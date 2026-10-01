import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "./PageHeader";
import { ApiError } from "../api/client";
import type { IkiAsamaliBilgi, IkiAsamaliDogrulama } from "../api/auth";
import "../pages/Login.css";

const KANAL_LABEL = { sms: "SMS", eposta: "E-posta" } as const;

type Props = {
  dogrulama: IkiAsamaliDogrulama;
  aciklama: string;
  onayEtiketi: string;
  geriEtiketi: string;
  /** Bu metni içeren hatalarda oturum sona erdiği için önceki ekrana dönülür. */
  oturumBittiMetni: string;
  onDogrula: (kod: string) => Promise<void>;
  onYenile: () => Promise<IkiAsamaliBilgi>;
  /** Önceki ekrana dönüş; hata mesajı verilirse orada gösterilmelidir. */
  onGeri: (hata?: string) => void;
};

export function DogrulamaKoduAdimi({
  dogrulama: ilkDogrulama,
  aciklama,
  onayEtiketi,
  geriEtiketi,
  oturumBittiMetni,
  onDogrula,
  onYenile,
  onGeri,
}: Props) {
  const [dogrulama, setDogrulama] = useState(ilkDogrulama);
  const [kod, setKod] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kodHata, setKodHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [beklemeSaniye, setBeklemeSaniye] = useState(ilkDogrulama.yeniden_gonderim_saniye);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);

  useEffect(() => {
    if (beklemeSaniye <= 0) return;
    const timer = window.setTimeout(() => setBeklemeSaniye((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [beklemeSaniye]);

  function oturumBitti(message: string) {
    return message.toLocaleLowerCase("tr").includes(oturumBittiMetni.toLocaleLowerCase("tr"));
  }

  async function handleDogrula(e: FormEvent) {
    e.preventDefault();
    setHata(null);
    setBilgi(null);

    if (!/^\d{6}$/.test(kod)) {
      setKodHata("6 haneli doğrulama kodunu girin.");
      return;
    }
    setKodHata(null);

    setGonderiliyor(true);
    try {
      await onDogrula(kod);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Doğrulama yapılamadı.";
      setKod("");
      if (oturumBitti(message)) {
        onGeri(message);
        return;
      }
      setHata(message);
    } finally {
      setGonderiliyor(false);
    }
  }

  async function handleYenile() {
    if (beklemeSaniye > 0 || yenileniyor) return;
    setHata(null);
    setBilgi(null);
    setYenileniyor(true);
    try {
      const sonuc = await onYenile();
      setDogrulama((d) => ({ ...d, ...sonuc }));
      setBeklemeSaniye(sonuc.yeniden_gonderim_saniye);
      setKod("");
      setBilgi("Yeni doğrulama kodu gönderildi.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Kod gönderilemedi.";
      if (oturumBitti(message)) {
        onGeri(message);
        return;
      }
      setHata(message);
      const kalan = message.match(/(\d+) saniye/);
      if (kalan) setBeklemeSaniye(Number(kalan[1]));
    } finally {
      setYenileniyor(false);
    }
  }

  return (
    <div className="page page--narrow login page-enter">
      <PageHeader title="Doğrulama kodu" description={aciklama} />

      <div className="login__panel">
        <form className="login__form" onSubmit={handleDogrula} noValidate>
          <ul className="login__hedefler">
            {dogrulama.hedefler.map((h) => (
              <li key={h.kanal}>
                <strong>{KANAL_LABEL[h.kanal]}</strong>
                <span>{h.hedef}</span>
              </li>
            ))}
          </ul>

          <label className="field" htmlFor="dogrulama-kod">
            <span>Doğrulama kodu</span>
            <input
              id="dogrulama-kod"
              className="login__kod"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={kod}
              onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              autoFocus
              required
            />
            {kodHata ? <small className="field-error">{kodHata}</small> : null}
          </label>

          <p className="login__hint">Kod {dogrulama.ttl_dakika} dakika geçerlidir.</p>

          {hata ? <p className="form-error">{hata}</p> : null}
          {bilgi ? <p className="form-success">{bilgi}</p> : null}

          <button type="submit" className="btn btn--primary btn--block" disabled={gonderiliyor}>
            {gonderiliyor ? "Doğrulanıyor…" : onayEtiketi}
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={handleYenile}
            disabled={beklemeSaniye > 0 || yenileniyor}
          >
            {yenileniyor
              ? "Gönderiliyor…"
              : beklemeSaniye > 0
                ? `Kodu tekrar gönder (${beklemeSaniye} sn)`
                : "Kodu tekrar gönder"}
          </button>

          <p className="login__hint">
            <button type="button" className="login__link" onClick={() => onGeri()}>
              {geriEtiketi}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
