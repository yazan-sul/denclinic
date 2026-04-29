export type PermissionRole = 'DOCTOR' | 'STAFF' | 'BRANCH_MANAGER';

export type PermissionDefinition = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export const allPermissions: PermissionDefinition[] = [
  { id: 'appt.view', label: 'عرض المواعيد', description: 'رؤية قائمة المواعيد والتفاصيل', category: 'المواعيد' },
  { id: 'appt.create', label: 'إنشاء مواعيد', description: 'حجز مواعيد جديدة للمرضى', category: 'المواعيد' },
  { id: 'appt.edit', label: 'تعديل المواعيد', description: 'تعديل مواعيد قائمة', category: 'المواعيد' },
  { id: 'appt.cancel', label: 'إلغاء المواعيد', description: 'إلغاء أو رفض المواعيد', category: 'المواعيد' },
  { id: 'pat.view', label: 'عرض المرضى', description: 'رؤية قائمة المرضى والبيانات الأساسية', category: 'المرضى' },
  { id: 'pat.records', label: 'السجلات الطبية', description: 'الاطلاع على السجلات الطبية السرية', category: 'المرضى' },
  { id: 'pat.edit', label: 'تعديل بيانات المريض', description: 'تعديل بيانات وملفات المرضى', category: 'المرضى' },
  { id: 'rep.basic', label: 'التقارير الأساسية', description: 'عرض تقارير المواعيد والإحضار', category: 'التقارير' },
  { id: 'rep.financial', label: 'التقارير المالية', description: 'عرض الإيرادات والمدفوعات', category: 'التقارير' },
  { id: 'rep.export', label: 'تصدير التقارير', description: 'تنزيل التقارير بصيغة Excel أو PDF', category: 'التقارير' },
  { id: 'msg.send', label: 'إرسال رسائل', description: 'التواصل مع المرضى والفريق', category: 'الرسائل' },
  { id: 'msg.broadcast', label: 'إشعارات جماعية', description: 'إرسال رسائل لجميع المرضى', category: 'الرسائل' },
  { id: 'adm.schedule', label: 'إدارة الجدول', description: 'تعديل جدول العمل والإجازات', category: 'الإدارة' },
  { id: 'adm.billing', label: 'إدارة الفواتير', description: 'إصدار الفواتير ومتابعة المدفوعات', category: 'الإدارة' },
];

export const defaultPermissionsByRole: Record<PermissionRole, Record<string, boolean>> = {
  DOCTOR: {
    'appt.view': true,
    'appt.create': true,
    'appt.edit': true,
    'appt.cancel': true,
    'pat.view': true,
    'pat.records': true,
    'pat.edit': true,
    'rep.basic': true,
    'rep.financial': false,
    'rep.export': false,
    'msg.send': true,
    'msg.broadcast': false,
    'adm.schedule': true,
    'adm.billing': false,
  },
  STAFF: {
    'appt.view': true,
    'appt.create': true,
    'appt.edit': true,
    'appt.cancel': false,
    'pat.view': true,
    'pat.records': false,
    'pat.edit': false,
    'rep.basic': true,
    'rep.financial': false,
    'rep.export': false,
    'msg.send': true,
    'msg.broadcast': false,
    'adm.schedule': false,
    'adm.billing': false,
  },
  BRANCH_MANAGER: {
    'appt.view': true,
    'appt.create': true,
    'appt.edit': true,
    'appt.cancel': true,
    'pat.view': true,
    'pat.records': true,
    'pat.edit': true,
    'rep.basic': true,
    'rep.financial': true,
    'rep.export': true,
    'msg.send': true,
    'msg.broadcast': true,
    'adm.schedule': true,
    'adm.billing': true,
  },
};
