import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { updateProfil, updateSifre } from "../api/auth";
import { ApiError } from "../api/client";
import { usePortalSayfaMeta } from "../hooks/usePortalSayfaMeta";
import {
  isoToDogumDisplay,
  isCepTelefonu,
  normalizeCepTelefonu,
} from "../lib/format";
import type { Kisi } from "../types";
import "./Login.css";

/** Kelime bazında kısmi maske: baş/son harfler görünür, ortası * */
function maskText(value: string): string {
  return value.replace(/[\p{L}\p{N}]+/gu, (word) => {
    const chars = Array.from(word);
    if (chars.length <= 1) return "*";
    if (chars.length === 2) return chars[0] + "*";
    if (chars.length <= 4) {
      return chars[0] + "*".repeat(chars.length - 1);
    }
    return (
      chars.slice(0, 2).join("") +
      "*".repeat(chars.length - 3) +
      chars[chars.length - 1]
    );
  });
}

function ikametAdresiMetni(kisi: Kisi): string {
  return [kisi.adres, kisi.ilce, kisi.il].filter(Boolean).join(", ");
}

export function Profile() {
  const { kisi, setKisi } = useAuth();
  const { ayarlar } = useSettings();
  const sayfaMeta = usePortalSayfaMeta("profil", {
    baslik: "Profil",
    aciklama: "Kişisel bilgilerinizi görüntüleyin ve güncelleyin.",
  });
  const canChangePassword =
    ayarlar?.kisi_giris_yontemi.kod !== "tc_dogum_tarihi";

  const [form, setForm] = useState({
    telefon: normalizeCepTelefonu(kisi?.telefon ?? ""),
    email: kisi?.email ?? "",
    diger_adres: kisi?.diger_adres ?? "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  if (!kisi) return null;

  const ikametHam = ikametAdresiMetni(kisi);
  const ikametVar = Boolean(ikametHam.trim());
  const ikametMaskeli = ikametVar ? maskText(ikametHam) : "";
  const adresEtiketi = ikametVar ? "Diğer adres" : "Adres";

  async function onSaveProfil(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);

    const telefon = normalizeCepTelefonu(form.telefon);
    if (!isCepTelefonu(telefon)) {
      setError("Cep telefonunu 05xxxxxxxxx formatında girin.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfil({
        telefon,
        email: form.email.trim() || null,
        diger_adres: form.diger_adres.trim() || null,
      });
      setKisi(updated);
      setForm({
        telefon: normalizeCepTelefonu(updated.telefon ?? ""),
        email: updated.email ?? "",
        diger_adres: updated.diger_adres ?? "",
      });
      setMsg("Profil güncellendi.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveSifre(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwError(null);
    setPwSaving(true);
    try {
      await updateSifre(pw);
      setPw({ current_password: "", password: "", password_confirmation: "" });
      setPwMsg("Şifre güncellendi.");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Şifre güncellenemedi.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="page page--narrow page-enter">
      <PageHeader
        title={sayfaMeta.baslik}
        description={
          sayfaMeta.aciklama ||
          `${kisi.tam_adi} · hesap bilgilerinizi güncelleyin.`
        }
      />

      <div className="login__panel" style={{ marginBottom: "1.25rem" }}>
        <form className="login__form" onSubmit={onSaveProfil}>
          <div className="field-row">
            <label className="field">
              <span>Ad</span>
              <input value={kisi.ad} disabled />
            </label>
            <label className="field">
              <span>Soyad</span>
              <input value={kisi.soyad} disabled />
            </label>
          </div>
          {kisi.tc_kimlik_no ? (
            <label className="field">
              <span>T.C. Kimlik No</span>
              <input value={kisi.tc_kimlik_no} disabled />
            </label>
          ) : null}
          {kisi.dogum_tarihi ? (
            <label className="field">
              <span>Doğum tarihi</span>
              <input value={isoToDogumDisplay(kisi.dogum_tarihi)} disabled />
            </label>
          ) : null}

          <label className="field">
            <span>Telefon *</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="05xxxxxxxxx"
              maxLength={11}
              value={form.telefon}
              onChange={(e) =>
                setForm({
                  ...form,
                  telefon: normalizeCepTelefonu(e.target.value),
                })
              }
              required
            />
          </label>
          <label className="field">
            <span>E-posta</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          {ikametVar ? (
            <label className="field">
              <span>İkamet adresi</span>
              <input value={ikametMaskeli} disabled readOnly />
            </label>
          ) : null}

          <label className="field">
            <span>{adresEtiketi}</span>
            <input
              value={form.diger_adres}
              onChange={(e) =>
                setForm({ ...form, diger_adres: e.target.value })
              }
              placeholder="İsteğe bağlı"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}
          {msg ? <p className="form-success">{msg}</p> : null}

          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Profili kaydet"}
          </button>
        </form>
      </div>

      {canChangePassword ? (
        <div className="login__panel">
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Şifre değiştir</h2>
          <form className="login__form" onSubmit={onSaveSifre}>
            <label className="field">
              <span>Mevcut şifre</span>
              <input
                type="password"
                value={pw.current_password}
                onChange={(e) =>
                  setPw({ ...pw, current_password: e.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Yeni şifre</span>
              <input
                type="password"
                value={pw.password}
                onChange={(e) => setPw({ ...pw, password: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Yeni şifre tekrar</span>
              <input
                type="password"
                value={pw.password_confirmation}
                onChange={(e) =>
                  setPw({ ...pw, password_confirmation: e.target.value })
                }
                required
              />
            </label>
            {pwError ? <p className="form-error">{pwError}</p> : null}
            {pwMsg ? <p className="form-success">{pwMsg}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={pwSaving}>
              {pwSaving ? "Kaydediliyor…" : "Şifreyi güncelle"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
