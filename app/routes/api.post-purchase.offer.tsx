import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";
import db from "../db.server";
import { DEFAULT_LOCALE, getDictionary, isSupportedLocale } from "../i18n";

// Preflight requests from the post-purchase extension
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.checkout(request);
  return new Response();
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cors, sessionToken } = await authenticate.public.checkout(request);
  const shop = (sessionToken as any).input_data?.shop?.domain ?? "";

  const body: any = await request.json();
  const lineItemProductGids: string[] = (body.lineItems ?? [])
    .map((li: any) => (li.productId ? `gid://shopify/Product/${li.productId}` : null))
    .filter(Boolean);

  console.log("[post-purchase] offer request, shop:", shop, "products:", lineItemProductGids);

  const campaigns = await db.campaign.findMany({
    where: {
      shop,
      type: { in: ["POST_PURCHASE_UPSELL", "POST_PURCHASE_DOWNSELL", "THANK_YOU_PAGE_UPSELL"] },
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      triggers: true,
      offers: { orderBy: { position: "asc" } },
      discount: true,
    },
    orderBy: { priority: "desc" },
  });

  const matched = campaigns.find((c) => {
    if (c.triggerType === "ALL_PRODUCTS") return true;
    return c.triggers.some((t) => lineItemProductGids.includes(t.resourceId));
  });

  const offersList = matched?.offers.filter((o) => o.productHandle) ?? [];
  if (!matched || !offersList.length) {
    console.log("[post-purchase] no matching campaign/offer");
    return cors(json({ offers: [] }));
  }

  const { admin } = await unauthenticated.admin(shop);
  const discountPct =
    matched.discount?.type === "PERCENTAGE" ? matched.discount.value ?? 0 : 0;

  // Fetch all offer products in a single aliased query instead of N round-trips
  const queryParts = offersList
    .map(
      (offer, i) => `p${i}: products(first: 1, query: $q${i}) {
        nodes {
          title
          featuredImage { url }
          variants(first: 25, sortKey: POSITION) {
            nodes { id title price }
          }
        }
      }`,
    )
    .join("\n");
  const varDefs = offersList.map((_, i) => `$q${i}: String!`).join(", ");
  const variables = Object.fromEntries(
    offersList.map((offer, i) => [`q${i}`, `handle:${offer.productHandle}`]),
  );

  const res = await admin.graphql(
    `query GetOfferVariants(${varDefs}) { ${queryParts} }`,
    { variables },
  );
  const gqlJson: any = await res.json();

  const products: any[] = [];
  offersList.forEach((offer, i) => {
    const product = gqlJson.data?.[`p${i}`]?.nodes?.[0];
    const variantNodes = product?.variants?.nodes ?? [];
    if (!variantNodes.length) {
      console.log("[post-purchase] skipped, no variants for handle:", offer.productHandle);
      return;
    }

    products.push({
      title: offer.productTitle,
      imageURL: offer.imageUrl || product?.featuredImage?.url || "",
      variants: variantNodes.map((v: any) => ({
        variantId: Number((v.id as string).split("/").pop()),
        title: v.title,
        price: v.price,
      })),
    });
  });

  if (!products.length) {
    return cors(json({ offers: [] }));
  }

  console.log("[post-purchase] offering", products.length, "products from campaign", matched.id);

  const tokenLanguage = (sessionToken as any).input_data?.localization?.language?.toLowerCase();
  const shopRecord = await db.shop.findUnique({ where: { shop } });
  const locale = isSupportedLocale(tokenLanguage)
    ? tokenLanguage
    : isSupportedLocale(shopRecord?.locale)
      ? shopRecord!.locale
      : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return cors(
    json({
      offers: [
        {
          id: matched.id,
          title: matched.title || t.postPurchase.specialOffer,
          productDescription: matched.subtitle ? [matched.subtitle] : [],
          discountPct,
          products,
        },
      ],
    }),
  );
};
