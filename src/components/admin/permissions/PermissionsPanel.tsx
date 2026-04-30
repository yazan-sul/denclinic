'use client';

import { useState } from 'react';

type Role = 'DOCTOR' | 'STAFF';

interface Permission {
  id: string;
  label: string;
  description: string;
  category: string;
}

interface RolePermissions {
  role: Role;
  permissions: Record<string, boolean>;
}

interface MemberOverride {
  memberId: number;
  name: string;
  role: Role;
  branch: string;
  overrides: Record<string, boolean | null>; // null = use role default
}

const allPermissions: Permission[] = [
  // المواعيد
  { id: 'appt.view',    label: 'عرض المواعيد',        description: 'رؤية قائمة المواعيد والتفاصيل',      category: 'المواعيد' },
  { id: 'appt.create',  label: 'إنشاء مواعيد',        description: 'حجز مواعيد جديدة للمرضى',             category: 'المواعيد' },
  { id: 'appt.edit',    label: 'تعديل المواعيد',       description: 'تعديل مواعيد قائمة',                  category: 'المواعيد' },
  { id: 'appt.cancel',  label: 'إلغاء المواعيد',       description: 'إلغاء أو رفض المواعيد',               category: 'المواعيد' },
  // المرضى
  { id: 'pat.view',     label: 'عرض المرضى',           description: 'رؤية قائمة المرضى والبيانات الأساسية', category: 'المرضى' },
  { id: 'pat.records',  label: 'السجلات الطبية',        description: 'الاطلاع على السجلات الطبية السرية',   category: 'المرضى' },
  { id: 'pat.edit',     label: 'تعديل بيانات المريض',  description: 'تعديل بيانات وملفات المرضى',          category: 'المرضى' },
  // التقارير
  { id: 'rep.basic',    label: 'التقارير الأساسية',    description: 'عرض تقارير المواعيد والإحضار',        category: 'التقارير' },
  { id: 'rep.financial',label: 'التقارير المالية',      description: 'عرض الإيرادات والمدفوعات',            category: 'التقارير' },
  { id: 'rep.export',   label: 'تصدير التقارير',        description: 'تنزيل التقارير بصيغة Excel أو PDF',   category: 'التقارير' },
  // الرسائل
  { id: 'msg.send',     label: 'إرسال رسائل',          description: 'التواصل مع المرضى والفريق',           category: 'الرسائل' },
  { id: 'msg.broadcast',label: 'إشعارات جماعية',       description: 'إرسال رسائل لجميع المرضى',            category: 'الرسائل' },
  // الإدارة
  { id: 'adm.schedule', label: 'إدارة الجدول',          description: 'تعديل جدول العمل والإجازات',          category: 'الإدارة' },
  { id: 'adm.billing',  label: 'إدارة الفواتير',        description: 'إصدار الفواتير ومتابعة المدفوعات',    category: 'الإدارة' },
];

const categories = [...new Set(allPermissions.map((p) => p.category))];

const defaultRolePermissions: RolePermissions[] = [
  {
    role: 'DOCTOR',
    permissions: {
      'appt.view': true, 'appt.create': true, 'appt.edit': true, 'appt.cancel': true,
      'pat.view': true,  'pat.records': true,  'pat.edit': true,
      'rep.basic': true, 'rep.financial': false, 'rep.export': false,
      'msg.send': true,  'msg.broadcast': false,
      'adm.schedule': true, 'adm.billing': false,
    },
  },
  {
    role: 'STAFF',
    permissions: {
      'appt.view': true, 'appt.create': true, 'appt.edit': true, 'appt.cancel': false,
      'pat.view': true,  'pat.records': false, 'pat.edit': false,
      'rep.basic': true, 'rep.financial': false, 'rep.export': false,
      'msg.send': true,  'msg.broadcast': false,
      'adm.schedule': false, 'adm.billing': false,
    },
  },
];

const mockMemberOverrides: MemberOverride[] = [
  {
    memberId: 1,
    name: 'د. خالد عبد الله',
    role: 'DOCTOR',
    branch: 'الفرع الرئيسي',
    overrides: { 'rep.financial': true, 'rep.export': true },
  },
  {
    memberId: 5,
    name: 'رنا أبو علي',
    role: 'STAFF',
    branch: 'الفرع الرئيسي',
    overrides: { 'adm.billing': true },
  },
];

const roleLabels: Record<Role, string> = { DOCTOR: 'الأطباء', STAFF: 'الموظفون' };
const roleColors: Record<Role, string> = { DOCTOR: 'purple', STAFF: 'blue' };

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-secondary border border-border'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  );
}

