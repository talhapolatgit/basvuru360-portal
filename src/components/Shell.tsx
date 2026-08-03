import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "./Brand";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { resolvePortalAssetUrl } from "../api/client";
import type { PortalSayfa } from "../types";
import "../styles/page.css";
import "./Shell.css";

type NavItem = {
  to: string;
  label: string;
  end: boolean;
  icon: ReactNode;
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5 12 4.5l7.5 6V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-5.25h-3V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCourses() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 6.5c-1.8-1.2-4-1.8-6.5-1.8H4v12.2h1.8c2.3 0 4.3.6 6.2 1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 6.5c1.8-1.2 4-1.8 6.5-1.8H20v12.2h-1.8c-2.3 0-4.3.6-6.2 1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 6.5v12.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconEvents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 14.1 9.1 20 9.6l-4.5 3.8 1.4 5.6L12 16.2 7.1 19l1.4-5.6L4 9.6l5.9-.5L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconApplications() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4.5h8a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.5 9h5M9.5 12.5h5M9.5 16h3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.2 16.2 20.5 20.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4.5h8a2 2 0 0 1 2 2V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.5 9h5M9.5 12.5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function pageIcon(sayfa: PortalSayfa) {
  const customIcon = resolvePortalAssetUrl(sayfa.sidebar_ikon_url);
  if (customIcon) {
    return (
      <span
        className="shell__link-icon-mask"
        style={{ "--icon-mask": `url("${customIcon}")` } as CSSProperties}
        aria-hidden="true"
      />
    );
  }
  if (sayfa.kod === "kurslar") return <IconCourses />;
  if (sayfa.kod === "etkinlikler") return <IconEvents />;
  if (sayfa.kod === "basvurularim") return <IconApplications />;
  if (sayfa.kod === "profil") return <IconUser />;
  return <IconPage />;
}

export function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, kisi, logout } = useAuth();
  const { ayarlar } = useSettings();
  const { sayfalar } = usePortalPages();

  const links: NavItem[] = useMemo(
    () => [
      { to: "/", label: "Ana Sayfa", end: true, icon: <IconHome /> },
      {
        to: "/hizli-arama",
        label: "Hızlı Arama",
        end: false,
        icon: <IconSearch />,
      },
      ...sayfalar
        .filter((s) => {
          if (s.kod === "basvurularim" || s.kod === "profil") {
            return isAuthenticated;
          }
          return true;
        })
        .map((s) => ({
          to: s.path,
          label: s.baslik,
          end: false,
          icon: pageIcon(s),
        })),
    ],
    [sayfalar, isAuthenticated],
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", menuOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [menuOpen]);

  async function onLogout() {
    await logout();
    navigate("/");
  }

  const telefon = ayarlar.telefon;
  const eposta = ayarlar.eposta;
  const adres = [ayarlar.ilce, ayarlar.il, ayarlar.adres]
    .filter(Boolean)
    .join(" · ");
  const sidebarArkaplan = ayarlar.sidebar_arkaplan?.trim() || "#0c2138";
  const sidebarArkaplanTip =
    ayarlar.sidebar_arkaplan_tip === "duz" ? "duz" : "gradient";

  function renderNavLink(link: NavItem) {
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) =>
          `shell__link${isActive ? " is-active" : ""}`
        }
      >
        <span className="shell__link-icon" aria-hidden="true">
          {link.icon}
        </span>
        {link.label}
      </NavLink>
    );
  }

  return (
    <div className={`shell${menuOpen ? " is-menu-open" : ""}`}>
      <button
        type="button"
        className="shell__backdrop"
        aria-label="Menüyü kapat"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="portal-sidebar"
        className={`shell__sidebar shell__sidebar--${sidebarArkaplanTip}`}
        aria-label="Yan menü"
        style={
          {
            "--sidebar-bg": sidebarArkaplan,
          } as CSSProperties
        }
      >
        <div className="shell__sidebar-brand">
          <Brand size="md" hideMarkWhenNoLogo logoVariant="sidebar" />
        </div>

        <p className="shell__nav-label">Menü</p>
        <nav className="shell__links" aria-label="Ana menü">
          {links.map(renderNavLink)}
        </nav>

        <div className="shell__sidebar-bottom">
          {isAuthenticated ? (
            <>
              <p className="shell__user">{kisi?.tam_adi}</p>
              <button type="button" className="shell__cta" onClick={onLogout}>
                Çıkış yap
              </button>
            </>
          ) : (
            <NavLink to="/giris" className="shell__cta">
              Giriş yap
            </NavLink>
          )}
          <div className="shell__sidebar-contact">
            {telefon ? (
              <a href={`tel:${telefon.replace(/\s/g, "")}`}>{telefon}</a>
            ) : null}
            {eposta ? <a href={`mailto:${eposta}`}>{eposta}</a> : null}
          </div>
          <p className="shell__sidebar-powered">Altyapı: Başvuru 360</p>
        </div>
      </aside>

      <div className="shell__content">
        <header className="shell__mobile-bar">
          <div className="shell__mobile-bar-side shell__mobile-bar-side--start">
            <button
              type="button"
              className="shell__menu-btn"
              aria-expanded={menuOpen}
              aria-controls="portal-sidebar"
              aria-label="Menü"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="shell__menu-icon" aria-hidden="true" />
            </button>
          </div>
          <div className="shell__mobile-bar-center">
            <Brand
              size="sm"
              showBaslik={false}
              showAltBaslik={false}
              hideMarkWhenNoLogo
              logoVariant="header"
            />
          </div>
          <div className="shell__mobile-bar-side shell__mobile-bar-side--end">
            <NavLink
              to="/hizli-arama"
              className={({ isActive }) =>
                `shell__mobile-search${isActive ? " is-active" : ""}`
              }
              aria-label="Hızlı Arama"
            >
              <IconSearch />
            </NavLink>
          </div>
        </header>

        <main className="shell__main">
          <Outlet />
        </main>

        <footer className="shell__footer">
          <div className="shell__footer-inner">
            <p>
              © {new Date().getFullYear()} {ayarlar.kurum_adi}
              {adres ? ` · ${adres}` : ""}
            </p>
            <p>Altyapı: Başvuru 360</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
