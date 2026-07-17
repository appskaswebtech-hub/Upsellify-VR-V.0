import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, InlineStack,
  Text, Button, Badge, Icon, Box,
} from "@shopify/polaris";
import { CheckCircleIcon, InfoIcon, StarFilledIcon, WandIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const host = url.searchParams.get("host");



  const shop = await db.shop.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  const shopPlan = await db.shopPlan.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop, plan: "free", status: "active" },
  });
  const effectivePlan = shopPlan.status === "active" ? shopPlan.plan : "free";

  const campaignCount = await db.campaign.count({
    where: { shop: session.shop, deletedAt: null },
  });

  return {
    shop,
    campaignCount,
    shopDomain: session.shop,
    plan: effectivePlan,
    host,
  };
};

export default function Index() {
  const { shop, campaignCount, shopDomain, plan, host } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps = [
    {
      key: "embed",
      title: t.dashboard.embedStep.title,
      description: t.dashboard.embedStep.description,
      done: shop.embedEnabled,
      cta: (
        <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.8, padding: "2px 0" }}>
          {t.dashboard.embedStep.instructionPrefix} <strong>{t.dashboard.embedStep.instructionPath}</strong> {t.dashboard.embedStep.instructionSuffix} <strong>Upsellify</strong>
        </div>
      ),
    },
    {
      key: "campaign",
      title: t.dashboard.campaignStep.title,
      description: t.dashboard.campaignStep.description,
      done: campaignCount > 0,
      cta: (
        <Button
  url={`/app/campaigns/new?host=${host}&shop=${shopDomain}`}
  variant="primary"
>
          {t.dashboard.campaignStep.cta}
        </Button>
      ),
    },
    {
      key: "verify",
      title: t.dashboard.verifyStep.title,
      description: t.dashboard.verifyStep.description,
      done: shop.storeVerified,
      cta: <Button
  url={`/app/campaigns`}
>{t.dashboard.verifyStep.cta}</Button>,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completed / steps.length) * 100);

  const isFreePlan = plan === "free";
  const isBasicPlan = plan === "basic";

  return (
    <Page>
      <TitleBar title={t.dashboard.title} />

      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        plan={plan}
        planSuffix={t.dashboard.planSuffix}
      />

      {isFreePlan && (
        <div style={{
          background: "linear-gradient(135deg, #4338CA, #6D5EF0)",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 6px 20px rgba(79, 70, 229, 0.25)",
        }}>
          <InlineStack gap="300" blockAlign="center">
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "#fff",
            }}>
              <Icon source={StarFilledIcon} tone="inherit" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#fff", marginBottom: "4px" }}>
                {t.dashboard.freePlanBanner.title}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
                {t.dashboard.freePlanBanner.subtitle}
              </div>
            </div>
          </InlineStack>
          <Button
            url={`/app/billing?shop=${shopDomain}&host=${host}`}
            variant="primary"
          >
            {t.dashboard.freePlanBanner.cta}
          </Button>
        </div>
      )}

      {isBasicPlan && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7, #fde68a)",
          border: "1px solid #f59e0b",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <InlineStack gap="200" blockAlign="center">
            <Icon source={StarFilledIcon} tone="warning" />
            <div style={{ fontSize: "13.5px", color: "#92400e", fontWeight: 600 }}>
              {t.dashboard.basicPlanBanner.text}
            </div>
          </InlineStack>
          <Button
            url={`/app/billing?shop=${shopDomain}&host=${host}`}
            variant="primary"
          >
            {t.dashboard.basicPlanBanner.cta}
          </Button>
        </div>
      )}


      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">{t.dashboard.checklist.title}</Text>
                <Badge tone={completed === steps.length ? "success" : "attention"}>
                  {t.dashboard.checklist.stepsCompleted(completed, steps.length)}
                </Badge>
              </InlineStack>

              <div style={{ height: "8px", background: "#EEF0FF", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #4F46E5, #7C6CF0)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }} />
              </div>

              <Text as="p" tone="subdued">
                {t.dashboard.checklist.description}
              </Text>

              <BlockStack gap="300">
                {steps.map((step) => (
                  <Box
                    key={step.key}
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderColor={step.done ? "border-success" : "border"}
                    borderWidth="025"
                  >
                    <InlineStack gap="400" align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: step.done ? "#DCFCE7" : "#EEF0FF",
                          flexShrink: 0,
                        }}>
                          <Icon
                            source={step.done ? CheckCircleIcon : InfoIcon}
                            tone={step.done ? "success" : "base"}
                          />
                        </div>
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">{step.title}</Text>
                          <Text as="p" tone="subdued">{step.description}</Text>
                        </BlockStack>
                      </InlineStack>
                      {!step.done && step.cta}
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="300" blockAlign="center">
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #4F46E5, #7C6CF0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#fff",
                }}>
                  <Icon source={WandIcon} tone="inherit" />
                </div>
                <Text as="h2" variant="headingMd">
                  {t.dashboard.quickStart.title}
                </Text>
              </InlineStack>
              <Text as="p" tone="subdued">
                {t.dashboard.quickStart.description}
              </Text>
              <InlineStack>
                {isFreePlan ? (
                  <Button disabled>
                    {t.dashboard.quickStart.upgradeCta}
                  </Button>
                ) : (
                  <Button url={`/app/campaigns/new`} variant="primary">
                    {t.dashboard.quickStart.createCta}
                  </Button>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function PageHeader({ title, subtitle, plan, planSuffix }: {
  title: string;
  subtitle?: string;
  plan?: string;
  planSuffix: string;
}) {
  return (
    <Box paddingBlockEnd="500">
      <div style={{
        background: "linear-gradient(135deg, #fafafe 0%, #f3f1ff 100%)",
        borderRadius: "16px",
        padding: "28px 32px",
        border: "1px solid #ede9fe",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6B7280" }}>{subtitle}</p>}
        </div>
        {plan && <PlanBadge plan={plan} suffix={planSuffix} />}
      </div>
    </Box>
  );
}

function PlanBadge({ plan, suffix }: { plan: string; suffix: string }) {
  const cfgs: Record<string, { bg: string; color: string; border: string; dot: string }> = {
    free:     { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB", dot: "#9CA3AF" },
    basic:    { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A", dot: "#F59E0B" },
    advanced: { bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE", dot: "#4F46E5" },
  };
  const cfg = cfgs[plan] ?? cfgs.free;
  return (
    <div style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: "999px", padding: "6px 14px 6px 10px",
      fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em",
      display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {plan.charAt(0).toUpperCase() + plan.slice(1)} {suffix}
    </div>
  );
}
