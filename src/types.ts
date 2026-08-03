export type GirisYontemiKod = "tc_sifre" | "tc_dogum_tarihi" | "eposta_sifre";

export type BasvuruDurumuKod = "acik" | "yakinda" | "kapandi" | "kapali";

export type GunKodu = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DersSaati = {
  gun: GunKodu;
  baslangic: string;
  bitis: string;
};

export type EvrakTipi = {
  id: number;
  ad: string;
  aciklama: string | null;
};

export type LookupItem = {
  id: number;
  ad: string;
  il?: string | null;
  ilce?: string | null;
  alan_id?: number | null;
};

export type GenelAyarlar = {
  kurum_adi: string;
  telefon: string | null;
  eposta: string | null;
  il: string | null;
  ilce: string | null;
  adres: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  web_sitesi: string | null;
  site_aciklama: string | null;
  sidebar_logo_url: string | null;
  sidebar_logo_arkaplan: string;
  header_logo_url: string | null;
  sidebar_arkaplan: string;
  sidebar_arkaplan_tip: "duz" | "gradient";
  sidebar_baslik: string | null;
  sidebar_alt_baslik: string | null;
  kisi_giris_yontemi: {
    kod: GirisYontemiKod;
    label: string;
  };
};

export type Kisi = {
  id: number;
  ad: string;
  soyad: string;
  tam_adi: string;
  tc_kimlik_no: string | null;
  dogum_tarihi: string | null;
  telefon: string | null;
  email: string | null;
  cinsiyet: "erkek" | "kadin" | null;
  il: string | null;
  ilce: string | null;
  adres: string | null;
  diger_adres: string | null;
  aktif: boolean;
  profil_foto_url: string | null;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type BasvuruOnay = {
  kod: "kvkk" | "aydinlatma" | string;
  baslik: string;
  metin: string;
};

export type KursApi = {
  id: number;
  kurs_no: string;
  merkez: { id: number; ad: string; il: string | null; ilce: string | null } | null;
  alan: { id: number; ad: string } | null;
  brans: { id: number; ad: string } | null;
  kurs_tipi: { id: number; ad: string } | null;
  kontenjan: number;
  yedek_kontenjan: number;
  kayit_sayisi: number;
  basvuru_sayisi: number;
  kurs_baslama_tarihi: string | null;
  kurs_bitis_tarihi: string | null;
  basvuru_baslama_tarihi: string | null;
  basvuru_bitis_tarihi: string | null;
  toplam_kurs_saati: number | null;
  cinsiyet_sarti: string | null;
  cinsiyet_sarti_label?: string | null;
  ikamet_sarti?: string | null;
  ikamet_sarti_label?: string | null;
  ikamet_disi_kontenjan?: number;
  minimum_yas: number | null;
  maksimum_yas: number | null;
  durum: { kod: string | null; label: string | null };
  basvuru_durumu: { kod: BasvuruDurumuKod; label: string };
  evrak_zorunlu: boolean;
  evrak_tipleri: EvrakTipi[];
  basvuru_onaylari?: BasvuruOnay[];
  haftalik_program?: Array<{
    gun: number | null;
    gun_kod?: string | null;
    gun_label?: string | null;
    baslangic: string;
    bitis: string;
    ders_saati?: number | null;
    sinif?: string | null;
  }>;
};

export type EtkinlikApi = {
  id: number;
  etkinlik_no: string;
  ad: string;
  aciklama: string | null;
  merkez: { id: number; ad: string; il: string | null; ilce: string | null } | null;
  etkinlik_tipi: { id: number; ad: string } | null;
  kontenjan: number;
  yedek_kontenjan: number;
  kayit_sayisi: number;
  basvuru_sayisi: number;
  baslangic_tarihi: string | null;
  bitis_tarihi: string | null;
  basvuru_baslama_tarihi: string | null;
  basvuru_bitis_tarihi: string | null;
  cinsiyet_sarti: string | null;
  cinsiyet_sarti_label?: string | null;
  ikamet_sarti?: string | null;
  ikamet_sarti_label?: string | null;
  ikamet_disi_kontenjan?: number;
  minimum_yas: number | null;
  maksimum_yas: number | null;
  durum: { kod: string | null; label: string | null };
  basvuru_durumu: { kod: BasvuruDurumuKod; label: string };
  evrak_zorunlu: boolean;
  evrak_tipleri: EvrakTipi[];
  basvuru_onaylari?: BasvuruOnay[];
};

/** UI kart/detay için sadeleştirilmiş kurs modeli */
export type Kurs = {
  id: number;
  kurs_no: string;
  brans: string;
  alan: string;
  merkez: string;
  il: string;
  ilce: string;
  kontenjan: number;
  kayit_sayisi: number;
  baslama: string;
  bitis: string;
  basvuru_bitis: string;
  basvuru_durumu: "acik" | "yakinda" | "kapandi";
  evrak_zorunlu: boolean;
  evrak_tipleri: EvrakTipi[];
  basvuru_onaylari: BasvuruOnay[];
  toplam_saat: number;
  kurs_tipi: string;
  minimum_yas: number | null;
  maksimum_yas: number | null;
  cinsiyet_sarti: string | null;
  cinsiyet_sarti_label: string | null;
  ikamet_sarti: string | null;
  ikamet_sarti_label: string | null;
  ozet: string;
  haftalik_program: DersSaati[];
};

export type Etkinlik = {
  id: number;
  etkinlik_no: string;
  ad: string;
  tip: string;
  merkez: string;
  il: string;
  ilce: string;
  kontenjan: number;
  kayit_sayisi: number;
  baslangic: string;
  bitis: string;
  basvuru_bitis: string;
  basvuru_durumu: "acik" | "yakinda" | "kapandi";
  evrak_zorunlu: boolean;
  evrak_tipleri: EvrakTipi[];
  basvuru_onaylari: BasvuruOnay[];
  aciklama: string;
  minimum_yas: number | null;
  maksimum_yas: number | null;
  cinsiyet_sarti: string | null;
  cinsiyet_sarti_label: string | null;
  ikamet_sarti: string | null;
  ikamet_sarti_label: string | null;
};

export type BasvuruItem = {
  id: number;
  tip: "kurs" | "etkinlik";
  durum: { kod: string; ad: string } | null;
  yedek_sira: number | null;
  iptal_tarihi: string | null;
  iptal_gerekce: { id: number; ad: string } | null;
  onay_tarihi: string | null;
  created_at: string | null;
  iptal_edilebilir: boolean;
  evraklar: Array<{
    id: number;
    evrak_tipi: { id: number; ad: string } | null;
    orijinal_ad: string;
    mime: string | null;
    boyut: number;
  }>;
  kurs?: {
    id: number;
    kurs_no: string;
    brans: string | null;
    merkez: string | null;
  } | null;
  etkinlik?: {
    id: number;
    etkinlik_no: string;
    ad: string;
    merkez: string | null;
  } | null;
};

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type PortalSayfa = {
  id: number;
  kod: string | null;
  baslik: string;
  aciklama: string | null;
  menu_aciklama: string | null;
  anasayfa_logo_url: string | null;
  anasayfa_menu_arkaplan_url: string | null;
  anasayfa_menu_arkaplan_mod: "kapla" | "sigdir";
  sidebar_ikon_url: string | null;
  slug: string;
  path: string;
  sistem: boolean;
  has_kurs: boolean;
  has_etkinlik: boolean;
};
