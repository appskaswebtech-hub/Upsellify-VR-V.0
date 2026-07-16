import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { useState } from "react";

import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  EmptyState,
  Box,
  InlineStack,
  Banner,
  Button,
  Modal,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon, CollectionIcon } from "@shopify/polaris-icons";

import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";

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

// =========================
// ACTION
// =========================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const campaignId = String(form.get("campaignId") || "");

  if (intent === "delete" && campaignId) {
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, shop: session.shop, deletedAt: null },
    });
    if (campaign) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { deletedAt: new Date() },
      });
      try {
        const { syncShopifyDiscount } = await import("../services/discount-sync.server");
        await syncShopifyDiscount({ admin, shop: session.shop });
      } catch (e) {
        console.error("Discount sync failed on delete:", e);
      }
      try {
        const { syncPostPurchaseMetafields } = await import("../services/post-purchase-sync.server");
        await syncPostPurchaseMetafields({ admin, shop: session.shop });
      } catch (e) {
        console.error("PP metafield sync failed on delete:", e);
      }
    }
  }

  return { ok: true };
};

// =========================
// LOADER
// =========================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // ✅ GET CAMPAIGNS
  const campaigns = await db.campaign.findMany({
    where: {
      shop: session.shop,
      deletedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          triggers: true,
          offers: true,
        },
      },
      discount: true,
    },
  });

  // ✅ GET SHOP PLAN (from ShopPlan model)
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

  // If the plan is not active (cancelled/expired), fall back to free limits
  const effectivePlan =
    shopPlan.status === "active" ? shopPlan.plan : "free";

  return {
    campaigns,
    plan: effectivePlan,
    rawPlan: shopPlan.plan,
    status: shopPlan.status,
  };
};

// =========================
// COMPONENT
// =========================

