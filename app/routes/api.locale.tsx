import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { isSupportedLocale } from "../i18n";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "");

  if (locale === "auto") {
    await db.shop.update({
      where: { shop: session.shop },
      data: { localeIsAuto: true },
    });
    return { ok: true };
  }

  if (!isSupportedLocale(locale)) {
    return { ok: false, error: "Unsupported locale" };
  }

  await db.shop.update({
    where: { shop: session.shop },
    data: { locale, localeIsAuto: false },
  });

  return { ok: true };
};
