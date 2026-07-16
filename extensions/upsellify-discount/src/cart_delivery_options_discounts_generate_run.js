import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

/**
  * @typedef {import("../generated/api").DeliveryInput} RunInput
  * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
  */

const FREE_DELIVERY_MESSAGES = {
  en: "FREE DELIVERY",
  de: "KOSTENLOSER VERSAND",
  es: "ENVÍO GRATIS",
  fr: "LIVRAISON GRATUITE",
  it: "SPEDIZIONE GRATUITA",
};

export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return {operations: []};
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );

  if (!hasShippingDiscountClass) {
    return {operations: []};
  }

  const language = (input.localization?.language?.isoCode || "en").toLowerCase();
  const message = FREE_DELIVERY_MESSAGES[language] || FREE_DELIVERY_MESSAGES.en;

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message,
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 100,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}