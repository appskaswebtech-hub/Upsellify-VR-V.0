import type { LoaderFunctionArgs } from "@remix-run/node";
import { Page, Card, BlockStack, Text, InlineStack, Button, Box, Select, Badge } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { useTranslation } from "../i18n/LanguageContext";
import type { Dictionary } from "../i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const SECTIONS = [
  {
    sectionKey: "productPage" as const,
    widgets: ["FBT_LIST", "FBT_AMAZON", "FBT_CLASSIC", "ADDON_LIST", "ADDON_CAROUSEL", "ADDON_GRID"],
  },
  {
    sectionKey: "popups" as const,
    widgets: ["FBT_ATC_POPUP"],
  },
  {
    sectionKey: "cart" as const,
    widgets: ["CART_UPSELL"],
  },
];

const POST_PURCHASE_WIDGETS = [
  { key: "POST_PURCHASE_UPSELL", shopifyPaymentsOnly: true, mockupType: "countdown" as const },
  { key: "POST_PURCHASE_DOWNSELL", shopifyPaymentsOnly: true, mockupType: "countdown" as const },
  { key: "THANK_YOU_PAGE_UPSELL", shopifyPaymentsOnly: false, mockupType: "thankyou" as const },
];

function CountdownMockup({ t }: { t: Dictionary }) {
  return (
    <div style={{ width: "100%", maxWidth: "190px" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px", justifyContent: "center" }}>
        {["0", "4", "3", "8"].map((digit, i) => (
          <span key={i}>
            {i === 2 && <span style={{ fontSize: "14px", fontWeight: 700, color: "#71717a", margin: "0 2px" }}>:</span>}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "22px", height: "26px", background: "#e4e4e7", borderRadius: "4px",
              fontSize: "13px", fontWeight: 700, color: "#3f3f46",
            }}>{digit}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ width: "56px", height: "56px", background: "#e4e4e7", borderRadius: "6px", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", paddingTop: "4px" }}>
          <div style={{ height: "7px", background: "#d4d4d8", borderRadius: "4px", width: "90%" }} />
          <div style={{ height: "7px", background: "#d4d4d8", borderRadius: "4px", width: "65%" }} />
          <div style={{ height: "7px", background: "#d4d4d8", borderRadius: "4px", width: "50%" }} />
        </div>
      </div>
      <div style={{ background: "#18181b", color: "white", borderRadius: "4px", padding: "5px 10px", fontSize: "10px", textAlign: "center", marginTop: "10px" }}>
        {t.campaignNew.mockup.payNow}
      </div>
      <div style={{ fontSize: "10px", textAlign: "center", color: "#71717a", marginTop: "5px" }}>{t.campaignNew.mockup.decline}</div>
    </div>
  );
}

function ThankYouMockup({ t }: { t: Dictionary }) {
  const items = [true, true, false];
  return (
    <div style={{ width: "100%", maxWidth: "190px" }}>
      {items.map((checked, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <div style={{
            width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0,
            background: checked ? "#18181b" : "white",
            border: checked ? "none" : "2px solid #d4d4d8",
          }} />
          <div style={{ width: "34px", height: "34px", background: "#e4e4e7", borderRadius: "4px", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ height: "6px", background: "#d4d4d8", borderRadius: "4px", width: "80%" }} />
            <div style={{ height: "6px", background: "#d4d4d8", borderRadius: "4px", width: "55%" }} />
          </div>
        </div>
      ))}
      <div style={{ background: "#18181b", color: "white", borderRadius: "4px", padding: "6px 10px", fontSize: "10px", textAlign: "center", marginTop: "6px" }}>
        {t.campaignNew.mockup.checkoutItems(2)}
      </div>
    </div>
  );
}

function PostPurchaseCard({
  widgetKey, shopifyPaymentsOnly, mockupType, t,
}: {
  widgetKey: string;
  shopifyPaymentsOnly: boolean;
  mockupType: "countdown" | "thankyou";
  t: Dictionary;
}) {
  const copy = t.campaignNew.types[widgetKey];
  return (
    <Card padding="0">
      <BlockStack gap="0">
        <div style={{
          position: "relative", background: "#f6f6f7",
          padding: "24px 20px", minHeight: "160px",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "12px 12px 0 0",
        }}>
          {mockupType === "countdown" ? <CountdownMockup t={t} /> : <ThankYouMockup t={t} />}
          {shopifyPaymentsOnly && (
            <div style={{ position: "absolute", top: "10px", right: "10px" }}>
              <Badge tone="success">{t.campaignNew.card.shopifyPaymentsOnly}</Badge>
            </div>
          )}
        </div>
        <Box padding="400">
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">{copy.title}</Text>
            <Text as="p" tone="subdued" variant="bodySm">{copy.description}</Text>
            <Box paddingBlockStart="200">
              <InlineStack align="space-between">
                <Button variant="secondary">{t.campaignNew.card.preview}</Button>
                <Button url={`/app/campaigns/new/${widgetKey}`} variant="primary">{t.campaignNew.card.create}</Button>
              </InlineStack>
            </Box>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}

function WidgetCard({ widgetKey, t }: { widgetKey: string; t: Dictionary }) {
  const title = t.campaignNew.types[widgetKey]?.title ?? widgetKey;
  const desc = t.customize.widgetDescriptions[widgetKey] ?? "";
  return (
    <Card>
      <BlockStack gap="200">
        <div style={{ color: "#ea580c", fontWeight: 600, fontSize: "14px", lineHeight: 1.3 }}>{title}</div>
        <Text as="p" tone="subdued" variant="bodySm">{desc}</Text>
        <Box paddingBlockStart="100">
          <InlineStack align="end">
            <Button url={`/app/widget-config/${widgetKey}`}>{t.customize.editWidgetCta}</Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Card>
  );
}

export default function CustomizeHub() {
  const [filter, setFilter] = useState("all");
  const { t } = useTranslation();

  const filterOptions = [
    { label: t.customize.filterOptions.all, value: "all" },
    { label: t.customize.filterOptions.productPage, value: "productPage" },
    { label: t.customize.filterOptions.popups, value: "popups" },
    { label: t.customize.filterOptions.cart, value: "cart" },
    { label: t.customize.filterOptions.postPurchase, value: "postPurchase" },
  ];

  const showWidgets = filter === "all" || (filter !== "postPurchase");
  const showPostPurchase = filter === "all" || filter === "postPurchase";

  const visibleSections = filter === "all" || filter === "postPurchase"
    ? SECTIONS
    : SECTIONS.filter((s) => s.sectionKey === filter);


  return (
    <Page title={t.customize.pageTitle}>
      <TitleBar title={t.customize.pageTitle} />
      <BlockStack gap="600">

        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="h3" variant="headingSm">{t.customize.commonSettings.title}</Text>
              <Text as="p" tone="subdued">{t.customize.commonSettings.description}</Text>
            </BlockStack>
            <Button url="/app/widget-settings">{t.customize.commonSettings.editCta}</Button>
          </InlineStack>
        </Card>

        <BlockStack gap="500">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">{t.customize.widgetsHeading}</Text>
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" tone="subdued">{t.customize.filterLabel}</Text>
              <div style={{ minWidth: 160 }}>
                <Select
                  label=""
                  labelHidden
                  options={filterOptions}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
            </InlineStack>
          </InlineStack>

          {showWidgets && visibleSections.map((section) => (
            <BlockStack key={section.sectionKey} gap="300">
              <Text as="p" tone="subdued" variant="bodySm">{t.customize.filterOptions[section.sectionKey]}</Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {section.widgets.map((widgetKey) => (
                  <WidgetCard key={widgetKey} widgetKey={widgetKey} t={t} />
                ))}
              </div>
            </BlockStack>
          ))}

          {showPostPurchase && (
            <BlockStack gap="300">
              <Text as="p" tone="subdued" variant="bodySm">{t.customize.filterOptions.postPurchase}</Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {POST_PURCHASE_WIDGETS.map((w) => (
                  <PostPurchaseCard
                    key={w.key}
                    widgetKey={w.key}
                    shopifyPaymentsOnly={w.shopifyPaymentsOnly}
                    mockupType={w.mockupType}
                    t={t}
                  />
                ))}
              </div>
            </BlockStack>
          )}
        </BlockStack>

      </BlockStack>
    </Page>
  );
}

