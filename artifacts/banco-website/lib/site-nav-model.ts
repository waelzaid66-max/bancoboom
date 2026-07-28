import { chromeCopy } from "./chrome-copy";
import { adminNavItems, browseNavItems, marketNavItems } from "./chrome-nav";
import type { SiteLocale } from "./hub-config";
import { isWebMarketCopyEnabled } from "./market-copy-config";
import { getAdminUrl, getAppStoreUrls, getMarketUrl } from "./site-env";
import { workspaceUiCopy } from "./workspace-ui-copy";

export type SiteNavLink = {
  href: string;
  label: string;
  external?: boolean;
};

export type SiteNavModel = {
  locale: SiteLocale;
  copy: ReturnType<typeof chromeCopy>;
  browse: SiteNavLink[];
  appItems: SiteNavLink[];
  marketItems: SiteNavLink[];
  managementItems: SiteNavLink[];
};

/** Shared nav model for desktop header + mobile drawer (Phase 5). */
export function buildSiteNavModel(locale: SiteLocale): SiteNavModel {
  const copy = chromeCopy(locale);
  const marketBase = getMarketUrl();
  const adminBase = getAdminUrl();
  const stores = getAppStoreUrls();

  const browse = browseNavItems(locale);

  const appItems: SiteNavLink[] = [
    stores.android ? { href: stores.android, label: copy.appAndroid, external: true } : null,
    stores.ios ? { href: stores.ios, label: copy.appIos, external: true } : null,
  ].filter(Boolean) as SiteNavLink[];

  const webMarketCopy = isWebMarketCopyEnabled();
  const webMarketHref = locale === "en" ? "/en/workspace/b2b" : "/workspace/b2b";
  const marketItems: SiteNavLink[] = [
    ...(webMarketCopy
      ? [
          {
            href: webMarketHref,
            label: workspaceUiCopy(locale).marketNavWebCopy,
            external: false,
          },
        ]
      : []),
    ...(marketBase
      ? marketNavItems(marketBase, locale).map((item) => ({ ...item, external: true }))
      : []),
  ];

  const managementItems: SiteNavLink[] = adminBase
    ? adminNavItems(adminBase, locale).map((item) => ({ ...item, external: true }))
    : [];

  return { locale, copy, browse, appItems, marketItems, managementItems };
}
