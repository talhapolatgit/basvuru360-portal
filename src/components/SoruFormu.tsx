import { useCallback, useMemo, useState } from "react";
import { formatCepTelefonu } from "../lib/format";
import type { BasvuruSoru } from "../types";
import "./SoruFormu.css";

type CevapDegeri = string | number[];

export type SoruFormuKontrol = {
  cevaplar: Record<number, CevapDegeri>;
  dosyalar: Record<number, File | null>;
  uyarilar: Record<number, string>;
  gorunur: (soru: BasvuruSoru) => boolean;
  setCevap: (soruId: number, value: string) => void;
  setDosya: (soruId: number, file: File | null) => void;
  toggleSecenek: (soru: BasvuruSoru, secenekId: number) => void;
  sifirla: () => void;
  /** Yalnızca görünür soruların cevaplarını cevaplar[<id>] olarak ekler. */
  formDatayaEkle: (fd: FormData) => void;
  /** Görünür soruları sunucudaki kurallarla doğrular; hataları `cevaplar.<id>` anahtarıyla döner. */
  dogrula: () => Record<string, string[]>;
};

function digitsOnly(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

function seciliIdler(soru: BasvuruSoru, deger: CevapDegeri | undefined): number[] {
  if (soru.tip === "checkbox") {
    return Array.isArray(deger) ? deger : [];
  }
  if ((soru.tip === "liste" || soru.tip === "radio") && typeof deger === "string" && deger) {
    return [Number(deger)];
  }
  return [];
}

function sayiMetni(deger: number): string {
  return Number.isInteger(deger) ? String(deger) : String(deger).replace(".", ",");
}

function soruHatasi(
  soru: BasvuruSoru,
  deger: CevapDegeri | undefined,
  dosya: File | null | undefined,
): string | null {
  if (soru.tip === "dosya" || soru.tip === "resim") {
    if (!dosya) return soru.zorunlu ? `${soru.baslik} için dosya yükleyin.` : null;
    if (dosya.size > 10 * 1024 * 1024) return `${soru.baslik}: Dosya en fazla 10 MB olabilir.`;
    return null;
  }

  if (soru.tip === "checkbox") {
    const secim = Array.isArray(deger) ? deger : [];
    if (secim.length === 0 && soru.zorunlu) return `${soru.baslik} için seçim yapın.`;
    if (secim.length > 0 || soru.zorunlu) {
      if (soru.min_deger != null && secim.length < soru.min_deger) {
        return `${soru.baslik} için en az ${soru.min_deger} seçim yapın.`;
      }
      if (soru.max_deger != null && secim.length > soru.max_deger) {
        return `${soru.baslik} için en fazla ${soru.max_deger} seçim yapın.`;
      }
    }
    return null;
  }

  const metin = typeof deger === "string" ? deger.trim() : "";
  if (!metin) return soru.zorunlu ? `${soru.baslik} zorunludur.` : null;

  let mesaj: string | null = null;
  switch (soru.tip) {
    case "sayi": {
      const sayi = Number(metin.replace(",", "."));
      if (!Number.isFinite(sayi)) mesaj = "Sayı girin.";
      else if (soru.tam_sayi && !Number.isInteger(sayi)) mesaj = "Tam sayı girin.";
      else if (soru.min_deger != null && sayi < soru.min_deger) {
        mesaj = `Minimum değer ${sayiMetni(soru.min_deger)}.`;
      } else if (soru.max_deger != null && sayi > soru.max_deger) {
        mesaj = `Maksimum değer ${sayiMetni(soru.max_deger)}.`;
      }
      break;
    }
    case "eposta":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metin)) mesaj = "Geçerli bir e-posta girin.";
      break;
    case "tc_kimlik":
      if (!/^\d{11}$/.test(metin)) mesaj = "T.C. kimlik no 11 haneli olmalıdır.";
      break;
    case "cep_telefonu":
      if (!/^05\d{9}$/.test(metin.replace(/\D/g, ""))) {
        mesaj = "Cep telefonunu 05xx xxx xx xx formatında girin.";
      }
      break;
    case "tarih":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(metin)) mesaj = "Geçerli bir tarih girin.";
      break;
  }

  return mesaj ? `${soru.baslik}: ${mesaj}` : null;
}

