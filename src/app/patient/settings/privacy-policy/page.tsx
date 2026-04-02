'use client';

import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';

export default function PrivacyPolicyPage() {
  return (
    <PatientLayout
      title="سياسة الخصوصية"
      subtitle="اطلع على كيفية حماية بياناتك"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-4 pb-8 text-sm leading-relaxed">
        <SectionCard title="مقدمة">
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              نحن في دن كلينك نولي أهمية قصوى لخصوصيتك وأمان بياناتك الطبية.
              تشرح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="البيانات التي نجمعها">
          <div className="px-6 py-4 space-y-3">
            <div>
              <h4 className="font-semibold mb-1">المعلومات الشخصية</h4>
              <p className="text-muted-foreground">
                الاسم، البريد الإلكتروني، رقم الهاتف، تاريخ الميلاد، والعنوان
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">المعلومات الطبية</h4>
              <p className="text-muted-foreground">
                السجلات الطبية، الوصفات الطبية، نتائج الفحوصات، والتشخيصات
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">بيانات الاستخدام</h4>
              <p className="text-muted-foreground">
                سجل تصفحك للتطبيق والأنشطة الأخرى لتحسين الخدمة
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="كيف نستخدم بياناتك">
          <div className="px-6 py-4 space-y-2">
            <p>✓ تقديم الخدمات الطبية والحجوزات</p>
            <p>✓ التواصل معك بشأن المواعيد والتحديثات</p>
            <p>✓ تحسين جودة الخدمات</p>
            <p>✓ الامتثال للمتطلبات القانونية</p>
            <p>✓ منع ال欺诈والاستخدام غير القانوني</p>
          </div>
        </SectionCard>

        <SectionCard title="أمان البيانات">
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              نستخدم تقنيات تشفير متقدمة وإجراءات أمان صارمة لحماية بياناتك.
              جميع المعلومات الطبية محفوظة في خوادم آمنة ومصرح بها.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="حقوقك">
          <div className="px-6 py-4 space-y-2">
            <p>✓ الحق في الوصول إلى بياناتك</p>
            <p>✓ الحق في تصحيح البيانات غير الدقيقة</p>
            <p>✓ الحق في حذف بياناتك (مع استثناءات قانونية)</p>
            <p>✓ الحق في الاعتراض على معالجة بياناتك</p>
          </div>
        </SectionCard>

        <SectionCard title="التواصل معنا">
          <div className="px-6 py-4">
            <p className="text-muted-foreground">
              إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا على:
            </p>
            <p className="font-semibold mt-2">privacy@denclinic.com</p>
          </div>
        </SectionCard>

        <SectionCard title="آخر تحديث">
          <div className="px-6 py-4">
            <p className="text-muted-foreground">تم آخر تحديث للسياسة في: 2 أبريل 2026</p>
          </div>
        </SectionCard>
        </div>
      </div>
    </PatientLayout>
  );
}
