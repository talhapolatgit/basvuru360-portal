import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveHeaderLogoUrl, resolveSidebarLogoUrl } from "../api/client";
import { useSettings } from "../auth/SettingsContext";
import "./Brand.css";

type Props = {
  size?: "sm" | "md" | "lg" | "hero";
  showBaslik?: boolean;
  showAltBaslik?: boolean;
  /** Logo yoksa (veya yüklenemezse) mark alanını tamamen gizle */
  hideMarkWhenNoLogo?: boolean;
  /** sidebar: sol menü logosu, header: mobil üst bar logosu */
  logoVariant?: "sidebar" | "header";
};

type LogoShape = "square" | "landscape" | "portrait";

function FallbackMark() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path
        d="M14 30V16.5c0-1.4 1.1-2.5 2.5-2.5H31c1.4 0 2.5 1.1 2.5 2.5V30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M18 21h12M18 25h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="34" r="3.5" fill="currentColor" />
    </svg>
  );
}

function detectLogoShape(width: number, height: number): LogoShape {
  if (!width || !height) return "square";
  const ratio = width / height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.85) return "portrait";
  return "square";
}

export function Brand({
  size = "md",
  showBaslik = true,
  showAltBaslik = true,
  hideMarkWhenNoLogo = false,
  logoVariant = "sidebar",
}: Props) {
  const { ayarlar } = useSettings();
  const name = showBaslik ? ayarlar.sidebar_baslik?.trim() || "" : "";
  const altBaslik = showAltBaslik
    ? ayarlar.sidebar_alt_baslik?.trim() || null
    : null;
  const logoUrl =
    logoVariant === "header"
      ? resolveHeaderLogoUrl(ayarlar.header_logo_url)
      : resolveSidebarLogoUrl(ayarlar.sidebar_logo_url);
  const logoArkaplan =
    logoVariant === "header"
      ? "transparent"
      : ayarlar.sidebar_logo_arkaplan?.trim() || "#ffffff";
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoShape, setLogoShape] = useState<LogoShape | null>(null);

  useEffect(() => {
    setLogoFailed(false);
    setLogoShape(null);
    if (!logoUrl) return;

    const img = new Image();
    img.onload = () => {
      setLogoShape(detectLogoShape(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => setLogoFailed(true);
    img.src = logoUrl;
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl) && !logoFailed;
  const showMark = showLogo || !hideMarkWhenNoLogo;

  const markClass = [
    "brand__mark",
    showLogo ? "brand__mark--logo" : "",
    showLogo && logoShape ? `brand__mark--${logoShape}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link to="/" className={`brand brand--${size}`}>
      {showMark ? (
        <span
          className={markClass}
          style={showLogo ? { background: logoArkaplan } : undefined}
        >
          {showLogo ? (
            <img
              className="brand__logo"
              src={logoUrl!}
              alt=""
              decoding="async"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <FallbackMark />
          )}
        </span>
      ) : null}
      {name || (showAltBaslik && altBaslik) ? (
        <span className="brand__text">
          {name ? <span className="brand__name">{name}</span> : null}
          {showAltBaslik && altBaslik ? (
            <span className="brand__birim">{altBaslik}</span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
