'use client';

import { useState } from 'react';
import { FormInput } from '@/components/ui/FormInputs';
import Button from '@/components/ui/Button';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  color: string;
}

interface AppointmentStat {
  status: string;
  count: number;
  color: string;
}

const ReportsPanel = () => {
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-01-31');

  const stats: StatCard[] = [
    {
      label: 'إجمالي المواعيد',
      value: '127',
      change: '+12% من الشهر السابق',
      trend: 'up',
      color: 'text-blue-600',
    },
    {
      label: 'المواعيد المكتملة',
      value: '112',
      change: '+8% من الشهر السابق',
      trend: 'up',
      color: 'text-green-600',
    },
    {
      label: 'عدم الحضور',
      value: '8',
      change: '-2% من الشهر السابق',
      trend: 'down',
      color: 'text-red-600',
    },
    {
      label: 'الإيرادات',
      value: '15,800 ر.س',
      change: '+18% من الشهر السابق',
      trend: 'up',
      color: 'text-purple-600',
    },
  ];

  const appointmentStats: AppointmentStat[] = [
    { status: 'مكتملة', count: 112, color: 'bg-green-500' },
    { status: 'قادمة', count: 8, color: 'bg-blue-500' },
    { status: 'ملغاة', count: 5, color: 'bg-gray-500' },
    { status: 'عدم حضور', count: 2, color: 'bg-red-500' },
  ];

  const topServices = [
    { name: 'تنظيف الأسنان', count: 45, revenue: '4,500 ر.س' },
    { name: 'الحشو', count: 38, revenue: '3,800 ر.س' },
    { name: 'خلع الأسنان', count: 22, revenue: '3,300 ر.س' },
    { name: 'تقويم أسنان', count: 15, revenue: '2,250 ر.س' },
    { name: 'فحص شامل', count: 7, revenue: '700 ر.س' },
  ];

  const patientStats = [
    { label: 'المرضى الجدد', value: 18, change: '+4' },
    { label: 'المرضى العائدين', value: 89, change: '+12' },
    { label: 'معدل الرضا', value: '4.8/5', change: '+0.2' },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">فلاتر التقرير</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="من تاريخ"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <FormInput
            label="إلي تاريخ"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="flex items-end">
            <Button variant="primary" className="w-full">
              تحديث التقرير
            </Button>
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold mb-2 ${stat.color}`}>{stat.value}</p>
            <p className={`text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {stat.trend === 'up' ? '📈' : '📉'} {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-6">توزيع حالات المواعيد</h3>
          <div className="space-y-4">
            {appointmentStats.map((stat, index) => {
              const percentage = (stat.count / 127) * 100;
              return (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{stat.status}</span>
                    <span className="text-sm font-semibold">{stat.count}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${stat.color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patient Statistics */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-6">إحصائيات المرضى</h3>
          <div className="space-y-6">
            {patientStats.map((stat, index) => (
              <div key={index} className="pb-6 border-b border-border last:border-0 last:pb-0">
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change} من الشهر السابق</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-6">أكثر الخدمات طلباً</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 font-semibold text-sm">الخدمة</th>
                <th className="pb-3 font-semibold text-sm">عدد الحجوزات</th>
                <th className="pb-3 font-semibold text-sm">الإيرادات</th>
                <th className="pb-3 font-semibold text-sm">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {topServices.map((service, index) => {
                const percentage = (service.count / 127) * 100;
                return (
                  <tr key={index} className="border-b border-border hover:bg-secondary/50">
                    <td className="py-4 text-sm">{service.name}</td>
                    <td className="py-4 text-sm font-semibold">{service.count}</td>
                    <td className="py-4 text-sm font-semibold">{service.revenue}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold">{Math.round(percentage)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">خيارات التصدير</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" className="flex-1 min-w-fit">
            📄 تصدير PDF
          </Button>
          <Button variant="secondary" className="flex-1 min-w-fit">
            📊 تصدير Excel
          </Button>
          <Button variant="secondary" className="flex-1 min-w-fit">
            🖨️ طباعة
          </Button>
          <Button variant="secondary" className="flex-1 min-w-fit">
            📧 إرسال بالبريد
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;
