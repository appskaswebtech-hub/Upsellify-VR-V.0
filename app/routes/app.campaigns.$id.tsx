// FILE: app/routes/app.campaigns.$id.tsx

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  Page, Layout, Card, BlockStack, InlineStack, TextField, Select, Button,
  Text, Badge, Thumbnail, Box, Checkbox, Modal, Icon,
} from "@shopify/polaris";
import {
  DeleteIcon, TargetIcon, ProductAddIcon, SettingsIcon, DiscountIcon,
  CalendarIcon, FlagIcon, PaintBrushFlatIcon, LockIcon,
} from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";
import type { Dictionary } from "../i18n";

type PickedResource = { id: string; title: string; handle?: string; image?: string };
type Tier = { id?: string; minItems: number; valueType: "PERCENTAGE" | "FIXED"; value: number; label?: string };

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop, deletedAt: null },
    include: {
      triggers: { orderBy: { position: "asc" } },
      offers: { orderBy: { position: "asc" } },
      discount: { include: { tiers: { orderBy: { position: "asc" } } } },
    },
  });
  if (!campaign) throw new Response("Not found", { status: 404 });

  const [shopRow, shopPlan] = await Promise.all([
    db.shop.findUnique({ where: { shop: session.shop } }),
    db.shopPlan.findUnique({ where: { shop: session.shop } }),
  ]);

  return {
    campaign,
    shopTimezone: shopRow?.timezone || "America/New_York",
    plan: shopPlan?.plan ?? "free",
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  const campaign = await db.campaign.findFirst({
    where: { id: params.id, shop: session.shop, deletedAt: null },
  });
  if (!campaign) throw new Response("Not found", { status: 404 });

  if (intent === "delete") {
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
    return redirect("/app/campaigns");
  }

  if (intent === "save") {
    const raw = String(form.get("payload") || "{}");
    const data = JSON.parse(raw);

    // Resolve status
    let status = data.status as string;
    const now = new Date();
    const start = data.startDate ? new Date(data.startDate) : null;
    const end = data.endDate ? new Date(data.endDate) : null;
    if (status === "ACTIVE" && start && start > now) status = "SCHEDULED";
    if (end && end < now) status = "EXPIRED";

    await db.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          name: data.name,
          status,
          title: data.title || null,
          subtitle: data.subtitle || null,
          priority: Number(data.priority) || 0,
          triggerType: data.triggerType,
          startDate: start,
          endDate: end,
          timezone: data.timezone,
          showQuantityPicker: data.settings.showQuantityPicker,
          allowDeselectTrigger: data.settings.allowDeselectTrigger,
          doNotPreselect: data.settings.doNotPreselect,
          randomizeOffers: data.settings.randomizeOffers,
          limitOffersShown: data.settings.limitOffersShown,
          autoMatchVariants: data.settings.autoMatchVariants,
        },
      });

      await tx.campaignTrigger.deleteMany({ where: { campaignId: campaign.id } });
      await tx.campaignOffer.deleteMany({ where: { campaignId: campaign.id } });

      if (data.triggerType !== "ALL_PRODUCTS" && Array.isArray(data.triggers) && data.triggers.length) {
        await tx.campaignTrigger.createMany({
          data: data.triggers.map((t: PickedResource, i: number) => ({
            campaignId: campaign.id,
            resourceType: data.triggerType === "SPECIFIC_COLLECTIONS" ? "collection" : "product",
            resourceId: t.id,
            resourceTitle: t.title,
            resourceHandle: t.handle,
            imageUrl: t.image,
            position: i,
          })),
        });
      }

      if (Array.isArray(data.offers) && data.offers.length) {
        await tx.campaignOffer.createMany({
          data: data.offers.map((o: PickedResource, i: number) => ({
            campaignId: campaign.id,
            productId: o.id,
            productTitle: o.title,
            productHandle: o.handle,
            imageUrl: o.image,
            position: i,
          })),
        });
      }

      const existing = await tx.discount.findUnique({ where: { campaignId: campaign.id } });
      if (data.discount.type === "NONE") {
        if (existing) await tx.discount.delete({ where: { id: existing.id } });
      } else {
        const discount = await tx.discount.upsert({
          where: { campaignId: campaign.id },
          create: {
            shop: session.shop,
            campaignId: campaign.id,
            type: data.discount.type,
            value: data.discount.value,
          },
          update: {
            type: data.discount.type,
            value: data.discount.value,
          },
        });
        await tx.discountTier.deleteMany({ where: { discountId: discount.id } });
        if (data.discount.type === "TIERED" && Array.isArray(data.discount.tiers)) {
          await tx.discountTier.createMany({
            data: data.discount.tiers.map((t: Tier, i: number) => ({
              discountId: discount.id,
              minItems: Number(t.minItems) || 1,
              valueType: t.valueType,
              value: Number(t.value) || 0,
              label: t.label || `Buy ${t.minItems}, get ${t.value}${t.valueType === "PERCENTAGE" ? "%" : ""}`,
              position: i,
            })),
          });
        }
      }

      await tx.shop.update({
        where: { shop: session.shop },
        data: { firstCampaignCreated: true },
      });
    });

    try {
      const { syncShopifyDiscount } = await import("../services/discount-sync.server");
      await syncShopifyDiscount({ admin, shop: session.shop });
    } catch (e) {
      console.error("Discount sync failed:", e);
    }

    try {
      const { syncPostPurchaseMetafields } = await import("../services/post-purchase-sync.server");
      await syncPostPurchaseMetafields({ admin, shop: session.shop });
    } catch (e) {
      console.error("PP metafield sync failed:", e);
    }

    return json({ ok: true });
  }

  return json({ ok: false });
};

