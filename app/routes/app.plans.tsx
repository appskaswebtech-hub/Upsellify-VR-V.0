import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Box } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useTranslation } from "../i18n/LanguageContext";
import type { Dictionary } from "../i18n";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopPlan = await db.shopPlan.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop, plan: "free", status: "active" },
  });
  return { currentPlan: shopPlan.status === "active" ? shopPlan.plan : "free" };
}

function buildPlans(t: Dictionary) {
  return [
    {
      name: t.plans.free.name,
      price: "$0",
      tagline: t.plans.free.tagline,
      description: t.plans.free.description,
      features: [
        { text: t.plans.free.features[0], highlight: false },
        { text: t.plans.free.features[1], highlight: false },
        { text: t.plans.free.features[2], highlight: false },
        { text: t.plans.free.features[3], highlight: false },
        { text: t.plans.free.features[4], highlight: false },
      ],
      planKey: "free",
      recommended: false,
      trialText: "",
    },
    {
      name: t.plans.basic.name,
      price: "$9.99",
      tagline: t.plans.basic.tagline,
      description: t.plans.basic.description,
      features: [
        { text: t.plans.basic.features[0], highlight: false },
        { text: t.plans.basic.features[1], highlight: false },
        { text: t.plans.basic.features[2], highlight: false },
        { text: t.plans.basic.features[3], highlight: false },
        { text: t.plans.basic.features[4], highlight: false },
      ],
      planKey: "basic",
      recommended: false,
      trialText: t.plans.basic.trialText,
    },
    {
      name: t.plans.advanced.name,
      price: "$17.99",
      tagline: t.plans.advanced.tagline,
      description: t.plans.advanced.description,
      features: [
        { text: t.plans.advanced.features[0], highlight: true },
        { text: t.plans.advanced.features[1], highlight: true },
        { text: t.plans.advanced.features[2], highlight: false },
        { text: t.plans.advanced.features[3], highlight: true },
        { text: t.plans.advanced.features[4], highlight: false },
      ],
      planKey: "advanced",
      recommended: true,
      trialText: t.plans.advanced.trialText,
    },
  ];
}

export default function PlansPage() {
  const { currentPlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const PLANS = buildPlans(t);

  const handleSelectPlan = (planKey: string) => {
    const params = new URLSearchParams(window.location.search);
    navigate(`/app/billing?plan=${planKey}&host=${params.get("host")}&shop=${params.get("shop")}`);
  };

  return (
    <Page>
      <TitleBar title={t.plans.title} />

      {/* Hero */}
      <Box paddingBlockEnd="600">
        <div style={{ textAlign: "center", padding: "32px 0 16px" }}>
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
      </Box>

      {/* Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "20px",
        maxWidth: "1080px",
        margin: "0 auto 48px",
      }}>
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.planKey;
          const isDark = plan.recommended;

          return (
            <div
              key={plan.planKey}
              style={{
                position: "relative",
                borderRadius: "20px",
                overflow: "hidden",
                ...(isDark
                  ? {
                      background: "linear-gradient(145deg, #1a1f6e 0%, #2a3bc8 60%, #4f6af0 100%)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 8px 40px rgba(45,63,212,0.35)",
                    }
                  : {
                      background: "linear-gradient(145deg, #ffffff, #f4f6fd)",
                      border: "1.5px solid #e2e6f3",
                      boxShadow: "0 4px 24px rgba(79,106,240,0.06)",
                    }),
              }}
            >
              {plan.recommended && (
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

              <div style={{ padding: "32px 28px 28px" }}>
                {/* Icon */}
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "20px",
                  background: isDark ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #eef1fd, #dde3fb)",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.3L10 14.5l-5 2.5 1-5.3L2 7.8l5.6-.8L10 2z"
                      fill={isDark ? "#ffffff" : "#4f6af0"} />
                  </svg>
                </div>

                <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px", color: isDark ? "#ffffff" : "#0d1117" }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 600, margin: "0 0 20px", color: isDark ? "rgba(255,255,255,0.65)" : "#4f6af0" }}>
                  {plan.tagline}
                </div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "42px", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: isDark ? "#ffffff" : "#0d1117" }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 500, paddingBottom: "7px", color: isDark ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>
                    {t.plans.perMonth}
                  </span>
                </div>

                {/* Trial badge */}
                <div style={{ marginBottom: "20px", minHeight: plan.trialText ? undefined : "0" }}>
                  {plan.trialText && (
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
                      {plan.trialText} {t.plans.trialSuffix}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "13.5px", lineHeight: 1.6, margin: "0 0 20px", color: isDark ? "rgba(255,255,255,0.7)" : "#6b7280" }}>
                  {plan.description}
                </p>

                <div style={{ height: "1px", margin: "0 0 20px", background: isDark ? "linear-gradient(90deg, rgba(255,255,255,0.15), transparent)" : "linear-gradient(90deg, #e5e7eb, transparent)" }} />

                {/* Features */}
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                  {t.plans.whatsIncluded}
                </div>
                <div style={{ marginBottom: "24px" }}>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDark ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #eef1fd, #dde3fb)",
                      }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke={isDark ? "#4ade80" : "#4f6af0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{
                        fontSize: "13.5px",
                        fontWeight: feature.highlight ? 700 : 500,
                        color: isDark
                          ? feature.highlight ? "#ffffff" : "rgba(255,255,255,0.85)"
                          : feature.highlight ? "#1a1f6e" : "#374151",
                      }}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isActive ? (
                  <button disabled style={{
                    width: "100%", padding: "13px 24px", borderRadius: "12px",
                    fontSize: "14.5px", fontWeight: 700, cursor: "not-allowed",
                    ...(isDark
                      ? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", border: "1.5px solid rgba(255,255,255,0.2)" }
                      : { background: "#f9fafb", color: "#9ca3af", border: "1.5px solid #e5e7eb" }),
                  }}>
                    {t.plans.activePlanCta}
                  </button>
                ) : plan.planKey === "free" ? (
                  <button
                    onClick={() => navigate("/app/billing")}
                    style={{
                      width: "100%", padding: "13px 24px", borderRadius: "12px",
                      fontSize: "14.5px", fontWeight: 700, cursor: "pointer",
                      transition: "all 0.2s ease",
                      ...(isDark
                        ? { background: "rgba(255,255,255,0.1)", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.3)" }
                        : { background: "#fff", color: "#1a1f6e", border: "1.5px solid #c5cdf8" }),
                    }}
                  >
                    {t.plans.manageCta}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan.planKey)}
                    style={{
                      width: "100%", padding: "13px 24px", borderRadius: "12px",
                      fontSize: "14.5px", fontWeight: 700, border: "none", cursor: "pointer",
                      transition: "all 0.2s ease",
                      ...(isDark
                        ? { background: "#ffffff", color: "#1a2fb8", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }
                        : { background: "linear-gradient(135deg, #2d3fd4, #4f6af0)", color: "#ffffff", boxShadow: "0 4px 16px rgba(79,106,240,0.35)" }),
                    }}
                  >
                    {t.plans.startTrialCta}
                  </button>
                )}

                <p style={{ textAlign: "center", margin: "10px 0 0", fontSize: "11.5px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.45)" : "#9ca3af" }}>
                  {t.plans.noCreditCard}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer trust row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap", paddingBottom: "40px" }}>
        {t.plans.trustRow.map((text, i, arr) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "12.5px", color: "#6b7280", fontWeight: 500 }}>{text}</span>
            {i < arr.length - 1 && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#d1d5db" }} />}
          </div>
        ))}
      </div>
    </Page>
  );
}
