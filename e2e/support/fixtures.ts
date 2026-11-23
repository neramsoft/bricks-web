import type { ApiComponents } from "@probiz/sdk";
import { pageFixture, blockFixture, ID } from "../../test/fixtures/page.ts";
import { siteFixture } from "../../test/fixtures/site.ts";

// What the fake CMS answers: Bricks as ProBiz CMS 1.0.0 would describe it, typed by the SDK's own
// `ApiComponents` so a drift in the API's shapes fails the type check. The sample menu and events
// are from the prototype's data (design "Bricks Prototype"); they are test data and never shipped
// as content (docs/decisions/0002).

type S = ApiComponents["schemas"];

export const MEDIA_PATH = "/media";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const IDS = {
  form: uuid(900),
  menuDay: uuid(901),
  menuNight: uuid(902),
  location: uuid(903),
  homeBs: uuid(1),
  tuzlaBs: uuid(2),
  privacyBs: uuid(3),
  homeEn: uuid(4),
  privacyEn: uuid(5),
  tuzlaEn: uuid(6),
} as const;

export interface Fixtures {
  mediaBase: string;
  site: (locale: string) => S["PublicSite"];
  menus: (locale: string) => S["PublicMenus"];
  pages: Map<string, S["PublicPage"]>;
  form: S["PublicForm"];
  locations: S["PublicLocationSummary"][];
  events: S["PublicEventSummary"][];
}

/** The widths the CMS makes variants at (never above the original's width, down to the smallest). */
const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920, 2560];

/** A 1x1 WEBP, standing in for the CMS's blurred placeholder. */
export const PLACEHOLDER =
  "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

/** Ready variants as the CMS makes them: WEBP and AVIF per width, served by the fixture API. */
export function variants(
  mediaBase: string,
  name: string,
  width: number,
  height: number,
): S["PublicImage"]["variants"] {
  const widths = VARIANT_WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(VARIANT_WIDTHS[0]!);
  return (["WEBP", "AVIF"] as const).flatMap((format) =>
    widths.map((w) => {
      const h = Math.round((height * w) / width);
      return {
        width: w,
        height: h,
        format,
        url: `${mediaBase}${MEDIA_PATH}/${name}/w${w}.${format.toLowerCase()}?h=${h}`,
      };
    }),
  );
}

export function image(
  mediaBase: string,
  name: string,
  width: number,
  height: number,
  alt: string | null,
): S["PublicImage"] {
  return {
    id: uuid(7000 + name.length * 7 + width),
    width,
    height,
    alt,
    caption: null,
    credit: null,
    focalPoint: { x: 0.5, y: 0.5 },
    dominantColor: "#3a2a20",
    placeholder: PLACEHOLDER,
    variants: variants(mediaBase, name, width, height),
    url: `${mediaBase}${MEDIA_PATH}/${name}.png?w=${width}&h=${height}`,
    mimeType: "image/png",
  };
}

const text = (value: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

// ---- opening hours: every day 07:00 to 23:00, as the prototype's data has it ----

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const WEEK: S["PublicOpeningHours"] = {
  weekly: DAYS.map((day) => ({
    day,
    open: true,
    intervals: [{ opens: "07:00", closes: "23:00" }],
  })),
  exceptions: [],
};

/** The CMS's `openNow` and `todayHours` for the main venue, computed for `now` in Europe/Sarajevo. */
export function venueToday(now: Date): {
  openNow: boolean;
  todayHours: S["PublicTodayHours"];
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sarajevo",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return {
    openNow: minutes >= 7 * 60 && minutes < 23 * 60,
    todayHours: {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      closed: false,
      label: null,
      intervals: [{ opens: "07:00", closes: "23:00" }],
    },
  };
}

// ---- the menu: the prototype's sample items, with price rows, labels and allergens ----

