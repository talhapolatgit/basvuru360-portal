import { Link } from "react-router-dom";
import { usePortalPages } from "../auth/PortalPagesContext";
import { basvuruLabel, formatDate, gunUzun } from "../lib/format";
import type { DersSaati, Etkinlik, Kurs } from "../types";
import "./ListingCards.css";

export function WeeklySchedule({ program }: { program: DersSaati[] }) {
  if (program.length === 0) return null;

  return (
    <div className="schedule" aria-label="Haftalık program">
      <div className="schedule__head">
        <span className="schedule__label">Haftalık program</span>
        <span className="schedule__count">{program.length} gün</span>
      </div>
      <ul className="schedule__list">
        {program.map((slot) => (
          <li key={`${slot.gun}-${slot.baslangic}-${slot.bitis}`}>
            <span className="schedule__day">{gunUzun(slot.gun)}</span>
            <span className="schedule__time">
              {slot.baslangic} – {slot.bitis}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CourseCard({ kurs }: { kurs: Kurs }) {
  const { paths } = usePortalPages();
  return (
    <Link
      to={paths.kurs(kurs.id)}
      className={`list-card list-card--${kurs.basvuru_durumu}`}
    >
      <div className="list-card__accent" aria-hidden="true" />
      <div className="list-card__body">
        <div className="list-card__info">
          <div className="list-card__top">
            <span className="list-card__no">Kurs #{kurs.kurs_no}</span>
            <span className={`pill pill--${kurs.basvuru_durumu}`}>
              {basvuruLabel(kurs.basvuru_durumu)}
            </span>
          </div>

          <h3 className="list-card__title">{kurs.brans}</h3>

          <dl className="list-card__facts">
            <div>
              <dt>Merkez</dt>
              <dd>
                {kurs.merkez} · {kurs.ilce}
              </dd>
            </div>
            <div>
              <dt>Tarih aralığı</dt>
              <dd>
                {formatDate(kurs.baslama)} – {formatDate(kurs.bitis)}
              </dd>
            </div>
            <div>
              <dt>Kontenjan</dt>
              <dd>
                {kurs.kayit_sayisi}/{kurs.kontenjan} dolu
              </dd>
            </div>
            <div>
              <dt>Toplam kurs saati</dt>
              <dd>{kurs.toplam_saat} saat</dd>
            </div>
            <div>
              <dt>Kurs tipi</dt>
              <dd>{kurs.kurs_tipi}</dd>
            </div>
          </dl>
        </div>

        <WeeklySchedule program={kurs.haftalik_program} />

        <span className="list-card__cta">
          Detayı gör <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export function EventCard({ etkinlik }: { etkinlik: Etkinlik }) {
  const { paths } = usePortalPages();
  return (
    <Link
      to={paths.etkinlik(etkinlik.id)}
      className={`list-card list-card--${etkinlik.basvuru_durumu}`}
    >
      <div className="list-card__accent" aria-hidden="true" />
      <div className="list-card__body">
        <div className="list-card__info">
          <div className="list-card__top">
            <span className="list-card__no">
              Etkinlik #{etkinlik.etkinlik_no} · {etkinlik.tip}
            </span>
            <span className={`pill pill--${etkinlik.basvuru_durumu}`}>
              {basvuruLabel(etkinlik.basvuru_durumu)}
            </span>
          </div>

          <h3 className="list-card__title">{etkinlik.ad}</h3>

          <dl className="list-card__facts">
            <div>
              <dt>Merkez</dt>
              <dd>
                {etkinlik.merkez} · {etkinlik.ilce}
              </dd>
            </div>
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
              <dt>Kontenjan</dt>
              <dd>
                {etkinlik.kayit_sayisi}/{etkinlik.kontenjan} dolu
              </dd>
            </div>
          </dl>
        </div>

        <span className="list-card__cta">
          Detayı gör <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

function ListingCardSkeleton({ withSchedule = false }: { withSchedule?: boolean }) {
  return (
    <div className="list-card list-card--skeleton" aria-hidden="true">
      <div className="list-card__accent list-card__accent--skeleton" />
      <div className="list-card__body">
        <div className="list-card__info">
          <div className="list-card__top">
            <span className="sk-line sk-line--no" />
            <span className="sk-line sk-line--pill" />
          </div>
          <span className="sk-line sk-line--title" />
          <div className="list-card__facts list-card__facts--skeleton">
            {Array.from({ length: withSchedule ? 5 : 3 }, (_, i) => (
              <div key={i}>
                <span className="sk-line sk-line--label" />
                <span className="sk-line sk-line--value" />
              </div>
            ))}
          </div>
        </div>
        {withSchedule ? (
          <div className="sk-schedule">
            <span className="sk-line sk-line--label" />
            <span className="sk-line sk-line--schedule" />
            <span className="sk-line sk-line--schedule" />
          </div>
        ) : null}
        <span className="sk-line sk-line--cta" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({
  count = 6,
  withSchedule = false,
  label = "Liste yükleniyor",
}: {
  count?: number;
  withSchedule?: boolean;
  label?: string;
}) {
  return (
    <div
      className="listing__grid listing__grid--skeleton"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} withSchedule={withSchedule} />
      ))}
    </div>
  );
}
