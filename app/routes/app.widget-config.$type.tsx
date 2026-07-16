import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useParams } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Card, BlockStack, Text, InlineStack, Button,
  Checkbox, Select, Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";

const SHORT_NAMES: Record<string, string> = {
  FBT_LIST:       "FBT List",
  FBT_AMAZON:     "FBT Amazon",
  FBT_CLASSIC:    "FBT Classic",
  ADDON_LIST:     "Addon List",
  ADDON_CAROUSEL: "Addon Carousel",
  ADDON_GRID:     "Addon Grid",
  FBT_ATC_POPUP:  "FBT Popup",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await db.shop.findUnique({ where: { shop: session.shop } });

  const allConfigs: Record<string, any> = (shop as any)?.widgetConfigs ?? {};
  const type = params.type ?? "";
  const config = allConfigs[type] ?? {};

  return {
    type,
    config: {
      useCSSSelectors: config.useCSSSelectors ?? false,
      actionAfterAdd:  config.actionAfterAdd  ?? "cart_drawer",
      imageResolution: config.imageResolution ?? "standard",
      hideWidget:      config.hideWidget      ?? false,
    },
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const incoming = JSON.parse(String(form.get("payload") || "{}"));
  const type = params.type ?? "";

  const shop = await db.shop.findUnique({ where: { shop: session.shop } });
  const existing: Record<string, any> = (shop as any)?.widgetConfigs ?? {};
  existing[type] = incoming;

  await (db.shop as any).update({
    where: { shop: session.shop },
    data: { widgetConfigs: existing },
  });

  return { ok: true };
};

export default function WidgetConfigPage() {
  const { type } = useParams();
  const { config } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const { t } = useTranslation();

  const widgetName = t.campaignNew.types[type ?? ""]?.title ?? t.widgetConfig.fallbackName;
  const shortName  = SHORT_NAMES[type  ?? ""] ?? t.widgetConfig.fallbackName;

  const [useCSSSelectors, setUseCSSSelectors] = useState(config.useCSSSelectors);
  const [actionAfterAdd,  setActionAfterAdd]  = useState(config.actionAfterAdd);
  const [imageResolution, setImageResolution] = useState(config.imageResolution);
  const [hideWidget,      setHideWidget]      = useState(config.hideWidget);

  const handleSave = () => {
    const fd = new FormData();
    fd.append("payload", JSON.stringify({ useCSSSelectors, actionAfterAdd, imageResolution, hideWidget }));
    submit(fd, { method: "post" });
  };

  return (
    <Page
      title={widgetName}
      backAction={{ content: t.customize.pageTitle, url: "/app/customize" }}
      primaryAction={{ content: t.common.save, onAction: handleSave }}
    >
      <TitleBar title={widgetName} />
      <BlockStack gap="400">

        {/* Widget position */}
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">{t.widgetConfig.position.sectionTitle}</Text>
            <div style={{ background: "#fff8f0", border: "1px solid #f5d0a9", borderRadius: 8, padding: "12px 14px" }}>
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <span style={{ color: "#b45309", fontSize: 16 }}>ℹ</span>
                  <Text as="span" tone="caution">
                    {t.widgetConfig.position.missingBlockWarning(shortName)}
                  </Text>
                </InlineStack>
                <Box paddingInlineStart="600">
                  <Button
                    variant="plain"
                    icon={<span>↗</span>}
                    url={`https://admin.shopify.com/themes`}
                    target="_blank"
                  >
                    {t.widgetConfig.position.addBlockCta(shortName)}
                  </Button>
                </Box>
              </BlockStack>
            </div>
            <Text as="p" tone="subdued">
              {t.widgetConfig.position.ignoreNote}
            </Text>
            <Checkbox
              label={t.widgetConfig.position.useCssSelectors}
              helpText={t.widgetConfig.position.useCssSelectorsHelp}
              checked={useCSSSelectors}
              onChange={setUseCSSSelectors}
            />
          </BlockStack>
        </Card>

        {/* Widget appearance */}
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">{t.widgetConfig.appearance.sectionTitle}</Text>
            <Text as="p" tone="subdued">
              {t.widgetConfig.appearance.description}
            </Text>
            <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, padding: "12px 16px" }}>
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <div style={{ width: 64, height: 52, background: "#f8f0e8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🎨
                  </div>
                  <Text as="span" fontWeight="medium">{widgetName}</Text>
                </InlineStack>
                <InlineStack gap="200">
                  <Button variant="plain">{t.widgetConfig.appearance.resetCta}</Button>
                  <Button url="/app/widget-settings">{t.widgetConfig.appearance.customizeCta}</Button>
                </InlineStack>
              </InlineStack>
            </div>
          </BlockStack>
        </Card>

        {/* Other settings */}
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">{t.widgetConfig.otherSettings.sectionTitle}</Text>
            <Select
              label={t.widgetConfig.otherSettings.actionAfterAdd}
              options={[
                { label: t.widgetConfig.otherSettings.openCartDrawer,   value: "cart_drawer" },
                { label: t.widgetConfig.otherSettings.navigateCartPage, value: "cart_page"   },
                { label: t.widgetConfig.otherSettings.stayOnPage,       value: "stay"        },
              ]}
              value={actionAfterAdd}
              onChange={setActionAfterAdd}
            />
            <Select
              label={t.widgetConfig.otherSettings.imageResolution}
              options={[
                { label: t.widgetConfig.otherSettings.standardRes, value: "standard" },
                { label: t.widgetConfig.otherSettings.highRes,     value: "high"     },
              ]}
              value={imageResolution}
              onChange={setImageResolution}
            />
            <Checkbox
              label={t.widgetConfig.otherSettings.hideWidget}
              helpText={t.widgetConfig.otherSettings.hideWidgetHelp}
              checked={hideWidget}
              onChange={setHideWidget}
            />
            <div style={{ opacity: 0.5 }}>
              <Checkbox
                label={t.widgetConfig.otherSettings.showAllValidCampaigns}
                helpText={t.widgetConfig.otherSettings.showAllValidCampaignsHelp}
                checked={false}
                onChange={() => {}}
                disabled
              />
            </div>
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}

