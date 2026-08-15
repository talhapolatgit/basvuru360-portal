import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { resolvePortalAssetUrl } from "../api/client";
import type { PortalSayfa } from "../types";
import "./Home.css";

function IconLogin() {
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

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4.5"
        y="3.5"
        width="15"
        height="17"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 16.5c1.1-1.6 2.4-2.3 4-2.3s2.9.7 4 2.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TONES = ["teal", "navy", "warm", "slate"] as const;

type HomeMenu = {
  key: string;
  to: string;
  title: string;
  description: string;
  tone: (typeof TONES)[number];
  iconSrc: string | null;
  backgroundSrc: string | null;
  backgroundMod: "kapla" | "sigdir";
  icon: "login" | "profile" | null;
};

function fallbackIcon(sayfa: PortalSayfa): "login" | "profile" | null {
  if (sayfa.kod === "basvurularim") return "login";
  if (sayfa.kod === "profil") return "profile";
  return null;
}

function mapSayfaToMenu(
  sayfa: PortalSayfa,
  index: number,
  isAuthenticated: boolean,
): HomeMenu {
  const description = sayfa.menu_aciklama?.trim() || "";
  const iconSrc = resolvePortalAssetUrl(sayfa.anasayfa_logo_url);

  let to = sayfa.path;
  let title = sayfa.baslik;
  let menuDescription = description;
  let icon = iconSrc ? null : fallbackIcon(sayfa);

  if (sayfa.kod === "basvurularim" && !isAuthenticated) {
    to = "/giris";
    title = "Giriş Yap";
    menuDescription =
      "Başvurularınızı görüntülemek için hesabınıza giriş yapın.";
    icon = iconSrc ? null : "login";
  } else if (sayfa.kod === "kres-basvuru" && !isAuthenticated) {
    to = "/giris";
    menuDescription =
      menuDescription || "Kreş başvurusu için hesabınıza giriş yapın.";
    icon = iconSrc ? null : "login";
  } else if (sayfa.kod === "profil" && !isAuthenticated) {
    to = "/giris";
    menuDescription =
      menuDescription || "Hesap bilgilerinizi yönetmek için giriş yapın.";
    icon = iconSrc ? null : "profile";
  }

  return {
    key: `${sayfa.kod ?? sayfa.slug}-${to}`,
    to,
    title,
    description: menuDescription,
    tone: TONES[index % TONES.length],
    iconSrc,
    backgroundSrc: resolvePortalAssetUrl(sayfa.anasayfa_menu_arkaplan_url),
    backgroundMod:
      sayfa.anasayfa_menu_arkaplan_mod === "sigdir" ? "sigdir" : "kapla",
    icon,
  };
}

export function Home() {
  const { ayarlar } = useSettings();
  const { isAuthenticated } = useAuth();
  const { sayfalar } = usePortalPages();

  const menus = sayfalar
    .filter((sayfa) => !(sayfa.sadece_giris && !isAuthenticated))
    .map((sayfa, index) => mapSayfaToMenu(sayfa, index, isAuthenticated));

  return (
    <div className="page page-enter home">
      <PageHeader
        eyebrow={ayarlar.kurum_adi}
        title="Hoş geldiniz"
        description="Kurs ve etkinlik başvurularınızı buradan yönetebilirsiniz."
      />

      <section className="home__menus" aria-label="Ana menü">
        {menus.map((menu) => (
          <Link
            key={menu.key}
            to={menu.to}
            className={`menu-card menu-card--${menu.tone}${menu.backgroundSrc ? ` menu-card--has-bg menu-card--bg-${menu.backgroundMod}` : ""}`}
            style={
              menu.backgroundSrc
                ? ({
                    "--menu-card-bg": `url("${menu.backgroundSrc}")`,
                  } as CSSProperties)
                : undefined
            }
          >
            {!menu.backgroundSrc ? (
              <span className="menu-card__accent" aria-hidden="true" />
            ) : null}
            <div className="menu-card__body">
              <div className="menu-card__title-row">
                {menu.iconSrc ? (
                  <img
                    className="menu-card__icon-img"
                    src={menu.iconSrc}
                    alt=""
                    width={40}
                    height={40}
                    decoding="async"
                  />
                ) : menu.icon ? (
                  <span className="menu-card__icon" aria-hidden="true">
                    {menu.icon === "profile" ? <IconProfile /> : <IconLogin />}
                  </span>
                ) : null}
                <h2 className="menu-card__title">{menu.title}</h2>
              </div>
              {menu.description ? (
                <p className="menu-card__desc">{menu.description}</p>
              ) : null}
              <span className="menu-card__cta">
                Devam et <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
