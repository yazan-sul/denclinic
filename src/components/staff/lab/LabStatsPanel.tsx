'use client';

import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabStat {
  labId:              number;
  labName:            string;
  total:              number;
  completed:          number;
  rejected:           number;
  delayed:            number;
  onTime:             number;
  late:               number;
  onTimeRate:         number | null;
  avgTurnaroundDays:  number | null;
}

interface StatsData {
  summary: {
    total:              number;
    byStatus:           Record<string, number>;
    avgTurnaroundDays:  number | null;
    onTimeRate:         number | null;
    onTimeCount:        number;
    lateCount:          number;
    totalWithTT:        number;
    totalRevenue:       number;
    pendingRevenue:     number;
  };
  byLab:  LabStat[];
  trend:  { month: string; count: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_AR: Record<string, string> = {
  DRAFT:               'مسودة',
  SENT_TO_LAB:         'مُرسل',
  UNDER_CONSTRUCTION:  'قيد التصنيع',
  DELAYED:             'متأخر',
  RECEIVED_AT_CLINIC:  'وصل',
  COMPLETED_FITTED:    'مكتمل',
  REJECTED:            'مرفوض',
  CANCELLED:           'ملغي',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:               'bg-secondary text-muted-foreground',
  SENT_TO_LAB:         'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  UNDER_CONSTRUCTION:  'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  DELAYED:             'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  RECEIVED_AT_CLINIC:  'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300',
  COMPLETED_FITTED:    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  REJECTED:            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  CANCELLED:           'bg-gray-100 dark:bg-gray-800 text-gray-500',
};

const MONTH_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function monthLabel(ym: string) {
  const [, m] = ym.split('-');
  return MONTH_AR[parseInt(m, 10) - 1] ?? ym;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Mini bar ──────────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LabStatsPanel() {
  const [data,      setData]      = useState<StatsData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/clinic/lab-orders/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!j.success) throw new Error(j.error?.message || 'تعذر التحميل');
        setData(j.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      جاري تحميل الإحصائيات...
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20 text-red-500 text-sm">{error}</div>
  );

  if (!data) return null;

  const { summary, byLab, trend } = data;
  const activeStatuses = ['SENT_TO_LAB','UNDER_CONSTRUCTION','DELAYED','RECEIVED_AT_CLINIC'];
  const activeCount = activeStatuses.reduce((s, k) => s + (summary.byStatus[k] ?? 0), 0);
  const maxTrend = Math.max(...trend.map(t => t.count), 1);

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="إجمالي الطلبات" value={summary.total} />
        <StatCard label="طلبات نشطة"     value={activeCount} color="text-blue-600 dark:text-blue-400" />
        <StatCard
          label="نسبة الالتزام بالموعد"
          value={summary.onTimeRate !== null ? `${summary.onTimeRate}%` : '—'}
          sub={summary.totalWithTT > 0 ? `${summary.onTimeCount} من ${summary.totalWithTT} طلب` : 'لا بيانات كافية'}
          color={summary.onTimeRate !== null ? (summary.onTimeRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400') : ''}
        />
        <StatCard
          label="متوسط وقت التسليم"
          value={(summary.avgTurnaroundDays !== null && summary.avgTurnaroundDays > 0) ? `${summary.avgTurnaroundDays} يوم` : '—'}
          sub={summary.totalWithTT > 0 ? 'من الإرسال للاستلام' : 'لا بيانات كافية'}
        />
      </div>

      {/* ── Revenue row ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="إجمالي إيرادات المختبرات"
          value={`${summary.totalRevenue.toLocaleString()} ₪`}
          color="text-primary"
        />
        <StatCard
          label="مستحقات قيد التحصيل"
          value={`${summary.pendingRevenue.toLocaleString()} ₪`}
          color={summary.pendingRevenue > 0 ? 'text-orange-600 dark:text-orange-400' : ''}
        />
      </div>

      {/* ── Status breakdown ── */}
      <div className="bg-card border border-border rounded-xl p-4" dir="rtl">
        <p className="text-sm font-semibold mb-3">توزيع الطلبات حسب الحالة</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(STATUS_AR).map(([key, label]) => {
            const count = summary.byStatus[key] ?? 0;
            if (count === 0) return null;
            return (
              <div key={key} className={`rounded-lg px-3 py-2 ${STATUS_COLOR[key] ?? 'bg-secondary'}`}>
                <p className="text-[11px] opacity-80">{label}</p>
                <p className="text-xl font-bold font-mono">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Monthly trend ── */}
      {trend.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4" dir="rtl">
          <p className="text-sm font-semibold mb-4">الطلبات — آخر 6 أشهر</p>
          <div className="flex items-end gap-2 h-24">
            {trend.map(t => {
              const pct = maxTrend > 0 ? (t.count / maxTrend) * 100 : 0;
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground font-mono">{t.count}</span>
                  <div className="w-full bg-primary/20 rounded-t-sm" style={{ height: `${Math.max(pct, 4)}%` }}>
                    <div className="w-full h-full bg-primary/60 rounded-t-sm" />
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">{monthLabel(t.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Per-lab table ── */}
      {byLab.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden" dir="rtl">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">أداء المختبرات</p>
          </div>
          <div className="divide-y divide-border">
            {byLab.map(lab => (
              <div key={lab.labId} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{lab.labName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lab.total} طلب · {lab.completed} مكتمل · {lab.rejected > 0 ? `${lab.rejected} مرفوض` : ''}
                      {lab.delayed > 0 ? ` · ${lab.delayed} متأخر حالياً` : ''}
                    </p>
                  </div>
                  <div className="text-left shrink-0 space-y-0.5">
                    {lab.onTimeRate !== null && (
                      <p className={`text-sm font-bold font-mono ${lab.onTimeRate >= 70 ? 'text-green-600 dark:text-green-400' : lab.onTimeRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                        {lab.onTimeRate}%
                      </p>
                    )}
                    {lab.avgTurnaroundDays !== null && (
                      <p className="text-[11px] text-muted-foreground">{lab.avgTurnaroundDays} يوم متوسط</p>
                    )}
                  </div>
                </div>
                {lab.onTimeRate !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>الالتزام بالموعد</span>
                      <span>{lab.onTime} في الوقت · {lab.late} متأخر</span>
                    </div>
                    <MiniBar
                      value={lab.onTime}
                      max={lab.onTime + lab.late}
                      color={lab.onTimeRate >= 70 ? 'bg-green-500' : lab.onTimeRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {byLab.length === 0 && summary.total === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          لا توجد طلبات بعد
        </div>
      )}
    </div>
  );
}
