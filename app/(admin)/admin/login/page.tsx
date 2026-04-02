"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <div className="flex w-full items-center justify-center p-4 sm:p-6 lg:w-1/2 lg:p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 text-3xl font-bold text-primary sm:text-4xl">Techna Technical Institute</h1>
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Admin Portal</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Sign in to access your dashboard</p>
          </div>

          <Card className="border-border shadow-md">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg">Sign in</CardTitle>
              <CardDescription>Use your institute credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(c === true)}
                  />
                  <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                    Remember me
                  </Label>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>

                <p className="text-center text-sm">
                  <a href="#" className="text-primary underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-primary p-8 text-primary-foreground lg:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, color-mix(in oklch, white 35%, transparent), transparent 55%), radial-gradient(circle at 80% 60%, color-mix(in oklch, white 20%, transparent), transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-lg text-center">
          <div className="mb-8">
            <svg
              className="mx-auto mb-6 h-28 w-28 opacity-90 lg:h-32 lg:w-32"
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
          <h3 className="mb-4 text-3xl font-bold lg:text-4xl">Welcome back</h3>
          <p className="mx-auto max-w-md text-lg opacity-90 lg:text-xl">
            Empowering education through technology and innovation
          </p>
          <div className="mx-auto mt-10 grid max-w-sm grid-cols-3 gap-6 lg:mt-12">
            <div>
              <div className="text-2xl font-bold lg:text-3xl">100+</div>
              <div className="text-xs opacity-80 lg:text-sm">Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold lg:text-3xl">50+</div>
              <div className="text-xs opacity-80 lg:text-sm">Staff</div>
            </div>
            <div>
              <div className="text-2xl font-bold lg:text-3xl">20+</div>
              <div className="text-xs opacity-80 lg:text-sm">Courses</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
