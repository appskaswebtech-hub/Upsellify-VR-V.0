import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, payload } = await authenticate.webhook(request);

  try {
    const lineItems: any[] = payload?.line_items ?? [];
    const productGids = lineItems
      .map((item: any) =>
        item.product_id ? `gid://shopify/Product/${item.product_id}` : null,
      )
      .filter(Boolean) as string[];

    if (!productGids.length) return new Response();

    // Find the first trigger product that has a pp_offer metafield
    let ppOfferRaw: any = null;

    for (const productGid of productGids) {
      const res = await admin.graphql(
        `query GetPPOffer($id: ID!) {
          product(id: $id) {
            metafield(namespace: "upsellify", key: "pp_offer") {
              value
            }
          }
        }`,
        { variables: { id: productGid } },
      );
      const json: any = await res.json();
      const value = json.data?.product?.metafield?.value;
      if (value) {
        try { ppOfferRaw = JSON.parse(value); } catch { /* skip */ }
        if (ppOfferRaw) break;
      }
    }

    if (!ppOfferRaw?.offerVariantId) {
      console.log("[orders-create] no pp_offer found for this order's products");
      return new Response();
    }

    // Get the shop's storefront URL
    const shopRes = await admin.graphql(`query { shop { primaryDomain { url } } }`);
    const shopJson: any = await shopRes.json();
    const storefrontUrl = shopJson.data?.shop?.primaryDomain?.url ?? "";

    // Write offer data to the ORDER metafield — readable by the thank-you extension
    const orderId = `gid://shopify/Order/${payload.id}`;
    const orderMetafieldValue = JSON.stringify({
      offerTitle: ppOfferRaw.offerTitle,
      offerImage: ppOfferRaw.offerImage ?? "",
      variantId: ppOfferRaw.offerVariantId,
      priceCents: ppOfferRaw.offerPriceCents ?? 0,
      discountPct: ppOfferRaw.discountPct ?? 0,
      discountType: ppOfferRaw.discountType ?? "NONE",
      storefrontUrl,
    });

    const writeRes = await admin.graphql(
      `mutation SetOrderPPOffer($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafields: [{
            ownerId: orderId,
            namespace: "upsellify",
            key: "pp_offer_data",
            type: "json",
            value: orderMetafieldValue,
          }],
        },
      },
    );

    const writeJson: any = await writeRes.json();
    const errs = writeJson.data?.metafieldsSet?.userErrors;
    if (errs?.length) {
      console.error("[orders-create] metafield write error:", errs);
    } else {
      console.log("[orders-create] wrote pp_offer_data to order:", orderId);
    }
  } catch (e) {
    console.error("[orders-create] error:", e);
  }

  return new Response();
};
