import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

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
    return { score, label: "Weak", color: "text-red-600", bgColor: "bg-red-500" };
  } else if (score <= 4) {
    return { score, label: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-500" };
  } else {
    return { score, label: "Strong", color: "text-green-600", bgColor: "bg-green-500" };
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

  // Auto-hide email verified notification after 3 seconds
  useEffect(() => {
    if (step === 'password' && showEmailVerified) {
      const timer = setTimeout(() => {
        setShowEmailVerified(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, showEmailVerified]);

  // Reset showEmailVerified when going back to email step
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
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
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
      const response = await fetch("/api/auth/register", {
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">
            {step === 'email'
              ? "Enter your company email to get started"
              : `Welcome ${employeeName}! Set your password`
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleCheckEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="yourname@aiya.ai"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use the company email provided by HR
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Email verified notification with fade out */}
            {showEmailVerified && (
              <div className="bg-green-50 p-3 rounded-lg flex items-center gap-2 text-green-700 text-sm animate-pulse">
                <CheckCircle size={18} />
                <span>Email verified: {email}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Password strength</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.bgColor} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                    <span className={password.length >= 8 ? "text-green-600" : ""}>
                      {password.length >= 8 ? "✓" : "○"} 8+ characters
                    </span>
                    <span className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase
                    </span>
                    <span className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                      {/[a-z]/.test(password) ? "✓" : "○"} Lowercase
                    </span>
                    <span className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                      {/[0-9]/.test(password) ? "✓" : "○"} Number
                    </span>
                    <span className={/[@$!%*?&#^()_+\-=]/.test(password) ? "text-green-600" : ""}>
                      {/[@$!%*?&#^()_+\-=]/.test(password) ? "✓" : "○"} Special char
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all ${
                    confirmPassword && password !== confirmPassword
                      ? "border-red-300 bg-red-50"
                      : confirmPassword && password === confirmPassword
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-500 mt-1">Passwords match</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || passwordStrength.score < 3 || password !== confirmPassword}
                className={`flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm ${
                  loading || passwordStrength.score < 3 || password !== confirmPassword
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
