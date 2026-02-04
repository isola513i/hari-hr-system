import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Lock, Mail, CheckCircle, Eye, EyeOff } from "lucide-react";

interface LocationState {
  registrationSuccess?: boolean;
  message?: string;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for registration success message
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.registrationSuccess && state?.message) {
      setSuccessMessage(state.message);
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate("/");
    } else {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to access your HR portal</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 border border-green-200 flex items-center gap-2">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
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
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-sm ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New employee?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
