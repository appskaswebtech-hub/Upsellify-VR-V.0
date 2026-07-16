// import { Link } from "@remix-run/react";
// import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Box } from "@shopify/polaris";
// import { TitleBar } from "@shopify/app-bridge-react";
// import type { LoaderFunctionArgs } from "@remix-run/node";
// import { authenticate } from "../shopify.server";

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   await authenticate.admin(request);
//   return null;
// };

// const TYPES = [
//   { key: "FBT_LIST", title: "Frequently bought together (List)", description: "A pre-selected bundle in list format.", available: true, preview: "list" },
//    { key: "FBT_AMAZON", title: "Frequently bought together (Amazon)", description: "A horizontal bundle in Amazon style.", available: true, preview: "amazon" },
//    { key: "FBT_CLASSIC", title: "Frequently bought together (Classic)", description: "A grid layout with horizontal product row.", available: true, preview: "classic" },
// ] as const;

// export default function NewCampaign() {
//   return (
//     <Page backAction={{ content: "Campaigns", url: "/app/campaigns" }}>
//       <TitleBar title="Create campaign" />
//       <Layout>
//         <Layout.Section>
//           <Text as="h2" variant="headingMd">Product page</Text>
//           <Box paddingBlockStart="400">
//             <InlineStack gap="400" wrap>
//               {TYPES.map((t) => (
//                 <Box key={t.key} width="320px">
//                   <Card>
//                     <BlockStack gap="300">
//                       <Box
//                         background="bg-surface-secondary"
//                         padding="400"
//                         borderRadius="200"
//                         minHeight="180px"
//                       >
//                         <PreviewMockup variant={t.preview} />
//                       </Box>
//                       <Text as="h3" variant="headingSm">{t.title}</Text>
//                       <Text as="p" tone="subdued">{t.description}</Text>
//                       <InlineStack align="end">
//                         <Button
//                           url={`/app/campaigns/new/${t.key}`}
//                           disabled={!t.available}
//                           variant="primary"
//                         >
//                           Create
//                         </Button>
//                       </InlineStack>
//                     </BlockStack>
//                   </Card>
//                 </Box>
//               ))}
//             </InlineStack>
//           </Box>
//         </Layout.Section>
//       </Layout>
//     </Page>
//   );
// }

// function PreviewMockup({ variant }: { variant: "list" | "amazon" | "classic" }) {
//   if (variant === "list") return <ListMockup />;
//   if (variant === "amazon") return <AmazonMockup />;
//   return <ClassicMockup />;
// }

// /* ---------------- List layout (trigger on top, offers below, vertical) ---------------- */
// function ListMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       {/* Trigger row */}
//       <rect x="10" y="10" width="260" height="38" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={20} y={19} />
//       <rect x="70" y="26" width="140" height="6" rx="3" fill="#d9d9d9" />

//       {/* Plus divider */}
//       <circle cx="140" cy="62" r="7" fill="#fff" stroke="#b5b5b5" />
//       <line x1="136" y1="62" x2="144" y2="62" stroke="#8a8a8a" strokeWidth="1.2" />
//       <line x1="140" y1="58" x2="140" y2="66" stroke="#8a8a8a" strokeWidth="1.2" />

//       {/* Offers group */}
//       <rect x="10" y="76" width="260" height="68" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={20} y={84} />
//       <rect x="70" y="96" width="130" height="6" rx="3" fill="#d9d9d9" />
//       <Checkbox x={244} y={92} />

//       <line x1="20" y1="115" x2="260" y2="115" stroke="#ececec" />

//       <SneakerIcon x={20} y={120} />
//       <rect x="70" y="128" width="130" height="6" rx="3" fill="#d9d9d9" />
//       <Checkbox x={244} y={124} />

//       {/* CTA */}
//       <rect x="10" y="154" width="260" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="140"
//         y="166"
//         textAnchor="middle"
//         fontSize="8"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>
//     </svg>
//   );
// }

// /* ---------------- Amazon layout (horizontal row of products) ---------------- */
// function AmazonMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       <rect x="40" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={50} y={40} scale={0.75} />

//       <PlusDot cx={105} cy={55} />

//       <rect x="120" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={130} y={40} scale={0.75} />
//       <CheckboxSmall x={158} y={33} />

//       <PlusDot cx={185} cy={55} />

//       <rect x="200" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <SneakerIcon x={210} y={44} scale={0.7} />
//       <CheckboxSmall x={238} y={33} />

//       {/* CTA */}
//       <rect x="40" y="110" width="210" height="22" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="145"
//         y="124"
//         textAnchor="middle"
//         fontSize="8"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>

