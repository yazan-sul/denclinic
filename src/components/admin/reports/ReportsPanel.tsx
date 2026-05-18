'use client';

import { useState, useEffect } from 'react';

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';
type ReportTab = 'overview' | 'appointments' | 'revenue' | 'patients';

interface StatCard { label: string; value: string | number; change: number; icon: string; color: string }
interface ChartBar { label: string; appointments: number; revenue: number }
interface TopDoctor { name: string; specialization: string; appointments: number; revenue: number; rating: number }
interface TopBranch { name: string; appointments: number; revenue: number; occupancy: number }

interface ReportData {
  stats: StatCard[];
  chart: ChartBar[];
  topDoctors: TopDoctor[];
  topBranches: TopBranch[];
  appointmentsByStatus: { label: string; count: number; color: string }[];
  newPatients: number;
  returningPatients: number;
}

const periodLabels: Record<ReportPeriod, string> = {
  week: 'هذا الأسبوع', month: 'هذا الشهر', quarter: 'هذا الربع', year: 'هذه السنة',
};

function MiniBarChart({ data, valueKey }: { data: ChartBar[]; valueKey: 'appointments' | 'revenue' }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors" style={{ height: `${pct}%` }} />
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</span>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded shadow hidden group-hover:block whitespace-nowrap z-10">
              {valueKey === 'revenue' ? `${d[valueKey].toLocaleString()}₪` : d[valueKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPanel() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [chartView, setChartView] = useState<'appointments' | 'revenue'>('appointments');

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/admin/reports?period=${period}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject('فشل التحميل')))
      .then((json) => setData(json.data))
      .catch(() => setFetchError('تعذّر تحميل التقارير'))
      .finally(() => setLoading(false));
  }, [period]);

  const totalAppts = data?.appointmentsByStatus.reduce((s, r) => s + r.count, 0) ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جارٍ تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" dir="rtl">
        <p className="text-4xl">⚠️</p>
        <p className="text-destructive text-sm">{fetchError ?? 'حدث خطأ'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Period + Export toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1 bg-secondary p-1 rounded-xl">
          {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <span>⬇️</span> تصدير PDF
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
              {s.change !== 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  s.change >= 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {s.change >= 0 ? '+' : ''}{s.change}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {([
          ['overview', 'نظرة عامة'],
          ['appointments', 'المواعيد'],
          ['revenue', 'الإيرادات'],
          ['patients', 'المرضى'],
        ] as [ReportTab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">الاتجاه الزمني</h3>
              <div className="flex gap-1 bg-secondary p-0.5 rounded-lg">
                {(['appointments', 'revenue'] as const).map((v) => (
                  <button key={v} onClick={() => setChartView(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${chartView === v ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}>
                    {v === 'appointments' ? 'مواعيد' : 'إيرادات'}
                  </button>
                ))}
              </div>
            </div>
            {data.chart.length > 0 ? (
              <MiniBarChart data={data.chart} valueKey={chartView} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات في هذه الفترة</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">توزيع حالات المواعيد</h3>
            {data.appointmentsByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد مواعيد في هذه الفترة</p>
            ) : (
              <div className="space-y-3">
                {data.appointmentsByStatus.map((s) => {
                  const pct = totalAppts > 0 ? Math.round((s.count / totalAppts) * 100) : 0;
                  return (
                    <div key={s.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                          <span className="text-foreground">{s.label}</span>
                        </div>
                        <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">أفضل الأطباء</h3>
            </div>
            {data.topDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-right px-4 py-2 font-semibold text-foreground">الطبيب</th>
                    <th className="text-right px-4 py-2 font-semibold text-foreground hidden sm:table-cell">مواعيد</th>
                    <th className="text-right px-4 py-2 font-semibold text-foreground">إيرادات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDoctors.map((d, i) => (
                    <tr key={d.name} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                          <div>
                            <p className="font-medium text-foreground">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{d.specialization}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-foreground">{d.appointments}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{d.revenue.toLocaleString()}₪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">أداء الفروع</h3>
            </div>
            {data.topBranches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.topBranches.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20">
                    <span className="text-muted-foreground text-sm w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{b.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${b.occupancy}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{b.occupancy}% إشغال</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-green-600">{b.revenue.toLocaleString()}₪</p>
                      <p className="text-xs text-muted-foreground">{b.appointments} موعد</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">المواعيد عبر الزمن</h3>
            {data.chart.length > 0 ? <MiniBarChart data={data.chart} valueKey="appointments" /> : (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            )}
          </div>
          {data.appointmentsByStatus.map((s) => {
            const pct = totalAppts > 0 ? Math.round((s.count / totalAppts) * 100) : 0;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                  <span className="text-white text-lg font-bold">{pct}%</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.count.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REVENUE ── */}
      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">الإيرادات عبر الزمن</h3>
            {data.chart.length > 0 ? <MiniBarChart data={data.chart} valueKey="revenue" /> : (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">الإيرادات حسب الطبيب</h3>
            </div>
            {data.topDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.topDoctors.map((d) => {
                  const totalRev = data.topDoctors.reduce((s, r) => s + r.revenue, 0);
                  const pct = totalRev > 0 ? Math.round((d.revenue / totalRev) * 100) : 0;
                  return (
                    <div key={d.name} className="px-5 py-3 hover:bg-secondary/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                        <span className="text-sm font-semibold text-green-600">{d.revenue.toLocaleString()}₪</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">الإيرادات حسب الفرع</h3>
            </div>
            {data.topBranches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.topBranches.map((b) => {
                  const totalRev = data.topBranches.reduce((s, r) => s + r.revenue, 0);
                  const pct = totalRev > 0 ? Math.round((b.revenue / totalRev) * 100) : 0;
                  return (
                    <div key={b.name} className="px-5 py-3 hover:bg-secondary/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-foreground">{b.name}</span>
                        <span className="text-sm font-semibold text-green-600">{b.revenue.toLocaleString()}₪</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PATIENTS ── */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 sm:col-span-2 lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">{data.newPatients.toLocaleString()}</p>
              <p className="text-sm text-purple-600/70 mt-1">مرضى جدد</p>
              {(data.newPatients + data.returningPatients) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((data.newPatients / (data.newPatients + data.returningPatients)) * 100)}% من الإجمالي
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">{data.returningPatients.toLocaleString()}</p>
              <p className="text-sm text-blue-600/70 mt-1">مرضى عائدون</p>
              {(data.newPatients + data.returningPatients) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((data.returningPatients / (data.newPatients + data.returningPatients)) * 100)}% من الإجمالي
                </p>
              )}
            </div>
          </div>
          {data.topBranches.map((b) => (
            <div key={b.name} className="bg-card border border-border rounded-xl p-4">
              <p className="font-semibold text-foreground text-sm mb-3">{b.name}</p>
              <p className="text-2xl font-bold text-foreground">{b.appointments}</p>
              <p className="text-xs text-muted-foreground">موعد في الفرع</p>
              <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${b.occupancy}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{b.occupancy}% من إجمالي المواعيد</p>
            </div>
          ))}
          {data.topBranches.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 sm:col-span-2 lg:col-span-4">لا توجد بيانات في هذه الفترة</p>
          )}
        </div>
      )}
    </div>
  );
}
