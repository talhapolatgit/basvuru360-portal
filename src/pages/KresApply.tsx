import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useBasvuruDogrulama } from "../components/BasvuruDogrulama";
import { useAuth } from "../auth/AuthContext";
import { usePortalPages } from "../auth/PortalPagesContext";
import { usePortalSayfaMeta } from "../hooks/usePortalSayfaMeta";
import {
  createKresBasvuru,
  fetchKresBasvuruDurum,
  fetchKresGruplar,
  fetchKresOkullar,
  fetchKresSoruFormu,
} from "../api/basvurular";
import { ApiError } from "../api/client";
import {
  dogumToIso,
  formatCepTelefonu,
  formatDogumInput,
  isoToDogumDisplay,
} from "../lib/format";
import type {
  KresBasvuruDurum,
  KresGrupSecim,
  KresOkulSecim,
  KresSoru,
  KresSoruFormuPayload,
} from "../types";
import "./Login.css";
import "./Listing.css";
import "./KresApply.css";

type Step = "kisiler" | "okullar" | "gruplar" | "sorular" | "basarili";

const STEPS: { id: Exclude<Step, "basarili">; label: string }[] = [
  { id: "kisiler", label: "Bilgiler" },
  { id: "okullar", label: "Okul" },
  { id: "gruplar", label: "Grup" },
  { id: "sorular", label: "Form" },
];

