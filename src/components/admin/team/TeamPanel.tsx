'use client';

import { useState } from 'react';
import { UsersIcon, SearchIcon, EditIcon, XIcon } from '@/components/Icons';
import { useBranchScope } from '@/hook/useBranchScope';

type MemberRole = 'DOCTOR' | 'STAFF';
type MemberStatus = 'active' | 'suspended';

type AddStep = 'search' | 'found' | 'new';

interface ExistingUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  currentRole: string;
}

interface TeamMember {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: MemberRole;
  specialization?: string;
  branch: string;
  status: MemberStatus;
  joinedAt: string;
}

const mockBranches = ['الفرع الرئيسي - رام الله', 'فرع البيرة', 'فرع نابلس'];

// Mock system users that can be looked up (not yet in team)
const mockSystemUsers: ExistingUser[] = [
  { id: 101, name: 'يوسف البرغوثي', phone: '+970591111111', email: 'yousef@example.com', currentRole: 'PATIENT' },
  { id: 102, name: 'هبة زيدان', phone: '+970592222222', email: 'heba@example.com', currentRole: 'PATIENT' },
  { id: 103, name: 'كريم عيسى', phone: '+970593333333', email: 'karim@example.com', currentRole: 'PATIENT' },
];

const mockTeam: TeamMember[] = [
  { id: 1, name: 'د. خالد عبد الله', phone: '+970591234567', email: 'khaled@clinic.com', role: 'DOCTOR', specialization: 'أخصائي تقويم', branch: 'الفرع الرئيسي - رام الله', status: 'active', joinedAt: '2025-01-15' },
  { id: 2, name: 'د. سارة محمود', phone: '+970592345678', email: 'sara@clinic.com', role: 'DOCTOR', specialization: 'جراحة فم وأسنان', branch: 'الفرع الرئيسي - رام الله', status: 'active', joinedAt: '2025-03-10' },
  { id: 3, name: 'د. أحمد النجار', phone: '+970593456789', email: 'ahmad@clinic.com', role: 'DOCTOR', specialization: 'أسنان عامة', branch: 'فرع البيرة', status: 'active', joinedAt: '2025-02-20' },
  { id: 4, name: 'د. منى حسن', phone: '+970594567890', email: 'mona@clinic.com', role: 'DOCTOR', specialization: 'تبييض وتجميل', branch: 'فرع نابلس', status: 'suspended', joinedAt: '2024-11-05' },
  { id: 5, name: 'رنا أبو علي', phone: '+970595678901', email: 'rana@clinic.com', role: 'STAFF', branch: 'الفرع الرئيسي - رام الله', status: 'active', joinedAt: '2025-01-20' },
  { id: 6, name: 'أحمد سلمان', phone: '+970596789012', email: 'a.salman@clinic.com', role: 'STAFF', branch: 'فرع البيرة', status: 'active', joinedAt: '2025-04-01' },
  { id: 7, name: 'نور الدين', phone: '+970597890123', email: 'nour@clinic.com', role: 'STAFF', branch: 'فرع نابلس', status: 'active', joinedAt: '2025-03-15' },
  { id: 8, name: 'لين عمر', phone: '+970598901234', email: 'leen@clinic.com', role: 'STAFF', branch: 'الفرع الرئيسي - رام الله', status: 'suspended', joinedAt: '2024-09-10' },
];

const emptyForm = { name: '', phone: '', email: '', role: 'DOCTOR' as MemberRole, specialization: '', branch: mockBranches[0] };

