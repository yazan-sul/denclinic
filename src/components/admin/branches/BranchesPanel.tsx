'use client';

import { useState, useEffect } from 'react';
import { SearchIcon } from '@/components/Icons';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
  doctorsCount: number;
  staffCount: number;
}

export default function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/branches', { credentials: 'include' });
        if (!res.ok) throw new Error('فشل تحميل الفروع');
        const json = await res.json();
        setBranches(json.data);
      } catch {
        setError('تعذّر تحميل بيانات الفروع');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = branches.filter((b) =>
    b.name.includes(search) || b.address.includes(search)
  );

  const totalDoctors = branches.reduce((s, b) => s + b.doctorsCount, 0);
  const totalStaff = branches.reduce((s, b) => s + b.staffCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground" dir="rtl">
        <p>جارٍ التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-destructive" dir="rtl">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{branches.length}</p>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الفروع</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalDoctors}</p>
          <p className="text-sm text-muted-foreground mt-1">أطباء</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalStaff}</p>
          <p className="text-sm text-muted-foreground mt-1">موظفون</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو العنوان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🏥</p>
            <p>لا توجد فروع</p>
          </div>
        ) : filtered.map((branch) => (
          <div
            key={branch.id}
            className="bg-card border border-border rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-primary/10">
                  🏥
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{branch.name}</h3>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-sm">
              {branch.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>📍</span>
                  <span className="text-xs">{branch.address}</span>
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>📞</span>
                  <span className="text-xs" dir="ltr">{branch.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>📅</span>
                <span className="text-xs">تاريخ الإنشاء: {branch.createdAt}</span>
              </div>
            </div>

            {/* Team counts */}
            <div className="flex gap-3 pt-1">
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-purple-600">{branch.doctorsCount}</p>
                <p className="text-xs text-purple-600/70">أطباء</p>
              </div>
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-600">{branch.staffCount}</p>
                <p className="text-xs text-blue-600/70">موظفون</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
