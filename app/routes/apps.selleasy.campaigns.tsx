import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session) return json({ campaigns: [] });

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return json({ campaigns: [] });

  const gid = `gid://shopify/Product/${productId}`;
  const now = new Date();

  const shopRow = await db.shop.findUnique({ where: { shop: session.shop } });

  const candidates = await db.campaign.findMany({
    where: {
      shop: session.shop,
      status: "ACTIVE",
      placement: url.searchParams.get("placement") || "PRODUCT_PAGE",
      deletedAt: null,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gt: now } }] },
      ],
      OR: [
        { triggerType: "ALL_PRODUCTS" },
        { triggerType: "SPECIFIC_PRODUCTS", triggers: { some: { resourceId: gid } } },
        { triggerType: "SPECIFIC_COLLECTIONS" },
      ],
    },
    include: {
      offers: { orderBy: { position: "asc" } },
      triggers: true,
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });

  // Filter collection-based campaigns by resolved membership
  const filtered: typeof candidates = [];
  const matchedCollectionIds = new Map<string, string>(); // campaignId -> collectionId
  for (const c of candidates) {
    if (c.triggerType !== "SPECIFIC_COLLECTIONS") {
      filtered.push(c);
      continue;
    }
    if (!admin) continue;
    const colIds = c.triggers
      .filter((t) => t.resourceType === "collection")
      .map((t) => t.resourceId);
    try {
      const matchedId = await matchedCollectionId(admin, session.shop, gid, colIds);
      if (matchedId) {
        matchedCollectionIds.set(c.id, matchedId);
        filtered.push(c);
      }
    } catch {
      // skip this campaign if collection lookup fails
    }
  }

  if (filtered.length === 0) return json({ campaigns: [] });

  const winner = filtered[0];
  const isShopCollection = SHOP_COLLECTION_TYPES.has(winner.type);

  let offers: { productId: string; productTitle: string; productHandle: string | null; imageUrl: string | null }[];
  if (isShopCollection && winner.offers.length === 0) {
    // No offers manually picked — auto-pull from the matched collection instead.
    const colId = matchedCollectionIds.get(winner.id);
    if (!admin || !colId) {
      offers = [];
    } else {
      const limit = winner.limitOffersShown || 8;
      const products = await fetchCollectionProductDetails(admin, colId, gid, limit);
      offers = products.map((p) => ({
        productId: p.id,
        productTitle: p.title,
        productHandle: p.handle,
        imageUrl: p.image,
      }));
      if (winner.randomizeOffers) offers.sort(() => Math.random() - 0.5);
    }
  } else {
    offers = [...winner.offers];
    if (winner.randomizeOffers) offers.sort(() => Math.random() - 0.5);
    if (winner.limitOffersShown) offers = offers.slice(0, winner.limitOffersShown);
  }

  const payload = {
    id: winner.id,
    type: SHOP_COLLECTION_VISUAL_ALIAS[winner.type] || winner.type,
    title: interpolate(
      winner.title || shopRow?.widgetTitle || "Frequently bought together",
      winner,
    ),
    subtitle: interpolate(winner.subtitle || shopRow?.widgetSubtitle || "", winner),
    ctaLabel: shopRow?.widgetCtaLabel || "Add bundle to cart",
    settings: {
      showQuantityPicker: winner.showQuantityPicker,
      allowDeselectTrigger: winner.allowDeselectTrigger,
      doNotPreselect: winner.doNotPreselect,
      autoMatchVariants: winner.autoMatchVariants,
    },
    appearance: {
      accentColor: shopRow?.widgetAccentColor || "#4F46E5",
      textColor: shopRow?.widgetTextColor || "#202020",
      borderRadius: shopRow?.widgetBorderRadius || 8,
      fontFamily: shopRow?.widgetFontFamily || "inherit",
    },
    discount: winner.discount
      ? {
          type: winner.discount.type,
          value: winner.discount.value,
          tiers: winner.discount.tiers.map((t) => ({
            minItems: t.minItems,
            valueType: t.valueType,
            value: t.value,
            label: t.label,
          })),
        }
      : null,
    offers: offers.map((o) => ({
      id: o.productId.replace("gid://shopify/Product/", ""),
      title: o.productTitle,
      handle: o.productHandle,
      image: o.imageUrl,
    })),
  };

  return json(
    { campaigns: [payload] },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
  } catch (e) {
    console.error("[selleasy proxy error]", e);
    return json({ campaigns: [] });
  }
};

