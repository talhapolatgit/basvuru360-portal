import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../auth/SettingsContext";
import { ApiError } from "../api/client";
import { dogumToIso, formatDogumInput } from "../lib/format";
import "./Login.css";

export function Login() {
  const { login } = useAuth();
  const { ayarlar } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  const yontem = ayarlar?.kisi_giris_yontemi.kod ?? "tc_sifre";
  const [showPassword, setShowPassword] = useState(false);
  const [tc, setTc] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dogum, setDogum] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const description = useMemo(() => {
    if (yontem === "tc_dogum_tarihi") {
      return "T.C. kimlik numaranız ve doğum tarihinizle devam edin.";
    }
    if (yontem === "eposta_sifre") {
      return "E-posta adresiniz ve şifrenizle devam edin.";
    }
    return "T.C. kimlik numaranız ve şifrenizle devam edin.";
  }, [yontem]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (yontem === "eposta_sifre") {
      if (email.trim() === "") errors.email = "E-posta adresi zorunludur.";
    } else if (tc === "") {
      errors.tc = "T.C. kimlik numarası zorunludur.";
    } else if (tc.length !== 11) {
      errors.tc = "T.C. kimlik numarası 11 haneli olmalıdır.";
    }

    if (yontem === "tc_dogum_tarihi") {
      if (dogum.trim() === "") {
        errors.dogum = "Doğum tarihi zorunludur.";
      } else if (!dogumToIso(dogum)) {
        errors.dogum = "Doğum tarihini GG.AA.YYYY formatında girin.";
      }
    } else if (password === "") {
      errors.password = "Şifre zorunludur.";
    }

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const clientErrors = validate();
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setError("Lütfen işaretli alanları kontrol edin.");
      return;
    }

    const dogumIso = yontem === "tc_dogum_tarihi" ? dogumToIso(dogum) : null;

    setSubmitting(true);
    try {
      const body: Record<string, string> =
        yontem === "eposta_sifre"
          ? { email, password }
          : yontem === "tc_dogum_tarihi"
            ? { tc_kimlik_no: tc, dogum_tarihi: dogumIso! }
            : { tc_kimlik_no: tc, password };
      await login(body);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page--narrow login page-enter">
      <PageHeader title="Giriş yap" description={description} />

      <div className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          {yontem === "eposta_sifre" ? (
            <label className="field" htmlFor="login-email">
              <span>E-posta</span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                autoComplete="username"
                required
              />
              {fieldErrors.email ? <small className="field-error">{fieldErrors.email}</small> : null}
            </label>
          ) : (
            <label className="field" htmlFor="login-tc">
              <span>T.C. Kimlik No</span>
              <input
                id="login-tc"
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={tc}
                onChange={(e) => setTc(e.target.value.replace(/\D/g, ""))}
                placeholder="11 haneli kimlik numarası"
                autoComplete="username"
                required
              />
              {fieldErrors.tc ? <small className="field-error">{fieldErrors.tc}</small> : null}
            </label>
          )}

          {yontem === "tc_dogum_tarihi" ? (
            <label className="field" htmlFor="login-dogum">
              <span>Doğum tarihi</span>
              <input
                id="login-dogum"
                type="text"
                inputMode="numeric"
                value={dogum}
                onChange={(e) => setDogum(formatDogumInput(e.target.value))}
                placeholder="GG.AA.YYYY"
                autoComplete="bday"
                maxLength={10}
                required
              />
              {fieldErrors.dogum ? <small className="field-error">{fieldErrors.dogum}</small> : null}
            </label>
          ) : (
            <div className="field">
              <label htmlFor="login-sifre">Şifre</label>
              <div className="field__password">
                <input
                  id="login-sifre"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? "Gizle" : "Göster"}
                </button>
              </div>
              {fieldErrors.password ? (
                <small className="field-error">{fieldErrors.password}</small>
              ) : null}
            </div>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={submitting}
          >
            {submitting ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>

          <p className="login__hint">
            Hesabınız yok mu? <Link to="/kayit">Kayıt olun</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
