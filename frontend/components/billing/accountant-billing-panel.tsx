"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  Users,
  IndianRupee,
  UploadCloud,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Camera,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import {
  createMonthlyBill,
  deleteMonthlyBill,
  fetchMonthlyBill,
  fetchMonthlyBills,
  formatCurrency,
  monthLabel,
  MonthlyBill,
  PaymentStatus,
  updateUserBillPayment,
  UserMonthlyBill,
} from '@/lib/billing';
import { useToast } from '@/components/providers/toast-provider';
import { useLanguage, toTibetanDigits } from '@/components/providers/language-provider';
import MonthYearPicker from './month-year-picker';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

type SortKey = 'name' | 'joined_count' | 'amount_due' | 'payment_status';
type SortDir = 'asc' | 'desc';

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className={`bg-white/80 dark:bg-[#272727]/80 backdrop-blur-xl border border-slate-100/80 dark:border-[#323232]/80 rounded-3xl shadow-sm dark:shadow-none hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-none transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { t } = useLanguage();
  const paid = status === 'paid';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${paid
        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
        }`}
    >
      {paid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {paid ? t('paid') : t('unpaid')}
    </span>
  );
}

export default function AccountantBillingPanel() {
  const { t, language } = useLanguage();

  const formatMonthYear = (month: number, year: number) => {
    if (language === 'bo') {
      return `ཕྱི་ཟླ་ ${toTibetanDigits(month)} པ་ལོ་ ${toTibetanDigits(year)}`;
    }
    return monthLabel(month, year);
  };

  const formatPrice = (amount: number) => {
    const formatted = formatCurrency(amount);
    return language === 'bo' ? toTibetanDigits(formatted) : formatted;
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (language === 'bo') {
      const tibetanWeekdays = [
        'གཟའ་ཉི་མ།', // Sunday
        'གཟའ་ཟླ་བ།', // Monday
        'གཟའ་མིག་དམར།', // Tuesday
        'གཟའ་ལྷག་པ།', // Wednesday
        'གཟའ་ཕུར་བུ།', // Thursday
        'གཟའ་པ་སངས།', // Friday
        'གཟའ་སྤེན་པ།' // Saturday
      ];
      const weekday = tibetanWeekdays[date.getDay()];
      const m = toTibetanDigits(date.getMonth() + 1);
      const d = toTibetanDigits(date.getDate());
      const y = toTibetanDigits(date.getFullYear());
      return `${weekday} ཕྱི་ཟླ་ ${m} པའི་ཚེས་ ${d} ལོ་ ${y}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const formatDateRange = (startStr: string | undefined, endStr: string | undefined) => {
    if (!startStr || !endStr) return '';
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    if (language === 'bo') {
      const sm = toTibetanDigits(startDate.getMonth() + 1);
      const sd = toTibetanDigits(startDate.getDate());
      const em = toTibetanDigits(endDate.getMonth() + 1);
      const ed = toTibetanDigits(endDate.getDate());
      const ey = toTibetanDigits(endDate.getFullYear());
      return `ཕྱི་ཟླ་ ${sm} ཚེས་ ${sd} ནས་ ཕྱི་ཟླ་ ${em} ཚེས་ ${ed} ལོ་ ${ey} བར།`;
    } else {
      const sFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const eFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${sFormatted} to ${eFormatted}`;
    }
  };

  const formatMonthDay = (dateStr: string) => {
    const date = new Date(dateStr);
    if (language === 'bo') {
      const m = toTibetanDigits(date.getMonth() + 1);
      const d = toTibetanDigits(date.getDate());
      return `ཕྱི་ཟླ་ ${m} ཚེས་ ${d}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatPaidAt = (paidAtStr: string | null | undefined) => {
    if (!paidAtStr) return '—';
    const date = new Date(paidAtStr);
    if (language === 'bo') {
      const m = toTibetanDigits(date.getMonth() + 1);
      const d = toTibetanDigits(date.getDate());
      const y = toTibetanDigits(date.getFullYear());
      return `ཕྱི་ཟླ་ ${m} ཚེས་ ${d} ལོ་ ${y}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const formatVotedAt = (votedAtStr: string | null | undefined) => {
    if (!votedAtStr) return '—';
    if (language === 'bo') {
      let formatted = votedAtStr;
      if (votedAtStr.toUpperCase().includes('AM')) {
        formatted = 'སྔ་དྲོ་ ' + votedAtStr.toUpperCase().replace('AM', '');
      } else if (votedAtStr.toUpperCase().includes('PM')) {
        formatted = 'ཕྱི་དྲོ་ ' + votedAtStr.toUpperCase().replace('PM', '');
      }
      return t('voted_at', { time: toTibetanDigits(formatted.trim()) });
    }
    return t('voted_at', { time: votedAtStr });
  };

  const { showToast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [totalBillInput, setTotalBillInput] = useState('');
  const [notes, setNotes] = useState('');
  const [billImage, setBillImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Dashboard Mode State ---
  const [activeTab, setActiveTab] = useState<'billing' | 'participation'>('billing');

  // --- Participation Report State ---
  const [participationView, setParticipationView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState(now.toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchParticipationReport = useCallback(async () => {
    setReportLoading(true);
    setReportData(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let url = `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/accountant/participation-report?type=${participationView}`;
      if (participationView === 'daily' || participationView === 'weekly') {
        url += `&date=${reportDate}`;
      } else {
        url += `&month=${reportMonth}&year=${reportYear}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const payload = await res.json();
        setReportData(payload);
      } else {
        showToast('Failed to load participation report', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading report', 'error');
    } finally {
      setReportLoading(false);
    }
  }, [participationView, reportDate, reportMonth, reportYear, showToast]);

  useEffect(() => {
    if (activeTab === 'participation') {
      fetchParticipationReport();
    }
  }, [activeTab, fetchParticipationReport]);

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('amount_due');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const loadBill = useCallback(async () => {
    setLoading(true);
    try {
      const bills = await fetchMonthlyBills(selectedMonth, selectedYear);
      if (bills.length > 0) {
        const full = await fetchMonthlyBill(bills[0].id);
        setBill(full);
      } else {
        setBill(null);
      }
    } catch {
      showToast(t('loading_error') || 'Could not load billing data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, showToast, t]);

  useEffect(() => {
    loadBill();
    setPage(1);
  }, [loadBill]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setBillImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalBillInput) {
      showToast(t('enter_bill_amount') || 'Enter the total bill amount', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('month', String(selectedMonth));
      fd.append('year', String(selectedYear));
      fd.append('total_bill', totalBillInput);
      if (notes) fd.append('notes', notes);
      if (billImage) fd.append('bill_image', billImage);

      const created = await createMonthlyBill(fd);
      setBill(created);
      setTotalBillInput('');
      setNotes('');
      setBillImage(null);
      setPreview(null);
      showToast(t('bill_generated_success') || 'Monthly bill generated successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const togglePayment = async (userBill: UserMonthlyBill) => {
    if (!bill) return;
    const next: PaymentStatus = userBill.payment_status === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateUserBillPayment(bill.id, userBill.id, next);
      const refreshed = await fetchMonthlyBill(bill.id);
      setBill(refreshed);
      showToast(
        t('payment_marked_success', {
          name: userBill.user?.name || 'User',
          status: next === 'paid' ? t('paid') : t('unpaid')
        }) || `Marked ${userBill.user?.name || 'user'} as ${next}`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleClearBilling = async () => {
    if (!bill) return;
    if (!window.confirm(t('clear_billing_confirm') || 'Are you sure you want to clear this monthly bill?')) {
      return;
    }
    setClearing(true);
    try {
      await deleteMonthlyBill(bill.id);
      setBill(null);
      showToast(t('clear_billing_success') || 'Monthly billing cleared successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Clear failed', 'error');
    } finally {
      setClearing(false);
    }
  };

  const userBills = bill?.user_bills ?? [];
  const stats = bill?.payment_statistics;

  const filtered = useMemo(() => {
    let rows = [...userBills];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.user?.name?.toLowerCase().includes(q));
    }
    if (paymentFilter !== 'all') {
      rows = rows.filter((r) => r.payment_status === paymentFilter);
    }
    rows.sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      switch (sortKey) {
        case 'name':
          av = a.user?.name ?? '';
          bv = b.user?.name ?? '';
          break;
        case 'joined_count':
          av = a.joined_count;
          bv = b.joined_count;
          break;
        case 'amount_due':
          av = a.amount_due;
          bv = b.amount_due;
          break;
        case 'payment_status':
          av = a.payment_status;
          bv = b.payment_status;
          break;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [userBills, search, paymentFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <section className="mt-16 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
            <Receipt className="text-[#2E5A88] dark:text-[#D7E8F4]" size={28} />
            {t('monthly_lunch_billing')}
          </h2>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-[#323232] gap-4 relative z-20">
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 relative ${activeTab === 'billing' ? 'text-[#2E5A88] dark:text-[#D7E8F4]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
        >
          <Receipt size={18} />
          {t('tab_billing')}
          {activeTab === 'billing' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E5A88] dark:bg-[#D7E8F4]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('participation')}
          className={`pb-4 px-2 font-bold text-sm transition-all flex items-center gap-2 relative ${activeTab === 'participation' ? 'text-[#2E5A88] dark:text-[#D7E8F4]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
        >
          <Users size={18} />
          {t('tab_participation')}
          {activeTab === 'participation' && (
            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E5A88] dark:bg-[#D7E8F4]" />
          )}
        </button>

        {activeTab === 'billing' && bill && (
          <div className="ml-auto flex items-center pb-2">
            <MonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChange={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
            />
          </div>
        )}
      </div>

      {activeTab === 'billing' && (
        <div className="space-y-8">
          <div className="flex justify-end items-center gap-2">
            {bill && (
              <button
                disabled={clearing}
                onClick={handleClearBilling}
                className="mr-auto px-4 py-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50 border border-rose-100 dark:border-rose-900/30 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all duration-300 shadow-sm"
              >
                {clearing ? (
                  <>
                    <Loader2 className="animate-spin text-rose-600 dark:text-rose-400" size={16} />
                    {t('clearing_bill')}
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    {t('clear_billing')}
                  </>
                )}
              </button>
            )}

          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin text-[#2E5A88] dark:text-[#D7E8F4]" size={24} />
              {t('loading_billing')}
            </div>
          ) : bill && stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: t('total_bill'), value: formatPrice(bill.total_bill), icon: <IndianRupee className="text-[#2E5A88] dark:text-[#D7E8F4]" /> },
                  { label: t('total_plates'), value: language === 'bo' ? toTibetanDigits(bill.total_plates) : bill.total_plates, icon: <Users className="text-indigo-600 dark:text-indigo-400" /> },
                  { label: t('per_plate_cost'), value: formatPrice(bill.plate_cost), icon: <Receipt className="text-violet-600 dark:text-violet-400" /> },
                  { label: t('paid_users'), value: language === 'bo' ? toTibetanDigits(stats.paid_users) : stats.paid_users, icon: <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" /> },
                  { label: t('unpaid_users'), value: language === 'bo' ? toTibetanDigits(stats.unpaid_users) : stats.unpaid_users, icon: <XCircle className="text-amber-600 dark:text-amber-400" /> },
                ].map((card, i) => (
                  <GlassCard key={card.label} className="p-5">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#202020] flex items-center justify-center mb-3 border border-slate-100 dark:border-[#323232]">
                        {card.icon}
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5] mt-1">{card.value}</p>
                    </motion.div>
                  </GlassCard>
                ))}
              </div>

              {bill.bill_image_url && (
                <GlassCard className="p-4 overflow-hidden">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                    {t('bill_receipt', { period: formatMonthYear(bill.month, bill.year) })}
                  </p>
                  <img src={bill.bill_image_url} alt={t('monthly_lunch_billing')} className="max-h-64 rounded-2xl object-contain" />
                </GlassCard>
              )}

              <GlassCard className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">
                    {t('user_billing', { period: formatMonthYear(bill.month, bill.year) })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'paid', 'unpaid'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setPaymentFilter(f);
                          setPage(1);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-300 ${paymentFilter === f
                          ? 'bg-[#2E5A88] dark:bg-[#D7E8F4] text-white dark:text-[#1C1C1C] shadow-md shadow-[#2E5A88]/10 dark:shadow-none'
                          : 'bg-slate-50 dark:bg-[#202020] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#323232]/50'
                          }`}
                      >
                        {f === 'all' ? t('all_filter') : t(f)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder={t('search_users')}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#323232] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 dark:focus:ring-[#D7E8F4]/20 transition-all"
                  />
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#323232]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-[#202020]/80 text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-[#323232]">
                        <th className="p-4 font-semibold">
                          <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            {t('user_column')} <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="p-4 font-semibold">
                          <button onClick={() => toggleSort('joined_count')} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            {t('joined_column')} <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="p-4 font-semibold">
                          <button onClick={() => toggleSort('amount_due')} className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                            {t('amount_due_column')} <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="p-4 font-semibold">{t('status_column')}</th>
                        <th className="p-4 font-semibold">{t('paid_at_column')}</th>
                        <th className="p-4 font-semibold">{t('action_column')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {paginated.length > 0 ? (
                          paginated.map((row) => (
                            <motion.tr
                              key={row.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-t border-slate-50 dark:border-[#323232] hover:bg-slate-50/50 dark:hover:bg-[#202020]/50 transition-colors"
                            >
                              <td className="p-4 font-semibold text-slate-800 dark:text-[#F5F5F5]">{language === 'bo' ? (row.user?.name_bo || row.user?.name) : row.user?.name}</td>
                              <td className="p-4 text-slate-600 dark:text-slate-300">{language === 'bo' ? toTibetanDigits(row.joined_count) : row.joined_count}</td>
                              <td className="p-4 font-bold text-slate-900 dark:text-[#F5F5F5]">{formatPrice(row.amount_due)}</td>
                              <td className="p-4">
                                <PaymentBadge status={row.payment_status} />
                              </td>
                              <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                                {formatPaidAt(row.paid_at)}
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => togglePayment(row)}
                                  className="text-xs font-bold text-[#2E5A88] dark:text-[#D7E8F4] hover:text-[#1F3D5E] dark:hover:text-[#b4d2e7] hover:underline transition-colors"
                                >
                                  {row.payment_status === 'paid' ? t('mark_unpaid') : t('mark_paid')}
                                </button>
                              </td>
                            </motion.tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                              {t('no_matching_users')}
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('page_indicator', { page, totalPages, count: filtered.length })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-[#323232] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-[#323232] text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard className="p-8 relative z-20">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">
                    {t('upload_bill', { period: formatMonthYear(selectedMonth, selectedYear) })}
                  </h3>

                </div>
                <MonthYearPicker
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onChange={(m, y) => {
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                />
              </div>
              <form onSubmit={handleUpload} className="space-y-5 max-w-xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('total_bill_amount')}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={totalBillInput}
                    onChange={(e) => setTotalBillInput(e.target.value)}
                    placeholder="e.g. 18000"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-[#323232] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-450 rounded-2xl focus:ring-2 focus:ring-[#2E5A88]/20 dark:focus:ring-[#D7E8F4]/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('notes_optional')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="office lunch bill"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-[#323232] text-slate-900 dark:text-[#F5F5F5] placeholder-slate-450 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-[#2E5A88]/20 dark:focus:ring-[#D7E8F4]/20 transition-all"
                  />
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileRef.current?.click()}
                  className="relative h-40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-[#323232] bg-slate-50 dark:bg-[#202020] flex flex-col items-center justify-center cursor-pointer hover:border-[#2E5A88] dark:hover:border-[#D7E8F4] transition-colors overflow-hidden"
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={32} />
                      </div>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="text-slate-300 dark:text-slate-600 mb-2" size={36} />
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('drag_drop_bill_image')}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('drag_drop_specs')}</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-4 bg-[#2E5A88] dark:bg-[#D7E8F4] text-white dark:text-[#1C1C1C] font-bold rounded-2xl hover:bg-[#1D4063] dark:hover:bg-[#b4d2e7] disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-[#2E5A88]/10 dark:shadow-none"
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : t('generate_monthly_bill')}
                </button>
              </form>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === 'participation' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-[#202020]/50 backdrop-blur-md p-3 rounded-3xl border border-slate-100/80 dark:border-[#323232]/80 shadow-sm relative z-20">
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setParticipationView(view)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${participationView === view
                    ? 'bg-[#2E5A88] dark:bg-[#D7E8F4] text-white dark:text-[#1C1C1C] shadow-md shadow-[#2E5A88]/15 dark:shadow-none'
                    : 'bg-slate-50 dark:bg-[#272727] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#323232]/50'
                    }`}
                >
                  {t(`${view}_participation`)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {(participationView === 'daily' || participationView === 'weekly') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const d = new Date(reportDate);
                      d.setDate(d.getDate() - (participationView === 'weekly' ? 7 : 1));
                      setReportDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#272727] hover:bg-slate-100 dark:hover:bg-[#323232]/50 border border-slate-200 dark:border-[#323232] text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#323232] text-slate-900 dark:text-[#F5F5F5] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 dark:focus:ring-[#D7E8F4]/20"
                  />
                  <button
                    onClick={() => {
                      const d = new Date(reportDate);
                      d.setDate(d.getDate() + (participationView === 'weekly' ? 7 : 1));
                      setReportDate(d.toISOString().split('T')[0]);
                    }}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#272727] hover:bg-slate-100 dark:hover:bg-[#323232]/50 border border-slate-200 dark:border-[#323232] text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              {participationView === 'monthly' && (
                <MonthYearPicker
                  selectedMonth={reportMonth}
                  selectedYear={reportYear}
                  onChange={(m, y) => {
                    setReportMonth(m);
                    setReportYear(y);
                  }}
                  buttonClassName="px-4 py-2 text-xs"
                />
              )}
            </div>
          </div>

          {reportLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <Loader2 className="animate-spin text-[#2E5A88] dark:text-[#D7E8F4]" size={24} />
              {t('loading_billing')}
            </div>
          ) : reportData ? (
            <div className="space-y-6">
               {participationView === 'daily' && (
                <GlassCard className="p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2">
                        <Calendar size={18} className="text-[#2E5A88] dark:text-[#D7E8F4]" />
                        {formatFullDate(reportData.date)}
                      </h3>
                      {reportData.has_menu ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {t('todays_special')}: <span className="font-bold text-[#2E5A88] dark:text-[#D7E8F4]">{t(reportData.menu_title)}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-rose-500 dark:text-rose-450 font-medium mt-1">{t('no_menu_set')}</p>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/30 px-4 py-2.5 rounded-2xl text-center">
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase leading-none">{t('total_opted_in')}</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1.5 leading-none">
                          {language === 'bo' ? toTibetanDigits(reportData?.users?.filter((u: any) => u.status === 'joining').length ?? 0) : (reportData?.users?.filter((u: any) => u.status === 'joining').length ?? 0)}
                        </p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/80 dark:border-rose-900/30 px-4 py-2.5 rounded-2xl text-center">
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase leading-none">{t('total_opted_out')}</p>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1.5 leading-none">
                          {language === 'bo' ? toTibetanDigits(reportData?.users?.filter((u: any) => u.status === 'skipped').length ?? 0) : (reportData?.users?.filter((u: any) => u.status === 'skipped').length ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#323232]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#202020] text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-[#323232]">
                          <th className="p-4 font-semibold">{t('user_column')}</th>
                          <th className="p-4 font-semibold">{t('column_role')}</th>
                          <th className="p-4 font-semibold">{t('column_department')}</th>
                          <th className="p-4 font-semibold">{t('status_column')}</th>
                          <th className="p-4 font-semibold">{t('column_voted_at')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.users?.map((u: any) => (
                          <tr key={u.id} className="border-t border-slate-50 dark:border-[#323232] hover:bg-slate-50/50 dark:hover:bg-[#202020]/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800 dark:text-[#F5F5F5]">{language === 'bo' ? (u.name_bo || u.name) : u.name}</td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 capitalize text-xs">{t('role_' + u.role.toLowerCase())}</td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{t((u.department || 'General').toLowerCase())}</td>
                            <td className="p-4">
                              {u.status === 'joining' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                  <CheckCircle2 size={12} /> {t('joined')}
                                </span>
                              ) : u.status === 'skipped' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                                  <XCircle size={12} /> {t('skipped')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-[#202020] text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-[#323232]">
                                  {t('not_registered')}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs text-slate-400 dark:text-slate-500">{formatVotedAt(u.voted_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}

              {participationView === 'weekly' && (
                <GlassCard className="p-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2">
                      <Calendar size={18} className="text-[#2E5A88] dark:text-[#D7E8F4]" />
                      {t('weekly_participation')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('billing_period')}: <span className="font-bold text-[#2E5A88] dark:text-[#D7E8F4]">{formatDateRange(reportData?.week_start, reportData?.week_end)}</span>
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#323232]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#202020] text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-[#323232]">
                          <th className="p-4 font-semibold">{t('user_column')}</th>
                          {reportData?.days?.map((d: any) => (
                            <th key={d.date} className="p-4 font-semibold text-center min-w-[120px]">
                              <div>{t(new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }))}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal normal-case">{formatMonthDay(d.date)}</div>
                              {d.has_menu ? (
                                <div className="text-[9px] text-[#2E5A88] dark:text-[#D7E8F4] font-bold mt-0.5 max-w-[120px] truncate mx-auto" title={t(d.menu_title)}>{t(d.menu_title)}</div>
                              ) : (
                                <div className="text-[9px] text-rose-500 dark:text-rose-400 font-medium mt-0.5">{t('no_menu_set')}</div>
                              )}
                            </th>
                          ))}
                          <th className="p-4 font-semibold text-center">{t('total_opted_in')}</th>
                          <th className="p-4 font-semibold text-center">{t('total_opted_out')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.users?.map((u: any) => (
                          <tr key={u.id} className="border-t border-slate-50 dark:border-[#323232] hover:bg-slate-50/50 dark:hover:bg-[#202020]/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800 dark:text-[#F5F5F5]">
                              <div>{language === 'bo' ? (u.name_bo || u.name) : u.name}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-normal">{t('role_' + u.role.toLowerCase())} • {t((u.department || 'General').toLowerCase())}</div>
                            </td>
                            {reportData?.days?.map((d: any) => {
                              const status = u.days?.[d.date];
                              return (
                                <td key={d.date} className="p-4 text-center">
                                  {status === 'joining' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 font-bold" title={t('joined')}>
                                      ✓
                                    </span>
                                  ) : status === 'skipped' ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 font-bold" title={t('skipped')}>
                                      ✗
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-300 dark:text-slate-600 font-normal">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 text-center">{language === 'bo' ? toTibetanDigits(u.joined_count) : u.joined_count}</td>
                            <td className="p-4 font-bold text-rose-500 dark:text-rose-400 text-center">{language === 'bo' ? toTibetanDigits(u.skipped_count) : u.skipped_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}

              {participationView === 'monthly' && (
                <GlassCard className="p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2">
                        <Calendar size={18} className="text-[#2E5A88] dark:text-[#D7E8F4]" />
                        {formatMonthYear(reportMonth, reportYear)} - {t('participation_report')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('total_days')}: <span className="font-bold text-[#2E5A88] dark:text-[#D7E8F4]">{language === 'bo' ? toTibetanDigits(reportData?.total_lunch_days ?? 0) : (reportData?.total_lunch_days ?? 0)} {t('lunch_days')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#323232]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#202020] text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-[#323232]">
                          <th className="p-4 font-semibold">{t('user_column')}</th>
                          <th className="p-4 font-semibold">{t('column_role')}</th>
                          <th className="p-4 font-semibold">{t('column_department')}</th>
                          <th className="p-4 font-semibold text-center">{t('total_eligible')}</th>
                          <th className="p-4 font-semibold text-center">{t('total_opted_in')}</th>
                          <th className="p-4 font-semibold text-center">{t('total_opted_out')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.users?.map((u: any) => (
                          <tr key={u.id} className="border-t border-slate-50 dark:border-[#323232] hover:bg-slate-50/50 dark:hover:bg-[#202020]/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800 dark:text-[#F5F5F5]">{language === 'bo' ? (u.name_bo || u.name) : u.name}</td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 capitalize text-xs">{t('role_' + u.role.toLowerCase())}</td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{t((u.department || 'General').toLowerCase())}</td>
                            <td className="p-4 text-center text-slate-700 dark:text-slate-350 font-medium">{language === 'bo' ? toTibetanDigits(u.total_eligible_days) : u.total_eligible_days}</td>
                            <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{language === 'bo' ? toTibetanDigits(u.joined_count) : u.joined_count}</td>
                            <td className="p-4 text-center font-bold text-rose-500 dark:text-rose-400">{language === 'bo' ? toTibetanDigits(u.skipped_count) : u.skipped_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#272727] border border-slate-100 dark:border-[#323232] rounded-3xl">
              {t('no_report_data')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
