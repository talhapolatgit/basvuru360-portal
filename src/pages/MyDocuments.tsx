import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../components/PageHeader";
import {
  fetchEvrakDetay,
  fetchEvrakDosya,
  fetchEvraklarim,
  type EvrakDetay,
  type EvrakItem,
} from "../api/evraklar";
import { ApiError } from "../api/client";
import { usePortalSayfaMeta } from "../hooks/usePortalSayfaMeta";
import { formatDate } from "../lib/format";
import "./Login.css";
import "./Listing.css";
import "./Detail.css";
import "./MyDocuments.css";

function durumBadgeClass(kod: string | null | undefined): string {
  switch (kod) {
    case "onaylandi":
      return "basvuru-badge basvuru-badge--success";
    case "iptal":
      return "basvuru-badge basvuru-badge--danger";
    case "onay_bekliyor":
      return "basvuru-badge basvuru-badge--warning";
    default:
      return "basvuru-badge";
  }
}

export function MyDocuments() {
  const sayfaMeta = usePortalSayfaMeta("evraklarim", {
    baslik: "Evraklarım",
    aciklama: "Sisteme yüklediğiniz evrakları görüntüleyin.",
  });
  const [items, setItems] = useState<EvrakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const [detail, setDetail] = useState<EvrakDetay | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailAdina, setDetailAdina] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchEvraklarim();
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Evraklar yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!detail && !detailLoading && !detailError) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detail, detailLoading, detailError]);

  function closeDetail() {
    setDetail(null);
    setDetailId(null);
    setDetailAdina(null);
    setDetailError(null);
    setDetailLoading(false);
  }

  async function onDetail(item: EvrakItem) {
    setDetailId(item.id);
    setDetailTitle(item.evrak_tipi);
    setDetailAdina(item.adina);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await fetchEvrakDetay(item.id);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : "Detaylar yüklenemedi.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function onOpen(item: EvrakItem) {
    if (openingId != null) return;
    const tab = window.open("about:blank", "_blank");
    setOpeningId(item.id);
    setFileError(null);
    try {
      const blob = await fetchEvrakDosya(item.id);
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setFileError(err instanceof ApiError ? err.message : "Dosya açılamadı.");
    } finally {
      setOpeningId(null);
    }
  }

  const detailOpen = detailLoading || detail != null || detailError != null;
  const detailModal =
    detailOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDetail();
            }}
          >
            <div
              className="modal modal--detail modal--evrak"
              role="dialog"
              aria-modal="true"
              aria-labelledby="evrak-detail-title"
            >
              <div className="modal__head">
                <h2 id="evrak-detail-title">
                  {detail?.evrak_tipi || detailTitle}
                  {detailId != null ? (
                    <span className="evrak-detail__id"> (#{detailId})</span>
                  ) : null}
                  {detailAdina ? <span className="evrak-row__adina">{detailAdina}</span> : null}
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
                <p className="evrak-detail__sub">Bu evrağı eklediğiniz başvurular</p>
                {detailLoading ? <p className="apply-note">Detaylar yükleniyor…</p> : null}
                {detailError ? <p className="form-error">{detailError}</p> : null}
                {detail ? (
                  <div>
                    {detail.basvurular.length === 0 ? (
                      <p className="apply-note">Bu evrak henüz bir başvuruda kullanılmamış.</p>
                    ) : (
                      <ul className="evrak-kullanim">
                        {detail.basvurular.map((basvuru) => (
                          <li key={`${basvuru.tip}-${basvuru.basvuru_id}`} className="evrak-kullanim__item">
                            <div className="evrak-kullanim__head">
                              <span className="evrak-kullanim__tip">{basvuru.tip_etiket}</span>
                              <span className="evrak-kullanim__title">{basvuru.baslik}</span>
                            </div>
                            <p className="evrak-kullanim__facts">
                              <span>
                                {basvuru.kayit_no_etiket}:{" "}
                                {basvuru.kayit_no != null && basvuru.kayit_no !== ""
                                  ? `#${basvuru.kayit_no}`
                                  : "—"}
                              </span>
                              <span>Başvuru no: #{basvuru.basvuru_id}</span>
                              <span>Başvuru tarihi: {formatDate(basvuru.tarih)}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
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
      <PageHeader title={sayfaMeta.baslik} description={sayfaMeta.aciklama} />

      {error ? <p className="form-error">{error}</p> : null}
      {fileError ? <p className="form-error">{fileError}</p> : null}

      {loading ? (
        <div aria-busy="true" aria-live="polite">
          <span className="visually-hidden">Evraklar yükleniyor</span>
          <ul className="evrak-list">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="evrak-row evrak-row--skeleton" aria-hidden="true">
                <div className="evrak-row__main">
                  <span className="sk-line sk-line--title" />
                  <span className="sk-line sk-line--meta" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="listing__empty">Henüz yüklenmiş evrak yok.</p>
      ) : null}

      {!loading ? (
        <ul className="evrak-list">
          {items.map((item) => (
            <li key={item.id} className="evrak-row">
              <div className="evrak-row__main">
                <div className="evrak-row__head">
                  <h3 className="evrak-row__title">{item.evrak_tipi}</h3>
                  {item.adina ? <span className="evrak-row__adina">{item.adina}</span> : null}
                  <span className={durumBadgeClass(item.durum.kod)}>{item.durum.ad}</span>
                </div>
                <p className="evrak-row__meta">
                  <span>Yüklenme {formatDate(item.yuklenme_tarihi)}</span>
                  <span>Son geçerlilik {item.son_gecerlilik_metin}</span>
                </p>
              </div>
              <div className="evrak-row__actions">
                <button
                  type="button"
                  className="basvuru-card__btn basvuru-card__btn--belge"
                  disabled={openingId === item.id}
                  onClick={() => void onOpen(item)}
                >
                  <span>{openingId === item.id ? "Açılıyor…" : "Görüntüle"}</span>
                </button>
                <button
                  type="button"
                  className="basvuru-card__btn basvuru-card__btn--detail"
                  onClick={() => void onDetail(item)}
                >
                  <span>Detaylar</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {detailModal}
    </div>
  );
}
