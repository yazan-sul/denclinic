'use client';

import { useState } from 'react';
import { useBranchScope } from '@/hook/useBranchScope';

type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';
type ReportTab = 'overview' | 'appointments' | 'revenue' | 'patients';

interface StatCard {
  label: string;
  value: string | number;
  change: number; // % change vs last period
  icon: string;
  color: string;
}

interface ChartBar {
  label: string;
  appointments: number;
  revenue: number;
}

interface TopDoctor {
  name: string;
  specialization: string;
  appointments: number;
  revenue: number;
  rating: number;
}

interface TopBranch {
  name: string;
  appointments: number;
  revenue: number;
  occupancy: number; // %
}

const mockData: Record<ReportPeriod, {
  stats: StatCard[];
  chart: ChartBar[];
  topDoctors: TopDoctor[];
  topBranches: TopBranch[];
  appointmentsByStatus: { label: string; count: number; color: string }[];
  newPatients: number;
  returningPatients: number;
}> = {
  week: {
    stats: [
      { label: 'إجمالي المواعيد', value: 87,      change: +12,  icon: '📅', color: 'primary' },
      { label: 'الإيرادات',        value: '4,320₪', change: +8,   icon: '💰', color: 'green' },
      { label: 'مرضى جدد',         value: 23,       change: +18,  icon: '👥', color: 'purple' },
      { label: 'معدل الحضور',       value: '89%',    change: -2,   icon: '✅', color: 'blue' },
    ],
    chart: [
      { label: 'الأحد',    appointments: 14, revenue: 680 },
      { label: 'الاثنين',  appointments: 18, revenue: 900 },
      { label: 'الثلاثاء', appointments: 12, revenue: 600 },
      { label: 'الأربعاء', appointments: 16, revenue: 800 },
      { label: 'الخميس',   appointments: 15, revenue: 750 },
      { label: 'الجمعة',   appointments: 8,  revenue: 400 },
      { label: 'السبت',    appointments: 4,  revenue: 190 },
    ],
    topDoctors: [
      { name: 'د. خالد عبد الله', specialization: 'تقويم',     appointments: 28, revenue: 1400, rating: 4.9 },
      { name: 'د. سارة محمود',    specialization: 'جراحة',     appointments: 22, revenue: 1100, rating: 4.7 },
      { name: 'د. أحمد النجار',   specialization: 'عام',       appointments: 19, revenue: 950,  rating: 4.5 },
    ],
    topBranches: [
      { name: 'الفرع الرئيسي', appointments: 45, revenue: 2250, occupancy: 82 },
      { name: 'فرع البيرة',    appointments: 26, revenue: 1300, occupancy: 74 },
      { name: 'فرع نابلس',     appointments: 16, revenue: 770,  occupancy: 61 },
    ],
    appointmentsByStatus: [
      { label: 'مكتمل',   count: 71, color: 'bg-green-500' },
      { label: 'ملغي',    count: 9,  color: 'bg-red-500' },
      { label: 'لم يحضر', count: 5,  color: 'bg-amber-500' },
      { label: 'معلق',    count: 2,  color: 'bg-blue-500' },
    ],
    newPatients: 23,
    returningPatients: 64,
  },
  month: {
    stats: [
      { label: 'إجمالي المواعيد', value: 342,      change: +6,   icon: '📅', color: 'primary' },
      { label: 'الإيرادات',        value: '17,100₪', change: +11,  icon: '💰', color: 'green' },
      { label: 'مرضى جدد',         value: 89,        change: +24,  icon: '👥', color: 'purple' },
      { label: 'معدل الحضور',       value: '91%',     change: +3,   icon: '✅', color: 'blue' },
    ],
    chart: [
      { label: 'أ1',  appointments: 78,  revenue: 3900 },
      { label: 'أ2',  appointments: 85,  revenue: 4250 },
      { label: 'أ3',  appointments: 91,  revenue: 4550 },
      { label: 'أ4',  appointments: 88,  revenue: 4400 },
    ],
    topDoctors: [
      { name: 'د. خالد عبد الله', specialization: 'تقويم', appointments: 112, revenue: 5600, rating: 4.9 },
      { name: 'د. سارة محمود',    specialization: 'جراحة', appointments: 98,  revenue: 4900, rating: 4.7 },
      { name: 'د. أحمد النجار',   specialization: 'عام',   appointments: 84,  revenue: 4200, rating: 4.5 },
      { name: 'د. منى حسن',       specialization: 'تجميل', appointments: 48,  revenue: 2400, rating: 4.3 },
    ],
    topBranches: [
      { name: 'الفرع الرئيسي', appointments: 178, revenue: 8900, occupancy: 86 },
      { name: 'فرع البيرة',    appointments: 102, revenue: 5100, occupancy: 77 },
      { name: 'فرع نابلس',     appointments: 62,  revenue: 3100, occupancy: 66 },
    ],
    appointmentsByStatus: [
      { label: 'مكتمل',   count: 285, color: 'bg-green-500' },
      { label: 'ملغي',    count: 32,  color: 'bg-red-500' },
      { label: 'لم يحضر', count: 18,  color: 'bg-amber-500' },
      { label: 'معلق',    count: 7,   color: 'bg-blue-500' },
    ],
    newPatients: 89,
    returningPatients: 253,
  },
  quarter: {
    stats: [
      { label: 'إجمالي المواعيد', value: 1024,     change: +9,   icon: '📅', color: 'primary' },
      { label: 'الإيرادات',        value: '51,200₪', change: +15,  icon: '💰', color: 'green' },
      { label: 'مرضى جدد',         value: 267,       change: +31,  icon: '👥', color: 'purple' },
      { label: 'معدل الحضور',       value: '88%',     change: +1,   icon: '✅', color: 'blue' },
    ],
    chart: [
      { label: 'يناير',  appointments: 320, revenue: 16000 },
      { label: 'فبراير', appointments: 342, revenue: 17100 },
      { label: 'مارس',   appointments: 362, revenue: 18100 },
    ],
    topDoctors: [
      { name: 'د. خالد عبد الله', specialization: 'تقويم', appointments: 336, revenue: 16800, rating: 4.9 },
      { name: 'د. سارة محمود',    specialization: 'جراحة', appointments: 294, revenue: 14700, rating: 4.8 },
      { name: 'د. أحمد النجار',   specialization: 'عام',   appointments: 252, revenue: 12600, rating: 4.6 },
    ],
    topBranches: [
      { name: 'الفرع الرئيسي', appointments: 534, revenue: 26700, occupancy: 88 },
      { name: 'فرع البيرة',    appointments: 306, revenue: 15300, occupancy: 79 },
      { name: 'فرع نابلس',     appointments: 184, revenue: 9200,  occupancy: 68 },
    ],
    appointmentsByStatus: [
      { label: 'مكتمل',   count: 854, color: 'bg-green-500' },
      { label: 'ملغي',    count: 96,  color: 'bg-red-500' },
      { label: 'لم يحضر', count: 54,  color: 'bg-amber-500' },
      { label: 'معلق',    count: 20,  color: 'bg-blue-500' },
    ],
    newPatients: 267,
    returningPatients: 757,
  },
  year: {
    stats: [
      { label: 'إجمالي المواعيد', value: 4128,      change: +22,  icon: '📅', color: 'primary' },
      { label: 'الإيرادات',        value: '206,400₪', change: +28,  icon: '💰', color: 'green' },
      { label: 'مرضى جدد',         value: 1073,       change: +41,  icon: '👥', color: 'purple' },
      { label: 'معدل الحضور',       value: '87%',      change: +5,   icon: '✅', color: 'blue' },
    ],
    chart: [
      { label: 'يناير',   appointments: 320,  revenue: 16000 },
      { label: 'فبراير',  appointments: 342,  revenue: 17100 },
      { label: 'مارس',    appointments: 362,  revenue: 18100 },
      { label: 'أبريل',   appointments: 340,  revenue: 17000 },
      { label: 'مايو',    appointments: 355,  revenue: 17750 },
      { label: 'يونيو',   appointments: 280,  revenue: 14000 },
      { label: 'يوليو',   appointments: 250,  revenue: 12500 },
      { label: 'أغسطس',   appointments: 310,  revenue: 15500 },
      { label: 'سبتمبر',  appointments: 378,  revenue: 18900 },
      { label: 'أكتوبر',  appointments: 392,  revenue: 19600 },
      { label: 'نوفمبر',  appointments: 398,  revenue: 19900 },
      { label: 'ديسمبر',  appointments: 401,  revenue: 20050 },
    ],
    topDoctors: [
      { name: 'د. خالد عبد الله', specialization: 'تقويم', appointments: 1344, revenue: 67200, rating: 4.9 },
      { name: 'د. سارة محمود',    specialization: 'جراحة', appointments: 1176, revenue: 58800, rating: 4.8 },
      { name: 'د. أحمد النجار',   specialization: 'عام',   appointments: 1008, revenue: 50400, rating: 4.6 },
      { name: 'د. منى حسن',       specialization: 'تجميل', appointments: 600,  revenue: 30000, rating: 4.4 },
    ],
    topBranches: [
      { name: 'الفرع الرئيسي', appointments: 2147, revenue: 107350, occupancy: 91 },
      { name: 'فرع البيرة',    appointments: 1228, revenue: 61400,  occupancy: 82 },
      { name: 'فرع نابلس',     appointments: 753,  revenue: 37650,  occupancy: 71 },
    ],
    appointmentsByStatus: [
      { label: 'مكتمل',   count: 3428, color: 'bg-green-500' },
      { label: 'ملغي',    count: 384,  color: 'bg-red-500' },
      { label: 'لم يحضر', count: 216,  color: 'bg-amber-500' },
      { label: 'معلق',    count: 100,  color: 'bg-blue-500' },
    ],
    newPatients: 1073,
    returningPatients: 3055,
  },
};

