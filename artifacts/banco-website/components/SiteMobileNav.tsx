"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../lib/hub-config";
import { buildSiteNavModel } from "../lib/site-nav-model";
import { SiteAuthControls } from "./SiteAuthControls";
import { LocaleSwitcher } from "./LocaleSwitcher";

type SiteMobileNavProps = {
  open: boolean;
  onClose: () => void;
  menuLabel: string;
  closeLabel: string;
  panelId: string;
};

export function SiteMobileNav({
  open,
  onClose,
  menuLabel,
  closeLabel,
  panelId,
}: SiteMobileNavProps) {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const { copy, browse, appItems, marketItems, managementItems } = buildSiteNavModel(locale);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (open) onClose();
    }
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className="banco-mobile-nav"
      data-banco-chrome="mobile-nav"
      data-open={open ? "true" : "false"}
      hidden={!open}
    >
      <button
        type="button"
        className="banco-mobile-nav__backdrop"
        aria-label={closeLabel}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        id={panelId}
        className="banco-mobile-nav__panel"
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label={menuLabel}
      >
        <div className="banco-mobile-nav__header">
          <strong>{menuLabel}</strong>
          <button
            ref={closeBtnRef}
            type="button"
            className="banco-menu-toggle"
            aria-expanded={true}
            aria-controls={panelId}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>

        <nav className="banco-mobile-nav__section" aria-label={copy.browse}>
          <p className="banco-mobile-nav__label">{copy.browse}</p>
          {browse.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="banco-mobile-nav__link"
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <nav className="banco-mobile-nav__section" aria-label={copy.appMenu}>
          <p className="banco-mobile-nav__label">{copy.appMenu}</p>
          {appItems.length > 0 ? (
            appItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="banco-mobile-nav__link"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
              >
                {item.label}
              </a>
            ))
          ) : (
            <span className="banco-mobile-nav__muted">{copy.appSoon}</span>
          )}
        </nav>

        <nav className="banco-mobile-nav__section" aria-label={copy.marketMenu}>
          <p className="banco-mobile-nav__label">{copy.marketMenu}</p>
          {marketItems.length > 0 ? (
            marketItems.map((item) =>
              item.external === false ? (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="banco-mobile-nav__link"
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href + item.label}
                  href={item.href}
                  className="banco-mobile-nav__link"
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ),
            )
          ) : (
            <span className="banco-mobile-nav__muted">{copy.marketSoon}</span>
          )}
        </nav>

        {managementItems.length > 0 ? (
          <nav className="banco-mobile-nav__section" aria-label={copy.managementMenu}>
            <p className="banco-mobile-nav__label">{copy.managementMenu}</p>
            {managementItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="banco-mobile-nav__link"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="banco-mobile-nav__footer">
          <div className="banco-mobile-nav__auth">
            <SiteAuthControls locale={locale} />
          </div>
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
