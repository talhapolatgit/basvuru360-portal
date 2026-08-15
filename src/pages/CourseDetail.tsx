import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DetailLayout } from "../components/DetailBackLink";
import { PageHeader } from "../components/PageHeader";
import { ShareButton } from "../components/ShareButton";
import { WeeklySchedule } from "../components/ListingCards";
import { useAuth } from "../auth/AuthContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { fetchKurs } from "../api/catalog";
import { ApiError } from "../api/client";
import { basvuruLabel, formatDate, kosullarMetni, mapKurs } from "../lib/format";
import { hasRichText, sanitizeRichHtml } from "../lib/richHtml";
import type { Kurs } from "../types";
import "./Detail.css";

export function CourseDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { paths } = usePortalPages();
  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const api = await fetchKurs(id!);
        if (!cancelled) setKurs(mapKurs(api));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Kurs bulunamadı.");
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
      <DetailLayout backTo={paths.kurslar} backLabel="Kurslara dön">
        <div className="detail-skeleton" aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Kurs detayı yükleniyor</span>
          <div className="detail-skeleton__header">
            <div className="detail-skeleton__line detail-skeleton__line--eyebrow" />
            <div className="detail-skeleton__line detail-skeleton__line--title" />
            <div className="detail-skeleton__line detail-skeleton__line--desc" />
            <div className="detail-skeleton__pill" />
          </div>
          <div className="detail-skeleton__facts">
            {Array.from({ length: 8 }, (_, i) => (
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
      </DetailLayout>
    );
  }

  if (!kurs) {
    return (
      <DetailLayout backTo={paths.kurslar} backLabel="Kurslara dön">
        <p>{error || "Kurs bulunamadı."}</p>
      </DetailLayout>
    );
  }

  const canApply = kurs.basvuru_durumu === "acik";
  const applyTo = isAuthenticated
    ? paths.kursBasvuru(kurs.id)
    : `/giris?next=${encodeURIComponent(paths.kursBasvuru(kurs.id))}`;

  return (
    <DetailLayout backTo={paths.kurslar} backLabel="Kurslara dön">
      <article className="detail">
        <PageHeader
          eyebrow={`#${kurs.kurs_no}`}
          title={kurs.brans}
          description={kurs.ozet}
          actions={
            <span className={`pill pill--${kurs.basvuru_durumu}`}>
              {basvuruLabel(kurs.basvuru_durumu)}
            </span>
          }
        />

        <dl className="detail__facts">
          <div>
            <dt>Merkez</dt>
            <dd>
              {kurs.merkez}
              {kurs.ilce ? ` · ${kurs.ilce}` : ""}
            </dd>
          </div>
          <div>
            <dt>Alan</dt>
            <dd>{kurs.alan}</dd>
          </div>
          <div>
            <dt>Tarihler</dt>
            <dd>
              {formatDate(kurs.baslama)} – {formatDate(kurs.bitis)}
            </dd>
          </div>
          <div>
            <dt>Başvuru bitiş</dt>
            <dd>{formatDate(kurs.basvuru_bitis)}</dd>
          </div>
          <div>
            <dt>Kontenjan</dt>
            <dd>
              {kurs.kayit_sayisi}/{kurs.kontenjan} dolu
            </dd>
          </div>
          <div>
            <dt>Toplam saat</dt>
            <dd>{kurs.toplam_saat} saat</dd>
          </div>
          <div>
            <dt>Kurs tipi</dt>
            <dd>{kurs.kurs_tipi}</dd>
          </div>
          <div>
            <dt>Şartlar</dt>
            <dd>{kosullarMetni(kurs)}</dd>
          </div>
        </dl>

        {kurs.haftalik_program.length > 0 ? (
          <section className="detail__section detail__schedule">
            <WeeklySchedule program={kurs.haftalik_program} />
          </section>
        ) : null}

        {kurs.evrak_zorunlu && kurs.evrak_tipleri.length > 0 ? (
          <section className="detail__section">
            <h2>Gerekli evraklar</h2>
            <ul className="detail__docs">
              {kurs.evrak_tipleri.map((e) => (
                <li key={e.id}>
                  <strong>{e.ad}</strong>
                  <span>{e.aciklama}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasRichText(kurs.aciklama) ? (
          <section className="detail__section detail__aciklama">
            <h2>Açıklama</h2>
            <div
              className="detail__prose"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(kurs.aciklama),
              }}
            />
          </section>
        ) : null}

        <div className="detail__actions">
          <ShareButton
            title={kurs.brans}
            text={[kurs.brans, kurs.merkez, kurs.ozet]
              .filter(Boolean)
              .join(" · ")}
          />
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
    </DetailLayout>
  );
}
