import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DetailLayout } from "../components/DetailBackLink";
import { ScrollSelect } from "../components/ScrollSelect";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { createEtkinlikBasvuru, createKursBasvuru } from "../api/basvurular";
import {
  fetchEtkinlik,
  fetchIlceler,
  fetchIller,
  fetchKurs,
} from "../api/catalog";
import { ApiError } from "../api/client";
import {
  dogumToIso,
  formatDogumInput,
  mapEtkinlik,
  mapKurs,
} from "../lib/format";
import type { BasvuruOnay, Etkinlik, Kurs, LookupItem } from "../types";
import "./Login.css";
import "./Detail.css";

type Kind = "kurs" | "etkinlik";

function isBlank(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

function normTr(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr");
}

function sortWithPriority<T extends { ad: string }>(
  items: T[],
  priorityAd: string | null | undefined,
): T[] {
  const priority = normTr(priorityAd);
  return [...items].sort((a, b) => {
    const aPri = Boolean(priority) && normTr(a.ad) === priority;
    const bPri = Boolean(priority) && normTr(b.ad) === priority;
    if (aPri !== bPri) return aPri ? -1 : 1;
    return a.ad.localeCompare(b.ad, "tr");
  });
}

function onayFieldName(kod: string): string {
  return kod === "aydinlatma" ? "aydinlatma_onay" : `${kod}_onay`;
}

export function ApplyCourse() {
  return <ApplyForm kind="kurs" />;
}

export function ApplyEvent() {
  return <ApplyForm kind="etkinlik" />;
}

function ApplyForm({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const { kisi, setKisi, refreshKisi } = useAuth();
  const { ayarlar } = useSettings();
  const navigate = useNavigate();
  const kimlikAktif = Boolean(ayarlar.kimlik_sorgulama_aktif);

  const [kurs, setKurs] = useState<Kurs | null>(null);
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    telefon: kisi?.telefon ?? "",
    email: kisi?.email ?? "",
    il: kisi?.il ?? "",
    ilce: kisi?.ilce ?? "",
    adres: kisi?.adres ?? "",
    cinsiyet: kisi?.cinsiyet ?? "",
    veli_tc_kimlik_no: "",
    veli_dogum_tarihi: "",
    veli_ad: "",
    veli_soyad: "",
    veli_telefon: "",
    veli_email: "",
    cocuk_ad: "",
    cocuk_soyad: "",
    cocuk_tc_kimlik_no: "",
    cocuk_dogum_tarihi: "",
  });
  const [basvuruIcin, setBasvuruIcin] = useState<"kendisi" | "cocuk">(
    "kendisi",
  );
  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [onaylar, setOnaylar] = useState<Record<string, boolean>>({});
  const [aktifMetin, setAktifMetin] = useState<BasvuruOnay | null>(null);
  const [iller, setIller] = useState<LookupItem[]>([]);
  const [ilceler, setIlceler] = useState<LookupItem[]>([]);
  const [selectedIlId, setSelectedIlId] = useState<number | null>(null);

  const item = kind === "kurs" ? kurs : etkinlik;
  const backTo = kind === "kurs" ? `/kurslar/${id}` : `/etkinlikler/${id}`;
  const backList = kind === "kurs" ? "/kurslar" : "/etkinlikler";

  const yas = useMemo(() => {
    if (!kisi?.dogum_tarihi) return null;
    const d = new Date(kisi.dogum_tarihi);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  }, [kisi?.dogum_tarihi]);

  const needsVeli = basvuruIcin === "kendisi" && yas !== null && yas < 18;
  const cocukBasvurusuIzinli = yas === null || yas >= 18;
  const cocukAdina = basvuruIcin === "cocuk" && cocukBasvurusuIzinli;
  const evrakTipleri = item?.evrak_zorunlu ? item.evrak_tipleri : [];
  const basvuruOnaylari = item?.basvuru_onaylari ?? [];

  const missing = useMemo(
    () => ({
      telefon: isBlank(kisi?.telefon),
      email: isBlank(kisi?.email),
      il: isBlank(kisi?.il),
      ilce: isBlank(kisi?.ilce),
      adres: isBlank(kisi?.adres),
      cinsiyet: isBlank(kisi?.cinsiyet),
    }),
    [kisi],
  );

  const hasMissingProfile =
    missing.telefon ||
    missing.email ||
    missing.il ||
    missing.ilce ||
    missing.adres ||
    (!cocukAdina && !kimlikAktif && missing.cinsiyet) ||
    needsVeli;

  const merkezIl = item?.il ?? "";
  const merkezIlce = item?.ilce ?? "";

  const sortedIller = useMemo(
    () => sortWithPriority(iller, merkezIl),
    [iller, merkezIl],
  );

  const sortedIlceler = useMemo(() => {
    const secilenIl = form.il.trim() || kisi?.il?.trim() || "";
    const oncelikli =
      normTr(secilenIl) === normTr(merkezIl) ? merkezIlce : null;
    return sortWithPriority(ilceler, oncelikli);
  }, [ilceler, merkezIl, merkezIlce, form.il, kisi?.il]);

  useEffect(() => {
    if (!cocukBasvurusuIzinli && basvuruIcin === "cocuk") {
      setBasvuruIcin("kendisi");
      setForm((f) => ({
        ...f,
        cinsiyet: kisi?.cinsiyet ?? f.cinsiyet,
      }));
    }
  }, [cocukBasvurusuIzinli, basvuruIcin, kisi?.cinsiyet]);

  useEffect(() => {
    if (!missing.il && !missing.ilce) return;
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchIller();
        if (cancelled) return;
        setIller(items);
        const currentIl = form.il.trim() || kisi?.il?.trim() || "";
        if (currentIl) {
          const match = items.find((i) => normTr(i.ad) === normTr(currentIl));
          if (match) setSelectedIlId(match.id);
        }
      } catch {
        if (!cancelled) setIller([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.il, missing.ilce]);

  useEffect(() => {
    if (!missing.il && !missing.ilce) return;
    const ilId = selectedIlId;
    const ilName = form.il.trim() || kisi?.il?.trim() || "";
    if (!ilId && !ilName) {
      setIlceler([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchIlceler(ilId ?? undefined, ilId ? undefined : ilName);
        if (!cancelled) setIlceler(items);
      } catch {
        if (!cancelled) setIlceler([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIlId, form.il, kisi?.il, missing.il, missing.ilce]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (kind === "kurs") {
          const api = await fetchKurs(id!);
          if (!cancelled) setKurs(mapKurs(api));
        } else {
          const api = await fetchEtkinlik(id!);
          if (!cancelled) setEtkinlik(mapEtkinlik(api));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Kayıt yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  useEffect(() => {
    if (!aktifMetin) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [aktifMetin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item || !kisi || submitting || success) return;
    setSubmitting(true);
    setError(null);
    setErrorDetails([]);
    setFieldErrors({});
    setSuccess(null);

    try {
      const fd = new FormData();
      if (kind === "kurs") fd.append("kurs_id", String(item.id));
      else fd.append("etkinlik_id", String(item.id));

      fd.append("il", form.il.trim() || kisi.il || "");
      fd.append("ilce", form.ilce.trim() || kisi.ilce || "");
      fd.append("adres", form.adres.trim() || kisi.adres || "");

      const telefon = form.telefon.trim() || kisi.telefon || "";
      const email = form.email.trim() || kisi.email || "";
      const cinsiyet = form.cinsiyet || kisi.cinsiyet || "";
      fd.append("telefon", telefon);
      if (email) fd.append("email", email);
      if (cinsiyet) fd.append("cinsiyet", cinsiyet);

      fd.append("basvuru_icin", basvuruIcin);
      if (cocukAdina) {
        const cocukDogumIso = dogumToIso(form.cocuk_dogum_tarihi);
        if (!cocukDogumIso) {
          setFieldErrors({
            cocuk_dogum_tarihi: [
              "Doğum tarihini GG.AA.YYYY formatında girin.",
            ],
          });
          setSubmitting(false);
          return;
        }
        fd.append("cocuk_ad", form.cocuk_ad.trim());
        fd.append("cocuk_soyad", form.cocuk_soyad.trim());
        fd.append("cocuk_tc_kimlik_no", form.cocuk_tc_kimlik_no.trim());
        fd.append("cocuk_dogum_tarihi", cocukDogumIso);
      }

      if (!cocukAdina && (needsVeli || form.veli_tc_kimlik_no)) {
        fd.append("veli_tc_kimlik_no", form.veli_tc_kimlik_no);
        fd.append("veli_dogum_tarihi", form.veli_dogum_tarihi);
        fd.append("veli_ad", form.veli_ad);
        fd.append("veli_soyad", form.veli_soyad);
        if (form.veli_telefon) fd.append("veli_telefon", form.veli_telefon);
        if (form.veli_email) fd.append("veli_email", form.veli_email);
      }

      for (const tip of evrakTipleri) {
        const file = files[tip.id];
        if (file) fd.append(`evrak[${tip.id}]`, file);
      }

      for (const onay of basvuruOnaylari) {
        if (onaylar[onay.kod]) {
          fd.append(onayFieldName(onay.kod), "1");
        }
      }

      const result =
        kind === "kurs"
          ? await createKursBasvuru(fd)
          : await createEtkinlikBasvuru(fd);

      if (result.kisi) {
        setKisi(result.kisi);
      } else {
        try {
          await refreshKisi();
        } catch {
          /* profil yenileme başarısız olsa da başvuru tamamlandı */
        }
      }

      setSuccess(
        result.durum === "yedek"
          ? `Başvurunuz yedek listeye alındı (sıra: ${result.yedek_sira}).`
          : "Başvurunuz alındı.",
      );
      setTimeout(() => navigate("/basvurularim"), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorDetails(err.detailMessages());
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Başvuru gönderilemedi.");
        setErrorDetails([]);
      }
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DetailLayout backTo={backList} backLabel="Geri">
        <div
          className="detail apply-skeleton"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="visually-hidden">Başvuru formu yükleniyor</span>
          <div className="apply-skeleton__header" aria-hidden="true">
            <div className="detail-skeleton__line detail-skeleton__line--title apply-skeleton__title" />
            <div className="detail-skeleton__line detail-skeleton__line--desc apply-skeleton__desc" />
          </div>
          <div className="login__panel apply-skeleton__panel" aria-hidden="true">
            <div className="detail-skeleton__line apply-skeleton__hint" />
            <div className="apply-skeleton__fieldset">
              <div className="detail-skeleton__line apply-skeleton__legend" />
              <div className="apply-skeleton__field">
                <div className="detail-skeleton__line apply-skeleton__label" />
                <div className="detail-skeleton__line apply-skeleton__input" />
              </div>
              <div className="apply-skeleton__field-row">
                <div className="apply-skeleton__field">
                  <div className="detail-skeleton__line apply-skeleton__label" />
                  <div className="detail-skeleton__line apply-skeleton__input" />
                </div>
                <div className="apply-skeleton__field">
                  <div className="detail-skeleton__line apply-skeleton__label" />
                  <div className="detail-skeleton__line apply-skeleton__input" />
                </div>
              </div>
              <div className="apply-skeleton__field">
                <div className="detail-skeleton__line apply-skeleton__label" />
                <div className="detail-skeleton__line apply-skeleton__input apply-skeleton__input--tall" />
              </div>
            </div>
            <div className="apply-skeleton__fieldset">
              <div className="detail-skeleton__line apply-skeleton__legend" />
              <div className="apply-skeleton__doc">
                <div className="detail-skeleton__line apply-skeleton__doc-name" />
                <div className="detail-skeleton__line apply-skeleton__doc-btn" />
              </div>
              <div className="apply-skeleton__doc">
                <div className="detail-skeleton__line apply-skeleton__doc-name" />
                <div className="detail-skeleton__line apply-skeleton__doc-btn" />
              </div>
            </div>
            <div className="apply-skeleton__fieldset">
              <div className="detail-skeleton__line apply-skeleton__legend" />
              <div className="apply-skeleton__consent">
                <div className="detail-skeleton__line apply-skeleton__check" />
                <div className="detail-skeleton__line apply-skeleton__consent-text" />
              </div>
              <div className="apply-skeleton__consent">
                <div className="detail-skeleton__line apply-skeleton__check" />
                <div className="detail-skeleton__line apply-skeleton__consent-text" />
              </div>
            </div>
            <div className="detail-skeleton__line apply-skeleton__submit" />
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (!item) {
    return (
      <DetailLayout backTo={backList} backLabel="Geri">
        <p>{error || "Kayıt bulunamadı."}</p>
      </DetailLayout>
    );
  }

  if (item.basvuru_durumu !== "acik") {
    return (
      <DetailLayout backTo={backTo} backLabel="Detaya dön">
        <p>Bu kayda şu anda başvuru alınmıyor.</p>
        <Link to={backTo}>Detaya dön</Link>
      </DetailLayout>
    );
  }

  const title = kind === "kurs" ? (kurs as Kurs).brans : (etkinlik as Etkinlik).ad;

  return (
    <DetailLayout backTo={backTo} backLabel="Detaya dön">
      <div className="detail">
        <PageHeader
          title="Başvuru yap"
          description={`${title} için başvuru formu`}
        />

        <div className="login__panel">
          <form className="login__form" onSubmit={onSubmit}>
            <p className="login__hint" style={{ textAlign: "left" }}>
              Başvuran: <strong>{kisi?.tam_adi}</strong>
              {kisi?.tc_kimlik_no ? ` · ${kisi.tc_kimlik_no}` : ""}
            </p>

            {cocukBasvurusuIzinli ? (
              <fieldset className="apply-fieldset">
                <legend>Başvuru kimin için?</legend>
                <div
                  className="apply-choice"
                  role="radiogroup"
                  aria-label="Başvuru kimin için?"
                >
                  <label
                    className={`apply-choice__option${
                      basvuruIcin === "kendisi" ? " is-selected" : ""
                    }`}
                  >
                    <input
                      className="apply-choice__input"
                      type="radio"
                      name="basvuru_icin"
                      value="kendisi"
                      checked={basvuruIcin === "kendisi"}
                      onChange={() => {
                        setBasvuruIcin("kendisi");
                        setForm((f) => ({
                          ...f,
                          cinsiyet: kisi?.cinsiyet ?? f.cinsiyet,
                        }));
                      }}
                    />
                    <span className="apply-choice__title">Kendim için</span>
                    <span className="apply-choice__desc">
                      Başvuruyu kendi adıma yapıyorum
                    </span>
                  </label>
                  <label
                    className={`apply-choice__option${
                      basvuruIcin === "cocuk" ? " is-selected" : ""
                    }`}
                  >
                    <input
                      className="apply-choice__input"
                      type="radio"
                      name="basvuru_icin"
                      value="cocuk"
                      checked={basvuruIcin === "cocuk"}
                      onChange={() => {
                        setBasvuruIcin("cocuk");
                        setForm((f) => ({ ...f, cinsiyet: "" }));
                      }}
                    />
                    <span className="apply-choice__title">Çocuğum için</span>
                    <span className="apply-choice__desc">
                      Velisi olduğum çocuk adına başvuruyorum
                    </span>
                  </label>
                </div>
                {fieldErrors.basvuru_icin?.[0] ? (
                  <small className="field-error">
                    {fieldErrors.basvuru_icin[0]}
                  </small>
                ) : null}
              </fieldset>
            ) : null}

            {cocukAdina ? (
              <fieldset className="apply-fieldset">
                <legend>Çocuk bilgileri</legend>
                <div className="field-row">
                  <label className="field">
                    <span>Ad *</span>
                    <input
                      value={form.cocuk_ad}
                      onChange={(e) =>
                        setForm({ ...form, cocuk_ad: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.cocuk_ad?.[0] ? (
                      <small className="field-error">{fieldErrors.cocuk_ad[0]}</small>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>Soyad *</span>
                    <input
                      value={form.cocuk_soyad}
                      onChange={(e) =>
                        setForm({ ...form, cocuk_soyad: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.cocuk_soyad?.[0] ? (
                      <small className="field-error">{fieldErrors.cocuk_soyad[0]}</small>
                    ) : null}
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>T.C. Kimlik No *</span>
                    <input
                      maxLength={11}
                      inputMode="numeric"
                      value={form.cocuk_tc_kimlik_no}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cocuk_tc_kimlik_no: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      required
                    />
                    {fieldErrors.cocuk_tc_kimlik_no?.[0] ? (
                      <small className="field-error">
                        {fieldErrors.cocuk_tc_kimlik_no[0]}
                      </small>
                    ) : null}
                  </label>
                  <label className="field">
                    <span>Doğum tarihi *</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.cocuk_dogum_tarihi}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cocuk_dogum_tarihi: formatDogumInput(e.target.value),
                        })
                      }
                      placeholder="GG.AA.YYYY"
                      autoComplete="bday"
                      maxLength={10}
                      required
                    />
                    {fieldErrors.cocuk_dogum_tarihi?.[0] ? (
                      <small className="field-error">
                        {fieldErrors.cocuk_dogum_tarihi[0]}
                      </small>
                    ) : null}
                  </label>
                </div>
                {item.cinsiyet_sarti && !kimlikAktif ? (
                  <label className="field">
                    <span>Cinsiyet *</span>
                    <select
                      value={form.cinsiyet}
                      onChange={(e) =>
                        setForm({ ...form, cinsiyet: e.target.value })
                      }
                      required
                    >
                      <option value="">Seçiniz</option>
                      <option value="kadin">Kadın</option>
                      <option value="erkek">Erkek</option>
                    </select>
                    {fieldErrors.cinsiyet?.[0] ? (
                      <small className="field-error">
                        {fieldErrors.cinsiyet[0]}
                      </small>
                    ) : null}
                  </label>
                ) : null}
              </fieldset>
            ) : null}

            {hasMissingProfile ? (
              <fieldset className="apply-fieldset">
                <legend>Eksik bilgiler</legend>

                {missing.telefon ? (
                  <label className="field">
                    <span>Telefon *</span>
                    <input
                      value={form.telefon}
                      onChange={(e) =>
                        setForm({ ...form, telefon: e.target.value })
                      }
                      required
                    />
                  </label>
                ) : null}

                {missing.email ? (
                  <label className="field">
                    <span>E-posta</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </label>
                ) : null}

                {missing.il || missing.ilce ? (
                  <div className="field-row">
                    {missing.il ? (
                      <label className="field">
                        <span>İl *</span>
                        <ScrollSelect
                          value={form.il}
                          required
                          aria-label="İl"
                          options={sortedIller.map((il) => ({
                            value: il.ad,
                            label: il.ad,
                          }))}
                          onChange={(ad) => {
                            const match = iller.find((i) => i.ad === ad);
                            setSelectedIlId(match?.id ?? null);
                            setForm({ ...form, il: ad, ilce: "" });
                          }}
                        />
                        {fieldErrors.il?.[0] ? (
                          <small className="field-error">
                            {fieldErrors.il[0]}
                          </small>
                        ) : null}
                      </label>
                    ) : null}
                    {missing.ilce ? (
                      <label className="field">
                        <span>İlçe *</span>
                        <ScrollSelect
                          value={form.ilce}
                          required
                          aria-label="İlçe"
                          disabled={
                            !(
                              selectedIlId ||
                              form.il.trim() ||
                              kisi?.il?.trim()
                            )
                          }
                          options={sortedIlceler.map((ilce) => ({
                            value: ilce.ad,
                            label: ilce.ad,
                          }))}
                          onChange={(ad) => setForm({ ...form, ilce: ad })}
                        />
                        {fieldErrors.ilce?.[0] ? (
                          <small className="field-error">
                            {fieldErrors.ilce[0]}
                          </small>
                        ) : null}
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {missing.adres ? (
                  <label className="field">
                    <span>Adres *</span>
                    <input
                      value={form.adres}
                      onChange={(e) =>
                        setForm({ ...form, adres: e.target.value })
                      }
                      required
                    />
                    {fieldErrors.adres?.[0] ? (
                      <small className="field-error">
                        {fieldErrors.adres[0]}
                      </small>
                    ) : null}
                  </label>
                ) : null}

                {!cocukAdina && !kimlikAktif && missing.cinsiyet ? (
                  <label className="field">
                    <span>
                      Cinsiyet{item.cinsiyet_sarti ? " *" : ""}
                    </span>
                    <select
                      value={form.cinsiyet}
                      onChange={(e) =>
                        setForm({ ...form, cinsiyet: e.target.value })
                      }
                      required={Boolean(item.cinsiyet_sarti)}
                    >
                      <option value="">Seçiniz</option>
                      <option value="kadin">Kadın</option>
                      <option value="erkek">Erkek</option>
                    </select>
                    {fieldErrors.cinsiyet?.[0] ? (
                      <small className="field-error">
                        {fieldErrors.cinsiyet[0]}
                      </small>
                    ) : null}
                  </label>
                ) : null}

                {needsVeli ? (
                  <>
                    <p className="apply-note">
                      18 yaşından küçük başvurular için veli bilgileri zorunludur.
                    </p>
                    <label className="field">
                      <span>Veli T.C. Kimlik No *</span>
                      <input
                        maxLength={11}
                        value={form.veli_tc_kimlik_no}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            veli_tc_kimlik_no: e.target.value.replace(
                              /\D/g,
                              "",
                            ),
                          })
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Veli doğum tarihi *</span>
                      <input
                        type="date"
                        value={form.veli_dogum_tarihi}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            veli_dogum_tarihi: e.target.value,
                          })
                        }
                        required
                      />
                    </label>
                    <div className="field-row">
                      <label className="field">
                        <span>Veli ad *</span>
                        <input
                          value={form.veli_ad}
                          onChange={(e) =>
                            setForm({ ...form, veli_ad: e.target.value })
                          }
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Veli soyad *</span>
                        <input
                          value={form.veli_soyad}
                          onChange={(e) =>
                            setForm({ ...form, veli_soyad: e.target.value })
                          }
                          required
                        />
                      </label>
                    </div>
                  </>
                ) : null}
              </fieldset>
            ) : (
              <p className="login__hint" style={{ textAlign: "left" }}>
                Profil bilgileriniz tamam. Başvuruya devam edebilirsiniz.
              </p>
            )}

            {evrakTipleri.length > 0 ? (
              <fieldset className="apply-fieldset">
                <legend>Gerekli evraklar</legend>
                {evrakTipleri.map((tip) => (
                  <label key={tip.id} className="field">
                    <span>
                      {tip.ad} *
                      {tip.aciklama ? (
                        <em style={{ fontWeight: 400 }}> — {tip.aciklama}</em>
                      ) : null}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                      required
                      onChange={(e) =>
                        setFiles((f) => ({
                          ...f,
                          [tip.id]: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    {fieldErrors[`evrak.${tip.id}`]?.[0] ? (
                      <small className="field-error">
                        {fieldErrors[`evrak.${tip.id}`][0]}
                      </small>
                    ) : null}
                  </label>
                ))}
              </fieldset>
            ) : null}

            {basvuruOnaylari.length > 0 ? (
              <fieldset className="apply-fieldset">
                <legend>Onaylar</legend>
                {basvuruOnaylari.map((onay) => {
                  const field = onayFieldName(onay.kod);
                  return (
                    <div key={onay.kod} className="consent-row">
                      <div className="consent-row__line">
                        <label className="consent-check">
                          <input
                            type="checkbox"
                            checked={Boolean(onaylar[onay.kod])}
                            onChange={(e) =>
                              setOnaylar((prev) => ({
                                ...prev,
                                [onay.kod]: e.target.checked,
                              }))
                            }
                            required
                          />
                          <span className="consent-check__text">
                            <button
                              type="button"
                              className="consent-link"
                              onClick={(e) => {
                                e.preventDefault();
                                setAktifMetin(onay);
                              }}
                            >
                              {onay.baslik} okudum, onayladım.
                            </button>
                          </span>
                        </label>
                      </div>
                      {fieldErrors[field]?.[0] ? (
                        <small className="field-error">
                          {fieldErrors[field][0]}
                        </small>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
            ) : null}

            {error ? (
              <div className="form-error" role="alert">
                <p>{error}</p>
                {errorDetails.length > 0 ? (
                  <ul className="form-error__list">
                    {errorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {success ? <p className="form-success">{success}</p> : null}

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={submitting || Boolean(success)}
            >
              {success
                ? "Yönlendiriliyor…"
                : submitting
                  ? "Gönderiliyor…"
                  : "Başvuruyu gönder"}
            </button>
          </form>
        </div>
      </div>

      {aktifMetin
        ? createPortal(
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => setAktifMetin(null)}
            >
              <div
                className="modal modal--consent"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consent-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal__head">
                  <h2 id="consent-modal-title">{aktifMetin.baslik}</h2>
                  <button
                    type="button"
                    className="modal__close"
                    aria-label="Kapat"
                    onClick={() => setAktifMetin(null)}
                  >
                    ×
                  </button>
                </div>
                <div
                  className="modal__body consent-html"
                  dangerouslySetInnerHTML={{ __html: aktifMetin.metin }}
                />
                <div className="modal__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setAktifMetin(null)}
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      setOnaylar((prev) => ({
                        ...prev,
                        [aktifMetin.kod]: true,
                      }));
                      setAktifMetin(null);
                    }}
                  >
                    Onayla
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </DetailLayout>
  );
}