export function useSoruFormu(sorular: BasvuruSoru[]): SoruFormuKontrol {
  const [cevaplar, setCevaplar] = useState<Record<number, CevapDegeri>>({});
  const [dosyalar, setDosyalar] = useState<Record<number, File | null>>({});
  const [uyarilar, setUyarilar] = useState<Record<number, string>>({});

  const gorunurlukHaritasi = useMemo(() => {
    const byId = new Map(sorular.map((soru) => [soru.id, soru]));
    const sonuc = new Map<number, boolean>();

    const hesapla = (soru: BasvuruSoru, ziyaret: Set<number>): boolean => {
      const onceki = sonuc.get(soru.id);
      if (onceki !== undefined) return onceki;
      if (!soru.kosul_soru_id || ziyaret.has(soru.id)) {
        sonuc.set(soru.id, true);
        return true;
      }
      ziyaret.add(soru.id);
      const ust = byId.get(soru.kosul_soru_id);
      const istenen = soru.kosul_secenek_ids ?? [];
      const gorunur = ust
        ? hesapla(ust, ziyaret) &&
          seciliIdler(ust, cevaplar[ust.id]).some((id) => istenen.includes(id))
        : true;
      sonuc.set(soru.id, gorunur);
      return gorunur;
    };

    sorular.forEach((soru) => hesapla(soru, new Set()));
    return sonuc;
  }, [sorular, cevaplar]);

  const gorunur = useCallback(
    (soru: BasvuruSoru) => gorunurlukHaritasi.get(soru.id) ?? true,
    [gorunurlukHaritasi],
  );

  const uyariKaldir = (soruId: number) =>
    setUyarilar((prev) => {
      if (!(soruId in prev)) return prev;
      const copy = { ...prev };
      delete copy[soruId];
      return copy;
    });

  const setCevap = (soruId: number, value: string) =>
    setCevaplar((prev) => ({ ...prev, [soruId]: value }));

  const setDosya = (soruId: number, file: File | null) =>
    setDosyalar((prev) => ({ ...prev, [soruId]: file }));

  const toggleSecenek = (soru: BasvuruSoru, secenekId: number) => {
    const mevcut = Array.isArray(cevaplar[soru.id]) ? (cevaplar[soru.id] as number[]) : [];
    if (mevcut.includes(secenekId)) {
      const sonraki = mevcut.filter((id) => id !== secenekId);
      if (soru.min_deger != null && sonraki.length < soru.min_deger) {
        setUyarilar((prev) => ({ ...prev, [soru.id]: `En az ${soru.min_deger} seçim yapın.` }));
      } else {
        uyariKaldir(soru.id);
      }
      setCevaplar((prev) => ({ ...prev, [soru.id]: sonraki }));
      return;
    }
    if (soru.max_deger != null && mevcut.length >= soru.max_deger) {
      setUyarilar((prev) => ({
        ...prev,
        [soru.id]: `En fazla ${soru.max_deger} seçim yapabilirsiniz.`,
      }));
      return;
    }
    uyariKaldir(soru.id);
    setCevaplar((prev) => ({ ...prev, [soru.id]: [...mevcut, secenekId] }));
  };

  const sifirla = () => {
    setCevaplar({});
    setDosyalar({});
    setUyarilar({});
  };

  const formDatayaEkle = (fd: FormData) => {
    for (const soru of sorular) {
      if (!gorunur(soru)) continue;
      if (soru.tip === "dosya" || soru.tip === "resim") {
        const file = dosyalar[soru.id];
        if (file) fd.append(`cevaplar[${soru.id}]`, file);
        continue;
      }
      if (soru.tip === "checkbox") {
        const ids = Array.isArray(cevaplar[soru.id]) ? (cevaplar[soru.id] as number[]) : [];
        for (const id of ids) fd.append(`cevaplar[${soru.id}][]`, String(id));
        continue;
      }
      const value = String(cevaplar[soru.id] ?? "").trim();
      if (value) fd.append(`cevaplar[${soru.id}]`, value);
    }
  };

  const dogrula = () => {
    const hatalar: Record<string, string[]> = {};
    for (const soru of sorular) {
      if (!gorunur(soru)) continue;
      const hata = soruHatasi(soru, cevaplar[soru.id], dosyalar[soru.id]);
      if (hata) hatalar[`cevaplar.${soru.id}`] = [hata];
    }
    return hatalar;
  };

  return {
    cevaplar,
    dosyalar,
    uyarilar,
    gorunur,
    setCevap,
    setDosya,
    toggleSecenek,
    sifirla,
    formDatayaEkle,
    dogrula,
  };
}