export default function CampaignEditor() {
  const { campaign, shopTimezone, plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const shopify = useAppBridge();
  const submit = useSubmit();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (actionData?.ok) {
      setShowSaved(true);
      const t = setTimeout(() => {
        setShowSaved(false);
        navigate("/app/campaigns");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [actionData]);

  const [name, setName] = useState(campaign.name);
  const [status, setStatus] = useState(campaign.status);
  const [title, setTitle] = useState(campaign.title ?? "");
  const [subtitle, setSubtitle] = useState(campaign.subtitle ?? "");
  const [priority, setPriority] = useState(String(campaign.priority));
  const isShopCollection = campaign.type.startsWith("SHOP_COLLECTION");
  const [triggerType, setTriggerType] = useState(campaign.triggerType);

  const [triggers, setTriggers] = useState<PickedResource[]>(
    campaign.triggers.map((t) => ({
      id: t.resourceId,
      title: t.resourceTitle,
      handle: t.resourceHandle ?? undefined,
      image: t.imageUrl ?? undefined,
    })),
  );
  const [offers, setOffers] = useState<PickedResource[]>(
    campaign.offers.map((o) => ({
      id: o.productId,
      title: o.productTitle,
      handle: o.productHandle ?? undefined,
      image: o.imageUrl ?? undefined,
    })),
  );

  const initTz = campaign.timezone || shopTimezone;
  const [startDate, setStartDate] = useState(
    campaign.startDate ? toDateInput(campaign.startDate, initTz) : toDateInput(new Date(), initTz),
  );
  const [startTime, setStartTime] = useState(
    campaign.startDate ? toTimeInput(campaign.startDate, initTz) : "00:00",
  );
  const [endEnabled, setEndEnabled] = useState(!!campaign.endDate);
  const [endDate, setEndDateValue] = useState(
    campaign.endDate ? toDateInput(campaign.endDate, initTz) : "",
  );
  const [endTime, setEndTime] = useState(
    campaign.endDate ? toTimeInput(campaign.endDate, initTz) : "23:59",
  );
  const [timezone, setTimezone] = useState(initTz);

  const [showQuantityPicker, setShowQuantityPicker] = useState(campaign.showQuantityPicker);
  const [allowDeselectTrigger, setAllowDeselectTrigger] = useState(campaign.allowDeselectTrigger);
  const [doNotPreselect, setDoNotPreselect] = useState(campaign.doNotPreselect);
  const [randomizeOffers, setRandomizeOffers] = useState(campaign.randomizeOffers);
  const [limitEnabled, setLimitEnabled] = useState(campaign.limitOffersShown != null);
  const [limitValue, setLimitValue] = useState(String(campaign.limitOffersShown ?? 3));
  const [autoMatchVariants, setAutoMatchVariants] = useState(campaign.autoMatchVariants);

  const [discountType, setDiscountType] = useState<"NONE" | "PERCENTAGE" | "FIXED" | "TIERED">(
    (campaign.discount?.type as any) || "NONE",
  );
  const [discountValue, setDiscountValue] = useState(String(campaign.discount?.value ?? ""));
  const [tiers, setTiers] = useState<Tier[]>(
    campaign.discount?.tiers?.length
      ? campaign.discount.tiers.map((t) => ({
          id: t.id,
          minItems: t.minItems,
          valueType: t.valueType as any,
          value: t.value,
          label: t.label ?? undefined,
        }))
      : [{ minItems: 2, valueType: "PERCENTAGE", value: 10 }],
  );

  const pickProducts = useCallback(
    async (target: "trigger" | "offer") => {
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });
      if (!selection) return;
      const picked: PickedResource[] = selection.map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        image: p.images?.[0]?.originalSrc,
      }));
      if (target === "trigger") setTriggers((prev) => dedupe([...prev, ...picked]));
      else setOffers((prev) => dedupe([...prev, ...picked]));
    },
    [shopify],
  );

  const pickCollections = useCallback(async () => {
    const selection = await shopify.resourcePicker({
      type: "collection",
      multiple: true,
      action: "select",
    });
    if (!selection) return;
    const picked: PickedResource[] = selection.map((c: any) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      image: c.image?.originalSrc,
    }));
    setTriggers((prev) => dedupe([...prev, ...picked]));
  }, [shopify]);

  const handleSave = () => {
    const payload = {
      name,
      status,
      title,
      subtitle,
      priority: Number(priority) || 0,
      triggerType,
      triggers: triggerType === "ALL_PRODUCTS" ? [] : triggers,
      offers,
      startDate: combineDateTime(startDate, startTime, timezone),
      endDate: endEnabled ? combineDateTime(endDate, endTime, timezone) : null,
      timezone,
      settings: {
        showQuantityPicker,
        allowDeselectTrigger,
        doNotPreselect,
        randomizeOffers,
        limitOffersShown: limitEnabled ? Number(limitValue) : null,
        autoMatchVariants,
      },
      discount: {
        type: discountType,
        value:
          discountType === "PERCENTAGE" || discountType === "FIXED"
            ? Number(discountValue)
            : null,
        tiers: discountType === "TIERED" ? tiers : [],
      },
    };
    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("payload", JSON.stringify(payload));
    submit(fd, { method: "post" });
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDelete = () => {
    const fd = new FormData();
    fd.append("intent", "delete");
    submit(fd, { method: "post" });
  };

  return (
    <Page
      backAction={{ content: t.campaignsIndex.title, url: "/app/campaigns" }}
      title={campaign.type.replace(/_/g, " ")}
      titleMetadata={
        <Badge tone={status === "ACTIVE" ? "success" : "info"}>{t.campaignsIndex.statusLabels[status] ?? status}</Badge>
      }
      primaryAction={{ content: t.common.save, onAction: handleSave }}
      secondaryActions={[
        { content: t.common.delete, destructive: true, onAction: () => setDeleteModalOpen(true) },
      ]}
    >
      <TitleBar title={campaign.name} />
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t.campaignsIndex.deleteModal.title}
        primaryAction={{
          content: t.campaignsIndex.deleteModal.confirm,
          destructive: true,
          onAction: () => {
            setDeleteModalOpen(false);
            handleDelete();
          },
        }}
        secondaryActions={[
          { content: t.campaignsIndex.deleteModal.cancel, onAction: () => setDeleteModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            {t.campaignsIndex.deleteModal.body(campaign.name)}
          </Text>
        </Modal.Section>
      </Modal>
      {showSaved && (
        <>
          <style>{`
            @keyframes slSavedBackdropIn {
              0% { opacity: 0; backdrop-filter: blur(0px); }
              100% { opacity: 1; backdrop-filter: blur(3px); }
            }
            @keyframes slSavedPop {
              0% { transform: scale(0.7); opacity: 0; }
              60% { transform: scale(1.06); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes slSavedFadeOut {
              0% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes slSavedDrawCheck {
              0% { stroke-dashoffset: 24; }
              100% { stroke-dashoffset: 0; }
            }
            .sl-saved-overlay {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              pointer-events: none;
              background: rgba(0,0,0,0.12);
              -webkit-backdrop-filter: blur(3px);
              backdrop-filter: blur(3px);
              animation: slSavedBackdropIn 0.3s ease-out,
                         slSavedFadeOut 0.4s ease-in 1.6s forwards;
            }
            .sl-saved-overlay__card {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
              background: #fff;
              padding: 36px 48px;
              border-radius: 16px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.18);
              animation: slSavedPop 0.35s ease-out,
                         slSavedFadeOut 0.4s ease-in 1.6s forwards;
            }
            .sl-saved-overlay__check {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: #008060;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .sl-saved-overlay__check path {
              stroke-dasharray: 24;
              stroke-dashoffset: 24;
              animation: slSavedDrawCheck 0.4s ease-out 0.25s forwards;
            }
          `}</style>
          <div className="sl-saved-overlay">
            <div className="sl-saved-overlay__card">
              <div className="sl-saved-overlay__check">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <Text as="p" variant="headingMd">{t.campaignDetail.savedOverlay.title}</Text>
              <Text as="p" tone="subdued">{t.campaignDetail.savedOverlay.subtitle}</Text>
            </div>
          </div>
        </>
      )}

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <TextField
                label={t.campaignDetail.campaignNameLabel}
                value={name}
                onChange={setName}
                autoComplete="off"
              />
            </Card>

            <Card>
              <BlockStack gap="300">
                <SectionTitle icon={TargetIcon} color="#4F46E5">{t.campaignDetail.trigger.sectionTitle}</SectionTitle>
                <Text as="p" tone="subdued">
                  {t.campaignDetail.trigger.description}
                </Text>
                <Select
                  label={t.campaignDetail.trigger.typeLabel}
                  options={[
                    { label: t.campaignDetail.trigger.allProducts, value: "ALL_PRODUCTS" },
                    { label: t.campaignDetail.trigger.specificProducts, value: "SPECIFIC_PRODUCTS" },
                    { label: t.campaignDetail.trigger.specificCollections, value: "SPECIFIC_COLLECTIONS" },
                  ]}
                  value={triggerType}
                  onChange={setTriggerType}
                />
                {triggerType === "SPECIFIC_PRODUCTS" && (
                  <ResourceList
                    items={triggers}
                    onAdd={() => pickProducts("trigger")}
                    onRemove={(id) => setTriggers((p) => p.filter((x) => x.id !== id))}
                    addLabel={t.campaignDetail.trigger.browseProducts}
                    removeLabel={t.campaignDetail.resourceList.remove}
                  />
                )}
                {triggerType === "SPECIFIC_COLLECTIONS" && (
                  <ResourceList
                    items={triggers}
                    onAdd={pickCollections}
                    onRemove={(id) => setTriggers((p) => p.filter((x) => x.id !== id))}
                    addLabel={t.campaignDetail.trigger.browseCollections}
                    removeLabel={t.campaignDetail.resourceList.remove}
                  />
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <SectionTitle icon={ProductAddIcon} color="#0D9488">{t.campaignDetail.offers.sectionTitle}</SectionTitle>
                <Text as="p" tone="subdued">
                  {isShopCollection
                    ? t.campaignDetail.offers.descriptionAuto
                    : t.campaignDetail.offers.descriptionManual}
                </Text>
                <ResourceList
                  items={offers}
                  onAdd={() => pickProducts("offer")}
                  onRemove={(id) => setOffers((p) => p.filter((x) => x.id !== id))}
                  addLabel={t.campaignDetail.trigger.browseProducts}
                  removeLabel={t.campaignDetail.resourceList.remove}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <SectionTitle icon={SettingsIcon} color="#71717A">{t.campaignDetail.settings.sectionTitle}</SectionTitle>
                <Checkbox
                  label={t.campaignDetail.settings.showQuantityPicker}
                  checked={showQuantityPicker}
                  onChange={setShowQuantityPicker}
                />
                <Checkbox
                  label={t.campaignDetail.settings.allowDeselectTrigger}
                  checked={allowDeselectTrigger}
                  onChange={setAllowDeselectTrigger}
                />
                <Checkbox
                  label={t.campaignDetail.settings.doNotPreselect}
                  checked={doNotPreselect}
                  onChange={setDoNotPreselect}
                />
                <Checkbox
                  label={t.campaignDetail.settings.randomizeOffers}
                  checked={randomizeOffers}
                  onChange={setRandomizeOffers}
                />
                <Checkbox
                  label={t.campaignDetail.settings.limitOffersShown}
                  checked={limitEnabled}
                  onChange={setLimitEnabled}
                />
                {limitEnabled && (
                  <TextField
                    label={t.campaignDetail.settings.maxOffers}
                    type="number"
                    value={limitValue}
                    onChange={setLimitValue}
                    autoComplete="off"
                    min={1}
                  />
                )}
                <Checkbox
                  label={t.campaignDetail.settings.autoMatchVariants}
                  helpText={t.campaignDetail.settings.autoMatchVariantsHelp}
                  checked={autoMatchVariants}
                  onChange={setAutoMatchVariants}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <SectionTitle icon={DiscountIcon} color="#DB2777">{t.campaignDetail.discounts.sectionTitle}</SectionTitle>
                <Select
                  label={t.campaignDetail.discounts.typeLabel}
                  options={[
                    { label: t.campaignDetail.discounts.noDiscount, value: "NONE" },
                    { label: t.campaignDetail.discounts.percentageOff, value: "PERCENTAGE" },
                    { label: t.campaignDetail.discounts.fixedAmountOff, value: "FIXED" },
                    { label: t.campaignDetail.discounts.tieredLabel, value: "TIERED" },
                  ]}
                  value={discountType}
                  onChange={(v) => setDiscountType(v as any)}
                />
                {(discountType === "PERCENTAGE" || discountType === "FIXED") && (
                  <TextField
                    label={discountType === "PERCENTAGE" ? t.campaignDetail.discounts.percentageOff : t.campaignDetail.discounts.amountOff}
                    type="number"
                    value={discountValue}
                    onChange={setDiscountValue}
                    suffix={discountType === "PERCENTAGE" ? "%" : undefined}
                    autoComplete="off"
                  />
                )}
                {discountType === "TIERED" && (
                  <TierEditor tiers={tiers} onChange={setTiers} t={t} />
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <SectionTitle icon={CalendarIcon} color="#D97706">{t.campaignDetail.schedule.sectionTitle}</SectionTitle>
                  <Text as="span" tone="subdued">{timezone}</Text>
                </InlineStack>
                <Text as="p" tone="subdued">
                  {t.campaignDetail.schedule.description}
                </Text>
                <InlineStack gap="300">
                  <Box minWidth="200px">
                    <TextField
                      label={t.campaignDetail.schedule.startDate}
                      type="date"
                      value={startDate}
                      onChange={setStartDate}
                      autoComplete="off"
                    />
                  </Box>
                  <Box minWidth="140px">
                    <TextField
                      label={t.campaignDetail.schedule.startTime}
                      type="time"
                      value={startTime}
                      onChange={setStartTime}
                      autoComplete="off"
                    />
                  </Box>
                </InlineStack>
                <Checkbox label={t.campaignDetail.schedule.setEndDate} checked={endEnabled} onChange={setEndEnabled} />
                {endEnabled && (
                  <InlineStack gap="300">
                    <Box minWidth="200px">
                      <TextField
                        label={t.campaignDetail.schedule.endDate}
                        type="date"
                        value={endDate}
                        onChange={setEndDateValue}
                        autoComplete="off"
                      />
                    </Box>
                    <Box minWidth="140px">
                      <TextField
                        label={t.campaignDetail.schedule.endTime}
                        type="time"
                        value={endTime}
                        onChange={setEndTime}
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                )}
                <Select
                  label={t.campaignDetail.schedule.timezone}
                  options={TIMEZONES.map((tz) => ({ label: tz, value: tz }))}
                  value={timezone}
                  onChange={setTimezone}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <SectionTitle icon={FlagIcon} color="#7C3AED">{t.campaignDetail.otherSettings.sectionTitle}</SectionTitle>
                <TextField
                  label={t.campaignDetail.otherSettings.campaignTitle}
                  value={title}
                  onChange={setTitle}
                  placeholder={t.campaignDetail.otherSettings.campaignTitlePlaceholder}
                  helpText={t.campaignDetail.otherSettings.campaignTitleHelp}
                  autoComplete="off"
                />
                <TextField
                  label={t.campaignDetail.otherSettings.campaignSubtitle}
                  value={subtitle}
                  onChange={setSubtitle}
                  placeholder={t.campaignDetail.otherSettings.campaignSubtitlePlaceholder}
                  helpText={t.campaignDetail.otherSettings.campaignSubtitleHelp}
                  autoComplete="off"
                />
                <TextField
                  label={t.campaignDetail.otherSettings.priority}
                  type="number"
                  value={priority}
                  onChange={setPriority}
                  placeholder="10"
                  helpText={t.campaignDetail.otherSettings.priorityHelp}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            <Card>
              <Select
                label={t.campaignDetail.status.label}
                options={[
                  { label: t.campaignDetail.status.active, value: "ACTIVE" },
                  { label: t.campaignDetail.status.draft, value: "DRAFT" },
                  { label: t.campaignDetail.status.paused, value: "PAUSED" },
                ]}
                value={status}
                onChange={setStatus}
              />
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Sidebar — Customize widget gated by plan */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <SectionTitle icon={PaintBrushFlatIcon} color="#4F46E5">{t.campaignDetail.appearance.sectionTitle}</SectionTitle>
              <Text as="p" tone="subdued">
                {t.campaignDetail.appearance.description}
              </Text>

              {plan === "free" ? (
                <Button url="/app/billing" variant="plain" icon={LockIcon}>
                  {t.campaignDetail.appearance.upgradeCta}
                </Button>
              ) : (
                // Basic or Advanced: full access
                <Button url="/app/customize">{t.campaignDetail.appearance.customizeCta}</Button>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <Box paddingBlockStart="400" paddingBlockEnd="800">
        <InlineStack align="end">
          <Button variant="primary" onClick={handleSave}>{t.common.save}</Button>
        </InlineStack>
      </Box>
    </Page>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon, color, children }: { icon: any; color: string; children: ReactNode }) {
  return (
    <InlineStack gap="300" blockAlign="center">
      <div style={{
        width: "28px", height: "28px", borderRadius: "7px",
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, color: "#fff",
      }}>
        <Icon source={icon} tone="inherit" />
      </div>
      <Text as="h3" variant="headingSm">{children}</Text>
    </InlineStack>
  );
}

function ResourceList({
  items, onAdd, onRemove, addLabel, removeLabel,
}: {
  items: PickedResource[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <BlockStack gap="200">
      <InlineStack>
        <Button onClick={onAdd}>{addLabel}</Button>
      </InlineStack>
      {items.map((p) => (
        <Box key={p.id} padding="300" background="bg-surface-secondary" borderRadius="200">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300" blockAlign="center">
              {p.image && <Thumbnail source={p.image} alt={p.title} size="small" />}
              <Text as="span">{p.title}</Text>
            </InlineStack>
            <Button
              icon={DeleteIcon}
              variant="tertiary"
              onClick={() => onRemove(p.id)}
              accessibilityLabel={removeLabel}
            />
          </InlineStack>
        </Box>
      ))}
    </BlockStack>
  );
}

function TierEditor({ tiers, onChange, t }: { tiers: Tier[]; onChange: (t: Tier[]) => void; t: Dictionary }) {
  const update = (i: number, patch: Partial<Tier>) => {
    const next = [...tiers];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () =>
    onChange([...tiers, { minItems: tiers.length + 2, valueType: "PERCENTAGE", value: 10 }]);
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  return (
    <BlockStack gap="300">
      <Text as="p" tone="subdued">{t.campaignDetail.tiers.helperText}</Text>
      {tiers.map((tier, i) => (
        <Box key={i} padding="300" background="bg-surface-secondary" borderRadius="200">
          <InlineStack gap="200" align="space-between" blockAlign="end">
            <InlineStack gap="200">
              <Box minWidth="110px">
                <TextField
                  label={t.campaignDetail.tiers.minItems}
                  type="number"
                  value={String(tier.minItems)}
                  onChange={(v) => update(i, { minItems: Number(v) })}
                  autoComplete="off"
                  min={1}
                />
              </Box>
              <Box minWidth="140px">
                <Select
                  label={t.campaignDetail.tiers.typeLabel}
                  options={[
                    { label: t.campaignDetail.tiers.percentage, value: "PERCENTAGE" },
                    { label: t.campaignDetail.tiers.fixedAmount, value: "FIXED" },
                  ]}
                  value={tier.valueType}
                  onChange={(v) => update(i, { valueType: v as any })}
                />
              </Box>
              <Box minWidth="110px">
                <TextField
                  label={tier.valueType === "PERCENTAGE" ? t.campaignDetail.tiers.percentOff : t.campaignDetail.tiers.amount}
                  type="number"
                  value={String(tier.value)}
                  onChange={(v) => update(i, { value: Number(v) })}
                  autoComplete="off"
                />
              </Box>
            </InlineStack>
            <Button
              icon={DeleteIcon}
              variant="tertiary"
              onClick={() => remove(i)}
              accessibilityLabel={t.campaignDetail.tiers.removeTier}
            />
          </InlineStack>
        </Box>
      ))}
      <InlineStack>
        <Button onClick={add}>{t.campaignDetail.tiers.addTier}</Button>
      </InlineStack>
    </BlockStack>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function dedupe(arr: PickedResource[]): PickedResource[] {
  const seen = new Set<string>();
  return arr.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function tzParts(d: Date, timezone: string): Record<string, string> {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d).forEach((p) => { parts[p.type] = p.value; });
  return parts;
}

function toDateInput(d: Date | string, timezone?: string) {
  const dt = new Date(d);
  if (!timezone) return dt.toISOString().slice(0, 10);
  const p = tzParts(dt, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}

function toTimeInput(d: Date | string, timezone?: string) {
  const dt = new Date(d);
  if (!timezone) return dt.toISOString().slice(11, 16);
  const p = tzParts(dt, timezone);
  return `${p.hour}:${p.minute}`;
}

function combineDateTime(date: string, time: string, timezone: string): string | null {
  if (!date) return null;
  // Parse the local date/time in the given IANA timezone → UTC
  const probe = new Date(`${date}T${time || "00:00"}:00Z`);
  const p = tzParts(probe, timezone);
  const localInTZ = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  const offsetMs = localInTZ.getTime() - probe.getTime();
  return new Date(probe.getTime() - offsetMs).toISOString();
}
