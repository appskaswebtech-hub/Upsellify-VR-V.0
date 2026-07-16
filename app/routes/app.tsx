import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import type { AppProviderProps } from "@shopify/polaris";
import polarisEn from "@shopify/polaris/locales/en.json";
import polarisDe from "@shopify/polaris/locales/de.json";
import polarisEs from "@shopify/polaris/locales/es.json";
import polarisFr from "@shopify/polaris/locales/fr.json";
import polarisIt from "@shopify/polaris/locales/it.json";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
  isSupportedLocale,
  type Locale,
} from "../i18n";
import { LanguageProvider, useTranslation } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

const polarisTranslations: Record<Locale, AppProviderProps["i18n"]> = {
  en: polarisEn,
  de: polarisDe,
  es: polarisEs,
  fr: polarisFr,
  it: polarisIt,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });

  const locale: Locale = shop.localeIsAuto
    ? detectLocaleFromAcceptLanguage(request.headers.get("accept-language"))
    : isSupportedLocale(shop.locale)
      ? shop.locale
      : DEFAULT_LOCALE;

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    locale,
    isAuto: shop.localeIsAuto,
  };
};

function AppNav() {
  const { t } = useTranslation();

  return (
    <>
      <NavMenu>
        <Link to="/app" rel="home">{t.nav.dashboard}</Link>
        <Link to="/app/campaigns">{t.nav.campaigns}</Link>
        <Link to="/app/customize">{t.nav.customize}</Link>
        <Link to="/app/billing">{t.nav.plans}</Link>
      </NavMenu>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
        <LanguageSwitcher />
      </div>
    </>
  );
}

export default function App() {
  const { apiKey, locale, isAuto } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={polarisTranslations[locale]}>
      <LanguageProvider detectedLocale={locale} isAuto={isAuto}>
        <AppNav />
        <Outlet />
      </LanguageProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