type Item = S["PublicRestaurantMenuItem"];
let itemNumber = 0;
const item = (
  name: string,
  prices: Array<[string | null, number]>,
  more: Partial<Item> = {},
): Item => ({
  id: uuid(2000 + ++itemNumber),
  name,
  description: null,
  image: null,
  prices: prices.map(([label, amount]) => ({ label, amount })),
  allergens: [],
  dietary: [],
  spicy: 0,
  recommended: false,
  unavailable: false,
  ...more,
});

function menuSections(): {
  day: S["PublicRestaurantMenuSection"][];
  night: S["PublicRestaurantMenuSection"][];
} {
  itemNumber = 0;
  const section = (n: number, title: string, items: Item[]) => ({
    id: uuid(3000 + n),
    title,
    description: null,
    items,
  });
  return {
    day: [
      section(1, "Topli napici", [
        item("Espresso Julius Meinl", [[null, 250]], {
          description: "Julius Meinl, bečka pržionica. Dupli na zahtjev.",
          recommended: true,
        }),
        item("Espresso cappuccino", [[null, 350]], { allergens: ["milk"] }),
        item("Nescafe classic 2 kesice", [[null, 300]]),
        item("Čaj od nane", [[null, 250]], { dietary: ["vegan"] }),
      ]),
      section(2, "Prirodni sokovi", [
        item("Prirodna limunada 0,3 l", [[null, 400]], {
          description: "Svježe cijeđeno.",
          dietary: ["vegan"],
        }),
        item("Prirodna naranča 0,3 l", [[null, 500]], { dietary: ["vegan"] }),
        item("Prirodna jabuka 0,3 l", [[null, 500]], { unavailable: true }),
      ]),
    ],
    night: [
      section(3, "Pivo", [
        item(
          "Heineken točeno",
          [
            ["0,25", 300],
            ["0,5", 600],
          ],
          {
            description: "S točionika.",
            allergens: ["gluten"],
            recommended: true,
          },
        ),
        item("Tuzlanski pilsner 0,5 l", [[null, 450]], { allergens: ["gluten"] }),
        item("Heineken 0% 0,33 l", [[null, 550]], {
          description: "Bezalkoholno.",
          allergens: ["gluten"],
        }),
      ]),
      section(4, "Vino i cider", [
        item(
          "Žilavka Andrija kvalitetna",
          [
            ["0,187", 800],
            ["0,75", 4000],
          ],
          {
            description: "Bijelo, Hercegovina.",
            allergens: ["sulphites"],
          },
        ),
        item(
          "Blatina Andrija kvalitetna",
          [
            ["0,187", 800],
            ["0,75", 4000],
          ],
          {
            description: "Crno, Hercegovina.",
            allergens: ["sulphites"],
          },
        ),
      ]),
    ],
  };
}

function menuOf(
  mediaBase: string,
  locale: string,
  id: string,
  title: string,
  summary: string,
  sections: S["PublicRestaurantMenuSection"][],
) {
  void mediaBase;
  void locale;
  return {
    id,
    title,
    summary,
    href: null,
    image: null,
    note: null,
    availability: WEEK,
    validFrom: null,
    validUntil: null,
    validity: "current" as const,
    currency: "BAM",
    showPrices: true,
    allergenNote: null,
    sections,
  };
}

// ---- events: relative to now, so there are always upcoming ones ----

function eventAt(now: Date, daysAhead: number, hour: number, minute = 0): string {
  // The venue's evening in Europe/Sarajevo (UTC+1 in winter, UTC+2 in summer): find the instant
  // whose local clock reads `hour:minute` on that day.
  const base = new Date(now.getTime() + daysAhead * 86_400_000);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sarajevo" }).format(base);
  for (const offset of ["+01:00", "+02:00"]) {
    const candidate = new Date(
      `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`,
    );
    const local = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Sarajevo",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(candidate);
    if (local === `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`) {
      return candidate.toISOString();
    }
  }
  return new Date(`${day}T${hour}:00:00Z`).toISOString();
}

