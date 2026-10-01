import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "../auth/SettingsContext";
import { ApiError } from "../api/client";
import {
  basvuruDogrulamaKoduGonder,
  basvuruDogrulamaKoduYenile,
  type BasvuruDogrulamaOturumu,
} from "../api/basvurular";
import "../pages/Login.css";

export type BasvuruDogrulamaEk = { dogrulama_token: string; dogrulama_kodu: string };

type Bekleyen = {
  fn: (ek: BasvuruDogrulamaEk) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

const KANAL_LABEL = { sms: "SMS", eposta: "E-posta" } as const;

function kodHatasi(err: unknown): string | null {
  return err instanceof ApiError ? (err.errors?.dogrulama_kodu?.[0] ?? null) : null;
}

function oturumBitti(message: string): boolean {
  return /yeni bir doğrulama kodu isteyin/i.test(message);
}

/**
 * Başvurularda doğrulama açıksa gönderimi, kodun girildiği bir pencereyle sarar.
 * `calistir` başvuru sonucunu, kullanıcı vazgeçerse `null` döner; kod dışı hatalar fırlatılır.
 */
export function useBasvuruDogrulama() {
  const { ayarlar } = useSettings();
  const gerekli = Boolean(ayarlar?.basvuru_dogrulama_aktif);

  const bekleyenRef = useRef<Bekleyen | null>(null);
  const [acik, setAcik] = useState(false);
  const [oturum, setOturum] = useState<BasvuruDogrulamaOturumu | null>(null);
  const [kod, setKod] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [beklemeSaniye, setBeklemeSaniye] = useState(0);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [onaylaniyor, setOnaylaniyor] = useState(false);

  useEffect(() => {
    if (beklemeSaniye <= 0) return;
    const timer = window.setTimeout(() => setBeklemeSaniye((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [beklemeSaniye]);

  const hataGoster = useCallback((err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    setHata(message);
    const kalan = message.match(/(\d+) saniye/);
    if (kalan) setBeklemeSaniye(Number(kalan[1]));
    return message;
  }, []);

  const kodIste = useCallback(async () => {
    setHata(null);
    setBilgi(null);
    setGonderiliyor(true);
    try {
      const yeni = await basvuruDogrulamaKoduGonder();
      setOturum(yeni);
      setBeklemeSaniye(yeni.yeniden_gonderim_saniye);
    } catch (err) {
      hataGoster(err, "Doğrulama kodu gönderilemedi.");
    } finally {
      setGonderiliyor(false);
    }
  }, [hataGoster]);

  async function kodYenile() {
    if (!oturum) {
      await kodIste();
      return;
    }
    setHata(null);
    setBilgi(null);
    setGonderiliyor(true);
    try {
      const sonuc = await basvuruDogrulamaKoduYenile(oturum.dogrulama_token);
      setOturum({ ...oturum, ...sonuc });
      setBeklemeSaniye(sonuc.yeniden_gonderim_saniye);
      setKod("");
      setBilgi("Yeni doğrulama kodu gönderildi.");
    } catch (err) {
      const message = hataGoster(err, "Doğrulama kodu gönderilemedi.");
      if (oturumBitti(message)) setOturum(null);
    } finally {
      setGonderiliyor(false);
    }
  }

  const calistir = useCallback(
    async <T,>(fn: (ek: BasvuruDogrulamaEk | null) => Promise<T>): Promise<T | null> => {
      if (!gerekli) {
        try {
          return await fn(null);
        } catch (err) {
          if (!kodHatasi(err)) throw err;
        }
      }

      return new Promise<T | null>((resolve, reject) => {
        bekleyenRef.current = {
          fn,
          resolve: resolve as (value: unknown) => void,
          reject,
        };
        setKod("");
        setHata(null);
        setBilgi(null);
        setAcik(true);
        if (!oturum) void kodIste();
      });
    },
    [gerekli, oturum, kodIste],
  );

  function vazgec() {
    if (onaylaniyor) return;
    setAcik(false);
    bekleyenRef.current?.resolve(null);
    bekleyenRef.current = null;
  }

  async function onayla(e: FormEvent) {
    e.preventDefault();
    const bekleyen = bekleyenRef.current;
    if (!bekleyen || !oturum || onaylaniyor) return;
    setBilgi(null);
    if (!/^\d{6}$/.test(kod)) {
      setHata("6 haneli doğrulama kodunu girin.");
      return;
    }

    setHata(null);
    setOnaylaniyor(true);
    try {
      const sonuc = await bekleyen.fn({
        dogrulama_token: oturum.dogrulama_token,
        dogrulama_kodu: kod,
      });
      bekleyenRef.current = null;
      setOturum(null);
      setAcik(false);
      bekleyen.resolve(sonuc);
    } catch (err) {
      const mesaj = kodHatasi(err);
      if (mesaj) {
        setHata(mesaj);
        setKod("");
        if (oturumBitti(mesaj)) setOturum(null);
      } else {
        bekleyenRef.current = null;
        setAcik(false);
        bekleyen.reject(err);
      }
    } finally {
      setOnaylaniyor(false);
    }
  }

  let modal: ReactNode = null;
  if (acik) {
    modal = createPortal(
      <div className="modal-backdrop" role="presentation">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="basvuru-dogrulama-title"
        >
          <form className="login__form" onSubmit={onayla} noValidate>
            <div>
              <h2 id="basvuru-dogrulama-title">Başvuru doğrulama</h2>
              <p>Başvurunuzu tamamlamak için size gönderilen 6 haneli kodu girin.</p>
            </div>

            {oturum ? (
              <ul className="login__hedefler">
                {oturum.hedefler.map((h) => (
                  <li key={h.kanal}>
                    <strong>{KANAL_LABEL[h.kanal]}</strong>
                    <span>{h.hedef}</span>
                  </li>
                ))}
              </ul>
            ) : gonderiliyor ? (
              <p className="login__hint">Doğrulama kodu gönderiliyor…</p>
            ) : null}

            <label className="field" htmlFor="basvuru-dogrulama-kod">
              <span>Doğrulama kodu</span>
              <input
                id="basvuru-dogrulama-kod"
                className="login__kod"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                disabled={!oturum}
                autoFocus
              />
            </label>

            {oturum ? (
              <p className="login__hint">Kod {oturum.ttl_dakika} dakika geçerlidir.</p>
            ) : null}

            {hata ? <p className="form-error">{hata}</p> : null}
            {bilgi ? <p className="form-success">{bilgi}</p> : null}

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={!oturum || onaylaniyor}
            >
              {onaylaniyor ? "Başvuru gönderiliyor…" : "Doğrula ve başvur"}
            </button>

            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => void kodYenile()}
              disabled={beklemeSaniye > 0 || gonderiliyor || onaylaniyor}
            >
              {gonderiliyor
                ? "Gönderiliyor…"
                : beklemeSaniye > 0
                  ? `Kodu tekrar gönder (${beklemeSaniye} sn)`
                  : oturum
                    ? "Kodu tekrar gönder"
                    : "Kod gönder"}
            </button>

            <p className="login__hint">
              <button
                type="button"
                className="login__link"
                onClick={vazgec}
                disabled={onaylaniyor}
              >
                Vazgeç
              </button>
            </p>
          </form>
        </div>
      </div>,
      document.body,
    );
  }

  return { gerekli, calistir, modal };
}