//       {/* Small price rows */}
//       <rect x="40" y="144" width="80" height="4" rx="2" fill="#d9d9d9" />
//       <rect x="40" y="154" width="60" height="4" rx="2" fill="#ececec" />
//     </svg>
//   );
// }

// /* ---------------- Classic layout (horizontal products + vertical checklist below) ---------------- */
// function ClassicMockup() {
//   return (
//     <svg
//       viewBox="0 0 280 180"
//       xmlns="http://www.w3.org/2000/svg"
//       width="100%"
//       style={{ display: "block" }}
//     >
//       <rect x="40" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <TShirtIcon x={48} y={20} scale={0.65} />

//       <PlusDot cx={95} cy={33} />

//       <rect x="108" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <ShortsIcon x={116} y={20} scale={0.65} />

//       <PlusDot cx={163} cy={33} />

//       <rect x="176" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
//       <SneakerIcon x={184} y={22} scale={0.6} />

//       {/* CTA */}
//       <rect x="40" y="68" width="180" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
//       <text
//         x="130"
//         y="80"
//         textAnchor="middle"
//         fontSize="7"
//         fill="#6b6b6b"
//         fontFamily="-apple-system, system-ui, sans-serif"
//       >
//         Add bundle to cart
//       </text>

//       {/* Check rows */}
//       <CheckboxSmall x={40} y={98} />
//       <rect x="56" y="101" width="160" height="4" rx="2" fill="#d9d9d9" />

//       <CheckboxSmall x={40} y={118} />
//       <rect x="56" y="121" width="160" height="4" rx="2" fill="#d9d9d9" />

//       <CheckboxSmall x={40} y={138} />
//       <rect x="56" y="141" width="130" height="4" rx="2" fill="#ececec" />
//     </svg>
//   );
// }

// /* ---------------- Icon primitives ---------------- */
// function TShirtIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M6 4 L12 1 L14 3 L18 3 L20 1 L26 4 L30 8 L26 11 L24 9 L24 22 L8 22 L8 9 L6 11 L2 8 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M13 3 Q16 5 19 3"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.1"
//       />
//     </g>
//   );
// }

// function ShortsIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M4 2 L28 2 L26 22 L18 22 L16 10 L14 22 L6 22 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <line x1="4" y1="5" x2="28" y2="5" stroke="#8a8a8a" strokeWidth="1" />
//     </g>
//   );
// }

// function SneakerIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
//   return (
//     <g transform={`translate(${x}, ${y}) scale(${scale})`}>
//       <path
//         d="M2 16 L2 10 Q4 6 10 6 L14 10 L20 11 L26 14 L30 16 L30 19 Q30 21 28 21 L4 21 Q2 21 2 19 Z"
//         fill="none"
//         stroke="#8a8a8a"
//         strokeWidth="1.3"
//         strokeLinejoin="round"
//       />
//       <line x1="10" y1="7" x2="12" y2="10" stroke="#8a8a8a" strokeWidth="1" />
//       <line x1="14" y1="8" x2="15" y2="11" stroke="#8a8a8a" strokeWidth="1" />
//       <line x1="18" y1="10" x2="18" y2="13" stroke="#8a8a8a" strokeWidth="1" />
//     </g>
//   );
// }

// function Checkbox({ x, y }: { x: number; y: number }) {
//   return (
//     <g transform={`translate(${x}, ${y})`}>
//       <rect width="14" height="14" rx="3" fill="#4a4a4a" />
//       <path d="M3.5 7 L6 9.5 L10.5 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//     </g>
//   );
// }

// function CheckboxSmall({ x, y }: { x: number; y: number }) {
//   return (
//     <g transform={`translate(${x}, ${y})`}>
//       <rect width="11" height="11" rx="2" fill="#4a4a4a" />
//       <path d="M2.5 5.5 L4.5 7.5 L8.5 3.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//     </g>
//   );
// }

// function PlusDot({ cx, cy }: { cx: number; cy: number }) {
//   return (
//     <g>
//       <circle cx={cx} cy={cy} r="6" fill="#fff" stroke="#b5b5b5" />
//       <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#8a8a8a" strokeWidth="1.2" />
//       <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#8a8a8a" strokeWidth="1.2" />
//     </g>
//   );
// }


import { Page, Layout, Card, BlockStack, Text, Button, InlineStack, Box, Badge, Icon } from "@shopify/polaris";
import {
  ProductIcon, LayoutPopupIcon, ProductAddIcon, CollectionIcon, CartIcon, FlagIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useTranslation } from "../i18n/LanguageContext";
