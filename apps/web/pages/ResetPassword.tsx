import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, ArrowLeft, Shield, RefreshCw, Key, Fingerprint } from "lucide-react";
import { BASE_URL } from "../lib/api";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[@$!%*?&#^()_+\-=]/.test(password)) score++;

  if (score <= 2) {
    return { score, label: "Weak", color: "text-accent-red", bgColor: "bg-accent-red" };
  } else if (score <= 4) {
    return { score, label: "Medium", color: "text-accent-orange", bgColor: "bg-accent-orange" };
  } else {
    return { score, label: "Strong", color: "text-accent-green", bgColor: "bg-accent-green" };
  }
};

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || (() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]token=([^&]*)/);
    return match ? match[1] : null;
  })();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors: typeof fieldErrors = {};
    if (!newPassword) {
      errors.password = t('resetPassword.newPasswordRequired');
    }
    if (!confirmPassword) {
      errors.confirmPassword = t('resetPassword.confirmRequired');
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('resetPassword.passwordTooShort'));
      return;
    }

    if (passwordStrength.score < 3) {
      setError(t('resetPassword.passwordTooWeak'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": localStorage.getItem('language') || 'en',
        },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login", {
            state: {
              registrationSuccess: true,
              message: t('resetPassword.resetSuccess'),
            },
          });
        }, 2000);
      } else {
        // Map backend error messages to translated strings
        const errorMsg = data.error || '';
        if (errorMsg.includes('must be different')) {
          setError(t('resetPassword.samePasswordError'));
        } else if (errorMsg.includes('expired')) {
          setError(t('resetPassword.linkExpiredError'));
        } else if (errorMsg.includes('already been used')) {
          setError(t('resetPassword.linkUsedError'));
        } else {
          setError(errorMsg || t('resetPassword.resetFailed'));
        }
      }
    } catch {
      setError(t('resetPassword.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, title: t('resetPassword.feature1'), desc: t('resetPassword.feature1Desc') },
    { icon: Key, title: t('resetPassword.feature2'), desc: t('resetPassword.feature2Desc') },
    { icon: RefreshCw, title: t('resetPassword.feature3'), desc: t('resetPassword.feature3Desc') },
    { icon: Fingerprint, title: t('resetPassword.feature4'), desc: t('resetPassword.feature4Desc') },
  ];

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-md">
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8 border border-border-light dark:border-border-dark text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-accent-red to-accent-orange text-white rounded-xl shadow-lg shadow-accent-red/30 mb-4">
              <AlertCircle size={26} />
            </div>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">{t('resetPassword.invalidLink')}</h2>
            <p className="text-text-muted-light dark:text-text-muted-dark mb-6">
              {t('resetPassword.invalidLinkDesc')}
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-hover hover:to-primary text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all duration-300"
            >
              {t('resetPassword.requestNewLink')}
            </Link>
            <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-hover transition-colors"
              >
                <ArrowLeft size={16} />
                {t('resetPassword.backToSignIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-accent-teal via-primary to-primary-dark">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-1/2 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo & Title */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <img
                src="/logo/AIYA_Logo.png"
                alt="AIYA Logo"
                className="h-14 w-14 rounded-xl shadow-lg shadow-black/20 object-contain bg-white/10 p-2"
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">HARI</h1>
                <p className="text-white/70 text-sm">{t('login.tagline')}</p>
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              {t('resetPassword.heroTitle1')}
              <span className="block text-white/90">{t('resetPassword.heroTitle2')}</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10">
              {t('resetPassword.heroDesc')}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 cursor-default"
                >
                  <feature.icon className="h-8 w-8 text-white mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-white/60 text-xs">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/50 text-sm">
            {t('login.copyright')}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img
              src="/logo/AIYA_Logo.png"
              alt="AIYA Logo"
              className="h-12 w-12 rounded-xl shadow-md object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">HARI</h1>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('login.tagline')}</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8 border border-border-light dark:border-border-dark">
            {success ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-accent-green to-accent-teal text-white rounded-xl shadow-lg shadow-accent-green/30 mb-4">
                  <CheckCircle size={26} />
                </div>
                <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">{t('resetPassword.successTitle')}</h2>
                <p className="text-text-muted-light dark:text-text-muted-dark">
                  {t('resetPassword.successDesc')}
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-accent-teal to-accent-green text-white rounded-xl shadow-lg shadow-accent-teal/30 mb-4">
                    <KeyRound size={26} />
                  </div>
                  <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">{t('resetPassword.title')}</h2>
                  <p className="text-text-muted-light dark:text-text-muted-dark mt-2">
                    {t('resetPassword.subtitle')}
                  </p>
                </div>

                {error && (
                  <div className="bg-accent-red/10 text-accent-red p-4 rounded-xl text-sm mb-6 border border-accent-red/20 flex items-start gap-3 animate-slide-in-right">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                      {t('resetPassword.newPasswordLabel')}
                    </label>
                    <div className="relative group">
                      <Lock
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.password ? "text-accent-red" : "text-text-muted-light dark:text-text-muted-dark group-focus-within:text-accent-teal"}`}
                        size={20}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                        className={`w-full pl-12 pr-14 py-3 bg-background-light dark:bg-background-dark border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark ${fieldErrors.password ? "border-accent-red focus:ring-accent-red/30" : "border-border-light dark:border-border-dark focus:ring-accent-teal"}`}
                        placeholder={t('resetPassword.newPasswordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-accent-teal transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-sm text-accent-red">{fieldErrors.password}</p>
                    )}

                    {/* Password Strength Meter */}
                    {newPassword.length > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('register.passwordStrength')}</span>
                          <span className={`text-xs font-medium ${passwordStrength.color}`}>
                            {passwordStrength.label === 'Weak' ? t('register.weak') : passwordStrength.label === 'Medium' ? t('register.medium') : t('register.strong')}
                          </span>
                        </div>
                        <div className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.bgColor} transition-all duration-300`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                          <span className={newPassword.length >= 8 ? "text-accent-green" : ""}>
                            {newPassword.length >= 8 ? "\u2713" : "\u25CB"} {t('register.rule8chars')}
                          </span>
                          <span className={/[A-Z]/.test(newPassword) ? "text-accent-green" : ""}>
                            {/[A-Z]/.test(newPassword) ? "\u2713" : "\u25CB"} {t('register.ruleUppercase')}
                          </span>
                          <span className={/[a-z]/.test(newPassword) ? "text-accent-green" : ""}>
                            {/[a-z]/.test(newPassword) ? "\u2713" : "\u25CB"} {t('register.ruleLowercase')}
                          </span>
                          <span className={/[0-9]/.test(newPassword) ? "text-accent-green" : ""}>
                            {/[0-9]/.test(newPassword) ? "\u2713" : "\u25CB"} {t('register.ruleNumber')}
                          </span>
                          <span className={/[@$!%*?&#^()_+\-=]/.test(newPassword) ? "text-accent-green" : ""}>
                            {/[@$!%*?&#^()_+\-=]/.test(newPassword) ? "\u2713" : "\u25CB"} {t('register.ruleSpecial')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                      {t('resetPassword.confirmPasswordLabel')}
                    </label>
                    <div className="relative group">
                      <Lock
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.confirmPassword ? "text-accent-red" : "text-text-muted-light dark:text-text-muted-dark group-focus-within:text-accent-teal"}`}
                        size={20}
                      />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined })); }}
                        className={`w-full pl-12 pr-14 py-3 bg-background-light dark:bg-background-dark border rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark ${
                          fieldErrors.confirmPassword
                            ? "border-accent-red focus:ring-accent-red/30"
                            : confirmPassword && newPassword !== confirmPassword
                            ? "border-accent-red bg-accent-red/5"
                            : confirmPassword && newPassword === confirmPassword
                            ? "border-accent-green bg-accent-green/5"
                            : "border-border-light dark:border-border-dark"
                        }`}
                        placeholder={t('resetPassword.confirmPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-accent-teal transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-accent-red">{fieldErrors.confirmPassword}</p>
                    )}
                    {!fieldErrors.confirmPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-accent-red mt-1">{t('resetPassword.passwordsMismatch')}</p>
                    )}
                    {!fieldErrors.confirmPassword && confirmPassword && newPassword === confirmPassword && (
                      <p className="text-xs text-accent-green mt-1">{t('resetPassword.passwordsMatch')}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || passwordStrength.score < 3 || newPassword !== confirmPassword || !confirmPassword}
                    className={`w-full bg-gradient-to-r from-accent-teal to-accent-green hover:from-accent-green hover:to-accent-teal text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-accent-teal/30 hover:shadow-xl transition-all duration-300 ${
                      loading || passwordStrength.score < 3 || newPassword !== confirmPassword || !confirmPassword
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:-translate-y-0.5"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('resetPassword.resetting')}
                      </span>
                    ) : t('resetPassword.resetButton')}
                  </button>
                </form>
              </>
            )}

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-hover transition-colors"
              >
                <ArrowLeft size={16} />
                {t('resetPassword.backToSignIn')}
              </Link>
            </div>
          </div>

          {/* Additional Info */}
          <p className="text-center text-xs text-text-muted-light dark:text-text-muted-dark mt-6">
            {t('login.sslEncryption')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