export default function Campaigns() {
  const { campaigns, plan } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const deleteFetcher = useFetcher();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteFetcher.submit(
      { intent: "delete", campaignId: deleteTarget.id },
      { method: "post" },
    );
    setDeleteTarget(null);
  };

  // =========================
  // LIMITS
  // =========================

  // Defensive fallback: if an unknown plan slips in, treat as free
  const limit = CAMPAIGN_LIMITS[plan] ?? CAMPAIGN_LIMITS.free;

  const totalCampaigns = campaigns.length;

  const canCreate = totalCampaigns < limit;

  const limitLabel = limit === Infinity ? t.campaignsIndex.planUsage.unlimited : limit;

  // =========================
  // EMPTY STATE
  // =========================

  if (campaigns.length === 0) {
    return (
      <Page>
        <TitleBar title={t.campaignsIndex.title} />

        <Box paddingBlockEnd="400">
          <PlanUsageCard plan={plan} totalCampaigns={totalCampaigns} limitLabel={limitLabel} limit={limit} />
        </Box>

        <Card>
          <EmptyState
            heading={t.campaignsIndex.emptyState.heading}
            action={{
              content: t.campaignsIndex.emptyState.cta,
              onAction: () => navigate("/app/campaigns/new"),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              {t.campaignsIndex.emptyState.body}
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  // =========================
  // MAIN PAGE
  // =========================

  return (
    <Page
      title={t.campaignsIndex.title}
      primaryAction={{
        content: canCreate ? t.campaignsIndex.createCampaign : t.campaignsIndex.upgradePlanAction,
        disabled: false,
        onAction: () => {
          if (canCreate) {
            navigate("/app/campaigns/new");
          } else {
            navigate("/app/billing");
          }
        },
      }}
    >
      <TitleBar title={t.campaignsIndex.title} />

      {/* ========================= */}
      {/* PLAN STATUS */}
      {/* ========================= */}

      <Box paddingBlockEnd="400">
        <PlanUsageCard plan={plan} totalCampaigns={totalCampaigns} limitLabel={limitLabel} limit={limit} />
      </Box>

      {/* ========================= */}
      {/* LIMIT REACHED BANNER */}
      {/* ========================= */}

      {!canCreate && (
        <Box paddingBlockEnd="400">
          <Banner
            tone="warning"
            title={
              plan === "free"
                ? t.campaignsIndex.limitBanner.freeTitle
                : t.campaignsIndex.limitBanner.genericTitle
            }
            action={{
              content:
                plan === "advanced"
                  ? t.campaignsIndex.limitBanner.contactSupport
                  : t.campaignsIndex.limitBanner.upgradePlan,
              onAction: () => navigate("/app/billing"),
            }}
          >
            <p>
              {plan === "free" && t.campaignsIndex.limitBanner.freeBody}
              {plan === "basic" && t.campaignsIndex.limitBanner.basicBody}
              {plan === "advanced" && t.campaignsIndex.limitBanner.advancedBody}
            </p>
          </Banner>
        </Box>
      )}

      {/* ========================= */}
      {/* TABLE */}
      {/* ========================= */}

      <Card padding="0">
        <IndexTable
          itemCount={campaigns.length}
          selectable={false}
          headings={[
            { title: t.campaignsIndex.table.name },
            { title: t.campaignsIndex.table.type },
            { title: t.campaignsIndex.table.status },
            { title: t.campaignsIndex.table.discount },
            { title: t.campaignsIndex.table.triggers },
            { title: t.campaignsIndex.table.offers },
            { title: t.campaignsIndex.table.actions },
          ]}
        >
          {campaigns.map((c, i) => (
            <IndexTable.Row
              id={c.id}
              key={c.id}
              position={i}
              onClick={() => navigate(`/app/campaigns/${c.id}`)}
            >
              <IndexTable.Cell>
                <Text
                  as="span"
                  fontWeight="semibold"
                  variant="bodyMd"
                >
                  {c.name}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <InlineStack gap="150" blockAlign="center">
                  <span style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: typeColor(c.type),
                    flexShrink: 0,
                  }} />
                  <Text as="span" tone="subdued">
                    {prettyType(c.type)}
                  </Text>
                </InlineStack>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Badge tone={statusTone(c.status)}>
                  {t.campaignsIndex.statusLabels[c.status] ?? c.status}
                </Badge>
              </IndexTable.Cell>

              <IndexTable.Cell>
                {c.discount && c.discount.type !== "NONE" ? (
                  <Badge tone="attention">
                    {prettyDiscount(c.discount, t)}
                  </Badge>
                ) : (
                  <Text as="span" tone="subdued">
                    {t.campaignsIndex.discount.none}
                  </Text>
                )}
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Text as="span">
                  {c._count.triggers}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <Text as="span">
                  {c._count.offers}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>
                <div onClick={(e) => e.stopPropagation()}>
                  <Button
                    icon={DeleteIcon}
                    variant="tertiary"
                    tone="critical"
                    accessibilityLabel={t.campaignsIndex.deleteCampaignAction}
                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                  />
                </div>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t.campaignsIndex.deleteModal.title}
        primaryAction={{
          content: t.campaignsIndex.deleteModal.confirm,
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[
          { content: t.campaignsIndex.deleteModal.cancel, onAction: () => setDeleteTarget(null) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            {t.campaignsIndex.deleteModal.body(deleteTarget?.name ?? "")}
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

// =========================
// HELPERS
// =========================

function PlanUsageCard({
  plan, totalCampaigns, limitLabel, limit,
}: {
  plan: string;
  totalCampaigns: number;
  limitLabel: string | number;
  limit: number;
}) {
  const { t } = useTranslation();
  const usagePct = limit === Infinity ? 100 : Math.min(100, Math.round((totalCampaigns / Math.max(limit, 1)) * 100));
  return (
    <Card>
      <InlineStack align="space-between" blockAlign="center" gap="400">
        <InlineStack gap="300" blockAlign="center">
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #4F46E5, #7C6CF0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#fff",
          }}>
            <Icon source={CollectionIcon} tone="inherit" />
          </div>
          <Text as="p" variant="bodyMd">
            {t.campaignsIndex.planUsage.currentPlan}{" "}
            <strong style={{ textTransform: "capitalize" }}>{plan}</strong>
          </Text>
        </InlineStack>

        <div style={{ minWidth: "180px" }}>
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm" tone="subdued">{t.campaignsIndex.planUsage.usage}</Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {totalCampaigns} / {limitLabel}
            </Text>
          </InlineStack>
          <div style={{ height: "6px", background: "#EEF0FF", borderRadius: "999px", overflow: "hidden", marginTop: "4px" }}>
            <div style={{
              height: "100%",
              width: `${usagePct}%`,
              background: "linear-gradient(90deg, #4F46E5, #7C6CF0)",
              borderRadius: "999px",
            }} />
          </div>
        </div>
      </InlineStack>
    </Card>
  );
}

function prettyType(t: string) {
  return t
    .replace("FBT_", "FBT · ")
    .replace(/_/g, " ");
}

function typeColor(t: string): string {
  if (t.startsWith("FBT_")) return "#4F46E5";
  if (t.startsWith("ADDON_")) return "#0D9488";
  if (t.startsWith("SHOP_COLLECTION")) return "#D97706";
  if (t.startsWith("CART_")) return "#DB2777";
  if (t.startsWith("POST_PURCHASE") || t === "THANK_YOU_PAGE_UPSELL") return "#7C3AED";
  return "#71717A";
}

function statusTone(
  status: string,
): "success" | "info" | "attention" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";

    case "SCHEDULED":
      return "attention";

    case "PAUSED":
      return "warning";

    case "EXPIRED":
      return "warning";

    default:
      return "info";
  }
}

function prettyDiscount(
  d: {
    type: string;
    value: number | null;
  },
  t: import("../i18n").Dictionary,
) {
  if (d.type === "PERCENTAGE") {
    return t.campaignsIndex.discount.percentOff(d.value ?? 0);
  }

  if (d.type === "FIXED") {
    return t.campaignsIndex.discount.fixedOff(d.value ?? 0);
  }

  if (d.type === "TIERED") {
    return t.campaignsIndex.discount.tiered;
  }

  return t.campaignsIndex.discount.none;
}