function events(mediaBase: string, now: Date): S["PublicEventSummary"][] {
  const place: S["PublicEventPlace"] = {
    locationId: IDS.location,
    href: null,
    address: { street: "Slatina do br. 14", postalCode: "75000", city: "Tuzla", country: "BA" },
    addressText: null,
    latitude: 44.5384,
    longitude: 18.6671,
    name: "Bricks Tuzla",
  };
  const make = (
    n: number,
    start: [daysAhead: number, hour: number],
    end: [daysAhead: number, hour: number] | null,
    title: string,
    category: string,
    summary: string,
    more: Partial<S["PublicEventSummary"]> = {},
  ): S["PublicEventSummary"] => ({
    id: uuid(4000 + n),
    href: null,
    startsAt: eventAt(now, ...start),
    endsAt: end ? eventAt(now, ...end) : null,
    place,
    image: null,
    eventStatus: "SCHEDULED",
    priceType: "FREE",
    price: null,
    category,
    title,
    summary,
    allDay: false,
    currency: "BAM",
    featured: false,
    ended: false,
    registrationOpen: false,
    ...more,
  });
  // The first is the next event: it is drawn wide, with its photograph, whatever `featured` says
  // (the flag is on a later one on purpose). It has a page of its own, so its performers are read
  // from the full event.
  return [
    make(
      1,
      [1, 21],
      [1, 23],
      "Akustika petkom",
      "Live muzika",
      "Gitara i vokal, bez ulaza. Sto rezerviši ranije, petkom je puno.",
      {
        href: "/dogadjaji/akustika-petkom",
        image: image(mediaBase, "event-acoustic", 1200, 675, "Gitarista na pozornici"),
      },
    ),
    // Paid, no end.
    make(2, [3, 20], null, "Pub kviz", "Kviz", "Ekipe do šest ljudi. Prijava na šanku do 19:30.", {
      priceType: "FIXED",
      price: 500,
      featured: true,
    }),
    // Free, past midnight.
    make(3, [8, 21], [9, 1], "DJ set, 90-e i 2000-e", "DJ", "Unutra. Bez ulaza."),
    make(
      4,
      [15, 21],
      [15, 23],
      "Gostujući bend",
      "Live muzika",
      "Gostujući bend iz Tuzle. Najava uskoro.",
      { priceType: "FROM", price: 1000, eventStatus: "CANCELLED" },
    ),
  ];
}

function form(): S["PublicForm"] {
  return {
    id: IDS.form,
    name: "Rezervacija",
    locale: "bs",
    fields: [
      {
        key: "ime",
        type: "text",
        label: "Ime i prezime",
        placeholder: "Ime i prezime",
        helpText: null,
        options: null,
        minLength: null,
        maxLength: 120,
        min: null,
        max: null,
        required: true,
      },
      {
        key: "telefon",
        type: "phone",
        label: "Telefon",
        placeholder: "Telefon",
        helpText: null,
        options: null,
        minLength: null,
        maxLength: null,
        min: null,
        max: null,
        required: true,
      },
      {
        key: "kad",
        type: "datetime",
        label: "Datum i vrijeme",
        placeholder: null,
        helpText: null,
        options: null,
        minLength: null,
        maxLength: null,
        min: null,
        max: null,
        required: true,
      },
      {
        key: "osobe",
        type: "number",
        label: "Broj osoba",
        placeholder: "Broj osoba",
        helpText: null,
        options: null,
        minLength: null,
        maxLength: null,
        min: 1,
        max: 12,
        required: true,
      },
    ],
    consentText: null,
    submitLabel: "Pošalji rezervaciju",
    captcha: null,
  };
}

export const PRIVACY_TEXT = "Ova politika opisuje kako Bricks postupa s podacima gostiju.";

