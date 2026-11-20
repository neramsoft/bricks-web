/** The texts of the site's chrome that the CMS does not hold. Page content comes from the CMS. */
export interface Messages {
  skipToContent: string;
  mainNavigation: string;
  languageSwitcher: string;
  breadcrumbs: string;
  home: string;
  footerNavigation: string;
  legalNavigation: string;
  contact: string;
  rights: string;
  previewBanner: string;
  notFound: {
    title: string;
    heading: string;
    lead: string;
    home: string;
  };
  gone: {
    title: string;
    heading: string;
    lead: string;
  };
  previewInvalid: {
    title: string;
    lead: string;
  };
}