const periodLabels: Record<ReportPeriod, string> = {
  week: 'هذا الأسبوع', month: 'هذا الشهر', quarter: 'هذا الربع', year: 'هذه السنة',
};

function MiniBarChart({ data, valueKey }: { data: ChartBar[]; valueKey: 'appointments' | 'revenue' }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-primary/80 rounded-t-sm hover:bg-primary transition-colors"
              style={{ height: `${pct}%` }}
            />
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
  const branchScope = useBranchScope();

  const rawData = mockData[period];
  // For branch managers, filter topBranches to only their branch
  const data = branchScope
    ? {
        ...rawData,
        topBranches: rawData.topBranches.filter((b) => b.name.includes(branchScope.branchName.split(' - ')[0])),
      }
    : rawData;
  const totalAppts = data.appointmentsByStatus.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Period + Export toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1 bg-secondary p-1 rounded-xl">
          {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
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
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                s.change >= 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {s.change >= 0 ? '+' : ''}{s.change}%
              </span>
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
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">الاتجاه الزمني</h3>
              <div className="flex gap-1 bg-secondary p-0.5 rounded-lg">
                {(['appointments', 'revenue'] as const).map((v) => (
                  <button key={v} onClick={() => setChartView(v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartView === v ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
                    }`}>
                    {v === 'appointments' ? 'مواعيد' : 'إيرادات'}
                  </button>
                ))}
              </div>
            </div>
            <MiniBarChart data={data.chart} valueKey={chartView} />
          </div>

          {/* Appointment status pie-like */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">توزيع حالات المواعيد</h3>
            <div className="space-y-3">
              {data.appointmentsByStatus.map((s) => {
                const pct = Math.round((s.count / totalAppts) * 100);
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
          </div>

          {/* Top doctors */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">أفضل الأطباء</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-right px-4 py-2 font-semibold text-foreground">الطبيب</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground hidden sm:table-cell">مواعيد</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground">إيرادات</th>
                  <th className="text-right px-4 py-2 font-semibold text-foreground hidden sm:table-cell">التقييم</th>
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
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className="text-amber-500">★</span>
                      <span className="text-sm text-foreground mr-1">{d.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top branches */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">أداء الفروع</h3>
            </div>
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
          </div>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">المواعيد عبر الزمن</h3>
            <MiniBarChart data={data.chart} valueKey="appointments" />
          </div>
          {data.appointmentsByStatus.map((s) => {
            const pct = Math.round((s.count / totalAppts) * 100);
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
            <MiniBarChart data={data.chart} valueKey="revenue" />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">الإيرادات حسب الطبيب</h3>
            </div>
            <div className="divide-y divide-border/60">
              {data.topDoctors.map((d) => {
                const totalRev = data.topDoctors.reduce((s, r) => s + r.revenue, 0);
                const pct = Math.round((d.revenue / totalRev) * 100);
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
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">الإيرادات حسب الفرع</h3>
            </div>
            <div className="divide-y divide-border/60">
              {data.topBranches.map((b) => {
                const totalRev = data.topBranches.reduce((s, r) => s + r.revenue, 0);
                const pct = Math.round((b.revenue / totalRev) * 100);
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
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((data.newPatients / (data.newPatients + data.returningPatients)) * 100)}% من الإجمالي
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-3xl font-bold text-blue-600">{data.returningPatients.toLocaleString()}</p>
              <p className="text-sm text-blue-600/70 mt-1">مرضى عائدون</p>
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((data.returningPatients / (data.newPatients + data.returningPatients)) * 100)}% من الإجمالي
              </p>
            </div>
          </div>
          {data.topBranches.map((b) => (
            <div key={b.name} className="bg-card border border-border rounded-xl p-4">
              <p className="font-semibold text-foreground text-sm mb-3">{b.name}</p>
              <p className="text-2xl font-bold text-foreground">{b.appointments}</p>
              <p className="text-xs text-muted-foreground">مريض زار الفرع</p>
              <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${b.occupancy}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{b.occupancy}% معدل الإشغال</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
