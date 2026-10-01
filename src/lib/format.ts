import type { BasvuruDurumuKod, DersSaati, Etkinlik, EtkinlikApi, GunKodu, Kurs, KursApi } from "../types";

const GUN_UZUN: Record<GunKodu, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

export function gunUzun(gun: GunKodu): string {
  return GUN_UZUN[gun] ?? String(gun);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** GG.AA.YYYY girişini biçimlendirir. */
export function formatDogumInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** YYYY-MM-DD → GG.AA.YYYY */
export function isoToDogumDisplay(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

/** 05xxxxxxxxx — yalnızca rakam, boşluksuz cep telefonu. */
export function normalizeCepTelefonu(raw: string): string {
  let digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }
  return digits.slice(0, 11);
}

export function isCepTelefonu(raw: string): boolean {
  return /^05\d{9}$/.test(normalizeCepTelefonu(raw));
}

/** 05xx xxx xx xx */
export function formatCepTelefonu(raw: string): string {
  const digits = normalizeCepTelefonu(raw);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

/** GG.AA.YYYY → YYYY-MM-DD; geçersizse null. */
export function dogumToIso(display: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function basvuruLabel(kod: BasvuruDurumuKod | string): string {
  return (
    {
      acik: "Başvuru açık",
      yakinda: "Yakında",
      kapandi: "Kapandı",
      kapali: "Kapalı",
    } as Record<string, string>
  )[kod] ?? kod;
}

function normalizeDurum(kod: BasvuruDurumuKod): "acik" | "yakinda" | "kapandi" {
  if (kod === "acik" || kod === "yakinda") return kod;
  return "kapandi";
}

function mapProgram(
  program: KursApi["haftalik_program"],
): DersSaati[] {
  if (!program) return [];
  return program
    .filter((p) => p.gun != null && p.baslangic && p.bitis)
    .map((p) => ({
      gun: p.gun as GunKodu,
      baslangic: p.baslangic,
      bitis: p.bitis,
    }));
}

export function mapKurs(api: KursApi): Kurs {
  const durum = normalizeDurum(api.basvuru_durumu.kod);
  return {
    id: api.id,
    kurs_no: api.kurs_no,
    brans: api.brans?.ad ?? "—",
    alan: api.alan?.ad ?? "—",
    merkez: api.merkez?.ad ?? "—",
    il: api.merkez?.il ?? "",
    ilce: api.merkez?.ilce ?? "",
    kontenjan: api.kontenjan,
    kayit_sayisi: api.kayit_sayisi,
    baslama: api.kurs_baslama_tarihi ?? "",
    bitis: api.kurs_bitis_tarihi ?? "",
    basvuru_bitis: api.basvuru_bitis_tarihi ?? "",
    basvuru_durumu: durum,
    evrak_zorunlu: api.evrak_zorunlu,
    evrak_tipleri: api.evrak_tipleri ?? [],
    basvuru_onaylari: api.basvuru_onaylari ?? [],
    toplam_saat: api.toplam_kurs_saati ?? 0,
    kurs_tipi: api.kurs_tipi?.ad ?? "—",
    minimum_yas: api.minimum_yas,
    maksimum_yas: api.maksimum_yas,
    cinsiyet_sarti: api.cinsiyet_sarti,
    cinsiyet_sarti_label: api.cinsiyet_sarti_label ?? null,
    ikamet_sarti: api.ikamet_sarti ?? null,
    ikamet_sarti_label: api.ikamet_sarti_label ?? null,
    ozet: [api.alan?.ad, api.brans?.ad, api.kurs_tipi?.ad].filter(Boolean).join(" · "),
    aciklama: api.aciklama ?? null,
    haftalik_program: mapProgram(api.haftalik_program),
  };
}

export function mapEtkinlik(api: EtkinlikApi): Etkinlik {
  const durum = normalizeDurum(api.basvuru_durumu.kod);
  return {
    id: api.id,
    etkinlik_no: api.etkinlik_no,
    ad: api.ad,
    tip: api.etkinlik_tipi?.ad ?? "—",
    merkez: api.merkez?.ad ?? "—",
    etkinlik_yeri: api.etkinlik_yeri?.trim() || null,
    il: api.merkez?.il ?? "",
    ilce: api.merkez?.ilce ?? "",
    kontenjan: api.kontenjan,
    kayit_sayisi: api.kayit_sayisi,
    baslangic: api.baslangic_tarihi ?? "",
    bitis: api.bitis_tarihi ?? "",
    basvuru_bitis: api.basvuru_bitis_tarihi ?? "",
    basvuru_durumu: durum,
    evrak_zorunlu: api.evrak_zorunlu,
    evrak_tipleri: api.evrak_tipleri ?? [],
    basvuru_onaylari: api.basvuru_onaylari ?? [],
    aciklama: api.aciklama ?? "",
    minimum_yas: api.minimum_yas,
    maksimum_yas: api.maksimum_yas,
    cinsiyet_sarti: api.cinsiyet_sarti,
    cinsiyet_sarti_label: api.cinsiyet_sarti_label ?? null,
    ikamet_sarti: api.ikamet_sarti ?? null,
    ikamet_sarti_label: api.ikamet_sarti_label ?? null,
  };
}

type KosulKaynak = {
  minimum_yas: number | null;
  maksimum_yas: number | null;
  cinsiyet_sarti: string | null;
  cinsiyet_sarti_label: string | null;
  ikamet_sarti: string | null;
  ilce?: string | null;
};

function cinsiyetCogul(kaynak: KosulKaynak): string | null {
  if (!kaynak.cinsiyet_sarti) return null;
  if (kaynak.cinsiyet_sarti === "kadin") return "kadınlar";
  if (kaynak.cinsiyet_sarti === "erkek") return "erkekler";
  const label = (kaynak.cinsiyet_sarti_label || kaynak.cinsiyet_sarti).toLocaleLowerCase("tr-TR");
  return `${label}lar`;
}

function yasIfadesi(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}-${max} yaş arası`;
  if (min != null) return `${min} yaş ve üstü`;
  if (max != null) return `${max} yaş ve altı`;
  return null;
}

function cumleBaslat(metin: string): string {
  if (!metin) return metin;
  return metin.charAt(0).toLocaleUpperCase("tr-TR") + metin.slice(1);
}

/** Başvuru şartlarını tek cümle halinde özetler. Şart yoksa "Koşul yoktur." */
export function kosullarMetni(kaynak: KosulKaynak): string {
  const yas = yasIfadesi(kaynak.minimum_yas, kaynak.maksimum_yas);
  const cinsiyet = cinsiyetCogul(kaynak);
  const ikametVar =
    kaynak.ikamet_sarti === "evet" || kaynak.ikamet_sarti === "kismen";
  const ilce = kaynak.ilce?.trim() || null;
  const kismen = kaynak.ikamet_sarti === "kismen";

  if (!yas && !cinsiyet && !ikametVar) {
    return "Koşul yoktur.";
  }

  const kim = cinsiyet ?? "katılımcılar";
  let cumle: string;

  if (ikametVar) {
    const yer = ilce ? `${ilce} ilçesinde ikamet eden` : "İkamet eden";
    if (yas) {
      cumle = `${yer} ${yas} ${kim}`;
    } else {
      cumle = `${yer} ${kim}`;
    }
    if (kismen) {
      cumle += " (sınırlı ilçe dışı kontenjan ayrılmıştır)";
    }
  } else if (yas && cinsiyet) {
    cumle = `${yas} ${cinsiyet}`;
  } else if (cinsiyet) {
    cumle = `Yalnızca ${cinsiyet}`;
  } else {
    cumle = yas!;
  }

  return cumleBaslat(cumle);
}
