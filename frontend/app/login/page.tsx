"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Lock, User, Utensils,
  Globe, Terminal, CheckCircle2, ShieldCheck,
  Eye, EyeOff, AlertCircle, ChefHat, Users
} from "lucide-react";
import { api, getCsrfCookie } from "@/lib/api";
import { useLanguage, LanguageSwitcher } from "@/components/providers/language-provider";
import { ThemeSwitcher } from "@/components/providers/theme-provider";

export default function AuthPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (type: string) => {
    setLoading(true);
    setError(null);

    try {
      if (type === "Login") {
        await getCsrfCookie();
        const response = await api.post("/v1/login", {
          email: formData.email,
          password: formData.password,
        });

        const { access_token, user } = response.data;
        localStorage.setItem("token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === 'chef') {
          router.push("/dashboard");
        } else {
          router.push("/user_dashboard");
        }
      } else {
        const response = await api.post("/v1/register", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });

        const { access_token, user } = response.data;
        localStorage.setItem("token", access_token);
        localStorage.setItem("user", JSON.stringify(user));

        if (user.role === 'chef') {
          router.push("/dashboard");
        } else {
          router.push("/user_dashboard");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "An error occurred. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground selection:bg-[#2E5A88]/20">

      {/* --- LEFT SIDE: PREMIUM BRANDING PANEL --- */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#2E5A88] p-16 text-white relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-black/20 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 z-10 cursor-pointer group"
          onClick={() => router.push('/')}
        >
          <div className="bg-white p-2.5 rounded-2xl text-[#2E5A88] shadow-2xl group-hover:scale-110 transition-transform duration-300">
            <Utensils size={30} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase">{t('app_title')}</span>
        </motion.div>

        {/* Hero Text & Glass Card */}
        <div className="z-10 relative">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-6xl font-bold mb-8 leading-[1.1] tracking-tight">
              Fueling up your hunger<br />
              <span className="text-blue-200">with the best food.</span>
            </h2>
          </motion.div>

          {/* Floating Glassmorphism Feature Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 p-6 rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl max-w-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/20 rounded-lg"><CheckCircle2 className="text-green-300" size={20} /></div>
                <p className="text-sm font-medium">Meals coordinated by your team</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-400/20 rounded-lg"><ShieldCheck className="text-blue-300" size={20} /></div>
                <p className="text-sm font-medium">Managed by mealbuddy</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs font-bold text-blue-200/50 uppercase tracking-widest z-10">
          <span>Standardizing Office Dining</span>
          <div className="flex gap-6">
            <span className="hover:text-white transition cursor-pointer">Security</span>
            <span className="hover:text-white transition cursor-pointer">Privacy</span>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: AUTHENTICATION FORM --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-20 relative dark:bg-[#323232s]">
        {/* Floating Language & Theme Switchers in Auth Panel */}
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-[60] flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[520px]"
        >
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="group mb-6 sm:mb-12 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#2E5A88] transition-all"
          >
            <div className="p-2 rounded-full group-hover:bg-[#2E5A88]/10 transition-colors">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            {t('back_to_website')}
          </button>

          {/* Header */}
          <div className="mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3">
              {activeTab === "login" ? t('welcome_back') : t('get_started')}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              {activeTab === "login"
                ? t('login_subtitle')
                : t('signup_subtitle')}
            </p>
          </div>

          <Tabs
            defaultValue="login"
            onValueChange={setActiveTab}
            className="w-full flex flex-col gap-6"
          >
            <TabsList className="flex flex-row w-full h-auto mb-4 bg-gray-200/40 dark:bg-[#202020] p-2 rounded-full border border-gray-200 dark:border-[#323232] gap-2">
              <TabsTrigger
                value="login"
                className="w-full py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#272727] data-[state=active]:text-[#2E5A88] dark:data-[state=active]:text-[#D7E8F4] data-[state=active]:shadow-md cursor-pointer"
              >
                {t('sign_in')}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="w-full py-2 sm:py-3 rounded-full font-bold text-sm sm:text-base transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#272727] data-[state=active]:text-[#2E5A88] dark:data-[state=active]:text-[#D7E8F4] data-[state=active]:shadow-md cursor-pointer"
              >
                {t('sign_up')}
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full"
              >
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
                {/* LOGIN FORM */}
                <TabsContent value="login" className="space-y-6 mt-0 focus-visible:outline-none">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">{t('email_address')}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                      <Input
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:bg-white dark:focus:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400">{t('password')}</label>
                      <button className="text-sm font-bold text-[#2E5A88] hover:underline decoration-2 underline-offset-4">{t('forgot_password')}</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:bg-white dark:focus:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                        onChange={handleInputChange}
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

                  <Button
                    className="w-full h-12 sm:h-16 bg-[#2E5A88] hover:bg-[#1F2A44] text-white text-base sm:text-lg font-bold rounded-full transition-all shadow-xl shadow-[#2E5A88]/20 active:scale-[0.98]"
                    onClick={() => handleSubmit("Login")}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing In...
                      </div>
                    ) : t('sign_in')}
                  </Button>
                </TabsContent>

                {/* SIGNUP FORM */}
                <TabsContent value="signup" className="space-y-5 mt-0 focus-visible:outline-none">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">{t('full_name')}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                      <Input
                        name="name"
                        placeholder="Tenzin"
                        className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">{t('work_email')}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                      <Input
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.1em] text-gray-400 ml-1">{t('password')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E5A88] transition-colors" size={20} />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        className="pl-12 h-12 sm:h-16 border-2 border-gray-100 dark:border-[#323232] bg-white dark:bg-[#272727] focus:ring-4 focus:ring-[#2E5A88]/5 focus:border-[#2E5A88] rounded-2xl sm:rounded-3xl transition-all text-base sm:text-lg font-medium text-foreground dark:text-[#F5F5F5]"
                        onChange={handleInputChange}
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

                  <Button
                    className="w-full h-12 sm:h-16 bg-[#2E5A88] hover:bg-[#1F2A44] text-white text-base sm:text-lg font-bold rounded-2xl sm:rounded-3xl transition-all shadow-xl shadow-[#2E5A88]/20 active:scale-[0.98]"
                    onClick={() => handleSubmit("Signup")}
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : t('create_account')}
                  </Button>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>


          <p className="mt-6 sm:mt-10 text-center text-xs sm:text-sm font-medium text-gray-400">
            {t('terms_info')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}