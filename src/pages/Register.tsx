import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { ApiError } from "../api/client";
import "./Login.css";

export function Register() {
  const { register } = useAuth();
  const { ayarlar } = useSettings();
  const navigate = useNavigate();
  const yontem = ayarlar?.kisi_giris_yontemi.kod ?? "tc_sifre";

  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    tc_kimlik_no: "",
    dogum_tarihi: "",
    email: "",
    telefon: "",
    il: "",
    ilce: "",
    adres: "",
    cinsiyet: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const needsPassword = yontem === "tc_sifre" || yontem === "eposta_sifre";

  const description = useMemo(
    () => "Hesap oluşturarak kurs ve etkinlik başvurularını yönetebilirsiniz.",
    [],
  );

  function set(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        ad: form.ad,
        soyad: form.soyad,
        telefon: form.telefon,
        il: form.il,
        ilce: form.ilce,
        adres: form.adres,
      };
      if (form.cinsiyet) body.cinsiyet = form.cinsiyet;

      if (yontem === "eposta_sifre") {
        body.email = form.email;
        body.password = form.password;
        body.password_confirmation = form.password_confirmation;
        if (form.tc_kimlik_no) body.tc_kimlik_no = form.tc_kimlik_no;
        if (form.dogum_tarihi) body.dogum_tarihi = form.dogum_tarihi;
      } else {
        body.tc_kimlik_no = form.tc_kimlik_no;
        body.dogum_tarihi = form.dogum_tarihi;
        if (form.email) body.email = form.email;
        if (needsPassword) {
          body.password = form.password;
          body.password_confirmation = form.password_confirmation;
        }
      }

      await register(body);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Kayıt tamamlanamadı.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function err(name: string) {
    return fieldErrors[name]?.[0];
  }

  return (
    <div className="page page--narrow login page-enter">
      <PageHeader title="Kayıt ol" description={description} />

      <div className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <div className="field-row">
            <label className="field">
              <span>Ad</span>
              <input value={form.ad} onChange={(e) => set("ad", e.target.value)} required />
              {err("ad") ? <small className="field-error">{err("ad")}</small> : null}
            </label>
            <label className="field">
              <span>Soyad</span>
              <input value={form.soyad} onChange={(e) => set("soyad", e.target.value)} required />
              {err("soyad") ? <small className="field-error">{err("soyad")}</small> : null}
            </label>
          </div>

          {yontem === "eposta_sifre" ? (
            <label className="field">
              <span>E-posta</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
              {err("email") ? <small className="field-error">{err("email")}</small> : null}
            </label>
          ) : (
            <>
              <label className="field">
                <span>T.C. Kimlik No</span>
                <input
                  inputMode="numeric"
                  maxLength={11}
                  value={form.tc_kimlik_no}
                  onChange={(e) => set("tc_kimlik_no", e.target.value.replace(/\D/g, ""))}
                  required
                />
                {err("tc_kimlik_no") ? (
                  <small className="field-error">{err("tc_kimlik_no")}</small>
                ) : null}
              </label>
              <label className="field">
                <span>Doğum tarihi</span>
                <input
                  type="date"
                  value={form.dogum_tarihi}
                  onChange={(e) => set("dogum_tarihi", e.target.value)}
                  required
                />
                {err("dogum_tarihi") ? (
                  <small className="field-error">{err("dogum_tarihi")}</small>
                ) : null}
              </label>
              <label className="field">
                <span>E-posta (isteğe bağlı)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
            </>
          )}

          <label className="field">
            <span>Telefon</span>
            <input
              value={form.telefon}
              onChange={(e) => set("telefon", e.target.value)}
              placeholder="05xxxxxxxxx"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>İl</span>
              <input value={form.il} onChange={(e) => set("il", e.target.value)} />
            </label>
            <label className="field">
              <span>İlçe</span>
              <input value={form.ilce} onChange={(e) => set("ilce", e.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Adres</span>
            <input value={form.adres} onChange={(e) => set("adres", e.target.value)} />
          </label>

          <label className="field">
            <span>Cinsiyet</span>
            <select
              value={form.cinsiyet}
              onChange={(e) => set("cinsiyet", e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="kadin">Kadın</option>
              <option value="erkek">Erkek</option>
            </select>
          </label>

          {needsPassword ? (
            <>
              <label className="field">
                <span>Şifre</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {err("password") ? (
                  <small className="field-error">{err("password")}</small>
                ) : null}
              </label>
              <label className="field">
                <span>Şifre tekrar</span>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={(e) => set("password_confirmation", e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
            </>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={submitting}
          >
            {submitting ? "Kaydediliyor…" : "Kayıt ol"}
          </button>

          <p className="login__hint">
            Zaten hesabınız var mı? <Link to="/giris">Giriş yapın</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
