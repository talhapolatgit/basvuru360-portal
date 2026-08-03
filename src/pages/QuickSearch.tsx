import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import {
  CourseCard,
  EventCard,
  ListingGridSkeleton,
} from "../components/ListingCards";
import { fetchEtkinlikler, fetchKurslar } from "../api/catalog";
import { ApiError } from "../api/client";
import { mapEtkinlik, mapKurs } from "../lib/format";
import type { Etkinlik, Kurs, PageMeta } from "../types";
import "./Listing.css";
import "./CourseFilters.css";
import "./QuickSearch.css";

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

export function QuickSearch() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [arama, setArama] = useState(initialQ);
  const [query, setQuery] = useState(initialQ.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  const [kursItems, setKursItems] = useState<Kurs[]>([]);
  const [kursMeta, setKursMeta] = useState<PageMeta | null>(null);
  const [kursPage, setKursPage] = useState(1);
  const [etkinlikItems, setEtkinlikItems] = useState<Etkinlik[]>([]);
  const [etkinlikMeta, setEtkinlikMeta] = useState<PageMeta | null>(null);
  const [etkinlikPage, setEtkinlikPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = arama.trim();
      setQuery((prev) => {
        if (prev !== next) {
          setKursPage(1);
          setEtkinlikPage(1);
        }
        return next;
      });
      setParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next) nextParams.set("q", next);
          else nextParams.delete("q");
          return nextParams;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [arama, setParams]);

  useEffect(() => {
    if (!query) {
      setKursItems([]);
      setEtkinlikItems([]);
      setKursMeta(null);
      setEtkinlikMeta(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchKurslar({ q: query, page: kursPage, per_page: 50 }),
      fetchEtkinlikler({ q: query, page: etkinlikPage, per_page: 50 }),
    ])
      .then(([kursData, etkinlikData]) => {
        if (cancelled) return;
        setKursItems(kursData.items.map(mapKurs));
        setKursMeta(kursData.meta);
        setEtkinlikItems(etkinlikData.items.map(mapEtkinlik));
        setEtkinlikMeta(etkinlikData.meta);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Arama yapılamadı.");
        setKursItems([]);
        setEtkinlikItems([]);
        setKursMeta(null);
        setEtkinlikMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, kursPage, etkinlikPage]);

  const total =
    (kursMeta?.total ?? kursItems.length) +
    (etkinlikMeta?.total ?? etkinlikItems.length);

  const countLabel = useMemo(() => {
    if (!query) return "Aramaya başlayın";
    if (loading) return "Aranıyor…";
    return `${total} sonuç`;
  }, [query, loading, total]);

  const showEmpty = Boolean(query) && !loading && !error && total === 0;

  return (
    <div className="page listing page-enter">
      <PageHeader
        title="Hızlı Arama"
        description="Kurs no, etkinlik no, alan, branş, tür veya etkinlik adına göre arayın."
      />

      <section className="filters-panel quick-search__panel" aria-label="Arama">
        <div className="filters-panel__head">
          <div>
            <h2 className="filters-panel__title">Ara</h2>
            <p className="filters-panel__subtitle">
              Tüm kurslar ve etkinlikler içinde arama
            </p>
          </div>
          <div className="filters-panel__meta">
            <span
              className={`filters-panel__count${query ? "" : " quick-search__count--idle"}`}
            >
              {countLabel}
            </span>
            {arama.trim() ? (
              <button
                type="button"
                className="filters-panel__clear"
                onClick={() => setArama("")}
              >
                Temizle
              </button>
            ) : null}
          </div>
        </div>

        <label className="filters-field filters-field--search quick-search__field">
          <span className="visually-hidden">Arama metni</span>
          <input
            ref={inputRef}
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Örn. Keman, K-1001, Seminer, Spor…"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
      </section>

      {!query ? (
        <p className="listing__empty quick-search__hint">
          Aramaya başlamak için yukarıya bir metin yazın.
        </p>
      ) : null}

      {error ? <p className="listing__empty">{error}</p> : null}

      {loading ? <ListingGridSkeleton count={6} label="Aranıyor" /> : null}

      {showEmpty ? (
        <p className="listing__empty">
          “{query}” için kurs veya etkinlik bulunamadı.
        </p>
      ) : null}

      {!loading && query && !error && kursItems.length > 0 ? (
        <section className="listing-section" aria-label="Kurslar">
          <h2 className="quick-search__section-title">
            Kurslar
            <span>{kursMeta?.total ?? kursItems.length}</span>
          </h2>
          <div className="listing__grid">
            {kursItems.map((kurs) => (
              <CourseCard key={kurs.id} kurs={kurs} />
            ))}
          </div>
          <Pager meta={kursMeta} page={kursPage} onPage={setKursPage} />
        </section>
      ) : null}

      {!loading && query && !error && etkinlikItems.length > 0 ? (
        <section
          className="listing-section"
          aria-label="Etkinlikler"
          style={{ marginTop: kursItems.length > 0 ? "1.75rem" : undefined }}
        >
          <h2 className="quick-search__section-title">
            Etkinlikler
            <span>{etkinlikMeta?.total ?? etkinlikItems.length}</span>
          </h2>
          <div className="listing__grid">
            {etkinlikItems.map((etkinlik) => (
              <EventCard key={etkinlik.id} etkinlik={etkinlik} />
            ))}
          </div>
          <Pager
            meta={etkinlikMeta}
            page={etkinlikPage}
            onPage={setEtkinlikPage}
          />
        </section>
      ) : null}
    </div>
  );
}