import type { Dictionary } from "../i18n";

const SECTION_META = {
  productPage: { icon: ProductIcon, color: "#4F46E5" },
  popups: { icon: LayoutPopupIcon, color: "#7C3AED" },
  addons: { icon: ProductAddIcon, color: "#0D9488" },
  shopCollection: { icon: CollectionIcon, color: "#D97706" },
  cart: { icon: CartIcon, color: "#DB2777" },
  postPurchase: { icon: FlagIcon, color: "#7C3AED" },
} as const;

function SectionHeader({ section, title }: { section: keyof typeof SECTION_META; title: string }) {
  const { icon, color } = SECTION_META[section];
  return (
    <InlineStack gap="300" blockAlign="center">
      <div style={{
        width: "32px", height: "32px", borderRadius: "8px",
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0, color: "#fff",
      }}>
        <Icon source={icon} tone="inherit" />
      </div>
      <Text as="h2" variant="headingMd">{title}</Text>
    </InlineStack>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const PRODUCT_PAGE_TYPES = [
  { key: "FBT_LIST", title: "Frequently bought together (List)", description: "A pre-selected bundle in list format.", available: true, preview: "list" },
  { key: "FBT_AMAZON", title: "Frequently bought together (Amazon)", description: "A horizontal bundle in Amazon style.", available: true, preview: "amazon" },
  { key: "FBT_CLASSIC", title: "Frequently bought together (Classic)", description: "A grid layout with horizontal product row.", available: true, preview: "classic" },
] as const;

const POPUP_TYPES = [
  { key: "FBT_ATC_POPUP", title: "Frequently bought together (Popup)", description: "Shown as a popup when shoppers click Add to cart.", available: true, preview: "popup" },
  { key: "ADDON_POPUP", title: "Product add-ons (Popup)", description: "Shown as a popup when shoppers click Add to cart, offering optional add-ons.", available: true, preview: "popup" },
  { key: "PRODUCT_UPSELL_POPUP", title: "Product upsell / down-sell (Popup)", description: "Shown as a popup when shoppers click Add to cart, offering a single upsell or down-sell. Add just one offer product for this type.", available: true, preview: "popup" },
] as const;

const ADDON_TYPES = [
  { key: "ADDON_LIST", title: "Product add-ons (List)", description: "Display add-ons in a list format along with the main product", available: true, preview: "addon_list" },
  { key: "ADDON_CAROUSEL", title: "Product add-ons (Carousel)", description: "Display add-ons in a carousel format along with the main product", available: true, preview: "addon_carousel" },
  { key: "ADDON_GRID", title: "Product add-ons (Grid)", description: "Display add-ons in a grid format along with the main product", available: true, preview: "addon_grid" },
] as const;

const SHOP_COLLECTION_TYPES = [
  { key: "SHOP_COLLECTION_LIST", title: "Shop the collection (List)", description: "Show other products from the same collection in a list", available: true, preview: "addon_list" },
  { key: "SHOP_COLLECTION_CAROUSEL", title: "Shop the collection (Carousel)", description: "Show other products from the same collection in a carousel", available: true, preview: "addon_carousel" },
  { key: "SHOP_COLLECTION_GRID", title: "Shop the collection (Grid)", description: "Show other products from the same collection in a grid", available: true, preview: "addon_grid" },
] as const;

const CART_TYPES = [
  { key: "CART_UPSELL", title: "Cart drawer upsell", description: "Show upsell product recommendations inside the cart drawer", available: true, preview: "cart_upsell" },
  { key: "CART_ADDONS_POPUP", title: "Cart add-ons (Popup)", description: "Shown as a popup when shoppers click the checkout button on the cart page", available: true, preview: "popup" },
  { key: "CART_UPSELL_POPUP", title: "Cart upsell / down-sell (Popup)", description: "Shown as a popup when shoppers click the checkout button, offering a single upsell or down-sell", available: true, preview: "popup" },
] as const;

const POST_PURCHASE_TYPES = [
  { key: "POST_PURCHASE_UPSELL",   title: "Post purchase upsell",              description: "Display up to 3 upsell products after order confirmation and payment.", shopifyPaymentsOnly: true,  mockupType: "countdown" as const },
  { key: "POST_PURCHASE_DOWNSELL", title: "Post purchase upsell / down-sell",  description: "Display upsell products one by one after order confirmation",           shopifyPaymentsOnly: true,  mockupType: "countdown" as const },
  { key: "THANK_YOU_PAGE_UPSELL",  title: "Thank you & order status page upsell", description: "Upsells on Thank you / Order status page via checkout extensibility", shopifyPaymentsOnly: false, mockupType: "thankyou" as const },
];

export default function NewCampaign() {
  const { t } = useTranslation();
  return (
    <Page backAction={{ content: t.campaignsIndex.title, url: "/app/campaigns" }}>
      <TitleBar title={t.campaignsIndex.createCampaign} />
      <Layout>
        {/* Product page section — always 3 in a row */}
        <Layout.Section>
          <SectionHeader section="productPage" title={t.campaignNew.sections.productPage} />
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {PRODUCT_PAGE_TYPES.map((type) => (
                <CampaignTypeCard key={type.key} type={type} accentColor={SECTION_META.productPage.color} t={t} />
              ))}
            </div>
          </Box>
        </Layout.Section>

        {/* Popups section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <SectionHeader section="popups" title={t.campaignNew.sections.popups} />
          </Box>
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {POPUP_TYPES.map((type) => (
                <CampaignTypeCard
                  key={type.key}
                  type={type}
                  accentColor={SECTION_META.popups.color}
                  isNew={type.key === "ADDON_POPUP" || type.key === "PRODUCT_UPSELL_POPUP"}
                  t={t}
                />
              ))}
            </div>
          </Box>
        </Layout.Section>

        {/* Product add-ons section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <SectionHeader section="addons" title={t.campaignNew.sections.addons} />
          </Box>
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {ADDON_TYPES.map((type) => (
                <CampaignTypeCard key={type.key} type={type} accentColor={SECTION_META.addons.color} t={t} />
              ))}
            </div>
          </Box>
        </Layout.Section>

        {/* Shop the collection section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <SectionHeader section="shopCollection" title={t.campaignNew.sections.shopCollection} />
          </Box>
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {SHOP_COLLECTION_TYPES.map((type) => (
                <CampaignTypeCard key={type.key} type={type} accentColor={SECTION_META.shopCollection.color} isNew t={t} />
              ))}
            </div>
          </Box>
        </Layout.Section>

        {/* Cart section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <SectionHeader section="cart" title={t.campaignNew.sections.cart} />
          </Box>
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {CART_TYPES.map((type) => (
                <CampaignTypeCard
                  key={type.key}
                  type={type}
                  accentColor={SECTION_META.cart.color}
                  isNew={type.key === "CART_ADDONS_POPUP" || type.key === "CART_UPSELL_POPUP"}
                  t={t}
                />
              ))}
            </div>
          </Box>
        </Layout.Section>

        {/* Post purchase section */}
        <Layout.Section>
          <Box paddingBlockStart="400">
            <SectionHeader section="postPurchase" title={t.campaignNew.sections.postPurchase} />
          </Box>
          <Box paddingBlockStart="400">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {POST_PURCHASE_TYPES.map((type) => (
                <PostPurchaseCampaignCard key={type.key} type={type} accentColor={SECTION_META.postPurchase.color} t={t} />
              ))}
            </div>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function CampaignTypeCard({
  type,
  accentColor = "#4F46E5",
  isNew = false,
  t,
}: {
  type: { key: string; title: string; description: string; available: boolean; preview: string };
  accentColor?: string;
  isNew?: boolean;
  t: Dictionary;
}) {
  const copy = t.campaignNew.types[type.key] ?? { title: type.title, description: type.description };
  return (
    <Card padding="0">
      <div style={{ height: "3px", background: accentColor, borderRadius: "12px 12px 0 0" }} />
      <Box padding="400">
        <BlockStack gap="300">
          <Box
            background="bg-surface-secondary"
            padding="400"
            borderRadius="200"
            minHeight="180px"
          >
            <PreviewMockup variant={type.preview as any} t={t} />
          </Box>
          <InlineStack gap="200" blockAlign="center">
            <div style={{ color: accentColor, fontWeight: 600, fontSize: "14px", lineHeight: 1.3 }}>
              {copy.title}
            </div>
            {isNew && <Badge tone="info">{t.campaignNew.card.newBadge}</Badge>}
          </InlineStack>
          <Text as="p" tone="subdued">{copy.description}</Text>
          <InlineStack align="space-between">
            <Button variant="plain">{t.campaignNew.card.preview}</Button>
            <Button
              url={`/app/campaigns/new/${type.key}`}
              disabled={!type.available}
              variant="primary"
            >
              {t.campaignNew.card.create}
            </Button>
          </InlineStack>
        </BlockStack>
      </Box>
    </Card>
  );
}

function PostPurchaseCampaignCard({
  type,
  accentColor = "#7C3AED",
  t,
}: {
  type: { key: string; title: string; description: string; shopifyPaymentsOnly: boolean; mockupType: "countdown" | "thankyou" };
  accentColor?: string;
  t: Dictionary;
}) {
  const copy = t.campaignNew.types[type.key] ?? { title: type.title, description: type.description };
  return (
    <Card padding="0">
      <BlockStack gap="0">
        <div style={{ height: "3px", background: accentColor }} />
        <div style={{
          position: "relative", background: "#f6f6f7",
          padding: "24px 20px", minHeight: "160px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {type.mockupType === "countdown" ? <CountdownMockup t={t} /> : <ThankYouMockup t={t} />}
          {type.shopifyPaymentsOnly && (
            <div style={{ position: "absolute", top: "10px", right: "10px" }}>
              <Badge tone="success">{t.campaignNew.card.shopifyPaymentsOnly}</Badge>
            </div>
          )}
        </div>
        <Box padding="400">
          <BlockStack gap="200">
            <div style={{ color: accentColor, fontWeight: 600, fontSize: "14px", lineHeight: 1.3 }}>
              {copy.title}
            </div>
            <Text as="p" tone="subdued">{copy.description}</Text>
            <Box paddingBlockStart="100">
              <InlineStack align="space-between">
                <Button variant="plain">{t.campaignNew.card.preview}</Button>
                <Button url={`/app/campaigns/new/${type.key}`} variant="primary">{t.campaignNew.card.create}</Button>
              </InlineStack>
            </Box>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}

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

function PreviewMockup({ variant, t }: { variant: "list" | "amazon" | "classic" | "popup" | "addon_list" | "addon_carousel" | "addon_grid" | "cart_upsell"; t: Dictionary }) {
  if (variant === "list") return <ListMockup t={t} />;
  if (variant === "amazon") return <AmazonMockup t={t} />;
  if (variant === "popup") return <PopupMockup t={t} />;
  if (variant === "addon_list") return <AddonListMockup />;
  if (variant === "addon_carousel") return <AddonCarouselMockup />;
  if (variant === "addon_grid") return <AddonGridMockup />;
  if (variant === "cart_upsell") return <CartDrawerMockup />;
  return <ClassicMockup t={t} />;
}

/* ---------------- Cart Drawer Upsell mockup ---------------- */
function CartDrawerMockup() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ display: "block" }}>
      {/* Cart drawer panel */}
      <rect x="60" y="0" width="220" height="180" fill="#fff" stroke="#e3e3e3" />

      {/* Header */}
      <rect x="60" y="0" width="220" height="32" fill="#f9f9f9" stroke="#e3e3e3" />
      <rect x="74" y="12" width="60" height="8" rx="4" fill="#d4d4d4" />
      {/* Close × */}
      <line x1="262" y1="10" x2="270" y2="18" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="270" y1="10" x2="262" y2="18" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round" />

      {/* Cart item 1 */}
      <rect x="74" y="42" width="32" height="32" rx="4" fill="#efefef" stroke="#e0e0e0" />
      <rect x="114" y="46" width="80" height="5" rx="2.5" fill="#d4d4d4" />
      <rect x="114" y="57" width="50" height="4" rx="2" fill="#ececec" />
      <rect x="114" y="67" width="36" height="4" rx="2" fill="#d4d4d4" />

      {/* Cart item 2 */}
      <rect x="74" y="84" width="32" height="32" rx="4" fill="#efefef" stroke="#e0e0e0" />
      <rect x="114" y="88" width="70" height="5" rx="2.5" fill="#d4d4d4" />
      <rect x="114" y="99" width="44" height="4" rx="2" fill="#ececec" />
      <rect x="114" y="109" width="36" height="4" rx="2" fill="#d4d4d4" />

      {/* Divider above upsell */}
      <line x1="68" y1="126" x2="272" y2="126" stroke="#e3e3e3" strokeWidth="1" />

      {/* "You might also like" label */}
      <rect x="74" y="131" width="88" height="5" rx="2.5" fill="#bbb" />

      {/* Upsell card 1 */}
      <rect x="74" y="143" width="46" height="30" rx="4" fill="#fff" stroke="#e3e3e3" />
      <rect x="76" y="145" width="42" height="18" rx="3" fill="#efefef" />
      <rect x="76" y="166" width="30" height="4" rx="2" fill="#d4d4d4" />

      {/* Upsell card 2 */}
      <rect x="126" y="143" width="46" height="30" rx="4" fill="#fff" stroke="#e3e3e3" />
      <rect x="128" y="145" width="42" height="18" rx="3" fill="#efefef" />
      <rect x="128" y="166" width="30" height="4" rx="2" fill="#d4d4d4" />

      {/* Upsell card 3 */}
      <rect x="178" y="143" width="46" height="30" rx="4" fill="#fff" stroke="#e3e3e3" />
      <rect x="180" y="145" width="42" height="18" rx="3" fill="#efefef" />
      <rect x="180" y="166" width="30" height="4" rx="2" fill="#d4d4d4" />

      {/* Dim overlay for left side */}
      <rect x="0" y="0" width="60" height="180" fill="#000" opacity="0.08" />
    </svg>
  );
}

/* ---------------- List layout (trigger on top, offers below, vertical) ---------------- */
function ListMockup({ t }: { t: Dictionary }) {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      {/* Trigger row */}
      <rect x="10" y="10" width="260" height="38" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={20} y={19} />
      <rect x="70" y="26" width="140" height="6" rx="3" fill="#d9d9d9" />

      {/* Plus divider */}
      <circle cx="140" cy="62" r="7" fill="#fff" stroke="#b5b5b5" />
      <line x1="136" y1="62" x2="144" y2="62" stroke="#8a8a8a" strokeWidth="1.2" />
      <line x1="140" y1="58" x2="140" y2="66" stroke="#8a8a8a" strokeWidth="1.2" />

      {/* Offers group */}
      <rect x="10" y="76" width="260" height="68" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={20} y={84} />
      <rect x="70" y="96" width="130" height="6" rx="3" fill="#d9d9d9" />
      <Checkbox x={244} y={92} />

      <line x1="20" y1="115" x2="260" y2="115" stroke="#ececec" />

      <SneakerIcon x={20} y={120} />
      <rect x="70" y="128" width="130" height="6" rx="3" fill="#d9d9d9" />
      <Checkbox x={244} y={124} />

      {/* CTA */}
      <rect x="10" y="154" width="260" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="140"
        y="166"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {t.campaignNew.mockup.addBundleToCart}
      </text>
    </svg>
  );
}

/* ---------------- Amazon layout (horizontal row of products) ---------------- */
function AmazonMockup({ t }: { t: Dictionary }) {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="40" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={50} y={40} scale={0.75} />

      <PlusDot cx={105} cy={55} />

      <rect x="120" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={130} y={40} scale={0.75} />
      <CheckboxSmall x={158} y={33} />

      <PlusDot cx={185} cy={55} />

      <rect x="200" y="30" width="50" height="50" rx="6" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={210} y={44} scale={0.7} />
      <CheckboxSmall x={238} y={33} />

      {/* CTA */}
      <rect x="40" y="110" width="210" height="22" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="145"
        y="124"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {t.campaignNew.mockup.addBundleToCart}
      </text>

      {/* Small price rows */}
      <rect x="40" y="144" width="80" height="4" rx="2" fill="#d9d9d9" />
      <rect x="40" y="154" width="60" height="4" rx="2" fill="#ececec" />
    </svg>
  );
}

/* ---------------- Classic layout (horizontal products + vertical checklist below) ---------------- */
function ClassicMockup({ t }: { t: Dictionary }) {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      <rect x="40" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={48} y={20} scale={0.65} />

      <PlusDot cx={95} cy={33} />

      <rect x="108" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={116} y={20} scale={0.65} />

      <PlusDot cx={163} cy={33} />

      <rect x="176" y="12" width="42" height="42" rx="6" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={184} y={22} scale={0.6} />

      {/* CTA */}
      <rect x="40" y="68" width="180" height="18" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="130"
        y="80"
        textAnchor="middle"
        fontSize="7"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {t.campaignNew.mockup.addBundleToCart}
      </text>

      {/* Check rows */}
      <CheckboxSmall x={40} y={98} />
      <rect x="56" y="101" width="160" height="4" rx="2" fill="#d9d9d9" />

      <CheckboxSmall x={40} y={118} />
      <rect x="56" y="121" width="160" height="4" rx="2" fill="#d9d9d9" />

      <CheckboxSmall x={40} y={138} />
      <rect x="56" y="141" width="130" height="4" rx="2" fill="#ececec" />
    </svg>
  );
}