function interpolate(template: string, c: any): string {
  if (!template) return "";
  let result = template;
  if (c.discount) {
    const top =
      c.discount.type === "TIERED" && c.discount.tiers?.length
        ? [...c.discount.tiers].sort((a: any, b: any) => b.value - a.value)[0]
        : { value: c.discount.value, valueType: c.discount.type };
    if (top) {
      const label =
        top.valueType === "PERCENTAGE" ? `${top.value}%` : `$${top.value}`;
      result = result.replace(/\{\{\s*discount\s*\}\}/g, label);
    }
  }
  if (c.endDate) {
    const remaining = Math.max(0, new Date(c.endDate).getTime() - Date.now());
    const hours = Math.floor(remaining / 3.6e6);
    const mins = Math.floor((remaining % 3.6e6) / 6e4);
    result = result.replace(/\{\{\s*timer\s*\}\}/g, `${hours}h ${mins}m`);
  }
  return result;
}

// Tells us whether (and which) of a campaign's trigger collections contains
// the current product — needed by "Shop the collection" campaigns to know
// where to pull offers from, and by regular collection-triggered campaigns
// to know whether they match at all.
async function matchedCollectionId(
  admin: any,
  shop: string,
  productGid: string,
  collectionIds: string[],
): Promise<string | null> {
  for (const colId of collectionIds) {
    const cached = await db.collectionProductCache.findUnique({
      where: { shop_collectionId: { shop, collectionId: colId } },
    });
    let productIds: string[];
    if (cached && cached.expiresAt > new Date()) {
      productIds = cached.productIds as string[];
    } else {
      productIds = await fetchCollectionProducts(admin, colId);
      await db.collectionProductCache.upsert({
        where: { shop_collectionId: { shop, collectionId: colId } },
        create: {
          shop, collectionId: colId,
          productIds,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        update: {
          productIds,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    }
    if (productIds.includes(productGid)) return colId;
  }
  return null;
}

async function fetchCollectionProducts(admin: any, collectionId: string): Promise<string[]> {
  const res = await admin.graphql(
    `query($id: ID!) {
      collection(id: $id) {
        products(first: 250) { nodes { id } }
      }
    }`,
    { variables: { id: collectionId } },
  );
  const data = await res.json();
  return data.data?.collection?.products?.nodes?.map((n: any) => n.id) || [];
}

// Full product details (title/handle/image) for "Shop the collection" offers —
// excludes the product currently being viewed, capped at `limit`.
async function fetchCollectionProductDetails(
  admin: any,
  collectionId: string,
  excludeProductGid: string,
  limit: number,
): Promise<{ id: string; title: string; handle: string; image: string }[]> {
  const res = await admin.graphql(
    `query($id: ID!) {
      collection(id: $id) {
        products(first: 250) {
          nodes { id title handle featuredImage { url } }
        }
      }
    }`,
    { variables: { id: collectionId } },
  );
  const data = await res.json();
  const nodes = data.data?.collection?.products?.nodes || [];
  return nodes
    .filter((n: any) => n.id !== excludeProductGid)
    .slice(0, limit)
    .map((n: any) => ({
      id: n.id,
      title: n.title,
      handle: n.handle,
      image: n.featuredImage?.url || "",
    }));
}

const SHOP_COLLECTION_TYPES = new Set([
  "SHOP_COLLECTION_LIST",
  "SHOP_COLLECTION_CAROUSEL",
  "SHOP_COLLECTION_GRID",
]);

// Widget JS only knows how to render the underlying layout styles below —
// "Shop the collection" campaigns just source offers differently server-side.
const SHOP_COLLECTION_VISUAL_ALIAS: Record<string, string> = {
  SHOP_COLLECTION_LIST: "ADDON_LIST",
  SHOP_COLLECTION_CAROUSEL: "ADDON_CAROUSEL",
  SHOP_COLLECTION_GRID: "ADDON_GRID",
};

