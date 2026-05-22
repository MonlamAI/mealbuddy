export type PaymentStatus = 'paid' | 'unpaid';

export interface PaymentStatistics {
  total_users: number;
  paid_users: number;
  unpaid_users: number;
  total_collected: number;
  total_due: number;
}

export interface UserBillUser {
  id: number;
  name: string;
  email: string;
  department?: string | null;
}

export interface UserMonthlyBill {
  id: number;
  user_id: number;
  joined_count: number;
  amount_due: number;
  payment_status: PaymentStatus;
  paid_at: string | null;
  user?: UserBillUser;
  monthly_bill?: {
    id: number;
    month: number;
    year: number;
    plate_cost: number;
    total_bill: number;
    total_plates: number;
  };
}

export interface MonthlyBill {
  id: number;
  month: number;
  year: number;
  total_bill: number;
  total_plates: number;
  plate_cost: number;
  bill_image_url: string | null;
  notes: string | null;
  status: string;
  user_bills?: UserMonthlyBill[];
  payment_statistics?: PaymentStatistics;
  created_at?: string;
}

export interface UserBillingResponse {
  current: UserMonthlyBill | null;
  history: UserMonthlyBill[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export function formatCurrency(amount: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMonthlyBill(id: number): Promise<MonthlyBill> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/monthly-bills/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load monthly bill');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchMonthlyBills(month?: number, year?: number): Promise<MonthlyBill[]> {
  const params = new URLSearchParams();
  if (month) params.set('month', String(month));
  if (year) params.set('year', String(year));
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/monthly-bills?${params.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to load monthly bills');
  const json = await res.json();
  return json.data;
}

export async function createMonthlyBill(formData: FormData): Promise<MonthlyBill> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/monthly-bills`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to create monthly bill');
  return json.data;
}

export async function updateUserBillPayment(
  monthlyBillId: number,
  userBillId: number,
  paymentStatus: PaymentStatus
): Promise<UserMonthlyBill> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/monthly-bills/${monthlyBillId}/user-bills/${userBillId}`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ payment_status: paymentStatus }),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to update payment');
  return json.data;
}

const emptyUserBilling: UserBillingResponse = {
  current: null,
  history: [],
  meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
};

export async function fetchUserBilling(): Promise<UserBillingResponse> {
  const headers = authHeaders();
  if (!('Authorization' in headers)) {
    return emptyUserBilling;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/user/monthly-bills`, {
    headers,
  });

  if (res.status === 401) {
    return emptyUserBilling;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.message === 'string'
        ? body.message
        : `Failed to load billing history (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}
