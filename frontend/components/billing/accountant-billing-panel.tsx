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
} from 'lucide-react';
import {
  createMonthlyBill,
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
import { useLanguage } from '@/components/providers/language-provider';

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
    className={`bg-white/80 backdrop-blur-xl border border-slate-100/80 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ${className}`}
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
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-amber-50 text-amber-700 border border-amber-100'
        }`}
    >
      {paid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {paid ? t('paid') : t('unpaid')}
    </span>
  );
}

export default function AccountantBillingPanel() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [bill, setBill] = useState<MonthlyBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [totalBillInput, setTotalBillInput] = useState('');
  const [notes, setNotes] = useState('');
  const [billImage, setBillImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-[#2E5A88]" size={28} />
            {t('monthly_lunch_billing')}
          </h2>

        </div>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 className="animate-spin text-[#2E5A88]" size={24} />
          {t('loading_billing')}
        </div>
      ) : bill && stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: t('total_bill'), value: formatCurrency(bill.total_bill), icon: <IndianRupee className="text-[#2E5A88]" /> },
              { label: t('total_plates'), value: bill.total_plates, icon: <Users className="text-indigo-600" /> },
              { label: t('per_plate_cost'), value: formatCurrency(bill.plate_cost), icon: <Receipt className="text-violet-600" /> },
              { label: t('paid_users'), value: stats.paid_users, icon: <CheckCircle2 className="text-emerald-600" /> },
              { label: t('unpaid_users'), value: stats.unpaid_users, icon: <XCircle className="text-amber-600" /> },
            ].map((card, i) => (
              <GlassCard key={card.label} className="p-5">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                    {card.icon}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                </motion.div>
              </GlassCard>
            ))}
          </div>

          {bill.bill_image_url && (
            <GlassCard className="p-4 overflow-hidden">
              <p className="text-sm font-semibold text-slate-600 mb-3">
                {t('bill_receipt', { period: monthLabel(bill.month, bill.year) })}
              </p>
              <img src={bill.bill_image_url} alt={t('monthly_lunch_billing')} className="max-h-64 rounded-2xl object-contain" />
            </GlassCard>
          )}

          <GlassCard className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold">
                {t('user_billing', { period: monthLabel(bill.month, bill.year) })}
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
                        ? 'bg-[#2E5A88] text-white shadow-md shadow-[#2E5A88]/10'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {f === 'all' ? t('all_filter') : t(f)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t('search_users')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-all"
              />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4 font-semibold">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                        {t('user_column')} <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="p-4 font-semibold">
                      <button onClick={() => toggleSort('joined_count')} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
                        {t('joined_column')} <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="p-4 font-semibold">
                      <button onClick={() => toggleSort('amount_due')} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
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
                          className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 font-semibold text-slate-800">{row.user?.name}</td>
                          <td className="p-4 text-slate-600">{row.joined_count}</td>
                          <td className="p-4 font-bold text-slate-900">{formatCurrency(row.amount_due)}</td>
                          <td className="p-4">
                            <PaymentBadge status={row.payment_status} />
                          </td>
                          <td className="p-4 text-slate-500 text-xs">
                            {row.paid_at
                              ? new Date(row.paid_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                              : '—'}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => togglePayment(row)}
                              className="text-xs font-bold text-[#2E5A88] hover:text-[#1F3D5E] hover:underline transition-colors"
                            >
                              {row.payment_status === 'paid' ? t('mark_unpaid') : t('mark_paid')}
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
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
                <p className="text-sm text-slate-500">
                  {t('page_indicator', { page, totalPages, count: filtered.length })}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </>
      ) : (
        <GlassCard className="p-8">
          <h3 className="text-xl font-bold mb-2">
            {t('upload_bill', { period: monthLabel(selectedMonth, selectedYear) })}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {t('no_bill_exists')}
          </p>
          <form onSubmit={handleUpload} className="space-y-5 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('total_bill_amount')}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={totalBillInput}
                onChange={(e) => setTotalBillInput(e.target.value)}
                placeholder="e.g. 18000"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#2E5A88]/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('notes_optional')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="office lunch bill"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none outline-none focus:ring-2 focus:ring-[#2E5A88]/20 transition-all"
              />
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current?.click()}
              className="relative h-40 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-[#2E5A88] transition-colors overflow-hidden"
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
                  <UploadCloud className="text-slate-300 mb-2" size={36} />
                  <p className="text-sm font-medium text-slate-500">{t('drag_drop_bill_image')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('drag_drop_specs')}</p>
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
              className="w-full py-4 bg-[#2E5A88] text-white font-bold rounded-2xl hover:bg-[#1D4063] disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-[#2E5A88]/10"
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : t('generate_monthly_bill')}
            </button>
          </form>
        </GlassCard>
      )}
    </section>
  );
}
