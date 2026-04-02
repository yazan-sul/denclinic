'use client';

import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';

export default function HelpPage() {
  const faqs = [
    {
      question: 'كيف أحجز موعداً عند طبيب؟',
      answer:
        'من القائمة الرئيسية، انقر على "الحجوزات" ثم ابحث عن العيادة أو الدكتور المطلوب. حدد الخدمة والموعد المناسب لك.',
    },
    {
      question: 'كيف أعدل أو ألغي حجزي؟',
      answer:
        'انتقل إلى صفحة "حجوزاتي" وابحث عن الموعد. يمكنك تعديل او الغاؤه قبل 24 ساعة من الموعد.',
    },
    {
      question: 'هل يمكن إضافة أفراد عائلتي؟',
      answer:
        'نعم، من قسم "العائلة" يمكنك إضافة أفراد عائلتك وإدارة سجلاتهم الطبية.',
    },
    {
      question: 'كيف أتابع سجلاتي الطبية؟',
      answer:
        'كل فحوصاتك وزياراتك الطبية موثقة في قسم "السجلات الطبية" للمراجعة السريعة.',
    },
    {
      question: 'كيف أتواصل مع الدعم الفني؟',
      answer:
        'يمكنك التواصل معنا عبر البريد الإلكتروني support@denclinic.com أو اتصل برقمنا: +966-50-XXXXX',
    },
  ];

  return (
    <PatientLayout
      title="المساعدة"
      subtitle="الأسئلة الشائعة والدعم"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-4 pb-8">
        {faqs.map((faq, index) => (
          <SectionCard key={index} title="">
            <div className="px-6 py-4">
              <h4 className="font-semibold text-foreground mb-2">
                {faq.question}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </SectionCard>
        ))}

        {/* Contact Support */}
        <SectionCard title="تواصل معنا">
          <div className="px-6 py-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
              <p className="font-semibold text-foreground">
                support@denclinic.com
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">رقم الهاتف</p>
              <p className="font-semibold text-foreground">+966-50-XXXXX</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ساعات العمل</p>
              <p className="font-semibold text-foreground">
                الأحد - الخميس: 8 ص - 10 م
              </p>
            </div>
          </div>
        </SectionCard>        </div>      </div>
    </PatientLayout>
  );
}