export default function PermissionsPanel() {
  const [rolePerms, setRolePerms] = useState<RolePermissions[]>(defaultRolePermissions);
  const [memberOverrides, setMemberOverrides] = useState<MemberOverride[]>(mockMemberOverrides);
  const [activeTab, setActiveTab] = useState<'roles' | 'members'>('roles');
  const [activeRole, setActiveRole] = useState<Role>('DOCTOR');
  const [activeMemberId, setActiveMemberId] = useState<number | null>(mockMemberOverrides[0]?.memberId ?? null);
  const [saved, setSaved] = useState(false);

  const currentRolePerm = rolePerms.find((r) => r.role === activeRole)!;
  const activeMember = memberOverrides.find((m) => m.memberId === activeMemberId) ?? null;

  const toggleRolePerm = (permId: string) => {
    setRolePerms((prev) =>
      prev.map((r) =>
        r.role === activeRole
          ? { ...r, permissions: { ...r.permissions, [permId]: !r.permissions[permId] } }
          : r
      )
    );
  };

  const toggleMemberOverride = (permId: string) => {
    if (!activeMember) return;
    const rolePerm = rolePerms.find((r) => r.role === activeMember.role)!;
    const currentOverride = activeMember.overrides[permId];
    // cycle: null(default) → opposite of default → null
    let next: boolean | null;
    if (currentOverride === undefined || currentOverride === null) {
      next = !rolePerm.permissions[permId];
    } else {
      next = null;
    }
    setMemberOverrides((prev) =>
      prev.map((m) =>
        m.memberId === activeMemberId
          ? { ...m, overrides: { ...m.overrides, [permId]: next } }
          : m
      )
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const getEffectivePerm = (member: MemberOverride, permId: string): { value: boolean; isOverride: boolean } => {
    const rolePerm = rolePerms.find((r) => r.role === member.role)!;
    const override = member.overrides[permId];
    if (override === null || override === undefined) {
      return { value: rolePerm.permissions[permId], isOverride: false };
    }
    return { value: override, isOverride: true };
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl w-fit">
        {([['roles', 'صلاحيات الأدوار'], ['members', 'استثناءات الأعضاء']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== ROLE PERMISSIONS TAB ===== */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Role selector */}
          <div className="lg:col-span-1 space-y-2">
            {(['DOCTOR', 'STAFF'] as Role[]).map((role) => {
              const count = Object.values(rolePerms.find((r) => r.role === role)!.permissions).filter(Boolean).length;
              return (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                    activeRole === role ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                      role === 'DOCTOR' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {role === 'DOCTOR' ? '👨‍⚕️' : '👤'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{roleLabels[role]}</p>
                      <p className="text-xs text-muted-foreground">{count} صلاحية مفعّلة</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">⚠️ ملاحظة</p>
              <p>تؤثر هذه الصلاحيات على جميع أعضاء الدور ما لم تكن هناك استثناءات فردية.</p>
            </div>
          </div>

          {/* Permissions list */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                صلاحيات {roleLabels[activeRole]}
              </h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                activeRole === 'DOCTOR'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {roleLabels[activeRole]}
              </span>
            </div>
            <div className="divide-y divide-border/60">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="px-5 py-2 bg-secondary/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {cat}
                  </div>
                  {allPermissions.filter((p) => p.category === cat).map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                      <Toggle
                        checked={currentRolePerm.permissions[perm.id]}
                        onChange={() => toggleRolePerm(perm.id)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end">
              <button
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {saved ? '✓ تم الحفظ' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MEMBER OVERRIDES TAB ===== */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Member list */}
          <div className="lg:col-span-1 space-y-2">
            {memberOverrides.map((m) => {
              const overrideCount = Object.values(m.overrides).filter((v) => v !== null && v !== undefined).length;
              return (
                <button
                  key={m.memberId}
                  onClick={() => setActiveMemberId(m.memberId)}
                  className={`w-full text-right p-3.5 rounded-xl border-2 transition-all ${
                    activeMemberId === m.memberId ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30 bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      m.role === 'DOCTOR' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{overrideCount > 0 ? `${overrideCount} استثناء` : 'لا استثناءات'}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">💡 الاستثناءات</p>
              <p>تتيح منح أو سحب صلاحيات محددة لعضو معين بشكل مستقل عن دوره.</p>
            </div>
          </div>

          {/* Override editor */}
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            {!activeMember ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                اختر عضواً من القائمة
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      activeMember.role === 'DOCTOR' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {activeMember.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{activeMember.name}</p>
                      <p className="text-xs text-muted-foreground">{activeMember.branch} · {roleLabels[activeMember.role]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> استثناء
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary border border-border inline-block" /> موروث من الدور
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-border/60">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <div className="px-5 py-2 bg-secondary/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {cat}
                      </div>
                      {allPermissions.filter((p) => p.category === cat).map((perm) => {
                        const { value, isOverride } = getEffectivePerm(activeMember, perm.id);
                        return (
                          <div key={perm.id} className={`flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors ${isOverride ? 'bg-primary/3' : ''}`}>
                            <div className="flex items-center gap-3">
                              {isOverride && (
                                <span className="text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                                  استثناء
                                </span>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">{perm.label}</p>
                                <p className="text-xs text-muted-foreground">{perm.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOverride && (
                                <button
                                  onClick={() => toggleMemberOverride(perm.id)}
                                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                  title="إزالة الاستثناء والعودة لصلاحية الدور"
                                >
                                  ↩
                                </button>
                              )}
                              <Toggle
                                checked={value}
                                onChange={() => toggleMemberOverride(perm.id)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                  <button
                    onClick={() => {
                      setMemberOverrides((prev) =>
                        prev.map((m) => m.memberId === activeMemberId ? { ...m, overrides: {} } : m)
                      );
                    }}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                  >
                    إعادة تعيين جميع الاستثناءات
                  </button>
                  <button
                    onClick={handleSave}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {saved ? '✓ تم الحفظ' : 'حفظ التغييرات'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
