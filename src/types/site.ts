export interface NavItem {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: NavItem[];
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  supportEmail: string;
  navigation: NavItem[];
  footerGroups: FooterLinkGroup[];
}
