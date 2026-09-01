"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, getCsrfCookie } from "@/lib/api";
import { useLanguage, LanguageSwitcher } from "@/components/providers/language-provider";
import { ThemeSwitcher } from "@/components/providers/theme-provider";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await getCsrfCookie();
      const response = await api.post("/v1/forgot-password", { email });
      setSuccess(response.data.message || "Reset link sent to your email.");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(
        err.response?.data?.message ||
        "An error occurred. Please check your email and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground selection:bg-[#2E5A88]/20">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-20 relative dark:bg-[#323232s]">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-[60] flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[520px]"
        >
          <button
            onClick={() => router.push('/login')}
            className="group mb-6 sm:mb-12 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#2E5A88] transition-all"
          >
            <div className="p-2 rounded-full group-hover:bg-[#2E5A88]/10 transition-colors">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Login
          </button>

          <div className="mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3">
              Forgot Password
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Enter your email address and we will send you a link to reset your password.
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
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                <Input
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:bg-white dark:focus:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                  onChange={(e) => setEmail(e.target.value)}
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
                  Sending...
                </div>
              ) : "Send Reset Link"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