/* ---------------- Popup layout (modal overlay with bundle inside) ---------------- */
function PopupMockup({ t }: { t: Dictionary }) {
  return (
    <svg
      viewBox="0 0 280 180"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ display: "block" }}
    >
      {/* Dim backdrop */}
      <rect x="0" y="0" width="280" height="180" fill="#000" opacity="0.08" />

      {/* Faint product page outline behind popup */}
      <rect x="14" y="14" width="252" height="152" rx="6" fill="none" stroke="#e3e3e3" strokeDasharray="3 3" />

      {/* Popup modal */}
      <rect x="40" y="22" width="200" height="140" rx="8" fill="#fff" stroke="#c9c9c9" />

      {/* Close (×) */}
      <line x1="224" y1="32" x2="230" y2="38" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="230" y1="32" x2="224" y2="38" stroke="#8a8a8a" strokeWidth="1.3" strokeLinecap="round" />

      {/* Title bar */}
      <rect x="52" y="34" width="120" height="6" rx="3" fill="#d9d9d9" />

      {/* Horizontal product row inside popup */}
      <rect x="56" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <TShirtIcon x={62} y={58} scale={0.55} />

      <PlusDot cx={104} cy={70} />

      <rect x="116" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <ShortsIcon x={122} y={58} scale={0.55} />
      <CheckboxSmall x={144} y={54} />

      <PlusDot cx={164} cy={70} />

      <rect x="176" y="52" width="36" height="36" rx="5" fill="#fff" stroke="#d9d9d9" />
      <SneakerIcon x={182} y={60} scale={0.5} />
      <CheckboxSmall x={204} y={54} />

      {/* Price/text rows */}
      <rect x="56" y="100" width="100" height="5" rx="2" fill="#d9d9d9" />
      <rect x="56" y="112" width="70" height="4" rx="2" fill="#ececec" />

      {/* CTA inside popup */}
      <rect x="56" y="128" width="160" height="20" rx="5" fill="#fff" stroke="#c9c9c9" />
      <text
        x="136"
        y="141"
        textAnchor="middle"
        fontSize="8"
        fill="#6b6b6b"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {t.campaignNew.mockup.addBundleToCart}
      </text>
    </svg>
  );
}

