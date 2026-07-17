// app/routes/app.billing.tsx
// Three plans: Free, Basic ($9.99/mo, 7-day trial), Advanced ($17.99/mo)

import { useEffect } from "react";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import type { PlanKey } from "../billing.server";
import {
  getShopPlan,
  createSubscription,
  cancelSubscription,
  syncSubscriptionStatus,
  isDevStore,
} from "../billing.server";
import { useTranslation } from "../i18n/LanguageContext";
import type { Dictionary } from "../i18n";

/* ── Required by React Router v7 in production ── */
export function headers() {
  return {};
}

export function ErrorBoundary() {
  const { t } = useTranslation();
  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#dc2626" }}>
        {t.billing.errorBoundary}
      </div>
    </div>
  );
}

/* ── Action response type ── */
type ActionData =
  | { confirmationUrl: string; error?: never }
  | { error: string; confirmationUrl?: never }
  | null;

/* ── Loader ── */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await getShopPlan(session.shop);

  const dev = await isDevStore(admin);

  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  if (chargeId) {
    await syncSubscriptionStatus(admin, session.shop);
  }

  const activePlan = await syncSubscriptionStatus(admin, session.shop);
  return { plan: activePlan, isDevStore: dev };
};

/* ── Action ── */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const planName = formData.get("planName") as Exclude<PlanKey, "free">;

  console.log("[billing action] actionType:", actionType, "planName:", planName);

  if (actionType === "subscribe") {
    const appUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "");
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!appUrl) {
      return { error: "SHOPIFY_APP_URL is not set in .env" };
    }
    if (!apiKey) {
      return { error: "SHOPIFY_API_KEY is not set in .env" };
    }

    const storeName = session.shop.replace(".myshopify.com", "");
    const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${apiKey}/app/billing`;

    console.log("[billing] planName:", planName, "returnUrl:", returnUrl);

    try {
      const { confirmationUrl, subscriptionId } = await createSubscription(
        admin,
        session.shop,
        returnUrl,
        planName,
      );

      console.log("[billing] confirmationUrl:", confirmationUrl);

      await db.shopPlan.upsert({
        where: { shop: session.shop },
        update: { subscriptionId, status: "active" },
        create: {
          shop: session.shop,
          plan: planName,
          subscriptionId,
          status: "active",
        },
      });

      return { confirmationUrl };
    } catch (err) {
      console.error("[billing] createSubscription failed:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create subscription. Please try again.",
      };
    }
  }

  if (actionType === "cancel") {
    try {
      const shopPlan = await db.shopPlan.findUnique({
        where: { shop: session.shop },
      });
      if (shopPlan?.subscriptionId) {
        await cancelSubscription(admin, shopPlan.subscriptionId);
      }
      await db.shopPlan.update({
        where: { shop: session.shop },
        data: { plan: "free", subscriptionId: null, status: "active" },
      });
      return redirect("/app/billing");
    } catch (err) {
      console.error("[billing] cancelSubscription failed:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to cancel subscription. Please try again.",
      };
    }
  }

  return { error: "Unknown action type." };
};

/* ── Plan definitions ── */
interface PlanDefinition {
  key: Exclude<PlanKey, "free">;
  name: string;
  tagline: string;
  description: string;
  price: number;
  trial: number | null;
  features: string[];
  recommended: boolean;
}

function buildPlans(t: Dictionary): PlanDefinition[] {
  return [
    {
      key: "basic",
      name: t.plans.basic.name,
      tagline: t.plans.basic.tagline,
      description: t.plans.basic.description,
      price: 9.99,
      trial: 7,
      features: t.billing.basicFeatures,
      recommended: false,
    },
    {
      key: "advanced",
      name: t.plans.advanced.name,
      tagline: t.plans.advanced.tagline,
      description: t.plans.advanced.description,
      price: 17.99,
      trial: null,
      features: t.billing.advancedFeatures,
      recommended: true,
    },
  ];
}

/* ── Page ── */
export default function BillingPage() {
  const { plan, isDevStore: devStore } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || fetcher.state !== "idle";
  const { t } = useTranslation();
  const PLANS = buildPlans(t);

  const currentPlan: PlanKey = plan ?? "free";

  // Redirect to Shopify's confirmation page when we get a confirmationUrl back.
  // Must be in useEffect, NOT during render.
  useEffect(() => {
    if (fetcher.data && "confirmationUrl" in fetcher.data && fetcher.data.confirmationUrl) {
      // Break out of the embedded iframe to Shopify admin
      if (window.top) {
        window.top.location.href = fetcher.data.confirmationUrl;
      } else {
        window.location.href = fetcher.data.confirmationUrl;
      }
    }
  }, [fetcher.data]);

  const handleSubscribe = (planKey: Exclude<PlanKey, "free">) => {
    const fd = new FormData();
    fd.append("actionType", "subscribe");
    fd.append("planName", planKey);
    fetcher.submit(fd, { method: "post" });
  };

  const handleCancel = () => {
    if (!confirm(t.billing.cancelConfirm)) return;
    const fd = new FormData();
    fd.append("actionType", "cancel");
    fetcher.submit(fd, { method: "post" });
  };

  const errorMessage =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        background: "#f5f5f0",
        minHeight: "100vh",
        padding: "48px 28px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "0 0 32px" }}>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #eef1fd, #dde3fb)",
            border: "1px solid #c5cdf8", color: "#3a50d0",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", padding: "5px 14px",
            borderRadius: "100px", marginBottom: "16px",
          }}>
            {t.plans.hero.badge}
          </div>
          <h1 style={{
            fontSize: "30px", fontWeight: 800, color: "#0d1117",
            lineHeight: 1.15, margin: "0 0 12px", letterSpacing: "-0.03em",
          }}>
            {t.plans.hero.title}
          </h1>
          <p style={{
            fontSize: "15px", color: "#6b7280", maxWidth: "420px",
            margin: "0 auto", lineHeight: 1.6,
          }}>
            {t.plans.hero.subtitle}
          </p>
        </div>

        {devStore && (
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: "#1e40af",
              fontWeight: 600,
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {t.billing.devStoreBanner.prefix} <strong>{t.billing.devStoreBanner.bold}</strong> {t.billing.devStoreBanner.suffix}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: "#991b1b",
              fontWeight: 600,
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {currentPlan !== "free" && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 24,
              fontSize: 13,
              color: "#065f46",
              fontWeight: 600,
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {t.billing.currentPlanBanner.prefix}{" "}
            <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong> {t.billing.currentPlanBanner.suffix}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}>
          <PlanCard
            name={t.plans.free.name}
            tagline={t.plans.free.tagline}
            description={t.plans.free.description}
            price={0}
            trial={null}
            features={t.plans.free.features}
            recommended={false}
            badge={null}
            action={
              currentPlan === "free"
                ? { label: t.plans.activePlanCta, onClick: () => {}, variant: "outline" }
                : { label: t.billing.downgradeCta, onClick: handleCancel, variant: "outline" }
            }
            isLoading={isLoading}
            isDisabled={currentPlan === "free"}
            muted
            t={t}
          />
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.key;

            const action: PlanCardAction = isCurrent
              ? { label: t.billing.cancelPlanCta, onClick: handleCancel, variant: "outline" }
              : {
                  label: p.key === "advanced" ? t.billing.upgradeAdvancedCta : t.billing.switchBasicCta,
                  onClick: () => handleSubscribe(p.key),
                  variant: "primary",
                };

            const badge = devStore ? t.billing.testChargeBadge : null;

            return (
              <PlanCard
                key={p.key}
                name={p.name}
                tagline={p.tagline}
                description={p.description}
                price={p.price}
                trial={p.trial}
                features={p.features}
                recommended={p.recommended}
                badge={badge}
                action={action}
                isLoading={isLoading}
                t={t}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap", paddingBottom: "8px" }}>
          {t.plans.trustRow.map((text, i, arr) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "12.5px", color: "#6b7280", fontWeight: 500 }}>{text}</span>
              {i < arr.length - 1 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#d1d5db" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Plan Card ── */
interface PlanCardAction {
  label: string;
  onClick: () => void;
  variant: "primary" | "outline";
}

interface PlanCardProps {
  name: string;
  tagline: string;
  description: string;
  price: number;
  trial: number | null;
  features: string[];
  recommended: boolean;
  badge: string | null;
  action: PlanCardAction;
  isLoading: boolean;
  isDisabled?: boolean;
  muted?: boolean;
  t: Dictionary;
}

function PlanCard({
  name,
  tagline,
  description,
  price,
  trial,
  features,
  recommended,
  badge,
  action,
  isLoading,
  isDisabled = false,
  muted = false,
  t,
}: PlanCardProps) {
  const isDark = recommended && !muted;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...(isDark
          ? {
              background: "linear-gradient(145deg, #1a1f6e 0%, #2a3bc8 60%, #4f6af0 100%)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 40px rgba(45,63,212,0.35)",
            }
          : muted
            ? {
                background: "#f9fafb",
                border: "1.5px solid #e5e7eb",
                boxShadow: "0 1px 4px rgba(0,0,0,.04)",
              }
            : {
                background: "linear-gradient(145deg, #ffffff, #f4f6fd)",
                border: "1.5px solid #e2e6f3",
                boxShadow: "0 4px 24px rgba(79,106,240,0.06)",
              }),
      }}
    >
      {recommended && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          color: "#1a0a00", fontSize: "10.5px", fontWeight: 800,
          letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "6px 20px 6px 14px", borderRadius: "0 20px 0 20px",
        }}>
          {t.plans.mostPopular}
        </div>
      )}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            background: "#1d4ed8",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 20,
            padding: "3px 12px",
            letterSpacing: ".04em",
          }}
        >
          {badge}
        </span>
      )}

      <div style={{ padding: "32px 28px 28px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Icon */}
        <div style={{
          width: "44px", height: "44px", borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
          background: isDark ? "rgba(255,255,255,0.15)" : muted ? "#eceef1" : "linear-gradient(135deg, #eef1fd, #dde3fb)",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.3L10 14.5l-5 2.5 1-5.3L2 7.8l5.6-.8L10 2z"
              fill={isDark ? "#ffffff" : muted ? "#9ca3af" : "#4f6af0"} />
          </svg>
        </div>

        <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px", color: isDark ? "#ffffff" : muted ? "#374151" : "#0d1117" }}>
          {name}
        </div>
        <div style={{ fontSize: "12.5px", fontWeight: 600, margin: "0 0 20px", color: isDark ? "rgba(255,255,255,0.65)" : muted ? "#9ca3af" : "#4f6af0" }}>
          {tagline}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "8px" }}>
          <span style={{ fontSize: "42px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: isDark ? "#ffffff" : muted ? "#4b5563" : "#0d1117" }}>
            ${price.toFixed(2)}
          </span>
          <span style={{ fontSize: "14px", fontWeight: 500, paddingBottom: "7px", color: isDark ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>
            {t.billing.perMonth}
          </span>
        </div>

        {/* Trial badge */}
        <div style={{ marginBottom: "20px", minHeight: trial ? undefined : "0" }}>
          {trial ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px",
              ...(isDark
                ? { color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }
                : { color: "#22c55e", background: "#f0fdf4", border: "1px solid #bbf7d0" }),
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2.5L8 2.5" stroke={isDark ? "#4ade80" : "#22c55e"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.billing.trialText(trial)}
            </span>
          ) : null}
        </div>

        <p style={{ fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 20px", color: isDark ? "rgba(255,255,255,0.7)" : muted ? "#9ca3af" : "#6b7280" }}>
          {description}
        </p>

        <div style={{ height: "1px", margin: "0 0 20px", background: isDark ? "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)" : "linear-gradient(90deg, #e5e7eb, transparent)" }} />

        {/* Features */}
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
          {t.plans.whatsIncluded}
        </div>
        <div style={{ marginBottom: "24px", flex: 1 }}>
          {features.map((feature, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDark ? "rgba(255,255,255,0.15)" : muted ? "#eceef1" : "linear-gradient(135deg, #eef1fd, #dde3fb)",
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke={isDark ? "#4ade80" : muted ? "#9ca3af" : "#4f6af0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{
                fontSize: "13.5px",
                fontWeight: 500,
                color: isDark ? "rgba(255,255,255,0.85)" : muted ? "#6b7280" : "#374151",
              }}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={action.onClick}
          disabled={isLoading || isDisabled}
          style={{
            width: "100%", padding: "13px 24px", borderRadius: "12px",
            fontSize: "14.5px", fontWeight: 700, cursor: isLoading ? "wait" : isDisabled ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: isLoading || isDisabled ? 0.6 : 1,
            ...(muted
              ? { background: "#fff", color: "#6b7280", border: "1.5px solid #d1d5db" }
              : isDark
                ? action.variant === "primary"
                  ? { background: "#ffffff", color: "#1a2fb8", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }
                  : { background: "rgba(255,255,255,0.1)", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.3)" }
                : action.variant === "primary"
                  ? { background: "linear-gradient(135deg, #2d3fd4, #4f6af0)", color: "#ffffff", border: "none", boxShadow: "0 4px 16px rgba(79,106,240,0.35)" }
                  : { background: "#fff", color: "#1a1f6e", border: "1.5px solid #c5cdf8" }),
          }}
        >
          {isLoading ? t.billing.pleaseWait : action.label}
        </button>

        <p style={{ textAlign: "center", margin: "10px 0 0", fontSize: "11.5px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.45)" : "#9ca3af" }}>
          {t.plans.noCreditCard}
        </p>
      </div>
    </div>
  );
}
