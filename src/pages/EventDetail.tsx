import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { fetchEtkinlik } from "../api/catalog";
import { ApiError } from "../api/client";
import { basvuruLabel, formatDate, kosullarMetni, mapEtkinlik } from "../lib/format";
import { hasRichText, sanitizeRichHtml } from "../lib/richHtml";
import type { Etkinlik } from "../types";
import "../components/ListingCards.css";
import "./Detail.css";

export function EventDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { paths } = usePortalPages();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const api = await fetchEtkinlik(id!);
        if (!cancelled) setEtkinlik(mapEtkinlik(api));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Etkinlik bulunamadı.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page page--narrow page-enter">
        <div className="detail-skeleton" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Etkinlik detayı yükleniyor</span>
          <div className="detail-skeleton__back" />
          <div className="detail-skeleton__header">
            <div className="detail-skeleton__line detail-skeleton__line--eyebrow" />
            <div className="detail-skeleton__line detail-skeleton__line--title" />
            <div className="detail-skeleton__line detail-skeleton__line--desc" />
            <div className="detail-skeleton__pill" />
          </div>
          <div className="detail-skeleton__facts">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="detail-skeleton__fact">
                <div className="detail-skeleton__line detail-skeleton__line--label" />
                <div className="detail-skeleton__line detail-skeleton__line--value" />
              </div>
            ))}
          </div>
          <div className="detail-skeleton__actions">
            <div className="detail-skeleton__btn" />
          </div>
        </div>
      </div>
    );
  }

  if (!etkinlik) {
    return (
      <div className="page page--narrow page-enter">
        <p>{error || "Etkinlik bulunamadı."}</p>
        <Link to={paths.etkinlikler}>Etkinliklere dön</Link>
      </div>
    );
  }

  const canApply = etkinlik.basvuru_durumu === "acik";
  const applyTo = isAuthenticated
    ? paths.etkinlikBasvuru(etkinlik.id)
    : `/giris?next=${encodeURIComponent(paths.etkinlikBasvuru(etkinlik.id))}`;

  return (
    <article className="page page--narrow detail page-enter">
      <Link to={paths.etkinlikler} className="detail__back">
        ← Etkinliklere dön
      </Link>

      <PageHeader
        eyebrow={`#${etkinlik.etkinlik_no} · ${etkinlik.tip}`}
        title={etkinlik.ad}
        actions={
          <span className={`pill pill--${etkinlik.basvuru_durumu}`}>
            {basvuruLabel(etkinlik.basvuru_durumu)}
          </span>
        }
      />

      <dl className="detail__facts">
        <div>
          <dt>Merkez</dt>
          <dd>
            {etkinlik.merkez}
            {etkinlik.ilce ? ` · ${etkinlik.ilce}` : ""}
          </dd>
        </div>
        {etkinlik.etkinlik_yeri ? (
          <div>
            <dt>Etkinlik yeri</dt>
            <dd>{etkinlik.etkinlik_yeri}</dd>
          </div>
        ) : null}
        <div>
          <dt>Tarih</dt>
          <dd>
            {formatDate(etkinlik.baslangic)}
            {etkinlik.bitis !== etkinlik.baslangic
              ? ` – ${formatDate(etkinlik.bitis)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Başvuru bitiş</dt>
          <dd>{formatDate(etkinlik.basvuru_bitis)}</dd>
        </div>
        <div>
          <dt>Kontenjan</dt>
          <dd>
            {etkinlik.kayit_sayisi}/{etkinlik.kontenjan} dolu
          </dd>
        </div>
        <div>
          <dt>Şartlar</dt>
          <dd>{kosullarMetni(etkinlik)}</dd>
        </div>
      </dl>

      {etkinlik.evrak_zorunlu && etkinlik.evrak_tipleri.length > 0 ? (
        <section className="detail__section">
          <h2>Gerekli evraklar</h2>
          <ul className="detail__docs">
            {etkinlik.evrak_tipleri.map((e) => (
              <li key={e.id}>
                <strong>{e.ad}</strong>
                <span>{e.aciklama}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasRichText(etkinlik.aciklama) ? (
        <section className="detail__section detail__aciklama">
          <h2>Açıklama</h2>
          <div
            className="detail__prose"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichHtml(etkinlik.aciklama),
            }}
          />
        </section>
      ) : null}

      <div className="detail__actions">
        {canApply ? (
          <Link to={applyTo} className="btn btn--primary">
            Başvur
          </Link>
        ) : (
          <button type="button" className="btn btn--primary" disabled>
            Başvuru kapalı
          </button>
        )}
      </div>
    </article>
  );
}
