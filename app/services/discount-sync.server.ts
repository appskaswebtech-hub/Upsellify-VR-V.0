import db from "../db.server";

type AdminApi = {
  graphql: (query: string, options?: { variables?: any }) => Promise<Response>;
};

const FUNCTION_TITLE = "upsellify-discount";
// ^^ must match the `handle` in extensions/upsellify-discount/shopify.extension.toml

export async function syncShopifyDiscount({
  admin,
  shop,
}: {
  admin: AdminApi;
  shop: string;
}) {
  // ── 1. Gather config ──
  const campaigns = await db.campaign.findMany({
    where: {
      shop,
      deletedAt: null,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      discount: { is: { NOT: { type: "NONE" } } },
    },
    include: {
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
      offers: true,
      triggers: true,
    },
  });

  const config = {
    campaigns: campaigns
      .map((c) => {
        if (!c.discount || c.discount.type === "NONE") return null;

        const productIds = Array.from(
          new Set([
            ...c.triggers
              .filter((t) => t.resourceType === "product")
              .map((t) => t.resourceId),
            ...c.offers.map((o) => o.productId),
          ]),
        );
        if (productIds.length === 0) return null;

        let tiers: { minItems: number; valueType: string; value: number }[] = [];
        if (c.discount.type === "TIERED") {
          tiers = c.discount.tiers.map((t) => ({
            minItems: t.minItems,
            valueType: t.valueType,
            value: t.value,
          }));
        } else if (c.discount.type === "PERCENTAGE") {
          tiers = [{ minItems: 1, valueType: "PERCENTAGE", value: c.discount.value || 0 }];
        } else if (c.discount.type === "FIXED") {
          tiers = [{ minItems: 1, valueType: "FIXED", value: c.discount.value || 0 }];
        }
        if (tiers.length === 0) return null;

        return { campaignId: c.id, campaignType: c.type, triggerType: c.triggerType, productIds, tiers };
      })
      .filter(Boolean),
  };

  console.log("[discount-sync] config being written:", JSON.stringify(config, null, 2));

  let shopRow = await db.shop.findUnique({ where: { shop } });

  // Nothing to sync and nothing exists → exit
  if (!shopRow?.shopifyDiscountId && config.campaigns.length === 0) return;

  // ── 2. Try updating the existing discount's metafield first ──
  if (shopRow?.shopifyDiscountId) {
    const result = await updateMetafield(admin, shopRow.shopifyDiscountId, config);
    if (result.ok) return;
    if (!result.ownerMissing) return; // a different error — don't mask it by recreating

    // The stored discount no longer exists on Shopify (e.g. removed on app
    // uninstall/reinstall). Clear it so we fall through and create a fresh one.
    console.log("[discount-sync] stored discount no longer exists — clearing and recreating");
    await db.shop.update({ where: { shop }, data: { shopifyDiscountId: null } });
    shopRow = { ...shopRow, shopifyDiscountId: null };
  }

  if (config.campaigns.length === 0) return;

  // ── 3. Create the discount ──
  const functionId = await findDiscountFunctionId(admin);
  if (!functionId) {
    console.error(
      "[discount-sync] No discount function found.\n" +
        "  Fix: run `shopify app deploy` to push the extension to Shopify.\n" +
        "  (shopify app dev is not enough — the function must be deployed.)",
    );
    return;
  }

  const title = "Upsellify bundle discount";
  const createRes = await admin.graphql(
    `mutation Create($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount { discountId }
        userErrors { field message code }
      }
    }`,
    {
      variables: {
        automaticAppDiscount: {
          title,
          functionId,
          discountClasses: ["PRODUCT"],
          startsAt: new Date().toISOString(),
          metafields: [
            {
              namespace: "selleasy",
              key: "config",
              type: "json",
              value: JSON.stringify(config),
            },
          ],
        },
      },
    },
  );
  const createJson: any = await createRes.json();
  const errs = createJson.data?.discountAutomaticAppCreate?.userErrors;
  if (errs?.length) {
    // A discount with this title already exists (likely an orphan from a
    // previous install) — find it and adopt its ID instead of failing forever.
    const titleTaken = errs.some((e: any) => /unique/i.test(e.message || ""));
    if (titleTaken) {
      const existingId = await findDiscountByTitle(admin, title);
      if (existingId) {
        console.log("[discount-sync] adopting existing discount with matching title:", existingId);
        await db.shop.update({ where: { shop }, data: { shopifyDiscountId: existingId } });
        await updateMetafield(admin, existingId, config);
        return;
      }
    }
    console.error("[discount-sync] Create errors:", errs);
    return;
  }
  const discountId =
    createJson.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
  if (discountId) {
    await db.shop.update({
      where: { shop },
      data: { shopifyDiscountId: discountId },
    });
    console.log("[discount-sync] Created discount:", discountId);
  }
}

