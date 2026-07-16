import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, BlockStack, TextField, Text, Banner, InlineStack,
  Box, RangeSlider, Modal, Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [shop, shopPlan] = await Promise.all([
    db.shop.upsert({
      where: { shop: session.shop },
      update: {},
      create: { shop: session.shop },
    }),
    db.shopPlan.findUnique({ where: { shop: session.shop } }),
  ]);
  return { shop, plan: shopPlan?.plan ?? "free" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const data = JSON.parse(String(form.get("payload") || "{}"));

  const shopPlan = await db.shopPlan.findUnique({ where: { shop: session.shop } });
  if (!shopPlan?.plan || shopPlan.plan === "free") {
    return json({ ok: false, upgradeRequired: true });
  }

  await db.shop.update({
    where: { shop: session.shop },
    data: {
      widgetTitle: data.widgetTitle || "Frequently bought together",
      widgetSubtitle: data.widgetSubtitle || null,
      widgetCtaLabel: data.widgetCtaLabel || "Add bundle to cart",
      widgetAccentColor: data.widgetAccentColor || "#4F46E5",
      widgetTextColor: data.widgetTextColor || "#202020",
      widgetBorderRadius: Number(data.widgetBorderRadius) || 8,
      widgetFontFamily: data.widgetFontFamily || "inherit",
    },
  });
  return json({ ok: true, upgradeRequired: false });
};

export default function WidgetSettings() {
  const { shop, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [title, setTitle] = useState(shop.widgetTitle);
  const [subtitle, setSubtitle] = useState(shop.widgetSubtitle ?? "");
  const [cta, setCta] = useState(shop.widgetCtaLabel);
  const [accent, setAccent] = useState(shop.widgetAccentColor);
  const [textColor, setTextColor] = useState(shop.widgetTextColor);
  const [radius, setRadius] = useState(shop.widgetBorderRadius);
  const [font, setFont] = useState(shop.widgetFontFamily);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSave = () => {
    if (plan === "free") { setShowUpgradeModal(true); return; }
    const fd = new FormData();
    fd.append("payload", JSON.stringify({
      widgetTitle: title, widgetSubtitle: subtitle, widgetCtaLabel: cta,
      widgetAccentColor: accent, widgetTextColor: textColor,
      widgetBorderRadius: radius, widgetFontFamily: font,
    }));
    submit(fd, { method: "post" });
  };

  const isModalOpen = showUpgradeModal || actionData?.upgradeRequired === true;

  return (
    <Page
      title={t.widgetSettings.pageTitle}
      backAction={{ content: t.customize.pageTitle, url: "/app/customize" }}
      primaryAction={{ content: t.common.save, onAction: handleSave }}
    >
      <TitleBar title={t.widgetSettings.pageTitle} />

      <Modal
        open={isModalOpen}
        onClose={() => setShowUpgradeModal(false)}
        title={t.widgetSettings.upgradeModal.title}
        primaryAction={{ content: t.widgetSettings.upgradeModal.viewPlansCta, onAction: () => navigate("/app/plans?reason=customize") }}
        secondaryActions={[{ content: t.widgetSettings.upgradeModal.maybeLater, onAction: () => setShowUpgradeModal(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div style={{ background: "linear-gradient(135deg, #1a1f6e, #4f6af0)", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎨</div>
              <div style={{ fontWeight: 700, fontSize: "17px", color: "#fff", marginBottom: "6px" }}>{t.widgetSettings.upgradeModal.heading}</div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                {t.widgetSettings.upgradeModal.description}
              </div>
            </div>
            <BlockStack gap="200">
              {t.widgetSettings.upgradeModal.features.map((f) => (
                <InlineStack key={f} gap="200" blockAlign="center">
                  <Text as="span" tone="success">✓</Text>
                  <Text as="span">{f}</Text>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {actionData?.ok && <Box paddingBlockEnd="400"><Banner tone="success" title={t.widgetSettings.savedBanner} /></Box>}
      {plan === "free" && (
        <Box paddingBlockEnd="400">
          <Banner tone="info" title={t.widgetSettings.freePlanBanner.title} action={{ content: t.widgetSettings.freePlanBanner.cta, url: "/app/plans" }} />
        </Box>
      )}

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">{t.widgetSettings.text.sectionTitle}</Text>
                <TextField label={t.widgetSettings.text.defaultTitle} value={title} onChange={setTitle} autoComplete="off" />
                <TextField label={t.widgetSettings.text.defaultSubtitle} value={subtitle} onChange={setSubtitle} helpText={t.widgetSettings.text.defaultSubtitleHelp} autoComplete="off" />
                <TextField label={t.widgetSettings.text.ctaLabel} value={cta} onChange={setCta} autoComplete="off" />
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">{t.widgetSettings.appearance.sectionTitle}</Text>
                <InlineStack gap="300" wrap>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <Box minWidth="180px">
                      <TextField label={t.widgetSettings.appearance.accentColor} value={accent} onChange={setAccent} autoComplete="off" />
                    </Box>
                    <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid #c9cccf", background: accent }} />
                      <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <Box minWidth="180px">
                      <TextField label={t.widgetSettings.appearance.textColor} value={textColor} onChange={setTextColor} autoComplete="off" />
                    </Box>
                    <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid #c9cccf", background: textColor }} />
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }} />
                    </div>
                  </div>
                </InlineStack>
                <RangeSlider label={t.widgetSettings.appearance.borderRadius} value={radius} min={0} max={24} onChange={(v) => setRadius(Number(v))} />
                <TextField label={t.widgetSettings.appearance.fontFamily} value={font} onChange={setFont} helpText={t.widgetSettings.appearance.fontFamilyHelp} autoComplete="off" />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">{t.widgetSettings.preview.sectionTitle}</Text>
              <div style={{ border: "1px solid #e3e3e3", borderRadius: radius, padding: 16, fontFamily: font, color: textColor, background: "#fff" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 12, color: "#707070", marginTop: 2 }}>{subtitle}</div>}
                <div style={{ border: "1px solid #e3e3e3", borderRadius: radius, padding: 10, margin: "10px 0", fontSize: 13 }}>{t.widgetSettings.preview.productA}</div>
                <div style={{ border: "1px solid #e3e3e3", borderRadius: radius, padding: 10, margin: "10px 0", fontSize: 13 }}>{t.widgetSettings.preview.productB}</div>
                <button style={{ width: "100%", padding: "12px", background: accent, color: "#fff", border: 0, borderRadius: radius, fontWeight: 600, cursor: "pointer" }}>{cta}</button>
              </div>
              {plan === "free" && (
                <Box paddingBlockStart="300">
                  <button onClick={() => setShowUpgradeModal(true)} style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg, #1a1f6e, #4f6af0)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                    {t.widgetSettings.preview.upgradeToSaveCta}
                  </button>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