/* shared checkbox helpers */
function CBOff({ x, y }: { x: number; y: number }) {
  return <rect x={x} y={y} width="12" height="12" rx="2" fill="#fff" stroke="#ccc" strokeWidth="1.2" />;
}
function CBOn({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="12" height="12" rx="2" fill="#1a1a1a" />
      <path d={`M${x+2} ${y+6} L${x+5} ${y+9} L${x+10} ${y+3.5}`} fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
/* simple product image with sock silhouette */
function Thumb({ x, y, w, h }: { x:number; y:number; w:number; h:number }) {
  const mx = x + w / 2;
  const my = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="5" fill="#f4f4f4" stroke="#e0e0e0" />
      {/* sock body */}
      <rect x={mx-6} y={my-12} width="11" height="16" rx="3" fill="#d4d4d4" />
      {/* sock foot */}
      <rect x={mx-6} y={my} width="16" height="8" rx="3" fill="#d4d4d4" />
      {/* cuff stripe */}
      <line x1={mx-5} y1={my-8} x2={mx+4} y2={my-8} stroke="#bbb" strokeWidth="1" />
    </g>
  );
}

/* ---------------- Addon List mockup ---------------- */
function AddonListMockup() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ display: "block" }}>
      {/* Title */}
      <rect x="10" y="8" width="100" height="7" rx="3.5" fill="#d9d9d9" />

      {/* Row 1 – unchecked */}
      <rect x="10" y="24" width="260" height="44" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={16} y={28} w={36} h={36} />
      <rect x="60" y="34" width="110" height="6" rx="3" fill="#d9d9d9" />
      <rect x="60" y="46" width="76" height="5" rx="2.5" fill="#ececec" />
      <CBOff x={258} y={38} />

      {/* Row 2 – checked */}
      <rect x="10" y="76" width="260" height="44" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={16} y={80} w={36} h={36} />
      <rect x="60" y="86" width="130" height="6" rx="3" fill="#d9d9d9" />
      <rect x="60" y="98" width="90" height="5" rx="2.5" fill="#ececec" />
      <CBOn x={258} y={90} />

      {/* Row 3 – unchecked */}
      <rect x="10" y="128" width="260" height="44" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={16} y={132} w={36} h={36} />
      <rect x="60" y="138" width="94" height="6" rx="3" fill="#d9d9d9" />
      <rect x="60" y="150" width="65" height="5" rx="2.5" fill="#ececec" />
      <CBOff x={258} y={142} />
    </svg>
  );
}