export function buildFixtures(mediaBase: string, now = new Date()): Fixtures {
  const img = (name: string, w: number, h: number, alt: string | null) =>
    image(mediaBase, name, w, h, alt);
  const { day, night } = menuSections();
  const today = venueToday(now);

  const site = (locale: string): S["PublicSite"] => {
    const base = siteFixture({
      locale,
      business: {
        name: "Bricks",
        legalName: "Bricks d.o.o.",
        description: "Kafe-bar na Slatini u Tuzli. Otvoreno svaki dan od 7 do 23.",
        email: "rezervacije@bricks.ba",
        phone: "+387 33 000 000",
        addresses: [
          {
            label: null,
            street: "Slatina do br. 14",
            postalCode: "75000",
            region: null,
            latitude: 44.5384,
            longitude: 18.6671,
            city: "Tuzla",
            country: "BA",
          },
        ],
        social: [{ platform: "INSTAGRAM", url: "https://instagram.com/bricks.ba" }],
        timeZone: "Europe/Sarajevo",
        businessType: "BarOrPub",
        openingHours: WEEK,
      },
    });
    return {
      ...base,
      brand: {
        ...base.brand,
        colors: { ...base.brand.colors, primary: "#B4492E", accent: "#E0A33B" },
      },
      legal: { ...base.legal, privacyHref: locale === "en" ? "/en/privacy" : "/privatnost" },
    };
  };

  const link = (anchorId: string) => ({ type: "anchor", anchorId, href: `#${anchorId}` });
  const L = (locale: string) => (locale === "en" ? "/en" : "");

  const menus = (locale: string): S["PublicMenus"] => {
    const en = locale === "en";
    const item = (n: number, label: string, href: string) => ({
      id: uuid(5000 + n),
      label,
      href,
      external: false,
      openInNewTab: false,
      children: [],
    });
    return {
      locale,
      menus: [
        {
          key: "header",
          name: "Header",
          items: [
            item(1, "Coffee", `${L(locale)}/#coffee`),
            item(2, "Beer", `${L(locale)}/#beer`),
            item(3, "People", `${L(locale)}/#people`),
            item(4, en ? "Live" : "Događaji", `${L(locale)}/#dogadjaji`),
            item(5, en ? "Gallery" : "Galerija", `${L(locale)}/#galerija`),
            item(6, en ? "Menu" : "Meni", `${L(locale)}/#coffee`),
            item(7, en ? "Book a table" : "Rezerviši sto", `${L(locale)}/#rezervacija`),
          ],
        },
        {
          key: "footer",
          name: "Footer",
          items: [
            item(11, "Coffee", `${L(locale)}/#coffee`),
            item(12, "Beer", `${L(locale)}/#beer`),
            item(13, "People", `${L(locale)}/#people`),
            item(14, "Bricks Tuzla", `${L(locale)}/tuzla`),
          ],
        },
        {
          key: "legal",
          name: "Legal",
          items: [item(21, en ? "Privacy" : "Privatnost", en ? "/en/privacy" : "/privatnost")],
        },
      ],
    };
  };

  const location: S["PublicLocationSummary"] = {
    id: IDS.location,
    // The CMS names a venue's page only for the locations module's own detail pages, which this
    // site does not draw; with them off the card has no link (docs/decisions/0002, gap G3).
    href: null,
    address: { street: "Slatina do br. 14", postalCode: "75000", city: "Tuzla", country: "BA" },
    phone: "+387 33 000 000",
    email: "rezervacije@bricks.ba",
    image: img("venue-tuzla", 1200, 675, "Ulaz u Bricks sa Slatine"),
    openNow: today.openNow,
    todayHours: today.todayHours,
    name: "Bricks Tuzla",
    primary: true,
  };

  const evs = events(mediaBase, now);

  function homeBlocks(locale: string) {
    const en = locale === "en";
    const hours = WEEK;
    return [
      blockFixture(
        "hero",
        {
          variant: "image",
          heading: "Coffee, Beer & People.",
          text: en
            ? "Come for coffee, stay for a beer. Bricks on Slatina in Tuzla is open every day from 7 to 23."
            : "Dođi na kafu, ostani na pivu. Bricks na Slatini u Tuzli radi svaki dan od 7 do 23.",
          buttons: [
            {
              label: en ? "See the menu" : "Pogledaj meni",
              variant: "primary",
              link: link("coffee"),
            },
            {
              label: en ? "Book a table" : "Rezerviši sto",
              variant: "ghost",
              link: link("rezervacija"),
            },
          ],
        },
        { id: uuid(100), version: 3 },
      ),
      blockFixture(
        "features",
        {
          layout: "grid",
          columns: 4,
          items: [
            {
              icon: "clock",
              title: en ? "Open 07:00–23:00" : "Otvoreno 07:00–23:00",
              text: en ? "Every day the same" : "Svaki dan isto",
            },
            { icon: "map-pin", title: "Slatina do br. 14", text: "75000 Tuzla" },
            {
              icon: "phone",
              title: "+387 33 000 000",
              text: en ? "Bookings and questions" : "Rezervacije i pitanja",
            },
            {
              icon: "sun",
              title: en ? "Garden · Wi-Fi · Live music" : "Bašta · Wi-Fi · Live muzika",
              text: en
                ? "The garden is open in summer."
                : "Bašta radi ljeti. Lozinka za Wi-Fi je na šanku.",
            },
          ],
        },
        { id: uuid(101), version: 2 },
      ),
      blockFixture(
        "showcase",
        {
          heading: en ? "What is poured at Bricks" : "Šta se pije u Bricksu",
          items: [
            {
              label: "Heineken",
              caption: en ? "0.25 l 3.00 KM, from the tap" : "0,25 l 3,00 KM, s točionika",
              mediaId: uuid(7101),
              image: img("drink-beer", 800, 1000, "Heineken se toči"),
            },
            {
              label: "Espresso",
              caption: en ? "2.50 KM, Julius Meinl" : "2,50 KM, Julius Meinl",
              mediaId: uuid(7102),
              image: img("drink-espresso", 800, 1000, "Espresso odozgo"),
            },
            {
              label: "Žilavka",
              caption: en ? "0.187 l 8.00 KM" : "0,187 l 8,00 KM",
              mediaId: uuid(7103),
              image: img("drink-wine", 800, 1000, "Čaša Žilavke u bašti"),
            },
          ],
        },
        { id: uuid(102) },
      ),
      blockFixture(
        "restaurantMenu",
        {
          heading: "Coffee",
          menuId: IDS.menuDay,
          layout: "list",
          showImages: false,
          showAllergens: true,
          menu: menuOf(
            mediaBase,
            locale,
            IDS.menuDay,
            "Coffee",
            en
              ? "Our coffee is Julius Meinl: espresso, cappuccino, macchiato. Juices are squeezed here."
              : "Kafa je Julius Meinl: espresso, cappuccino, macchiato. Sokove cijedimo ovdje, limun, naranču i jabuku.",
            day,
          ),
        },
        { id: uuid(103), anchorId: "coffee" },
      ),
      blockFixture(
        "restaurantMenu",
        {
          heading: "Beer",
          menuId: IDS.menuNight,
          layout: "list",
          showImages: false,
          showAllergens: true,
          menu: menuOf(
            mediaBase,
            locale,
            IDS.menuNight,
            "Beer",
            en
              ? "Heineken is on tap, 0.25 and 0.5. Wine is Andrija, by the glass or the bottle."
              : "Na točioniku je Heineken, 0,25 i 0,5. Vino je Andrija, Žilavka ili Blatina, na čašu ili cijela flaša.",
            night,
          ),
        },
        { id: uuid(104), anchorId: "beer" },
      ),
      blockFixture(
        "eventList",
        {
          heading: en ? "Live" : "Uživo",
          intro: en
            ? "Acoustic on Fridays, a quiz or a DJ now and then. Entry is always free."
            : "Petkom akustika, povremeno kviz i DJ. Ulaz je uvijek slobodan, ali sto rezerviši ranije, petkom je puno.",
          source: "upcoming",
          layout: "cards",
          limit: 4,
          locationId: null,
          events: evs,
        },
        { id: uuid(105), anchorId: "dogadjaji" },
      ),
      blockFixture(
        "imageText",
        {
          mediaId: uuid(7104),
          image: img("room-inside", 1200, 900, "Unutra u Bricksu navečer"),
          heading: "People",
          content: text(
            en
              ? "22 tables, 11 inside and 11 in the garden. Each table has its number and its QR code."
              : "22 stola, 11 unutra i 11 u bašti koja radi ljeti. Svaki sto ima svoj broj i svoj QR kod.",
          ),
          imagePosition: "right",
          buttons: [],
        },
        { id: uuid(106), anchorId: "people", version: 2 },
      ),
      blockFixture(
        "locationList",
        {
          heading: en ? "Where to find us" : "Naši objekti",
          layout: "cards",
          showHours: true,
          limit: 24,
          locations: [location],
        },
        { id: uuid(107) },
      ),
      blockFixture(
        "gallery",
        {
          heading: en ? "Gallery" : "Galerija",
          intro: en
            ? "Bricks in pictures: the bar, the garden, Friday night."
            : "Bricks u slikama: šank, bašta, petak navečer.",
          layout: "masonry",
          columns: 3,
          items: ["bar-night", "pour", "garden", "band", "espresso", "inside", "entrance"].map(
            (name, index) => ({
              mediaId: uuid(7200 + index),
              image: img(`gallery-${name}`, 900, 700, `Fotografija ${index + 1}`),
              ...(index === 1 ? { caption: "Točenje" } : {}),
            }),
          ),
        },
        { id: uuid(108), anchorId: "galerija", version: 2 },
      ),
      blockFixture(
        "map",
        {
          heading: en ? "Where we are." : "Gdje smo.",
          latitude: 44.5384,
          longitude: 18.6671,
          zoom: 16,
          label: "Bricks",
        },
        { id: uuid(109) },
      ),
      blockFixture("openingHours", { showExceptions: true, hours }, { id: uuid(110) }),
      blockFixture(
        "contactForm",
        {
          heading: en ? "Book a table." : "Rezerviši sto.",
          text: en
            ? "For more than six people, call and we will join tables."
            : "Za više od šest ljudi nazovi, pa spojimo stolove.",
          formId: IDS.form,
          layout: "stacked",
          prefill: [],
        },
        { id: uuid(111), anchorId: "rezervacija", version: 3 },
      ),
    ];
  }

  const alternates = (bs: string, en: string): S["PublicPageAlternate"][] => [
    { locale: "bs", path: bs, href: bs },
    { locale: "en", path: en, href: en === "/" ? "/en" : `/en${en}` },
  ];

  const pages = new Map<string, S["PublicPage"]>();
  const put = (locale: string, page: S["PublicPage"]) => pages.set(`${locale}:${page.path}`, page);

  const seo = (title: string, description: string) => ({
    title,
    description,
    canonicalUrl: null,
    ogImage: img("og-home", 1200, 630, "Bricks"),
    noindex: false,
  });

  put(
    "bs",
    pageFixture({
      id: IDS.homeBs,
      path: "/",
      href: "/",
      isHome: true,
      title: "Bricks Tuzla",
      locale: "bs",
      breadcrumbs: [],
      alternates: alternates("/", "/"),
      seo: seo(
        "Bricks Tuzla",
        "Bricks, kafe-bar na Slatini u Tuzli. Otvoreno svaki dan od 7 do 23.",
      ),
      blocks: homeBlocks("bs"),
    }),
  );
  put(
    "en",
    pageFixture({
      id: IDS.homeEn,
      path: "/",
      href: "/en",
      isHome: true,
      title: "Bricks Tuzla",
      locale: "en",
      breadcrumbs: [],
      alternates: alternates("/", "/"),
      seo: seo(
        "Bricks Tuzla",
        "Bricks, a café-bar on Slatina in Tuzla. Open every day from 7 to 23.",
      ),
      blocks: homeBlocks("en"),
    }),
  );

  const venueBlocks = (locale: string) => [
    blockFixture(
      "hero",
      {
        variant: "image",
        heading: "Bricks Tuzla",
        text:
          locale === "en"
            ? "Slatina do br. 14, open every day."
            : "Slatina do br. 14, otvoreno svaki dan.",
        buttons: [],
      },
      { id: uuid(200), version: 3 },
    ),
    blockFixture(
      "contactInfo",
      {
        heading: locale === "en" ? "Details" : "Podaci",
        show: ["address", "phone", "email", "hours"],
        addressIndex: 0,
        info: {
          email: { value: "rezervacije@bricks.ba", href: "mailto:rezervacije@bricks.ba" },
          phone: { value: "+387 33 000 000", href: "tel:+38733000000" },
          address: site(locale).business.addresses[0],
          hours: WEEK,
        },
      },
      { id: uuid(201) },
    ),
    blockFixture(
      "map",
      { latitude: 44.5384, longitude: 18.6671, zoom: 16, label: "Bricks Tuzla" },
      { id: uuid(202) },
    ),
  ];
  put(
    "bs",
    pageFixture({
      id: IDS.tuzlaBs,
      path: "/tuzla",
      href: "/tuzla",
      title: "Bricks Tuzla",
      locale: "bs",
      breadcrumbs: [{ title: "Bricks Tuzla", path: "/tuzla", href: "/tuzla" }],
      alternates: alternates("/tuzla", "/tuzla"),
      seo: seo("Bricks Tuzla", "Objekat u Tuzli: adresa, radno vrijeme i kontakt."),
      blocks: venueBlocks("bs"),
    }),
  );
  put(
    "en",
    pageFixture({
      id: IDS.tuzlaEn,
      path: "/tuzla",
      href: "/en/tuzla",
      title: "Bricks Tuzla",
      locale: "en",
      breadcrumbs: [{ title: "Bricks Tuzla", path: "/tuzla", href: "/en/tuzla" }],
      alternates: alternates("/tuzla", "/tuzla"),
      seo: seo("Bricks Tuzla", "The Tuzla venue: address, opening hours and contact."),
      blocks: venueBlocks("en"),
    }),
  );

  put(
    "bs",
    pageFixture({
      id: IDS.privacyBs,
      path: "/privatnost",
      href: "/privatnost",
      title: "Politika privatnosti",
      locale: "bs",
      breadcrumbs: [{ title: "Politika privatnosti", path: "/privatnost", href: "/privatnost" }],
      alternates: [
        { locale: "bs", path: "/privatnost", href: "/privatnost" },
        { locale: "en", path: "/privacy", href: "/en/privacy" },
      ],
      seo: seo("Politika privatnosti", "Kako Bricks postupa s podacima gostiju."),
      blocks: [
        blockFixture(
          "richText",
          { content: text(PRIVACY_TEXT), width: "normal" },
          { id: uuid(300) },
        ),
      ],
    }),
  );
  put(
    "en",
    pageFixture({
      id: IDS.privacyEn,
      path: "/privacy",
      href: "/en/privacy",
      title: "Privacy policy",
      locale: "en",
      breadcrumbs: [{ title: "Privacy policy", path: "/privacy", href: "/en/privacy" }],
      alternates: [
        { locale: "bs", path: "/privatnost", href: "/privatnost" },
        { locale: "en", path: "/privacy", href: "/en/privacy" },
      ],
      seo: seo("Privacy policy", "How Bricks handles guests' data."),
      blocks: [
        blockFixture(
          "richText",
          {
            content: text("This policy describes how Bricks handles guests' data."),
            width: "normal",
          },
          { id: uuid(301) },
        ),
      ],
    }),
  );

  return { mediaBase, site, menus, pages, form: form(), locations: [location], events: evs };
}

export { ID };