export default function TeamPanel() {
  const [team, setTeam] = useState<TeamMember[]>(mockTeam);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | MemberRole>('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const branchScope = useBranchScope();

  // Lock branch filter to assigned branch for BRANCH_MANAGER
  const effectiveBranchFilter = branchScope ? branchScope.branchName : filterBranch;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Add modal state machine
  const [addStep, setAddStep] = useState<AddStep>('search');
  const [addSearch, setAddSearch] = useState('');
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<ExistingUser | null>(null);
  const [assignRole, setAssignRole] = useState<MemberRole>('DOCTOR');
  const [assignBranch, setAssignBranch] = useState(mockBranches[0]);
  const [assignSpecialization, setAssignSpecialization] = useState('');

  const openAddModal = () => {
    setAddStep('search');
    setAddSearch('');
    setFoundUser(null);
    setAssignRole('DOCTOR');
    setAssignBranch(branchScope?.branchName ?? mockBranches[0]);
    setAssignSpecialization('');
    setForm({ ...emptyForm, branch: branchScope?.branchName ?? mockBranches[0] });
    setShowAddModal(true);
  };

  const handleSearchUser = () => {
    if (!addSearch.trim()) return;
    setAddSearchLoading(true);
    // Simulate async lookup
    setTimeout(() => {
      const match = mockSystemUsers.find(
        (u) => u.phone.includes(addSearch.trim()) || u.email.toLowerCase().includes(addSearch.trim().toLowerCase())
      );
      setAddSearchLoading(false);
      if (match) {
        setFoundUser(match);
        setAddStep('found');
      } else {
        // Pre-fill phone/email in new form
        const isPhone = addSearch.startsWith('+') || /^\d/.test(addSearch.trim());
        setForm({ ...emptyForm, phone: isPhone ? addSearch.trim() : '', email: isPhone ? '' : addSearch.trim() });
        setAddStep('new');
      }
    }, 600);
  };

  const handleAssignExisting = () => {
    if (!foundUser) return;
    const newMember: TeamMember = {
      id: foundUser.id,
      name: foundUser.name,
      phone: foundUser.phone,
      email: foundUser.email,
      role: assignRole,
      specialization: assignRole === 'DOCTOR' ? assignSpecialization : undefined,
      branch: assignBranch,
      status: 'active',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setTeam((prev) => [newMember, ...prev]);
    setShowAddModal(false);
  };

  const filtered = team.filter((m) => {
    const matchSearch = m.name.includes(search) || m.phone.includes(search) || m.email.includes(search);
    const matchRole = filterRole === 'ALL' || m.role === filterRole;
    const matchBranch = effectiveBranchFilter === 'ALL' || m.branch === effectiveBranchFilter;
    return matchSearch && matchRole && matchBranch;
  });

  const scopedTeam = branchScope ? team.filter((m) => m.branch === branchScope.branchName) : team;
  const doctors = scopedTeam.filter((m) => m.role === 'DOCTOR').length;
  const staff = scopedTeam.filter((m) => m.role === 'STAFF').length;
  const active = scopedTeam.filter((m) => m.status === 'active').length;

  const handleAdd = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    const newMember: TeamMember = {
      id: Date.now(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      role: form.role,
      specialization: form.role === 'DOCTOR' ? form.specialization : undefined,
      branch: form.branch,
      status: 'active',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setTeam((prev) => [newMember, ...prev]);
    setForm(emptyForm);
    setShowAddModal(false);
  };

  const handleEdit = () => {
    if (!editMember) return;
    setTeam((prev) => prev.map((m) => m.id === editMember.id ? editMember : m));
    setEditMember(null);
  };

  const handleToggleStatus = (id: number) => {
    setTeam((prev) => prev.map((m) => m.id === id ? { ...m, status: m.status === 'active' ? 'suspended' : 'active' } : m));
  };

  const handleDelete = (id: number) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{team.length}</p>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الفريق</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{doctors}</p>
          <p className="text-sm text-muted-foreground mt-1">أطباء</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{staff}</p>
          <p className="text-sm text-muted-foreground mt-1">موظفون</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">جميع الأدوار</option>
          <option value="DOCTOR">أطباء</option>
          <option value="STAFF">موظفون</option>
        </select>
        {!branchScope && (
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">جميع الفروع</option>
            {mockBranches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          + إضافة عضو
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الدور</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">الفرع</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الهاتف</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>لا توجد نتائج</p>
                  </td>
                </tr>
              ) : filtered.map((member) => (
                <tr key={member.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                        member.role === 'DOCTOR' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        {member.specialization && (
                          <p className="text-xs text-muted-foreground">{member.specialization}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === 'DOCTOR'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {member.role === 'DOCTOR' ? 'طبيب' : 'موظف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{member.branch}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground" dir="ltr">{member.phone}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(member.id)}
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        member.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                      }`}
                    >
                      {member.status === 'active' ? 'نشط' : 'موقوف'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditMember({ ...member })}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(member.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          عرض {filtered.length} من {team.length} عضو
        </div>
      </div>

      {/* Add Modal — 3-step flow */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-bold text-foreground">إضافة عضو للفريق</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {addStep === 'search' && 'ابحث عن حساب موجود أو أنشئ حساباً جديداً'}
                  {addStep === 'found' && 'تم العثور على الحساب — حدد الدور والفرع'}
                  {addStep === 'new' && 'لم يُعثر على حساب — أدخل بيانات العضو الجديد'}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1 px-6 mt-4">
              {(['search', 'found', 'new'] as AddStep[]).map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
                  addStep === s ? 'bg-primary' :
                  (addStep === 'found' && s === 'search') || (addStep === 'new' && s === 'search') ? 'bg-primary/40' : 'bg-border'
                }`} />
              ))}
            </div>

            <div className="p-6 space-y-4">
              {/* STEP 1: Search */}
              {addStep === 'search' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">هاتف أو بريد إلكتروني</label>
                    <div className="flex gap-2">
                      <input
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                        className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+970... أو email@..."
                        dir="ltr"
                      />
                      <button
                        onClick={handleSearchUser}
                        disabled={!addSearch.trim() || addSearchLoading}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {addSearchLoading ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <SearchIcon className="w-4 h-4" />
                        )}
                        بحث
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      مثال للتجربة: <span dir="ltr" className="font-mono">+970591111111</span>
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => { setForm(emptyForm); setAddStep('new'); }}
                      className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      + إنشاء حساب جديد مباشرة
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: Existing user found */}
              {addStep === 'found' && foundUser && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                      {foundUser.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{foundUser.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{foundUser.phone} · {foundUser.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">موجود في النظام</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">الدور في العيادة <span className="text-destructive">*</span></label>
                    <div className="flex gap-3">
                      {(['DOCTOR', 'STAFF'] as MemberRole[]).map((r) => (
                        <button key={r} onClick={() => setAssignRole(r)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                            assignRole === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                          }`}>
                          {r === 'DOCTOR' ? 'طبيب' : 'موظف'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {assignRole === 'DOCTOR' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">التخصص</label>
                      <input value={assignSpecialization} onChange={(e) => setAssignSpecialization(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
                        placeholder="مثال: أخصائي تقويم" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">تعيين للفرع <span className="text-destructive">*</span></label>
                    <select value={assignBranch} onChange={(e) => setAssignBranch(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                      {mockBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setAddStep('search')}
                      className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                      رجوع
                    </button>
                    <button onClick={handleAssignExisting}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                      تعيين
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3: New user */}
              {addStep === 'new' && (
                <>
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    <span>⚠️</span>
                    <span>لم يُعثر على حساب موجود. سيتم إنشاء حساب جديد وإرسال دعوة.</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">الدور <span className="text-destructive">*</span></label>
                    <div className="flex gap-3">
                      {(['DOCTOR', 'STAFF'] as MemberRole[]).map((r) => (
                        <button key={r} onClick={() => setForm((p) => ({ ...p, role: r }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                            form.role === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                          }`}>
                          {r === 'DOCTOR' ? 'طبيب' : 'موظف'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل <span className="text-destructive">*</span></label>
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" placeholder="أدخل الاسم" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف <span className="text-destructive">*</span></label>
                    <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" placeholder="+970..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
                    <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" placeholder="email@clinic.com" />
                  </div>
                  {form.role === 'DOCTOR' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">التخصص</label>
                      <input value={form.specialization} onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" placeholder="مثال: أخصائي تقويم" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">الفرع <span className="text-destructive">*</span></label>
                    <select value={form.branch} onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                      {mockBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setAddStep('search')}
                      className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                      رجوع
                    </button>
                    <button onClick={handleAdd} disabled={!form.name.trim() || !form.phone.trim()}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                      إنشاء وإضافة
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">تعديل بيانات العضو</h2>
              <button onClick={() => setEditMember(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل</label>
                <input value={editMember.name} onChange={(e) => setEditMember((p) => p && ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف</label>
                <input value={editMember.phone} onChange={(e) => setEditMember((p) => p && ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
              </div>
              {editMember.role === 'DOCTOR' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">التخصص</label>
                  <input value={editMember.specialization || ''} onChange={(e) => setEditMember((p) => p && ({ ...p, specialization: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الفرع</label>
                <select value={editMember.branch} onChange={(e) => setEditMember((p) => p && ({ ...p, branch: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {mockBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditMember(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button onClick={handleEdit}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 text-center" dir="rtl">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XIcon className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">تأكيد الحذف</h2>
            <p className="text-sm text-muted-foreground mb-6">
              هل أنت متأكد من حذف هذا العضو؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
