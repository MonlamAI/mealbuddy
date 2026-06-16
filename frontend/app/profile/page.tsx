"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Save, User, Sparkles, Utensils } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { useToast } from '@/components/providers/toast-provider';
import Header from '@/components/header';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/70 dark:bg-[#1E1E1E]/40 backdrop-blur-xl border border-white/25 dark:border-white/5 rounded-3xl shadow-xl ${className}`}>
        {children}
    </div>
);

export default function ProfilePage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { showToast } = useToast();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form inputs
    const [name, setName] = useState('');
    const [nameBo, setNameBo] = useState('');
    const [nickname, setNickname] = useState('');
    const [nicknameBo, setNicknameBo] = useState('');

    // Avatar file and preview
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (!token || !savedUser) {
            router.push('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setName(parsedUser.name || '');
            setNameBo(parsedUser.name_bo || '');
            setNickname(parsedUser.nickname || '');
            setNicknameBo(parsedUser.nickname_bo || '');
            setAvatarPreview(parsedUser.avatar_url || '');
            setLoading(false);
        } catch (e) {
            console.error("Failed to parse user data", e);
            router.push('/login');
        }
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast(language === 'bo' ? 'པར་གྱི་ཆེ་ཆུང་ 5MB ལས་ཆུང་བ་དགོས།' : 'Photo size must be less than 5MB', 'error');
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast(language === 'bo' ? 'དབྱིན་ཡིག་གི་མིང་འབྲི་རོགས།' : 'English name is required', 'error');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', name);
            formData.append('name_bo', nameBo);
            formData.append('nickname', nickname);
            formData.append('nickname_bo', nicknameBo);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/user/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                showToast(t('profile_updated'), 'success');

                // Redirect back after a short delay
                setTimeout(() => {
                    if (data.user.role === 'chef') {
                        router.push('/dashboard');
                    } else {
                        router.push('/user_dashboard');
                    }
                }, 1200);
            } else {
                const errData = await res.json();
                showToast(errData.message || (language === 'bo' ? 'ཉར་ཚགས་བྱེད་པར་སྐྱོན་བྱུང་སོང་།' : 'Failed to save profile'), 'error');
            }
        } catch (error) {
            console.error(error);
            showToast(language === 'bo' ? 'དྲ་རྒྱའི་མཐུད་ལམ་ལ་སྐྱོན་བྱུང་སོང་།' : 'Network error updating profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (user?.role === 'chef') {
            router.push('/dashboard');
        } else {
            router.push('/user_dashboard');
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-400/5 dark:bg-blue-400/[0.02] blur-[100px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-emerald-400/5 dark:bg-emerald-400/[0.02] blur-[100px]" />
            </div>

            <Header user={user} onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
            }} onNavigateHome={() => router.push('/')} />

            <main className="relative z-10 max-w-2xl mx-auto px-4 pt-28 pb-16">

                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm mb-6 cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    <span>{language === 'bo' ? 'ཕྱིར་ལོག' : 'Back'}</span>
                </button>

                {/* Profile Form Card */}
                <GlassCard className="p-6 sm:p-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F5F5F5]">
                                {t('profile_settings')}
                            </h1>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Profile Photo Uploader */}
                        <div className="flex flex-col items-center justify-center gap-3">
                            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                                {t('profile_photo')}
                            </label>

                            <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-[#323232] shadow-lg bg-blue-50/50 flex items-center justify-center transition-all duration-300 group-hover:opacity-90">
                                    <img
                                        src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Member'}`}
                                        alt="Avatar Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Camera className="text-white w-6 h-6" />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={triggerFileInput}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {t('click_to_upload_photo')}
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                            />
                        </div>

                        {/* Text Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Username English */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {t('username_en')} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Andre Taylor"
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-[#202020]/50 border border-slate-200 dark:border-[#323232] rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-[#F5F5F5]"
                                />
                            </div>

                            {/* Username Tibetan */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {t('username_bo')}
                                </label>
                                <input
                                    type="text"
                                    value={nameBo}
                                    onChange={(e) => setNameBo(e.target.value)}
                                    placeholder="e.g. བསྟན་འཛིན་ཆོས་འཕེལ།"
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-[#202020]/50 border border-slate-200 dark:border-[#323232] rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-[#F5F5F5]"
                                />
                            </div>

                            {/* Nickname English */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {t('nickname_en')}
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="e.g. Food Explorer"
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-[#202020]/50 border border-slate-200 dark:border-[#323232] rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-[#F5F5F5]"
                                />
                            </div>

                            {/* Nickname Tibetan */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {t('nickname_bo')}
                                </label>
                                <input
                                    type="text"
                                    value={nicknameBo}
                                    onChange={(e) => setNicknameBo(e.target.value)}
                                    placeholder="e.g. ལྟོགས་པ་ཆེན་པོ།"
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-[#202020]/50 border border-slate-200 dark:border-[#323232] rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-[#F5F5F5]"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 text-center flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <span>{t('saving')}</span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>{t('save_changes')}</span>
                                </>
                            )}
                        </button>
                    </form>
                </GlassCard>
            </main>
        </div>
    );
}

// --- Loading State Component ---

function LoadingState() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/20"
            >
                <Utensils size={24} />
            </motion.div>
            <p className="text-slate-400 dark:text-slate-300 font-medium animate-pulse">{t('setting_table')}</p>
        </div>
    );
}
