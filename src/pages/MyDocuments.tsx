import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { fetchYakinlar, type KisiYakinItem } from "../api/auth";
import {
  fetchEvrakDetay,
  fetchEvrakDosya,
  fetchEvraklarim,
  fetchEvrakTipleri,
  uploadEvrak,
  type EvrakDetay,
  type EvrakItem,
  type EvrakTipiSecenegi,
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
  const { kisi } = useAuth();
  const sayfaMeta = usePortalSayfaMeta("evraklarim", {
    baslik: "Evraklarım",
    aciklama: "Sisteme yüklediğiniz evrakları görüntüleyin.",
  });
  const [items, setItems] = useState<EvrakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFieldErrors, setUploadFieldErrors] = useState<Record<string, string[]>>({});
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [evrakTipleri, setEvrakTipleri] = useState<EvrakTipiSecenegi[]>([]);
  const [yakinlar, setYakinlar] = useState<KisiYakinItem[]>([]);
  const [sahip, setSahip] = useState<"kendisi" | number>("kendisi");
  const [evrakTipiId, setEvrakTipiId] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);

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
    if (!uploadOpen) return;
    let cancelled = false;
    setUploadLoading(true);
    setUploadError(null);
    setUploadFieldErrors({});
    void Promise.all([fetchEvrakTipleri(), fetchYakinlar()])
      .then(([tipler, kayitliYakinlar]) => {
        if (cancelled) return;
        setEvrakTipleri(tipler);
        setYakinlar(kayitliYakinlar);
      })
      .catch((err) => {
        if (!cancelled) {
          setUploadError(err instanceof ApiError ? err.message : "Yükleme formu açılamadı.");
        }
      })
      .finally(() => {
        if (!cancelled) setUploadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uploadOpen]);

  useEffect(() => {
    if (!detail && !detailLoading && !detailError && !uploadOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [detail, detailLoading, detailError, uploadOpen]);

  function openUpload() {
    setSahip("kendisi");
    setEvrakTipiId("");
    setDosya(null);
    setUploadError(null);
    setUploadFieldErrors({});
    setUploadNotice(null);
    setUploadOpen(true);
  }

  function closeUpload() {
    if (uploadSubmitting) return;
    setUploadOpen(false);
  }

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (uploadSubmitting) return;
    setUploadError(null);
    setUploadFieldErrors({});
    if (!evrakTipiId) {
      setUploadFieldErrors({ evrak_tipi_id: ["Evrak tipi seçin."] });
      return;
    }
    if (!dosya) {
      setUploadFieldErrors({ dosya: ["Dosya seçin."] });
      return;
    }
    const form = new FormData();
    form.append("evrak_tipi_id", evrakTipiId);
    form.append("dosya", dosya);
    if (sahip !== "kendisi") form.append("yakin_id", String(sahip));
    setUploadSubmitting(true);
    try {
      await uploadEvrak(form);
      const list = await fetchEvraklarim();
      setItems(list);
      setUploadNotice("Evrak yüklendi. Onay bekliyor.");
      setUploadOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
        setUploadFieldErrors(err.errors ?? {});
      } else {
        setUploadError("Evrak yüklenemedi.");
      }
    } finally {
      setUploadSubmitting(false);
    }
  }

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

  const uploadModal =
    uploadOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeUpload();
            }}
          >
            <div
              className="modal modal--detail modal--evrak"
              role="dialog"
              aria-modal="true"
              aria-labelledby="evrak-upload-title"
            >
              <div className="modal__head">
                <h2 id="evrak-upload-title">Yeni evrak yükle</h2>
                <button
                  type="button"
                  className="modal__close"
                  aria-label="Kapat"
                  onClick={closeUpload}
                >
                  ×
                </button>
              </div>
              <form className="modal__body evrak-form" onSubmit={(e) => void onUpload(e)}>
                {uploadLoading ? <p className="apply-note">Form hazırlanıyor…</p> : null}
                {uploadError ? <p className="form-error">{uploadError}</p> : null}
                <label className="field">
                  <span>Kimin adına</span>
                  <select
                    value={sahip === "kendisi" ? "kendisi" : String(sahip)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSahip(value === "kendisi" ? "kendisi" : Number(value));
                    }}
                    disabled={uploadSubmitting}
                  >
                    <option value="kendisi">
                      Kendim{kisi?.tam_adi ? ` (${kisi.tam_adi})` : ""}
                    </option>
                    {yakinlar.map((yakin) => (
                      <option key={yakin.id} value={yakin.id}>
                        {(yakin.yakinlik_label || "Yakın") + " · " + (yakin.tam_adi || "İsimsiz")}
                      </option>
                    ))}
                  </select>
                </label>
                {!uploadLoading && !uploadError && yakinlar.length === 0 ? (
                  <p className="apply-note">Kayıtlı eş veya çocuk bulunmuyor. Evrak kendi adınıza yüklenir.</p>
                ) : null}
                {uploadFieldErrors.yakin_id?.[0] ? (
                  <small className="field-error">{uploadFieldErrors.yakin_id[0]}</small>
                ) : null}
                <label className="field">
                  <span>Evrak tipi</span>
                  <select
                    value={evrakTipiId}
                    onChange={(e) => setEvrakTipiId(e.target.value)}
                    disabled={uploadSubmitting || uploadLoading}
                    required
                  >
                    <option value="">Seçin</option>
                    {evrakTipleri.map((tip) => (
                      <option key={tip.id} value={tip.id}>
                        {tip.ad}
                      </option>
                    ))}
                  </select>
                </label>
                {evrakTipleri.find((tip) => String(tip.id) === evrakTipiId)?.aciklama ? (
                  <p className="apply-note">
                    {evrakTipleri.find((tip) => String(tip.id) === evrakTipiId)?.aciklama}
                  </p>
                ) : null}
                {uploadFieldErrors.evrak_tipi_id?.[0] ? (
                  <small className="field-error">{uploadFieldErrors.evrak_tipi_id[0]}</small>
                ) : null}
                <label className="evrak-yukle">
                  <input
                    className="evrak-yukle__input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    disabled={uploadSubmitting}
                    onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
                  />
                  <span className="evrak-yukle__name">
                    {dosya ? dosya.name : "Dosya seçin"}
                  </span>
                  <span className="evrak-yukle__btn">Gözat</span>
                </label>
                <p className="apply-note">PDF, JPG veya PNG · en fazla 5 MB</p>
                {uploadFieldErrors.dosya?.[0] ? (
                  <small className="field-error">{uploadFieldErrors.dosya[0]}</small>
                ) : null}
                <div className="evrak-form__actions">
                  <button type="button" className="btn btn--ghost" onClick={closeUpload} disabled={uploadSubmitting}>
                    Vazgeç
                  </button>
                  <button type="submit" className="btn btn--accent" disabled={uploadSubmitting || uploadLoading}>
                    {uploadSubmitting ? "Yükleniyor…" : "Yükle"}
                  </button>
                </div>
              </form>
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
        actions={
          <button type="button" className="btn btn--accent" onClick={openUpload}>
            Yeni evrak yükle
          </button>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}
      {fileError ? <p className="form-error">{fileError}</p> : null}
      {uploadNotice ? <p className="form-success">{uploadNotice}</p> : null}

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
      {uploadModal}
    </div>
  );
}
