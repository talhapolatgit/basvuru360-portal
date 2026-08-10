import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import {
  CourseCard,
  EventCard,
  ListingGridSkeleton,
} from "../components/ListingCards";
import {
  fetchPortalSayfa,
  fetchPortalSayfaEtkinlikler,
  fetchPortalSayfaFiltreler,
  fetchPortalSayfaKurslar,
} from "../api/catalog";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { gunUzun, mapEtkinlik, mapKurs } from "../lib/format";
import type {
  Etkinlik,
  GunKodu,
  Kurs,
  LookupItem,
  PageMeta,
  PortalSayfa,
} from "../types";
import "./Listing.css";
import "./CourseFilters.css";

type FilterMode = "kurs" | "etkinlik" | "ortak";

function sameGunler(a: GunKodu[], b: GunKodu[]): boolean {
  return a.length === b.length && a.every((g, i) => g === b[i]);
}

function Pager({
  meta,
  page,
  onPage,
}: {
  meta: PageMeta | null;
  page: number;
  onPage: (page: number) => void;
}) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="pager">
      <button
        type="button"
        className="btn btn--ghost"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Önceki
      </button>
      <span>
        {meta.current_page} / {meta.last_page}
      </span>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={page >= meta.last_page}
        onClick={() => onPage(page + 1)}
      >
        Sonraki
      </button>
    </div>
  );
}

