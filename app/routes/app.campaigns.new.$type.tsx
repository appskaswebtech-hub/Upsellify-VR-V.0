// // import type { LoaderFunctionArgs } from "@remix-run/node";
// import { redirect } from "@remix-run/node";

// import { authenticate } from "../shopify.server";
// import db from "../db.server";

// // =========================
// // CAMPAIGN LIMITS
// // =========================
// // free     → 1 campaign
// // basic    → 5 campaigns
// // advanced → unlimited
// const CAMPAIGN_LIMITS: Record<string, number> = {
//   free: 1,
//   basic: 5,
//   advanced: Infinity,
// };

// // Allowed campaign types
// const ALLOWED_TYPES = [
//   "FBT_LIST",
//   "FBT_AMAZON",
//   "FBT_CLASSIC",
//   "FBT_ATC_POPUP",
// ] as const;

// // Map type → placement
// function getPlacementForType(type: string): string {
//   if (type === "FBT_ATC_POPUP") return "ATC_POPUP";
//   return "PRODUCT_PAGE";
// }

// export const loader = async ({ request, params }: LoaderFunctionArgs) => {
//   const { session } = await authenticate.admin(request);

//   const type = params.type!;

//   // ✅ VALIDATE TYPE
//   if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
//     throw new Response("Unsupported type", { status: 400 });
//   }

//   // ✅ GET SHOP PLAN (from ShopPlan model, not Shop)
//   const shopPlan = await db.shopPlan.upsert({
//     where: {
//       shop: session.shop,
//     },
//     update: {},
//     create: {
//       shop: session.shop,
//       plan: "free",
//       status: "active",
//     },
//   });

//   // If subscription is cancelled/expired, fall back to free limits
//   const effectivePlan =
//     shopPlan.status === "active" ? shopPlan.plan : "free";

//   const limit =
//     CAMPAIGN_LIMITS[effectivePlan] ?? CAMPAIGN_LIMITS.free;

//   // ✅ COUNT CAMPAIGNS (exclude soft-deleted ones)
//   const totalCampaigns = await db.campaign.count({
//     where: {
//       shop: session.shop,
//       deletedAt: null,
//     },
//   });

//   // =========================
//   // LIMIT CHECK
//   // =========================

//   if (totalCampaigns >= limit) {
//     return redirect(
//       `/app/billing?reason=campaign_limit_${effectivePlan}`,
//     );
//   }

//   // =========================
//   // CREATE CAMPAIGN
//   // =========================

//   const campaign = await db.campaign.create({
//     data: {
//       shop: session.shop,
//       name: "Untitled campaign",
//       type,
//       status: "DRAFT",
//       placement: getPlacementForType(type),
//     },
//   });

//   return redirect(`/app/campaigns/${campaign.id}`);
// };
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import db from "../db.server";

// =========================
// CAMPAIGN LIMITS
// =========================
// free     → 1 campaign
// basic    → 5 campaigns
// advanced → unlimited
const CAMPAIGN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 5,
  advanced: Infinity,
};

// Allowed campaign types
const ALLOWED_TYPES = [
  "FBT_LIST",
  "FBT_AMAZON",
  "FBT_CLASSIC",
  "FBT_ATC_POPUP",
  "ADDON_LIST",
  "ADDON_CAROUSEL",
  "ADDON_GRID",
  "SHOP_COLLECTION_LIST",
  "SHOP_COLLECTION_CAROUSEL",
  "SHOP_COLLECTION_GRID",
  "CART_UPSELL",
  "POST_PURCHASE_UPSELL",
  "POST_PURCHASE_DOWNSELL",
  "THANK_YOU_PAGE_UPSELL",
] as const;

// Map type → placement
function getPlacementForType(type: string): string {
  if (type === "FBT_ATC_POPUP") return "ATC_POPUP";
  if (type === "CART_UPSELL") return "CART_DRAWER";
  if (type === "POST_PURCHASE_UPSELL" || type === "POST_PURCHASE_DOWNSELL" || type === "THANK_YOU_PAGE_UPSELL") return "POST_PURCHASE";
  return "PRODUCT_PAGE";
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const type = params.type!;

  // ✅ VALIDATE TYPE
  if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    throw new Response("Unsupported type", { status: 400 });
  }

  // ✅ ENSURE SHOP EXISTS (Campaign has a required FK to Shop)
  await db.shop.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  // ✅ GET SHOP PLAN (from ShopPlan model, not Shop)
  const shopPlan = await db.shopPlan.upsert({
    where: {
      shop: session.shop,
    },
    update: {},
    create: {
      shop: session.shop,
      plan: "free",
      status: "active",
    },
  });

  // If subscription is cancelled/expired, fall back to free limits
  const effectivePlan =
    shopPlan.status === "active" ? shopPlan.plan : "free";

  const limit =
    CAMPAIGN_LIMITS[effectivePlan] ?? CAMPAIGN_LIMITS.free;

  // ✅ COUNT CAMPAIGNS (exclude soft-deleted ones)
  const totalCampaigns = await db.campaign.count({
    where: {
      shop: session.shop,
      deletedAt: null,
    },
  });

  // =========================
  // LIMIT CHECK
  // =========================

  if (totalCampaigns >= limit) {
    return redirect(
      `/app/billing?reason=campaign_limit_${effectivePlan}`,
    );
  }

  // =========================
  // CREATE CAMPAIGN
  // =========================

  const campaign = await db.campaign.create({
    data: {
      shop: session.shop,
      name: "Untitled campaign",
      type,
      status: "DRAFT",
      placement: getPlacementForType(type),
    },
  });

  return redirect(`/app/campaigns/${campaign.id}`);
};

