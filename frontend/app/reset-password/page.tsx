"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertCircle, CheckCircle2, EyeOff, Eye } from "lucide-react";
import { api, getCsrfCookie } from "@/lib/api";
import { LanguageSwitcher } from "@/components/providers/language-provider";
import { ThemeSwitcher } from "@/components/providers/theme-provider";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid reset token.");
      setLoading(false);
      return;
    }

    try {
      await getCsrfCookie();
      const response = await api.post("/v1/reset-password", { 
        email, 
        password,
        password_confirmation: passwordConfirmation,
        token
      });
      setSuccess(response.data.message || "Password successfully reset. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(
        err.response?.data?.message ||
        "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[520px]"
    >
      <div className="mb-6 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3">
          Reset Password
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
          Create a new password for your account.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
        >
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 text-sm font-medium"
        >
          <CheckCircle2 size={18} />
          {success}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">Email Address</label>
          <div className="relative group">
            <Input
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              readOnly
              value={email}
              className="pl-4 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-gray-50 dark:bg-[#1f1f1f] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5] opacity-70"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">New Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={password}
              className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:bg-white dark:focus:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2E5A88] transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">Confirm Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
            <Input
              name="passwordConfirmation"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={passwordConfirmation}
              className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:bg-white dark:focus:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 sm:h-16 bg-[#2E5A88] hover:bg-[#1F2A44] text-white text-base sm:text-lg font-bold rounded-full transition-all shadow-xl shadow-[#2E5A88]/20 active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Resetting...
            </div>
          ) : "Reset Password"}
        </Button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground selection:bg-[#2E5A88]/20">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-20 relative dark:bg-[#323232s]">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-[60] flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        
        <Suspense fallback={<div className="animate-spin w-8 h-8 border-4 border-[#2E5A88] border-t-transparent rounded-full" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
