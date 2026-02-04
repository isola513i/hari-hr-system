import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Users, Sparkles, Shield, Award } from "lucide-react";
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

const Register: React.FC = () => {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailVerified, setShowEmailVerified] = useState(true);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (step === 'password' && showEmailVerified) {
      const timer = setTimeout(() => {
        setShowEmailVerified(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, showEmailVerified]);

  useEffect(() => {
    if (step === 'email') {
      setShowEmailVerified(true);
    }
  }, [step]);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.eligible) {
        setEmployeeName(data.employeeName || "");
        setStep('password');
      } else {
        setError(data.message);
      }
    } catch {
      setError("Failed to verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (passwordStrength.score < 3) {
      setError("Password is too weak. Add uppercase, lowercase, numbers, and special characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate("/login", {
          state: {
            registrationSuccess: true,
            message: "Registration successful! Please login with your new password."
          }
        });
      } else {
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Users, title: "Team Collaboration", desc: "Connect with your colleagues" },
    { icon: Sparkles, title: "Smart Features", desc: "AI-powered HR assistance" },
    { icon: Shield, title: "Secure Access", desc: "Enterprise-grade protection" },
    { icon: Award, title: "Self-Service", desc: "Manage your profile easily" },
  ];

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
                <p className="text-white/70 text-sm">HR Intelligence by AIYA</p>
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Join Your Team
              <span className="block text-white/90">on HARI Today</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-10">
              Get started with your company's HR portal. Access your profile, timekeeping, and more.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div 
                  key={index}
                  className="group bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-300 cursor-default"
                >
                  <benefit.icon className="h-8 w-8 text-white mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                  <p className="text-white/60 text-xs">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/50 text-sm">
            © 2026 AIYA Technology. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
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
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">HR Intelligence by AIYA</p>
            </div>
          </div>

          {/* Register Card */}
          <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 p-8 border border-border-light dark:border-border-dark">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 bg-gradient-to-br from-accent-teal to-accent-green text-white rounded-xl shadow-lg shadow-accent-teal/30 mb-4">
                <UserPlus size={26} />
              </div>
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Create Account</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark mt-2">
                {step === 'email'
                  ? "Enter your company email to get started"
                  : `Welcome ${employeeName}! Set your password`
                }
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'email' ? 'bg-accent-teal' : 'bg-accent-green'}`} />
              <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'password' ? 'bg-accent-green' : 'bg-border-light dark:bg-border-dark'}`} />
            </div>

            {error && (
              <div className="bg-accent-red/10 text-accent-red p-4 rounded-xl text-sm mb-6 border border-accent-red/20 flex items-start gap-3 animate-slide-in-right">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleCheckEmail} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Company Email
                  </label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-accent-teal transition-colors"
                      size={20}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-teal focus:border-transparent outline-none transition-all text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark"
                      placeholder="yourname@company.com"
                    />
                  </div>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">
                    Use the company email provided by HR
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-accent-teal to-accent-green hover:from-accent-green hover:to-accent-teal text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-accent-teal/30 hover:shadow-xl hover:shadow-accent-teal/40 transition-all duration-300 transform hover:-translate-y-0.5 ${
                    loading ? "opacity-70 cursor-not-allowed transform-none" : ""
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking...
                    </span>
                  ) : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                {showEmailVerified && (
                  <div className="bg-accent-green/10 p-4 rounded-xl flex items-center gap-3 text-accent-green text-sm border border-accent-green/20 animate-slide-in-right">
                    <CheckCircle size={20} />
                    <span>Email verified: {email}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Create Password
                  </label>
                  <div className="relative group">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-accent-teal transition-colors"
                      size={20}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-14 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-accent-teal focus:border-transparent outline-none transition-all text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-accent-teal transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">Password strength</span>
                        <span className={`text-xs font-medium ${passwordStrength.color}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.bgColor} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                        <span className={password.length >= 8 ? "text-accent-green" : ""}>
                          {password.length >= 8 ? "✓" : "○"} 8+ characters
                        </span>
                        <span className={/[A-Z]/.test(password) ? "text-accent-green" : ""}>
                          {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase
                        </span>
                        <span className={/[a-z]/.test(password) ? "text-accent-green" : ""}>
                          {/[a-z]/.test(password) ? "✓" : "○"} Lowercase
                        </span>
                        <span className={/[0-9]/.test(password) ? "text-accent-green" : ""}>
                          {/[0-9]/.test(password) ? "✓" : "○"} Number
                        </span>
                        <span className={/[@$!%*?&#^()_+\-=]/.test(password) ? "text-accent-green" : ""}>
                          {/[@$!%*?&#^()_+\-=]/.test(password) ? "✓" : "○"} Special char
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-accent-teal transition-colors"
                      size={20}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-12 pr-14 py-3 bg-background-light dark:bg-background-dark border rounded-xl focus:ring-2 focus:ring-accent-teal focus:border-transparent outline-none transition-all text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark ${
                        confirmPassword && password !== confirmPassword
                          ? "border-accent-red bg-accent-red/5"
                          : confirmPassword && password === confirmPassword
                          ? "border-accent-green bg-accent-green/5"
                          : "border-border-light dark:border-border-dark"
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-accent-teal transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-accent-red mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-accent-green mt-1">Passwords match</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="flex-1 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark py-3 rounded-xl font-medium hover:bg-border-light dark:hover:bg-border-dark transition-colors border border-border-light dark:border-border-dark"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || passwordStrength.score < 3 || password !== confirmPassword}
                    className={`flex-1 bg-gradient-to-r from-accent-teal to-accent-green hover:from-accent-green hover:to-accent-teal text-white py-3 rounded-xl font-semibold shadow-lg shadow-accent-teal/30 hover:shadow-xl transition-all duration-300 ${
                      loading || passwordStrength.score < 3 || password !== confirmPassword
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
                        Creating...
                      </span>
                    ) : "Create Account"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark text-center">
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-semibold hover:text-primary-hover transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <p className="text-center text-xs text-text-muted-light dark:text-text-muted-dark mt-6">
            Secured with 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

