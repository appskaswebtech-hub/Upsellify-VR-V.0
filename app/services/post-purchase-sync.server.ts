import db from "../db.server";

type AdminApi = {
  graphql: (query: string, options?: { variables?: any }) => Promise<Response>;
};

// Fetches the first variant ID and price for a product handle via Admin API.
async function resolveOfferVariant(
  admin: AdminApi,
  handle: string,
): Promise<{ variantNumericId: string; priceCents: number } | null> {
  try {
    const res = await admin.graphql(
      `query GetOfferVariant($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            variants(first: 1, sortKey: POSITION) {
              nodes {
                id
                price
              }
            }
          }
        }
      }`,
      { variables: { query: `handle:${handle}` } },
    );
    const json: any = await res.json();
    const variant = json.data?.products?.nodes?.[0]?.variants?.nodes?.[0];
    if (!variant) return null;
    const variantNumericId = (variant.id as string).split("/").pop() ?? "";
    const priceCents = Math.round(parseFloat(variant.price ?? "0") * 100);
    return { variantNumericId, priceCents };
  } catch (e) {
    console.error("[pp-sync] resolveOfferVariant failed:", e);
    return null;
  }
}

// Ensures a SHOP-level metafield definition exists with PUBLIC_READ storefront access.
async function ensureShopMetafieldDefinition(admin: AdminApi) {
  try {
    const res = await admin.graphql(
      `mutation CreateShopPPOfferDefinition {
        metafieldDefinitionCreate(definition: {
          namespace: "upsellify"
          key: "current_pp_offer"
          name: "Current post-purchase offer"
          type: "json"
          ownerType: SHOP
          access: { storefront: PUBLIC_READ }
        }) {
          createdDefinition { id }
          userErrors { field message code }
        }
      }`,
    );
    const json: any = await res.json();
    const errs = json.data?.metafieldDefinitionCreate?.userErrors ?? [];
    const alreadyExists = errs.some((e: any) => e.code === "TAKEN");
    if (errs.length && !alreadyExists) {
      console.error("[pp-sync] shop metafield definition error:", errs);
    }
  } catch (e) {
    console.error("[pp-sync] ensureShopMetafieldDefinition failed:", e);
  }
}

/**
 * Called whenever a campaign is saved or deleted.
 * Writes upsellify/pp_offer on each trigger product AND writes the active offer
 * to a SHOP-level metafield (upsellify/current_pp_offer) so the thank-you page
 * extension can read it without needing webhooks or order API access.
 */
export async function syncPostPurchaseMetafields({
  admin,
  shop,
}: {
  admin: AdminApi;
  shop: string;
}) {
  const campaigns = await db.campaign.findMany({
    where: {
      shop,
      type: { in: ["POST_PURCHASE_UPSELL", "POST_PURCHASE_DOWNSELL", "THANK_YOU_PAGE_UPSELL"] },
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      triggers: true,
      offers: { orderBy: { position: "asc" }, take: 1 },
      discount: true,
    },
  });

  await ensureShopMetafieldDefinition(admin);

  console.log(`[pp-sync] found ${campaigns.length} active PP campaigns for shop ${shop}`);

  // Get the shop GID for writing the shop metafield
  const shopRes = await admin.graphql(`query { shop { id primaryDomain { url } } }`);
  const shopJson: any = await shopRes.json();
  const shopGid: string = shopJson.data?.shop?.id ?? "";
  const storefrontUrl: string = shopJson.data?.shop?.primaryDomain?.url ?? "";

  // Build product-level metafields AND collect the first offer for the shop metafield
  const toWrite = new Map<string, string>();
  let shopPayload: string | null = null;

  for (const campaign of campaigns) {
    const firstOffer = campaign.offers[0];
    if (!firstOffer?.productHandle) {
      console.log(`[pp-sync] campaign ${campaign.id} skipped — no offers`);
      continue;
    }

    const discountPct =
      campaign.discount?.type === "PERCENTAGE" ? campaign.discount.value ?? 0 : 0;

    const variantData = await resolveOfferVariant(admin, firstOffer.productHandle);
    if (!variantData) {
      console.log(`[pp-sync] campaign ${campaign.id} skipped — offer variant not found`);
      continue;
    }

    const payload = JSON.stringify({
      campaignId: campaign.id,
      offerHandle: firstOffer.productHandle,
      offerTitle: firstOffer.productTitle,
      offerImage: firstOffer.imageUrl ?? "",
      offerVariantId: variantData.variantNumericId,
      offerPriceCents: variantData.priceCents,
      discountPct,
      discountType: campaign.discount?.type ?? "NONE",
      storefrontUrl,
    });

    // First active campaign becomes the shop-level offer
    if (!shopPayload) shopPayload = payload;

    for (const trigger of campaign.triggers) {
      if (trigger.resourceType === "product") {
        toWrite.set(trigger.resourceId, payload);
      }
    }
  }

  // Write shop-level metafield (readable by extension without any webhooks)
  if (shopGid && shopPayload) {
    const res = await admin.graphql(
      `mutation SetShopPPOffer($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [{
            ownerId: shopGid,
            namespace: "upsellify",
            key: "current_pp_offer",
            type: "json",
            value: shopPayload,
          }],
        },
      },
    );
    const json: any = await res.json();
    const errs = json.data?.metafieldsSet?.userErrors;
    if (errs?.length) {
      console.error("[pp-sync] shop metafield error:", errs);
    } else {
      console.log("[pp-sync] wrote shop current_pp_offer metafield");
    }
  } else if (shopGid && !shopPayload) {
    // No active PP campaigns — clear the shop metafield
    await admin.graphql(
      `mutation ClearShopPPOffer($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [{
            ownerId: shopGid,
            namespace: "upsellify",
            key: "current_pp_offer",
            type: "json",
            value: "{}",
          }],
        },
      },
    );
    console.log("[pp-sync] cleared shop current_pp_offer (no active campaigns)");
  }

  if (toWrite.size === 0) return;

  // Write per-product metafields (for future per-order targeting)
  const entries = [...toWrite.entries()];
  for (let i = 0; i < entries.length; i += 25) {
    const batch = entries.slice(i, i + 25).map(([ownerId, value]) => ({
      ownerId,
      namespace: "upsellify",
      key: "pp_offer",
      type: "json",
      value,
    }));

    const res = await admin.graphql(
      `mutation SetPPOfferMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      { variables: { metafields: batch } },
    );
    const json: any = await res.json();
    const errs = json.data?.metafieldsSet?.userErrors;
    if (errs?.length) {
      console.error("[pp-sync] product metafield write errors:", errs);
    } else {
      console.log(`[pp-sync] wrote ${batch.length} pp_offer product metafields`);
    }
  }
}