/* ---------------- Addon Carousel mockup ---------------- */
function AddonCarouselMockup() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ display: "block" }}>
      {/* Left arrow */}
      <circle cx="16" cy="95" r="13" fill="#e0e0e0" />
      <text x="16" y="100" textAnchor="middle" fontSize="14" fill="#666" fontFamily="sans-serif">‹</text>

      {/* Card 1 – unchecked */}
      <rect x="34" y="14" width="64" height="152" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={38} y={28} w={56} h={80} />
      <CBOff x={82} y={18} />
      <rect x="40" y="116" width="50" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="40" y="127" width="36" height="5" rx="2.5" fill="#ececec" />

      {/* Card 2 – checked */}
      <rect x="106" y="14" width="68" height="152" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={110} y={28} w={60} h={80} />
      <CBOn x={158} y={18} />
      <rect x="112" y="116" width="54" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="112" y="127" width="40" height="5" rx="2.5" fill="#ececec" />

      {/* Card 3 – unchecked */}
      <rect x="182" y="14" width="64" height="152" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={186} y={28} w={56} h={80} />
      <CBOff x={230} y={18} />
      <rect x="188" y="116" width="48" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="188" y="127" width="34" height="5" rx="2.5" fill="#ececec" />

      {/* Right arrow */}
      <circle cx="264" cy="95" r="13" fill="#e0e0e0" />
      <text x="264" y="100" textAnchor="middle" fontSize="14" fill="#666" fontFamily="sans-serif">›</text>
    </svg>
  );
}

