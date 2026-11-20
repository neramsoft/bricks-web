import type { ApiComponents } from "@probiz/sdk";

type Schemas = ApiComponents["schemas"];

export type SiteFixture = Schemas["PublicSite"];

/** A `GET /v1/public/site` answer: Bricks as the CMS would describe it. Override what a test needs. */
export function siteFixture(
  overrides: Partial<Omit<SiteFixture, "business">> & {
    business?: Partial<Schemas["PublicBusiness"]>;
  } = {},
): SiteFixture {
  const { business, ...rest } = overrides;
  return {
    languages: [
      { code: "bs", name: "Bosanski", isDefault: true },
      { code: "en", name: "English", isDefault: false },
    ],
    locale: "bs",
    defaultLocale: "bs",
    business: {
      name: "Bricks",
      legalName: "Bricks d.o.o.",
      description: "Café-bar u Tuzli",
      email: "info@bricks.ba",
      phone: "+387 35 000 000",
      companyId: null,
      vatId: null,
      addresses: [
        {
          label: null,
          street: "Ulica 1",
          postalCode: "75000",
          region: null,
          latitude: null,
          longitude: null,
          city: "Tuzla",
          country: "BA",
        },
      ],
      social: [{ platform: "INSTAGRAM", url: "https://instagram.com/bricks" }],
      timeZone: "Europe/Sarajevo",
      businessType: "BarOrPub",
      openingHours: { weekly: [], exceptions: [] },
      ...business,
    },
    brand: {
      logoLightMediaId: null,
      logoDarkMediaId: null,
      faviconMediaId: null,
      logoLight: null,
      logoDark: null,
      favicon: null,
      tagline: null,
      footerNote: null,
      colors: {
        primary: "#b5452a",
        accent: "#e8a33d",
        neutral: "#777777",
        text: "#111111",
        background: "#ffffff",
        surface: "#f5f5f5",
      },
      fonts: { heading: "DM Sans", body: "DM Sans" },
      radius: "SOFT",
      style: "BASIC",
    },
    legal: {
      privacyPageId: null,
      cookiesPageId: null,
      termsPageId: null,
      privacyHref: null,
      cookiesHref: null,
      termsHref: null,
      cookieBanner: { text: null, acceptLabel: null, rejectLabel: null, settingsLabel: null },
      cookieCategories: {
        necessary: { description: null },
        analytics: { description: null, enabled: false },
        marketing: { description: null, enabled: false },
      },
    },
    integrations: {
      ga4MeasurementId: null,
      gtmContainerId: null,
      metaPixelId: null,
      searchConsoleToken: null,
    },
    localization: { autoSuggestLanguage: false, hreflang: true },
    indexing: true,
    ...rest,
  } as SiteFixture;
}