function digitsOnly(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

function firstError(
  fieldErrors: Record<string, string[]>,
  key: string,
): string | undefined {
  return fieldErrors[key]?.[0];
}

export function KresApply() {
  const { kisi, refreshKisi } = useAuth();
  const { paths } = usePortalPages();
  const basvuruDogrulama = useBasvuruDogrulama();
  const sayfaMeta = usePortalSayfaMeta("kres-basvuru", {
    baslik: "Kreş Başvuru",
    aciklama: "Aktif dönem için veli ve öğrenci bilgileriyle kreş başvurusu yapın.",
  });

  const [durum, setDurum] = useState<KresBasvuruDurum | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("kisiler");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    veli_ad: kisi?.ad ?? "",
    veli_soyad: kisi?.soyad ?? "",
    veli_tc_kimlik_no: kisi?.tc_kimlik_no ?? "",
    veli_dogum_tarihi: isoToDogumDisplay(kisi?.dogum_tarihi),
    veli_telefon: formatCepTelefonu(kisi?.telefon ?? ""),
    veli_email: kisi?.email ?? "",
    veli_adres: kisi?.adres ?? kisi?.diger_adres ?? "",
    ogrenci_ad: "",
    ogrenci_soyad: "",
    ogrenci_tc_kimlik_no: "",
    ogrenci_dogum_tarihi: "",
  });

  const [okullar, setOkullar] = useState<KresOkulSecim[]>([]);
  const [ogrenciYas, setOgrenciYas] = useState<number | null>(null);
  const [selectedOkulId, setSelectedOkulId] = useState<number | null>(null);
  const [gruplar, setGruplar] = useState<KresGrupSecim[]>([]);
  const [selectedOkulAd, setSelectedOkulAd] = useState<string | null>(null);
  const [selectedGrupId, setSelectedGrupId] = useState<number | null>(null);
  const [soruFormu, setSoruFormu] = useState<KresSoruFormuPayload | null>(null);
  const [cevaplar, setCevaplar] = useState<Record<number, string | number[]>>({});
  const [dosyalar, setDosyalar] = useState<Record<number, File | null>>({});
  const [checkboxUyari, setCheckboxUyari] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchKresBasvuruDurum();
        if (!cancelled) setDurum(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Kreş başvuru dönemi yüklenemedi.",
          );
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
    if (!kisi) return;
    setForm((prev) => ({
      ...prev,
      veli_ad: prev.veli_ad || kisi.ad || "",
      veli_soyad: prev.veli_soyad || kisi.soyad || "",
      veli_tc_kimlik_no: prev.veli_tc_kimlik_no || kisi.tc_kimlik_no || "",
      veli_dogum_tarihi:
        prev.veli_dogum_tarihi || isoToDogumDisplay(kisi.dogum_tarihi),
      veli_telefon: prev.veli_telefon || formatCepTelefonu(kisi.telefon ?? ""),
      veli_email: prev.veli_email || kisi.email || "",
      veli_adres: prev.veli_adres || kisi.adres || kisi.diger_adres || "",
    }));
  }, [kisi]);

  useEffect(() => {
    if (!error && errorDetails.length === 0) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error, errorDetails]);

  const ogrenciDogumIso = useMemo(
    () => dogumToIso(form.ogrenci_dogum_tarihi),
    [form.ogrenci_dogum_tarihi],
  );

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearAlerts() {
    setError(null);
    setErrorDetails([]);
    setFieldErrors({});
  }

  function showApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      setError(err.message);
      setErrorDetails(err.detailMessages());
      setFieldErrors(err.errors ?? {});
    } else {
      setError(fallback);
      setErrorDetails([]);
    }
  }

  function validateKisiler(): boolean {
    const next: Record<string, string[]> = {};
    const required: Array<[keyof typeof form, string]> = [
      ["veli_ad", "Veli adı zorunludur."],
      ["veli_soyad", "Veli soyadı zorunludur."],
      ["veli_tc_kimlik_no", "Veli T.C. kimlik no zorunludur."],
      ["veli_dogum_tarihi", "Veli doğum tarihi zorunludur."],
      ["veli_telefon", "Veli telefon numarası zorunludur."],
      ["veli_email", "Veli e-posta adresi zorunludur."],
      ["veli_adres", "Ev adresi zorunludur."],
      ["ogrenci_ad", "Öğrenci adı zorunludur."],
      ["ogrenci_soyad", "Öğrenci soyadı zorunludur."],
      ["ogrenci_tc_kimlik_no", "Öğrenci T.C. kimlik no zorunludur."],
      ["ogrenci_dogum_tarihi", "Öğrenci doğum tarihi zorunludur."],
    ];
    for (const [key, msg] of required) {
      if (!String(form[key]).trim()) next[key] = [msg];
    }
    if (form.veli_tc_kimlik_no && form.veli_tc_kimlik_no.length !== 11) {
      next.veli_tc_kimlik_no = ["Veli T.C. kimlik no 11 haneli olmalıdır."];
    }
    if (form.ogrenci_tc_kimlik_no && form.ogrenci_tc_kimlik_no.length !== 11) {
      next.ogrenci_tc_kimlik_no = ["Öğrenci T.C. kimlik no 11 haneli olmalıdır."];
    }
    if (
      form.veli_tc_kimlik_no &&
      form.ogrenci_tc_kimlik_no &&
      form.veli_tc_kimlik_no === form.ogrenci_tc_kimlik_no
    ) {
      next.ogrenci_tc_kimlik_no = ["Öğrenci ile veli aynı kişi olamaz."];
    }
    if (form.veli_dogum_tarihi && !dogumToIso(form.veli_dogum_tarihi)) {
      next.veli_dogum_tarihi = ["Geçerli bir doğum tarihi girin (GG.AA.YYYY)."];
    }
    if (form.ogrenci_dogum_tarihi && !ogrenciDogumIso) {
      next.ogrenci_dogum_tarihi = ["Geçerli bir doğum tarihi girin (GG.AA.YYYY)."];
    }
    const phoneDigits = form.veli_telefon.replace(/\D/g, "");
    if (form.veli_telefon && !/^05\d{9}$/.test(phoneDigits)) {
      next.veli_telefon = ["Cep telefonunu 05xx xxx xx xx formatında girin."];
    }
    if (form.veli_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.veli_email)) {
      next.veli_email = ["Geçerli bir e-posta adresi girin."];
    }
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("Eksik veya hatalı alanları kontrol edin.");
      return false;
    }
    return true;
  }

  async function goOkullar() {
    clearAlerts();
    if (!validateKisiler() || !ogrenciDogumIso) return;
    setBusy(true);
    try {
      const data = await fetchKresOkullar(ogrenciDogumIso);
      setOkullar(data.items);
      setOgrenciYas(data.ogrenci_yas);
      setSelectedOkulId(null);
      setSelectedGrupId(null);
      setGruplar([]);
      setStep("okullar");
    } catch (err) {
      showApiError(err, "Uygun okullar yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function goGruplar() {
    clearAlerts();
    if (!selectedOkulId || !ogrenciDogumIso) {
      setError("Devam etmek için bir okul seçin.");
      return;
    }
    setBusy(true);
    try {
      const data = await fetchKresGruplar(selectedOkulId, ogrenciDogumIso);
      setGruplar(data.items);
      setSelectedOkulAd(data.okul.ad);
      setSelectedGrupId(null);
      setStep("gruplar");
    } catch (err) {
      showApiError(err, "Uygun gruplar yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function goSorular() {
    clearAlerts();
    if (!selectedGrupId) {
      setError("Devam etmek için bir grup seçin.");
      return;
    }
    setBusy(true);
    try {
      const data = await fetchKresSoruFormu();
      setSoruFormu(data);
      setCevaplar({});
      setDosyalar({});
      setCheckboxUyari({});
      setStep("sorular");
    } catch (err) {
      showApiError(err, "Soru formu yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  function setCevap(soruId: number, value: string) {
    setCevaplar((prev) => ({ ...prev, [soruId]: value }));
  }

  function toggleCheckbox(soru: KresSoru, optionId: number) {
    const current = Array.isArray(cevaplar[soru.id])
      ? ([...(cevaplar[soru.id] as number[])] as number[])
      : [];
    const has = current.includes(optionId);
    if (has) {
      const next = current.filter((id) => id !== optionId);
      if (soru.min_deger != null && next.length < soru.min_deger) {
        setCheckboxUyari((prev) => ({
          ...prev,
          [soru.id]: `En az ${soru.min_deger} seçim yapın.`,
        }));
      } else {
        setCheckboxUyari((prev) => {
          const copy = { ...prev };
          delete copy[soru.id];
          return copy;
        });
      }
      setCevaplar((prev) => ({ ...prev, [soru.id]: next }));
      return;
    }
    if (soru.max_deger != null && current.length >= soru.max_deger) {
      setCheckboxUyari((prev) => ({
        ...prev,
        [soru.id]: `En fazla ${soru.max_deger} seçim yapabilirsiniz.`,
      }));
      return;
    }
    setCheckboxUyari((prev) => {
      const copy = { ...prev };
      delete copy[soru.id];
      return copy;
    });
    setCevaplar((prev) => ({ ...prev, [soru.id]: [...current, optionId] }));
  }

  function appendKisiler(fd: FormData) {
    fd.append("veli_ad", form.veli_ad.trim());
    fd.append("veli_soyad", form.veli_soyad.trim());
    fd.append("veli_tc_kimlik_no", form.veli_tc_kimlik_no);
    fd.append("veli_dogum_tarihi", dogumToIso(form.veli_dogum_tarihi) ?? "");
    fd.append("veli_telefon", form.veli_telefon);
    fd.append("veli_email", form.veli_email.trim());
    fd.append("veli_adres", form.veli_adres.trim());
    fd.append("ogrenci_ad", form.ogrenci_ad.trim());
    fd.append("ogrenci_soyad", form.ogrenci_soyad.trim());
    fd.append("ogrenci_tc_kimlik_no", form.ogrenci_tc_kimlik_no);
    fd.append("ogrenci_dogum_tarihi", ogrenciDogumIso ?? "");
    fd.append("grup_id", String(selectedGrupId ?? ""));
  }

  async function submitBasvuru(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    if (!selectedGrupId) {
      setError("Grup seçimi eksik.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    appendKisiler(fd);
    for (const soru of soruFormu?.sorular ?? []) {
      if (soru.tip === "dosya" || soru.tip === "resim") {
        const file = dosyalar[soru.id];
        if (file) fd.append(`cevaplar[${soru.id}]`, file);
        continue;
      }
      if (soru.tip === "checkbox") {
        const ids = Array.isArray(cevaplar[soru.id])
          ? (cevaplar[soru.id] as number[])
          : [];
        for (const id of ids) {
          fd.append(`cevaplar[${soru.id}][]`, String(id));
        }
        continue;
      }
      const value = String(cevaplar[soru.id] ?? "").trim();
      if (value) fd.append(`cevaplar[${soru.id}]`, value);
    }

    try {
      const sonuc = await basvuruDogrulama.calistir((ek) => {
        if (ek) {
          fd.set("dogrulama_token", ek.dogrulama_token);
          fd.set("dogrulama_kodu", ek.dogrulama_kodu);
        }
        return createKresBasvuru(fd);
      });
      if (!sonuc) return;
      try {
        await refreshKisi();
      } catch {
        /* profil yenileme başarısız olsa da başvuru tamamlandı */
      }
      setStep("basarili");
    } catch (err) {
      showApiError(err, "Başvuru gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page page-enter">
        <PageHeader title={sayfaMeta.baslik} description="Yükleniyor…" />
      </div>
    );
  }

  if (!durum?.acik) {
    return (
      <div className="page page-enter">
        <PageHeader
          title={sayfaMeta.baslik}
          description={sayfaMeta.aciklama}
        />
        <div className="login__panel">
          <p className="form-error">
            {durum?.mesaj || error || "Şu anda portalda açık bir kreş başvuru dönemi yok."}
          </p>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="page page-enter kres-apply">
      <PageHeader
        eyebrow={durum.donem?.ad ?? undefined}
        title={sayfaMeta.baslik}
        description={sayfaMeta.aciklama}
      />

      {step !== "basarili" ? (
        <ol className="kres-steps" aria-label="Başvuru adımları">
          {STEPS.map((item, index) => (
            <li
              key={item.id}
              className={`kres-steps__item${index === stepIndex ? " is-current" : ""}${index < stepIndex ? " is-done" : ""}`}
            >
              <span className="kres-steps__num">{index + 1}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {errorDetails.length > 0 ? (
        <div className="form-error" role="alert">
          <ul className="form-error__list">
            {errorDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </div>
      ) : error ? (
        <div className="form-error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {step === "kisiler" ? (
        <form
          className="login__panel login__form"
          onSubmit={(e) => {
            e.preventDefault();
            void goOkullar();
          }}
        >
          <fieldset className="apply-fieldset">
            <legend>Veli bilgileri</legend>
            <div className="field-row">
              <label className="field">
                <span>Ad</span>
                <input
                  value={form.veli_ad}
                  onChange={(e) => setField("veli_ad", e.target.value)}
                  autoComplete="given-name"
                />
                {firstError(fieldErrors, "veli_ad") ? (
                  <small className="field-error">{firstError(fieldErrors, "veli_ad")}</small>
                ) : null}
              </label>
              <label className="field">
                <span>Soyad</span>
                <input
                  value={form.veli_soyad}
                  onChange={(e) => setField("veli_soyad", e.target.value)}
                  autoComplete="family-name"
                />
                {firstError(fieldErrors, "veli_soyad") ? (
                  <small className="field-error">{firstError(fieldErrors, "veli_soyad")}</small>
                ) : null}
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>T.C. Kimlik No</span>
                <input
                  inputMode="numeric"
                  maxLength={11}
                  value={form.veli_tc_kimlik_no}
                  onChange={(e) =>
                    setField("veli_tc_kimlik_no", digitsOnly(e.target.value, 11))
                  }
                />
                {firstError(fieldErrors, "veli_tc_kimlik_no") ? (
                  <small className="field-error">
                    {firstError(fieldErrors, "veli_tc_kimlik_no")}
                  </small>
                ) : null}
              </label>
              <label className="field">
                <span>Doğum tarihi</span>
                <input
                  placeholder="GG.AA.YYYY"
                  inputMode="numeric"
                  value={form.veli_dogum_tarihi}
                  onChange={(e) =>
                    setField("veli_dogum_tarihi", formatDogumInput(e.target.value))
                  }
                />
                {firstError(fieldErrors, "veli_dogum_tarihi") ? (
                  <small className="field-error">
                    {firstError(fieldErrors, "veli_dogum_tarihi")}
                  </small>
                ) : null}
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Telefon numarası</span>
                <input
                  inputMode="tel"
                  placeholder="05xx xxx xx xx"
                  value={form.veli_telefon}
                  onChange={(e) =>
                    setField("veli_telefon", formatCepTelefonu(e.target.value))
                  }
                />
                {firstError(fieldErrors, "veli_telefon") ? (
                  <small className="field-error">
                    {firstError(fieldErrors, "veli_telefon")}
                  </small>
                ) : null}
              </label>
              <label className="field">
                <span>E-posta adresi</span>
                <input
                  type="email"
                  value={form.veli_email}
                  onChange={(e) => setField("veli_email", e.target.value)}
                  autoComplete="email"
                />
                {firstError(fieldErrors, "veli_email") ? (
                  <small className="field-error">{firstError(fieldErrors, "veli_email")}</small>
                ) : null}
              </label>
            </div>
            <label className="field">
              <span>Ev adresi</span>
              <textarea
                rows={3}
                value={form.veli_adres}
                onChange={(e) => setField("veli_adres", e.target.value)}
              />
              {firstError(fieldErrors, "veli_adres") ? (
                <small className="field-error">{firstError(fieldErrors, "veli_adres")}</small>
              ) : null}
            </label>
          </fieldset>

          <fieldset className="apply-fieldset">
            <legend>Öğrenci bilgileri</legend>
            <div className="field-row">
              <label className="field">
                <span>Ad</span>
                <input
                  value={form.ogrenci_ad}
                  onChange={(e) => setField("ogrenci_ad", e.target.value)}
                />
                {firstError(fieldErrors, "ogrenci_ad") ? (
                  <small className="field-error">{firstError(fieldErrors, "ogrenci_ad")}</small>
                ) : null}
              </label>
              <label className="field">
                <span>Soyad</span>
                <input
                  value={form.ogrenci_soyad}
                  onChange={(e) => setField("ogrenci_soyad", e.target.value)}
                />
                {firstError(fieldErrors, "ogrenci_soyad") ? (
                  <small className="field-error">{firstError(fieldErrors, "ogrenci_soyad")}</small>
                ) : null}
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>T.C. Kimlik No</span>
                <input
                  inputMode="numeric"
                  maxLength={11}
                  value={form.ogrenci_tc_kimlik_no}
                  onChange={(e) =>
                    setField("ogrenci_tc_kimlik_no", digitsOnly(e.target.value, 11))
                  }
                />
                {firstError(fieldErrors, "ogrenci_tc_kimlik_no") ? (
                  <small className="field-error">
                    {firstError(fieldErrors, "ogrenci_tc_kimlik_no")}
                  </small>
                ) : null}
              </label>
              <label className="field">
                <span>Doğum tarihi</span>
                <input
                  placeholder="GG.AA.YYYY"
                  inputMode="numeric"
                  value={form.ogrenci_dogum_tarihi}
                  onChange={(e) =>
                    setField(
                      "ogrenci_dogum_tarihi",
                      formatDogumInput(e.target.value),
                    )
                  }
                />
                {firstError(fieldErrors, "ogrenci_dogum_tarihi") ? (
                  <small className="field-error">
                    {firstError(fieldErrors, "ogrenci_dogum_tarihi")}
                  </small>
                ) : null}
              </label>
            </div>
          </fieldset>

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Yükleniyor…" : "Devam"}
          </button>
        </form>
      ) : null}

      {step === "okullar" ? (
        <div className="login__panel kres-apply__panel">
          <p className="kres-apply__hint">
            Öğrenci yaşı: {ogrenciYas ?? "—"} · Uygun okullar listeleniyor.
          </p>
          {okullar.length === 0 ? (
            <p className="listing__empty">Öğrenciye uygun grup bulunan okul yok.</p>
          ) : (
            <ul className="kres-choice-list">
              {okullar.map((okul) => (
                <li key={okul.id}>
                  <button
                    type="button"
                    className={`kres-choice${selectedOkulId === okul.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedOkulId(okul.id)}
                  >
                    <strong>{okul.ad}</strong>
                    {okul.adres ? <span>{okul.adres}</span> : null}
                    <em>
                      {okul.uygun_grup_sayisi} uygun grup
                      {okul.telefon ? ` · ${okul.telefon}` : ""}
                    </em>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="kres-apply__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clearAlerts();
                setStep("kisiler");
              }}
            >
              Geri
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !selectedOkulId}
              onClick={() => void goGruplar()}
            >
              {busy ? "Yükleniyor…" : "Devam"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "gruplar" ? (
        <div className="login__panel kres-apply__panel">
          <p className="kres-apply__hint">
            {selectedOkulAd} · öğrenciye uygun gruplar
          </p>
          {gruplar.length === 0 ? (
            <p className="listing__empty">Bu okulda uygun grup yok.</p>
          ) : (
            <ul className="kres-choice-list">
              {gruplar.map((grup) => (
                <li key={grup.id}>
                  <button
                    type="button"
                    className={`kres-choice${selectedGrupId === grup.id ? " is-selected" : ""}`}
                    onClick={() => setSelectedGrupId(grup.id)}
                  >
                    <strong>{grup.ad}</strong>
                    <span>
                      {[grup.yas_araligi, grup.cinsiyet_sarti]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <em>
                      Kontenjan {grup.kontenjan} · Kesin kayıt {grup.kesin_kayit}
                    </em>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="kres-apply__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clearAlerts();
                setStep("okullar");
              }}
            >
              Geri
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !selectedGrupId}
              onClick={() => void goSorular()}
            >
              {busy ? "Yükleniyor…" : "Devam"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "sorular" ? (
        <form className="login__panel login__form" onSubmit={(e) => void submitBasvuru(e)}>
          <fieldset className="apply-fieldset">
            <legend>{soruFormu?.form?.ad || "Soru formu"}</legend>
            {soruFormu?.form?.aciklama ? (
              <p className="kres-apply__hint">{soruFormu.form.aciklama}</p>
            ) : null}
            {(soruFormu?.sorular ?? []).length === 0 ? (
              <p className="kres-apply__hint">
                Bu dönem için ek soru yok. Başvuruyu tamamlayabilirsiniz.
              </p>
            ) : (
              soruFormu?.sorular.map((soru) => (
                <SoruAlani
                  key={soru.id}
                  soru={soru}
                  value={cevaplar[soru.id]}
                  file={dosyalar[soru.id] ?? null}
                  uyari={checkboxUyari[soru.id]}
                  fieldError={
                    firstError(fieldErrors, `cevaplar.${soru.id}`) ||
                    firstError(fieldErrors, `cevaplar.${soru.id}.0`)
                  }
                  onChange={(value) => setCevap(soru.id, value)}
                  onFile={(file) =>
                    setDosyalar((prev) => ({ ...prev, [soru.id]: file }))
                  }
                  onToggle={(optionId) => toggleCheckbox(soru, optionId)}
                />
              ))
            )}
          </fieldset>
          <div className="kres-apply__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                clearAlerts();
                setStep("gruplar");
              }}
            >
              Geri
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Gönderiliyor…" : "Başvuruyu Tamamla"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "basarili" ? (
        <div className="login__panel kres-apply__success">
          <p className="form-success">Kreş başvurunuz alındı.</p>
          <Link to={paths.basvurularim} className="btn btn--primary">
            Başvurularıma git
          </Link>
        </div>
      ) : null}
      {basvuruDogrulama.modal}
    </div>
  );
}

function SoruAlani({
  soru,
  value,
  file,
  uyari,
  fieldError,
  onChange,
  onFile,
  onToggle,
}: {
  soru: KresSoru;
  value: string | number[] | undefined;
  file: File | null;
  uyari?: string;
  fieldError?: string;
  onChange: (value: string) => void;
  onFile: (file: File | null) => void;
  onToggle: (optionId: number) => void;
}) {
  const text = typeof value === "string" ? value : "";
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="field">
      <span>
        {soru.baslik}
        {soru.zorunlu ? " *" : ""}
      </span>
      {soru.aciklama ? <em className="kres-apply__soru-desc">{soru.aciklama}</em> : null}

      {soru.tip === "uzun_metin" ? (
        <textarea
          rows={4}
          placeholder={soru.placeholder ?? ""}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {soru.tip === "metin" || soru.tip === "eposta" ? (
        <input
          type={soru.tip === "eposta" ? "email" : "text"}
          placeholder={soru.placeholder ?? ""}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {soru.tip === "sayi" ? (
        <input
          type="number"
          step={soru.tam_sayi ? 1 : "any"}
          min={soru.min_deger ?? undefined}
          max={soru.max_deger ?? undefined}
          placeholder={soru.placeholder ?? ""}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {soru.tip === "tc_kimlik" ? (
        <input
          inputMode="numeric"
          maxLength={11}
          placeholder={soru.placeholder ?? ""}
          value={text}
          onChange={(e) => onChange(digitsOnly(e.target.value, 11))}
        />
      ) : null}

      {soru.tip === "cep_telefonu" ? (
        <input
          inputMode="tel"
          placeholder={soru.placeholder ?? "05xx xxx xx xx"}
          value={text}
          onChange={(e) => onChange(formatCepTelefonu(e.target.value))}
        />
      ) : null}

      {soru.tip === "tarih" ? (
        <input type="date" value={text} onChange={(e) => onChange(e.target.value)} />
      ) : null}

      {soru.tip === "liste" ? (
        <select value={text} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seçiniz</option>
          {soru.secenekler.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
              {opt.etiket}
            </option>
          ))}
        </select>
      ) : null}

      {soru.tip === "radio" ? (
        <div className="kres-options">
          {soru.secenekler.map((opt) => (
            <label key={opt.id} className="kres-options__item">
              <input
                type="radio"
                name={`soru-${soru.id}`}
                checked={text === String(opt.id)}
                onChange={() => onChange(String(opt.id))}
              />
              <span className="kres-options__label">{opt.etiket}</span>
            </label>
          ))}
        </div>
      ) : null}

      {soru.tip === "checkbox" ? (
        <div className="kres-options">
          {soru.secenekler.map((opt) => (
            <label key={opt.id} className="kres-options__item">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => onToggle(opt.id)}
              />
              <span className="kres-options__label">{opt.etiket}</span>
            </label>
          ))}
        </div>
      ) : null}

      {soru.tip === "dosya" || soru.tip === "resim" ? (
        <input
          type="file"
          accept={soru.tip === "resim" ? "image/jpeg,image/png,image/webp,image/gif" : undefined}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      ) : null}

      {file ? <small>{file.name}</small> : null}
      {uyari ? <small className="field-error">{uyari}</small> : null}
      {fieldError ? <small className="field-error">{fieldError}</small> : null}
    </div>
  );
}