/* ---------------- Addon Grid mockup ---------------- */
function AddonGridMockup() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ display: "block" }}>
      {/* Title */}
      <rect x="10" y="6" width="90" height="7" rx="3.5" fill="#d9d9d9" />

      {/* Top-left – unchecked */}
      <rect x="10" y="22" width="122" height="76" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={14} y={26} w={114} h={52} />
      <CBOff x={118} y={26} />
      <rect x="16" y="84" width="68" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="16" y="91" width="46" height="4" rx="2" fill="#ececec" />

      {/* Top-right – checked */}
      <rect x="148" y="22" width="122" height="76" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={152} y={26} w={114} h={52} />
      <CBOn x={256} y={26} />
      <rect x="154" y="84" width="76" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="154" y="91" width="52" height="4" rx="2" fill="#ececec" />

      {/* Bottom-left – unchecked */}
      <rect x="10" y="106" width="122" height="68" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={14} y={110} w={114} h={44} />
      <CBOff x={118} y={110} />
      <rect x="16" y="160" width="60" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="16" y="167" width="42" height="4" rx="2" fill="#ececec" />

      {/* Bottom-right – unchecked */}
      <rect x="148" y="106" width="122" height="68" rx="7" fill="#fff" stroke="#e8e8e8" />
      <Thumb x={152} y={110} w={114} h={44} />
      <CBOff x={256} y={110} />
      <rect x="154" y="160" width="72" height="5" rx="2.5" fill="#d9d9d9" />
      <rect x="154" y="167" width="50" height="4" rx="2" fill="#ececec" />
    </svg>
  );
}

