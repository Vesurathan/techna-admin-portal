"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only redirect if user is already logged in (not during initial load)
  useEffect(() => {
    if (mounted && !authLoading && user) {
      router.replace(user.role.isSuperAdmin ? "/admin" : "/admin/home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { isSuperAdmin } = await login(email, password);
      router.replace(isSuperAdmin ? "/admin" : "/admin/home");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Don't render login if user is already logged in
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Left Side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">
              Techna Technical Institute
            </h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-base-content">
              Admin Portal
            </h2>
            <p className="text-base-content/70 mt-2 text-sm sm:text-base">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="alert alert-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Email Address</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full border-base-300 focus:border-primary focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="label-text">Remember me</span>
              </label>
            </div>

            <div className="form-control mt-4 sm:mt-6">
              <button
                type="submit"
                className="btn btn-primary w-full text-base sm:text-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <a href="#" className="link link-primary text-sm">
                Forgot password?
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Education Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 text-center text-white w-full max-w-lg">
          <div className="mb-6 lg:mb-8">
            <svg
              className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-6 opacity-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-3xl lg:text-4xl font-bold mb-3 lg:mb-4">Welcome Back!</h3>
          <p className="text-lg lg:text-xl opacity-90 max-w-md mx-auto">
            Empowering education through technology and innovation
          </p>
          <div className="mt-8 lg:mt-12 grid grid-cols-3 gap-4 lg:gap-6 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">100+</div>
              <div className="text-xs lg:text-sm opacity-80">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">50+</div>
              <div className="text-xs lg:text-sm opacity-80">Staff</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold">20+</div>
              <div className="text-xs lg:text-sm opacity-80">Courses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