export function CatalogPage({ slug: slugProp }: { slug?: string }) {
  const params = useParams();
  const location = useLocation();
  const slug = slugProp || params.slug || "";
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { sayfalar } = usePortalPages();
  const sayfalarRef = useRef(sayfalar);
  sayfalarRef.current = sayfalar;

  const cachedSayfa = sayfalar.find((s) => s.slug === slug) ?? null;

  const [sayfa, setSayfa] = useState<PortalSayfa | null>(cachedSayfa);
  const [metaLoading, setMetaLoading] = useState(!cachedSayfa);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [arama, setArama] = useState("");
  const [merkez, setMerkez] = useState("");
  const [alan, setAlan] = useState("");
  const [brans, setBrans] = useState("");
  const [kursTipi, setKursTipi] = useState("");
  const [tip, setTip] = useState("");
  const [gunler, setGunler] = useState<GunKodu[]>([]);
  const [gunlerOpen, setGunlerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const gunlerRef = useRef<HTMLDivElement>(null);

  const [merkezler, setMerkezler] = useState<LookupItem[]>([]);
  const [alanlar, setAlanlar] = useState<LookupItem[]>([]);
  const [branslar, setBranslar] = useState<LookupItem[]>([]);
  const [kursTipleri, setKursTipleri] = useState<LookupItem[]>([]);
  const [etkinlikTipleri, setEtkinlikTipleri] = useState<LookupItem[]>([]);
  const [mevcutGunler, setMevcutGunler] = useState<GunKodu[]>([]);

  const [kursItems, setKursItems] = useState<Kurs[]>([]);
  const [kursMeta, setKursMeta] = useState<PageMeta | null>(null);
  const [kursPage, setKursPage] = useState(1);
  const [kursLoading, setKursLoading] = useState(false);
  const [kursError, setKursError] = useState<string | null>(null);

  const [etkinlikItems, setEtkinlikItems] = useState<Etkinlik[]>([]);
  const [etkinlikMeta, setEtkinlikMeta] = useState<PageMeta | null>(null);
  const [etkinlikPage, setEtkinlikPage] = useState(1);
  const [etkinlikLoading, setEtkinlikLoading] = useState(false);
  const [etkinlikError, setEtkinlikError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fromCache =
      sayfalarRef.current.find((s) => s.slug === slug) ?? null;

    setSayfa(fromCache);
    setMetaLoading(!fromCache);
    setMetaError(null);
    setArama("");
    setMerkez("");
    setAlan("");
    setBrans("");
    setKursTipi("");
    setTip("");
    setGunler([]);
    setKursPage(1);
    setEtkinlikPage(1);

    void fetchPortalSayfa(slug)
      .then((data) => {
        if (!cancelled) {
          setSayfa(data);
          setMetaError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (!fromCache) {
          setMetaError(
            err instanceof ApiError ? err.message : "Sayfa yüklenemedi.",
          );
          setSayfa(null);
        }
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const mode: FilterMode | null = useMemo(() => {
    if (!sayfa) return null;
    if (sayfa.has_kurs && sayfa.has_etkinlik) return "ortak";
    if (sayfa.has_kurs) return "kurs";
    if (sayfa.has_etkinlik) return "etkinlik";
    return null;
  }, [sayfa]);

  useEffect(() => {
    if (!mode || !slug) return;
    if (sayfa?.sadece_giris && !isAuthenticated) return;
    let cancelled = false;
    void fetchPortalSayfaFiltreler(slug, {
      alan_id: mode === "kurs" && alan ? alan : undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setMerkezler(data.merkezler);
        setAlanlar(data.alanlar);
        setBranslar(data.branslar);
        setKursTipleri(data.kurs_tipleri);
        setEtkinlikTipleri(data.etkinlik_tipleri);
        setMevcutGunler(
          data.gunler.filter((g): g is GunKodu => g >= 1 && g <= 7) as GunKodu[],
        );
        const merkezIds = new Set(data.merkezler.map((m) => String(m.id)));
        const alanIds = new Set(data.alanlar.map((a) => String(a.id)));
        const bransIds = new Set(data.branslar.map((b) => String(b.id)));
        const tipIds = new Set(data.kurs_tipleri.map((t) => String(t.id)));
        const etkinlikTipIds = new Set(
          data.etkinlik_tipleri.map((t) => String(t.id)),
        );
        const gunSet = new Set(data.gunler);
        setMerkez((prev) => (prev && !merkezIds.has(prev) ? "" : prev));
        setAlan((prev) => (prev && !alanIds.has(prev) ? "" : prev));
        setBrans((prev) => (prev && !bransIds.has(prev) ? "" : prev));
        setKursTipi((prev) => (prev && !tipIds.has(prev) ? "" : prev));
        setTip((prev) => (prev && !etkinlikTipIds.has(prev) ? "" : prev));
        setGunler((prev) => {
          const next = prev.filter((g) => gunSet.has(g));
          return sameGunler(prev, next) ? prev : next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMerkezler([]);
        setAlanlar([]);
        setBranslar([]);
        setKursTipleri([]);
        setEtkinlikTipleri([]);
        setMevcutGunler((prev) => (prev.length === 0 ? prev : []));
      });
    return () => {
      cancelled = true;
    };
  }, [mode, slug, alan, sayfa?.sadece_giris, isAuthenticated]);

  useEffect(() => {
    if (!sayfa?.has_kurs || !slug) return;
    if (sayfa.sadece_giris && !isAuthenticated) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setKursLoading(true);
      setKursError(null);
      try {
        const query: Record<string, string | number | undefined> = {
          page: kursPage,
          per_page: 15,
          q: arama.trim() || undefined,
          merkez_id: merkez || undefined,
        };
        if (mode === "kurs") {
          query.alan_id = alan || undefined;
          query.brans_id = brans || undefined;
          query.kurs_tipi_id = kursTipi || undefined;
        }
        const data = await fetchPortalSayfaKurslar(slug, query);
        if (cancelled) return;
        let mapped = data.items.map(mapKurs);
        if (mode === "kurs" && gunler.length > 0) {
          mapped = mapped.filter((k) =>
            gunler.some((g) => k.haftalik_program.some((p) => p.gun === g)),
          );
        }
        setKursItems(mapped);
        setKursMeta(data.meta);
      } catch (err) {
        if (!cancelled) {
          setKursError(
            err instanceof ApiError ? err.message : "Kurslar yüklenemedi.",
          );
          setKursItems([]);
        }
      } finally {
        if (!cancelled) setKursLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    sayfa?.has_kurs,
    sayfa?.sadece_giris,
    isAuthenticated,
    slug,
    mode,
    arama,
    merkez,
    alan,
    brans,
    kursTipi,
    gunler,
    kursPage,
  ]);

  useEffect(() => {
    if (!sayfa?.has_etkinlik || !slug) return;
    if (sayfa.sadece_giris && !isAuthenticated) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setEtkinlikLoading(true);
      setEtkinlikError(null);
      try {
        const query: Record<string, string | number | undefined> = {
          page: etkinlikPage,
          per_page: 15,
          q: arama.trim() || undefined,
          merkez_id: merkez || undefined,
        };
        if (mode === "etkinlik") {
          query.etkinlik_tipi_id = tip || undefined;
        }
        const data = await fetchPortalSayfaEtkinlikler(slug, query);
        if (cancelled) return;
        setEtkinlikItems(data.items.map(mapEtkinlik));
        setEtkinlikMeta(data.meta);
      } catch (err) {
        if (!cancelled) {
          setEtkinlikError(
            err instanceof ApiError
              ? err.message
              : "Etkinlikler yüklenemedi.",
          );
          setEtkinlikItems([]);
        }
      } finally {
        if (!cancelled) setEtkinlikLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    sayfa?.has_etkinlik,
    sayfa?.sadece_giris,
    isAuthenticated,
    slug,
    mode,
    arama,
    merkez,
    tip,
    etkinlikPage,
  ]);

  useEffect(() => {
    if (!gunlerOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!gunlerRef.current?.contains(event.target as Node)) {
        setGunlerOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setGunlerOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gunlerOpen]);

  const aktifFiltre = useMemo(() => {
    if (mode === "kurs") {
      return (
        Boolean(arama.trim()) ||
        Boolean(merkez) ||
        Boolean(alan) ||
        Boolean(brans) ||
        Boolean(kursTipi) ||
        gunler.length > 0
      );
    }
    if (mode === "etkinlik") {
      return Boolean(arama.trim()) || Boolean(tip) || Boolean(merkez);
    }
    return Boolean(arama.trim()) || Boolean(merkez);
  }, [mode, arama, merkez, alan, brans, kursTipi, tip, gunler.length]);

  const gunlerLabel =
    gunler.length === 0
      ? "Tümü"
      : gunler.length === 1
        ? gunUzun(gunler[0])
        : `${gunler.length} gün seçili`;

  function clearFilters() {
    setArama("");
    setMerkez("");
    setAlan("");
    setBrans("");
    setKursTipi("");
    setTip("");
    setGunler([]);
    setGunlerOpen(false);
    setKursPage(1);
    setEtkinlikPage(1);
  }

  function resetPage() {
    setKursPage(1);
    setEtkinlikPage(1);
  }

  const countLabel = useMemo(() => {
    if (mode === "kurs") {
      if (gunler.length > 0) return `${kursItems.length} sonuç`;
      return `${kursMeta?.total ?? kursItems.length} sonuç`;
    }
    if (mode === "etkinlik") {
      return `${etkinlikMeta?.total ?? etkinlikItems.length} sonuç`;
    }
    const k = kursMeta?.total ?? kursItems.length;
    const e = etkinlikMeta?.total ?? etkinlikItems.length;
    return `${k + e} sonuç`;
  }, [
    mode,
    gunler.length,
    kursItems.length,
    kursMeta?.total,
    etkinlikItems.length,
    etkinlikMeta?.total,
  ]);

  if (metaLoading) {
    return (
      <div className="page listing page-enter">
        <ListingGridSkeleton count={6} label="Sayfa yükleniyor" />
      </div>
    );
  }

  if (metaError || !sayfa) {
    return (
      <div className="page listing page-enter">
        <PageHeader title="Sayfa bulunamadı" description={metaError ?? ""} />
        <p className="listing__empty">
          {metaError || "Bu sayfa bulunamadı."}
        </p>
      </div>
    );
  }

  if (sayfa.sadece_giris) {
    // Cookie'de kişi varken kabuğu hemen göster; token doğrulanırken skeleton yok.
    if (authLoading && !isAuthenticated) {
      return (
        <div className="page listing page-enter">
          <ListingGridSkeleton count={6} label="Sayfa yükleniyor" />
        </div>
      );
    }
    if (!isAuthenticated) {
      const next = `${location.pathname}${location.search}`;
      return (
        <Navigate to={`/giris?next=${encodeURIComponent(next)}`} replace />
      );
    }
  }

  const pageDescription = sayfa.aciklama?.trim() || undefined;

  if (!mode) {
    return (
      <div className="page listing page-enter">
        <PageHeader title={sayfa.baslik} description={pageDescription} />
        <p className="listing__empty">Bu sayfada henüz içerik yok.</p>
      </div>
    );
  }

  const filterSubtitle =
    mode === "kurs"
      ? "Branş, merkez ve programa göre daraltın"
      : mode === "etkinlik"
        ? "Ad, tür ve merkeze göre daraltın"
        : "Ara ve merkeze göre daraltın";

  const hasAdvancedFilters =
    mode === "kurs"
      ? merkezler.length > 1 ||
        alanlar.length > 1 ||
        branslar.length > 1 ||
        kursTipleri.length > 1 ||
        mevcutGunler.length > 1
      : mode === "etkinlik"
        ? etkinlikTipleri.length > 1 || merkezler.length > 1
        : merkezler.length > 1;

  return (
    <div className="page listing page-enter">
      <PageHeader title={sayfa.baslik} description={pageDescription} />

      <section className="filters-panel" aria-label="Filtreler">
        <div className="filters-panel__head">
          <div>
            <h2 className="filters-panel__title">Filtrele</h2>
            <p className="filters-panel__subtitle">{filterSubtitle}</p>
          </div>
          <div className="filters-panel__meta">
            <span className="filters-panel__count">{countLabel}</span>
            {aktifFiltre ? (
              <button
                type="button"
                className="filters-panel__clear"
                onClick={clearFilters}
              >
                Temizle
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`filters-panel__grid${mode === "etkinlik" ? " filters-panel__grid--events" : ""}`}
          role="search"
        >
          <label className="filters-field filters-field--search">
            <span>{mode === "etkinlik" ? "Etkinlik ara" : "Ara"}</span>
            <input
              type="search"
              value={arama}
              onChange={(e) => {
                resetPage();
                setArama(e.target.value);
              }}
              placeholder={
                mode === "etkinlik"
                  ? "Örn. Fotoğrafçılık, Seminer…"
                  : mode === "kurs"
                    ? "Örn. Keman, İşaret Dili…"
                    : "Kurs veya etkinlik ara…"
              }
              autoComplete="off"
            />
          </label>

          {mode === "ortak" ? (
            merkezler.length > 1 ? (
              <label className="filters-field">
                <span>Merkez</span>
                <select
                  value={merkez}
                  onChange={(e) => {
                    resetPage();
                    setMerkez(e.target.value);
                  }}
                >
                  <option value="">Tümü</option>
                  {merkezler.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ad}
                    </option>
                  ))}
                </select>
              </label>
            ) : null
          ) : hasAdvancedFilters ? (
            <>
              <button
                type="button"
                className={`filters-panel__toggle${moreOpen ? " is-open" : ""}`}
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                {moreOpen ? "Daha az filtre" : "Daha fazla filtre"}
                <span
                  className="filters-panel__toggle-chevron"
                  aria-hidden="true"
                />
              </button>

              <div
                className={`filters-panel__advanced${moreOpen ? " is-open" : ""}`}
              >
                {mode === "kurs" ? (
                  <>
                    {merkezler.length > 1 ? (
                      <label className="filters-field">
                        <span>Merkez</span>
                        <select
                          value={merkez}
                          onChange={(e) => {
                            resetPage();
                            setMerkez(e.target.value);
                          }}
                        >
                          <option value="">Tümü</option>
                          {merkezler.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {alanlar.length > 1 ? (
                      <label className="filters-field">
                        <span>Alan</span>
                        <select
                          value={alan}
                          onChange={(e) => {
                            resetPage();
                            setAlan(e.target.value);
                            setBrans("");
                          }}
                        >
                          <option value="">Tümü</option>
                          {alanlar.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {branslar.length > 1 ? (
                      <label className="filters-field">
                        <span>Branş</span>
                        <select
                          value={brans}
                          onChange={(e) => {
                            resetPage();
                            setBrans(e.target.value);
                          }}
                        >
                          <option value="">Tümü</option>
                          {branslar.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {kursTipleri.length > 1 ? (
                      <label className="filters-field">
                        <span>Kurs tipi</span>
                        <select
                          value={kursTipi}
                          onChange={(e) => {
                            resetPage();
                            setKursTipi(e.target.value);
                          }}
                        >
                          <option value="">Tümü</option>
                          {kursTipleri.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {mevcutGunler.length > 1 ? (
                      <div className="filters-field" ref={gunlerRef}>
                        <span
                          className="filters-field__label"
                          id="gunler-label"
                        >
                          Günler
                        </span>
                        <button
                          type="button"
                          className={`filters-select${gunlerOpen ? " is-open" : ""}`}
                          aria-haspopup="listbox"
                          aria-expanded={gunlerOpen}
                          aria-labelledby="gunler-label"
                          onClick={() => setGunlerOpen((v) => !v)}
                        >
                          <span>{gunlerLabel}</span>
                          <span
                            className="filters-select__chevron"
                            aria-hidden="true"
                          />
                        </button>
                        {gunlerOpen ? (
                          <div
                            className="filters-dropdown"
                            role="listbox"
                            aria-multiselectable="true"
                            aria-labelledby="gunler-label"
                          >
                            {mevcutGunler.map((gun) => {
                              const selected = gunler.includes(gun);
                              return (
                                <label
                                  key={gun}
                                  className={`filters-dropdown__option${selected ? " is-selected" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                      resetPage();
                                      setGunler((prev) =>
                                        prev.includes(gun)
                                          ? prev.filter((g) => g !== gun)
                                          : [...prev, gun],
                                      );
                                    }}
                                  />
                                  <span>{gunUzun(gun)}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {etkinlikTipleri.length > 1 ? (
                      <label className="filters-field">
                        <span>Tür</span>
                        <select
                          value={tip}
                          onChange={(e) => {
                            resetPage();
                            setTip(e.target.value);
                          }}
                        >
                          <option value="">Tümü</option>
                          {etkinlikTipleri.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {merkezler.length > 1 ? (
                      <label className="filters-field">
                        <span>Merkez</span>
                        <select
                          value={merkez}
                          onChange={(e) => {
                            resetPage();
                            setMerkez(e.target.value);
                          }}
                        >
                          <option value="">Tümü</option>
                          {merkezler.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.ad}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {sayfa.has_kurs ? (
        <section
          className="listing-section"
          aria-label="Kurslar"
          style={mode === "ortak" ? { marginTop: "1.5rem" } : undefined}
        >
          {mode === "ortak" ? (
            <h2
              className="page-title"
              style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}
            >
              Kurslar
            </h2>
          ) : null}
          {kursError ? <p className="form-error">{kursError}</p> : null}
          {kursLoading ? (
            <ListingGridSkeleton
              count={6}
              withSchedule
              label="Kurslar yükleniyor"
            />
          ) : (
            <div className="listing__grid">
              {kursItems.map((kurs) => (
                <CourseCard key={kurs.id} kurs={kurs} />
              ))}
              {kursItems.length === 0 ? (
                <p className="listing__empty">
                  Bu filtrelere uygun kurs bulunamadı.
                </p>
              ) : null}
            </div>
          )}
          {!kursLoading && mode === "kurs" && gunler.length === 0 ? (
            <Pager meta={kursMeta} page={kursPage} onPage={setKursPage} />
          ) : null}
          {!kursLoading && mode === "ortak" ? (
            <Pager meta={kursMeta} page={kursPage} onPage={setKursPage} />
          ) : null}
        </section>
      ) : null}

      {sayfa.has_etkinlik ? (
        <section
          className="listing-section"
          aria-label="Etkinlikler"
          style={mode === "ortak" ? { marginTop: "2rem" } : undefined}
        >
          {mode === "ortak" ? (
            <h2
              className="page-title"
              style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}
            >
              Etkinlikler
            </h2>
          ) : null}
          {etkinlikError ? (
            <p className="form-error">{etkinlikError}</p>
          ) : null}
          {etkinlikLoading ? (
            <ListingGridSkeleton count={6} label="Etkinlikler yükleniyor" />
          ) : (
            <div className="listing__grid">
              {etkinlikItems.map((etkinlik) => (
                <EventCard key={etkinlik.id} etkinlik={etkinlik} />
              ))}
              {etkinlikItems.length === 0 ? (
                <p className="listing__empty">
                  Bu filtrelere uygun etkinlik bulunamadı.
                </p>
              ) : null}
            </div>
          )}
          {!etkinlikLoading ? (
            <Pager
              meta={etkinlikMeta}
              page={etkinlikPage}
              onPage={setEtkinlikPage}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