/* ---------------- Icon primitives ---------------- */
function TShirtIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M6 4 L12 1 L14 3 L18 3 L20 1 L26 4 L30 8 L26 11 L24 9 L24 22 L8 22 L8 9 L6 11 L2 8 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M13 3 Q16 5 19 3"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.1"
      />
    </g>
  );
}

function ShortsIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M4 2 L28 2 L26 22 L18 22 L16 10 L14 22 L6 22 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="4" y1="5" x2="28" y2="5" stroke="#8a8a8a" strokeWidth="1" />
    </g>
  );
}

function SneakerIcon({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <path
        d="M2 16 L2 10 Q4 6 10 6 L14 10 L20 11 L26 14 L30 16 L30 19 Q30 21 28 21 L4 21 Q2 21 2 19 Z"
        fill="none"
        stroke="#8a8a8a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="10" y1="7" x2="12" y2="10" stroke="#8a8a8a" strokeWidth="1" />
      <line x1="14" y1="8" x2="15" y2="11" stroke="#8a8a8a" strokeWidth="1" />
      <line x1="18" y1="10" x2="18" y2="13" stroke="#8a8a8a" strokeWidth="1" />
    </g>
  );
}

function Checkbox({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="14" height="14" rx="3" fill="#4a4a4a" />
      <path d="M3.5 7 L6 9.5 L10.5 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function CheckboxSmall({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width="11" height="11" rx="2" fill="#4a4a4a" />
      <path d="M2.5 5.5 L4.5 7.5 L8.5 3.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function PlusDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="6" fill="#fff" stroke="#b5b5b5" />
      <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#8a8a8a" strokeWidth="1.2" />
      <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#8a8a8a" strokeWidth="1.2" />
    </g>
  );
}

