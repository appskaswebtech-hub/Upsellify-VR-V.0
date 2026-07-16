import { InlineStack, Select, Spinner } from "@shopify/polaris";
import { useTranslation } from "../i18n/LanguageContext";
import { SUPPORTED_LOCALES, type Locale } from "../i18n";

export function LanguageSwitcher() {
  const { locale, t, setLocale, isChangingLocale } = useTranslation();

  const options = SUPPORTED_LOCALES.map((code) => ({
    label: t.common.languageNames[code],
    value: code,
  }));

  return (
    <InlineStack gap="200" blockAlign="center">
      <div style={{ width: 180 }}>
        <Select
          label={t.common.language}
          labelHidden
          options={options}
          value={locale}
          onChange={(value) => setLocale(value as Locale)}
          disabled={isChangingLocale}
        />
      </div>
      {isChangingLocale && <Spinner size="small" accessibilityLabel={t.common.loading} />}
    </InlineStack>
  );
}