/**
 * Finds an existing automatic discount by title — used to recover when a
 * stale shopifyDiscountId blocked creation of a new one with the same name.
 */
async function findDiscountByTitle(admin: AdminApi, title: string): Promise<string | null> {
  const res = await admin.graphql(
    `query {
      discountNodes(first: 25, query: "method:automatic") {
        nodes {
          id
          discount {
            __typename
            ... on DiscountAutomaticApp { title }
          }
        }
      }
    }`,
  );
  const json: any = await res.json();
  const nodes = json.data?.discountNodes?.nodes || [];
  const match = nodes.find((n: any) => n.discount?.title === title);
  return match?.id ?? null;
}

/**
 * Find the discount function ID for this app.
 * Handles all known variations of the `apiType` field across API versions.
 */
async function findDiscountFunctionId(admin: AdminApi): Promise<string | null> {
  const res = await admin.graphql(
    `query {
      shopifyFunctions(first: 50) {
        nodes {
          id
          title
          apiType
          app { title }
        }
      }
    }`,
  );
  const json: any = await res.json();
  const nodes = json.data?.shopifyFunctions?.nodes || [];

  console.log(
    "[discount-sync] Functions seen by Shopify:",
    JSON.stringify(nodes, null, 2),
  );

  if (nodes.length === 0) {
    console.error(
      "[discount-sync] shopifyFunctions returned ZERO nodes. " +
        "The extension hasn't been deployed to this shop yet. " +
        "Run `shopify app deploy` and re-install the app.",
    );
    return null;
  }

  // Match on apiType (case-insensitive, handles singular + plural) OR title
  const discountFn = nodes.find((n: any) => {
    const api = String(n.apiType || "").toLowerCase();
    const title = String(n.title || "").toLowerCase();
    const handle = String(n.handle || "").toLowerCase();
    return (
      api === "discounts" ||
      api === "discount" ||
      api.startsWith("discount") ||
      title === FUNCTION_TITLE.toLowerCase() ||
      title.includes("selleasy") ||
      title.includes("upsellify") ||
      handle === FUNCTION_TITLE.toLowerCase()
    );
  });

  if (!discountFn) {
    console.error(
      "[discount-sync] Found functions but none matched a discount function. " +
        "Check the logged output above — the `apiType` or `title` field may have changed.",
    );
    return null;
  }

  console.log(
    `[discount-sync] Matched function: ${discountFn.title} (apiType=${discountFn.apiType})`,
  );
  return discountFn.id;
}

async function updateMetafield(
  admin: AdminApi,
  discountId: string,
  config: any,
): Promise<{ ok: boolean; ownerMissing: boolean }> {
  const res = await admin.graphql(
    `mutation Update($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: discountId,
            namespace: "selleasy",
            key: "config",
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );
  const json: any = await res.json();
  const errs = json.data?.metafieldsSet?.userErrors;
  if (errs?.length) {
    console.error("[discount-sync] Metafield errors:", errs);
    const ownerMissing = errs.some((e: any) => /does not exist/i.test(e.message || ""));
    return { ok: false, ownerMissing };
  }
  console.log("[discount-sync] Updated discount metafield:", discountId);
  return { ok: true, ownerMissing: false };
}
