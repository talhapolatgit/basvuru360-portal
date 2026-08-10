import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { WeeklySchedule } from "../components/ListingCards";
import {
  fetchBasvurularim,
  iptalEtkinlikBasvuru,
  iptalKursBasvuru,
} from "../api/basvurular";
import { fetchEtkinlik, fetchKurs } from "../api/catalog";
import { ApiError } from "../api/client";
import { usePortalSayfaMeta } from "../hooks/usePortalSayfaMeta";
import {
  basvuruLabel,
  formatDate,
  kosullarMetni,
  mapEtkinlik,
  mapKurs,
} from "../lib/format";
import type { BasvuruItem, Etkinlik, Kurs } from "../types";
import "./Login.css";
import "./Listing.css";
import "./Detail.css";
import "../components/ListingCards.css";

function durumBadgeClass(kod: string | null | undefined): string {
  switch (kod) {
    case "kesin_kayit":
      return "basvuru-badge basvuru-badge--success";
    case "yedek":
      return "basvuru-badge basvuru-badge--info";
    case "onay_bekliyor":
      return "basvuru-badge basvuru-badge--warning";
    case "iptal":
      return "basvuru-badge basvuru-badge--danger";
    default:
      return "basvuru-badge";
  }
}

export function MyApplications() {
  const sayfaMeta = usePortalSayfaMeta("basvurularim", {
    baslik: "Başvurularım",
    aciklama: "Kurs ve etkinlik başvurularınızı görüntüleyin veya iptal edin.",
  });
  const [items, setItems] = useState<BasvuruItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BasvuruItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [detailTarget, setDetailTarget] = useState<BasvuruItem | null>(null);
  const [detailKurs, setDetailKurs] = useState<Kurs | null>(null);
  const [detailEtkinlik, setDetailEtkinlik] = useState<Etkinlik | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchBasvurularim();
      setItems(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Başvurular yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!detailTarget && !cancelTarget) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detailTarget, cancelTarget]);

  useEffect(() => {
    if (!detailTarget) {
      setDetailKurs(null);
      setDetailEtkinlik(null);
      setDetailError(null);
      return;
    }

    const id =
      detailTarget.tip === "kurs"
        ? detailTarget.kurs?.id
        : detailTarget.etkinlik?.id;

    if (!id) {
      setDetailError("Kayıt bilgisi bulunamadı.");
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setDetailKurs(null);
    setDetailEtkinlik(null);

    (async () => {
      try {
        if (detailTarget.tip === "kurs") {
          const api = await fetchKurs(id);
          if (!cancelled) setDetailKurs(mapKurs(api));
        } else {
          const api = await fetchEtkinlik(id);
          if (!cancelled) setDetailEtkinlik(mapEtkinlik(api));
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof ApiError ? err.message : "Detaylar yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailTarget]);

  async function onCancel(e: FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      if (cancelTarget.tip === "kurs") {
        await iptalKursBasvuru(cancelTarget.id);
      } else {
        await iptalEtkinlikBasvuru(cancelTarget.id);
      }
      setCancelTarget(null);
      await load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "İptal edilemedi.");
    } finally {
      setCancelling(false);
    }
  }

  function closeCancel() {
    if (cancelling) return;
    setCancelTarget(null);
    setCancelError(null);
  }

  function closeDetail() {
    setDetailTarget(null);
  }

  const cancelModal =
    cancelTarget && typeof document !== "undefined"
      ? createPortal(
          <div
            className="modal-backdrop modal-backdrop--confirm"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCancel();
            }}
          >
            <div
              className="modal modal--cancel-confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="basvuru-cancel-title"
            >
              <h2 id="basvuru-cancel-title">Başvuruyu iptal et</h2>
              <p>
                Bu başvuruyu iptal etmek istediğinize emin misiniz? Bu işlem geri
                alınamaz.
              </p>
              <form onSubmit={onCancel}>
                {cancelError ? <p className="form-error">{cancelError}</p> : null}
                <div className="modal__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={closeCancel}
                    disabled={cancelling}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="btn btn--danger basvuru-cancel-confirm"
                    disabled={cancelling}
                  >
                    {cancelling ? "İptal ediliyor…" : "Evet, iptal et"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  const detailModal =
    detailTarget && typeof document !== "undefined"
      ? createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDetail();
            }}
          >
            <div
              className="modal modal--detail"
              role="dialog"
              aria-modal="true"
              aria-labelledby="basvuru-detail-title"
            >
              <div className="modal__head">
                <h2 id="basvuru-detail-title">
                  {detailTarget.tip === "kurs"
                    ? "Kurs Detayları"
                    : "Etkinlik Detayları"}
                </h2>
                <button
                  type="button"
                  className="modal__close"
                  aria-label="Kapat"
                  onClick={closeDetail}
                >
                  ×
                </button>
              </div>
              <div className="modal__body">
                {detailLoading ? (
                  <p className="apply-note">Detaylar yükleniyor…</p>
                ) : null}
                {detailError ? <p className="form-error">{detailError}</p> : null}
                {!detailLoading && !detailError && detailKurs ? (
                  <div className="basvuru-detail">
                    <p className="basvuru-detail__eyebrow">
                      #{detailKurs.kurs_no}
                    </p>
                    <h3 className="basvuru-detail__title">{detailKurs.brans}</h3>
                    <p className="basvuru-detail__desc">{detailKurs.ozet}</p>
                    <dl className="basvuru-detail__facts">
                      <div>
                        <dt>Merkez</dt>
                        <dd>
                          {detailKurs.merkez}
                          {detailKurs.ilce ? ` · ${detailKurs.ilce}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Alan</dt>
                        <dd>{detailKurs.alan}</dd>
                      </div>
                      <div>
                        <dt>Tarihler</dt>
                        <dd>
                          {formatDate(detailKurs.baslama)} –{" "}
                          {formatDate(detailKurs.bitis)}
                        </dd>
                      </div>
                      <div>
                        <dt>Kontenjan</dt>
                        <dd>
                          {detailKurs.kayit_sayisi}/{detailKurs.kontenjan} dolu
                        </dd>
                      </div>
                      <div>
                        <dt>Toplam saat</dt>
                        <dd>{detailKurs.toplam_saat} saat</dd>
                      </div>
                      <div>
                        <dt>Kurs tipi</dt>
                        <dd>{detailKurs.kurs_tipi}</dd>
                      </div>
                      <div>
                        <dt>Başvuru durumu</dt>
                        <dd>{basvuruLabel(detailKurs.basvuru_durumu)}</dd>
                      </div>
                    </dl>
                    {detailKurs.haftalik_program.length > 0 ? (
                      <div className="basvuru-detail__schedule">
                        <WeeklySchedule program={detailKurs.haftalik_program} />
                      </div>
                    ) : null}
                    {detailKurs.evrak_zorunlu &&
                    detailKurs.evrak_tipleri.length > 0 ? (
                      <div className="basvuru-detail__docs">
                        <h4>Gerekli evraklar</h4>
                        <ul>
                          {detailKurs.evrak_tipleri.map((e) => (
                            <li key={e.id}>
                              <strong>{e.ad}</strong>
                              {e.aciklama ? <span>{e.aciklama}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="modal__actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={closeDetail}
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                ) : null}
                {!detailLoading && !detailError && detailEtkinlik ? (
                  <div className="basvuru-detail">
                    <p className="basvuru-detail__eyebrow">
                      #{detailEtkinlik.etkinlik_no}
                    </p>
                    <h3 className="basvuru-detail__title">
                      {detailEtkinlik.ad}
                    </h3>
                    <p className="basvuru-detail__desc">{detailEtkinlik.tip}</p>
                    <dl className="basvuru-detail__facts">
                      <div>
                        <dt>Merkez</dt>
                        <dd>
                          {detailEtkinlik.merkez}
                          {detailEtkinlik.ilce
                            ? ` · ${detailEtkinlik.ilce}`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Tarih</dt>
                        <dd>
                          {formatDate(detailEtkinlik.baslangic)}
                          {detailEtkinlik.bitis !== detailEtkinlik.baslangic
                            ? ` – ${formatDate(detailEtkinlik.bitis)}`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Başvuru bitiş</dt>
                        <dd>{formatDate(detailEtkinlik.basvuru_bitis)}</dd>
                      </div>
                      <div>
                        <dt>Kontenjan</dt>
                        <dd>
                          {detailEtkinlik.kayit_sayisi}/
                          {detailEtkinlik.kontenjan} dolu
                        </dd>
                      </div>
                      <div>
                        <dt>Başvuru durumu</dt>
                        <dd>{basvuruLabel(detailEtkinlik.basvuru_durumu)}</dd>
                      </div>
                      <div>
                        <dt>Şartlar</dt>
                        <dd>{kosullarMetni(detailEtkinlik)}</dd>
                      </div>
                    </dl>
                    {detailEtkinlik.aciklama ? (
                      <p className="basvuru-detail__aciklama">
                        {detailEtkinlik.aciklama}
                      </p>
                    ) : null}
                    {detailEtkinlik.evrak_zorunlu &&
                    detailEtkinlik.evrak_tipleri.length > 0 ? (
                      <div className="basvuru-detail__docs">
                        <h4>Gerekli evraklar</h4>
                        <ul>
                          {detailEtkinlik.evrak_tipleri.map((e) => (
                            <li key={e.id}>
                              <strong>{e.ad}</strong>
                              {e.aciklama ? <span>{e.aciklama}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="modal__actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={closeDetail}
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="page page-enter">
      <PageHeader
        title={sayfaMeta.baslik}
        description={sayfaMeta.aciklama}
      />

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Başvurular yükleniyor</span>
          <ul className="basvuru-list basvuru-list--skeleton">
            {Array.from({ length: 4 }, (_, i) => (
              <li
                key={i}
                className="basvuru-card basvuru-card--skeleton"
                aria-hidden="true"
              >
                <div className="basvuru-card__accent" />
                <div className="basvuru-card__body">
                  <div className="basvuru-card__top">
                    <span className="sk-line sk-line--tip" />
                    <span className="sk-line sk-line--durum" />
                  </div>
                  <span className="sk-line sk-line--basvuru-title" />
                  <div className="basvuru-card__facts basvuru-card__facts--skeleton">
                    <span className="sk-line sk-line--basvuru-meta" />
                    <span className="sk-line sk-line--basvuru-meta sk-line--basvuru-meta-short" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="listing__empty">
          Henüz başvurunuz yok.{" "}
          <Link to="/kurslar">Kurslara göz atın</Link>
        </p>
      ) : null}

      {!loading ? (
        <ul className="basvuru-list">
          {items.map((item) => {
            const title =
              item.tip === "kurs"
                ? item.kurs?.brans || `Kurs #${item.kurs?.kurs_no ?? item.id}`
                : item.etkinlik?.ad ||
                  `Etkinlik #${item.etkinlik?.etkinlik_no ?? item.id}`;
            const durumText = [
              item.durum?.ad ?? "—",
              item.yedek_sira ? `Yedek #${item.yedek_sira}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const hasDetailId =
              item.tip === "kurs" ? Boolean(item.kurs?.id) : Boolean(item.etkinlik?.id);

            const no =
              item.tip === "kurs"
                ? item.kurs?.kurs_no
                  ? `#${item.kurs.kurs_no}`
                  : null
                : item.etkinlik?.etkinlik_no
                  ? `#${item.etkinlik.etkinlik_no}`
                  : null;
            const merkez =
              item.tip === "kurs"
                ? item.kurs?.merkez
                : item.etkinlik?.merkez;

            return (
              <li
                key={`${item.tip}-${item.id}`}
                className={`basvuru-card basvuru-card--${item.tip}${item.durum?.kod ? ` is-${item.durum.kod}` : ""}`}
              >
                <div className="basvuru-card__accent" aria-hidden="true" />
                <div className="basvuru-card__body">
                  <div className="basvuru-card__top">
                    <div className="basvuru-card__identity">
                      <span className="basvuru-card__tip">
                        {item.tip === "kurs" ? "Kurs" : "Etkinlik"}
                      </span>
                      {no ? <span className="basvuru-card__no">{no}</span> : null}
                      {item.basvuru_icin === "cocuk" ? (
                        <span className="basvuru-card__for">Çocuk için</span>
                      ) : null}
                    </div>
                    <span className={durumBadgeClass(item.durum?.kod)}>
                      {durumText}
                    </span>
                  </div>

                  <h3 className="basvuru-card__title">{title}</h3>

                  <dl className="basvuru-card__facts">
                    {merkez ? (
                      <div>
                        <dt>Merkez</dt>
                        <dd>{merkez}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Başvuru tarihi</dt>
                      <dd>{formatDate(item.created_at)}</dd>
                    </div>
                    {item.cocuk ? (
                      <>
                        <div className="basvuru-card__fact--wide">
                          <dt>Çocuk</dt>
                          <dd>{item.cocuk.tam_adi}</dd>
                        </div>
                        {item.cocuk.tc_kimlik_no ? (
                          <div>
                            <dt>T.C. Kimlik No</dt>
                            <dd>{item.cocuk.tc_kimlik_no}</dd>
                          </div>
                        ) : null}
                        {item.cocuk.dogum_tarihi ? (
                          <div>
                            <dt>Doğum tarihi</dt>
                            <dd>{formatDate(item.cocuk.dogum_tarihi)}</dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {item.iptal_gerekce ? (
                      <div className="basvuru-card__fact--wide">
                        <dt>İptal gerekçesi</dt>
                        <dd>{item.iptal_gerekce.ad}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {hasDetailId || item.iptal_edilebilir ? (
                    <div className="basvuru-card__actions">
                      {hasDetailId ? (
                        <button
                          type="button"
                          className="basvuru-card__btn basvuru-card__btn--detail"
                          onClick={() => setDetailTarget(item)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 8v4" />
                            <path d="M12 16h.01" />
                          </svg>
                          <span>
                            {item.tip === "kurs"
                              ? "Kurs Detayları"
                              : "Etkinlik Detayları"}
                          </span>
                        </button>
                      ) : null}
                      {item.iptal_edilebilir ? (
                        <button
                          type="button"
                          className="basvuru-card__btn basvuru-card__btn--cancel"
                          onClick={() => {
                            setCancelTarget(item);
                            setCancelError(null);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="m15 9-6 6" />
                            <path d="m9 9 6 6" />
                          </svg>
                          <span>İptal et</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {cancelModal}
      {detailModal}
    </div>
  );
}