/** Hatalar render edildikten sonra ilk hatalı soruyu görünür alana kaydırır. */
export function ilkSoruHatasinaKaydir() {
  window.setTimeout(() => {
    document
      .querySelector(".soru-formu .field-error")
      ?.closest(".field")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 0);
}

export function SoruFormuAlanlari({
  sorular,
  kontrol,
  fieldErrors,
}: {
  sorular: BasvuruSoru[];
  kontrol: SoruFormuKontrol;
  fieldErrors: Record<string, string[]>;
}) {
  return (
    <div className="soru-formu">
      {sorular.filter(kontrol.gorunur).map((soru) => (
        <SoruAlani
          key={soru.id}
          soru={soru}
          value={kontrol.cevaplar[soru.id]}
          file={kontrol.dosyalar[soru.id] ?? null}
          uyari={kontrol.uyarilar[soru.id]}
          fieldError={
            fieldErrors[`cevaplar.${soru.id}`]?.[0] ?? fieldErrors[`cevaplar.${soru.id}.0`]?.[0]
          }
          onChange={(value) => kontrol.setCevap(soru.id, value)}
          onFile={(file) => kontrol.setDosya(soru.id, file)}
          onToggle={(secenekId) => kontrol.toggleSecenek(soru, secenekId)}
        />
      ))}
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
  soru: BasvuruSoru;
  value: CevapDegeri | undefined;
  file: File | null;
  uyari?: string;
  fieldError?: string;
  onChange: (value: string) => void;
  onFile: (file: File | null) => void;
  onToggle: (secenekId: number) => void;
}) {
  const text = typeof value === "string" ? value : "";
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="field">
      <span>
        {soru.baslik}
        {soru.zorunlu ? " *" : ""}
      </span>
      {soru.aciklama ? <em className="soru-formu__desc">{soru.aciklama}</em> : null}

      {soru.tip === "uzun_metin" ? (
        <textarea
          rows={4}
          maxLength={5000}
          placeholder={soru.placeholder ?? ""}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}

      {soru.tip === "metin" || soru.tip === "eposta" ? (
        <input
          type={soru.tip === "eposta" ? "email" : "text"}
          maxLength={1000}
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
        <div className="soru-options">
          {soru.secenekler.map((opt) => (
            <label key={opt.id} className="soru-options__item">
              <input
                type="radio"
                name={`soru-${soru.id}`}
                checked={text === String(opt.id)}
                onChange={() => onChange(String(opt.id))}
              />
              <span className="soru-options__label">{opt.etiket}</span>
            </label>
          ))}
        </div>
      ) : null}

      {soru.tip === "checkbox" ? (
        <div className="soru-options">
          {soru.secenekler.map((opt) => (
            <label key={opt.id} className="soru-options__item">
              <input
                type="checkbox"
                checked={selected.includes(opt.id)}
                onChange={() => onToggle(opt.id)}
              />
              <span className="soru-options__label">{opt.etiket}</span>
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
