import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError } from '@/lib/errors';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    // Access params correctly based on Next.js 15+ async params or sync params fallback
    let id: string;
    if ('then' in context.params) {
      id = (await context.params).id;
    } else {
      id = context.params.id;
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patient: {
          userId: decoded.userId,
        },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        clinic: true,
        branch: true,
        doctor: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError('السجل الطبي غير موجود');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سجل طبي - ${appointment.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .clinic-name { font-size: 28px; font-weight: bold; color: #2563eb; margin: 0; }
          .branch-name { font-size: 16px; color: #666; margin-top: 5px; }
          .title { font-size: 22px; margin-bottom: 20px; text-align: center; font-weight: bold; background: #f3f4f6; padding: 10px; border-radius: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-item { background: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .info-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .info-value { font-size: 16px; font-weight: 600; color: #111827; }
          .details-section { margin-top: 30px; }
          .details-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
          .details-text { font-size: 14px; background: #f9fafb; padding: 15px; border-radius: 8px; min-height: 60px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">${appointment.clinic.name}</h1>
          <p class="branch-name">فرع ${appointment.branch.name}</p>
        </div>

        <div class="title">تقرير سجل طبي</div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">اسم المريض</div>
            <div class="info-value">${appointment.patient.user.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">تاريخ الموعد</div>
            <div class="info-value">${new Date(appointment.appointmentDate).toLocaleDateString('ar-SA')} - ${appointment.appointmentTime}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الطبيب المعالج</div>
            <div class="info-value">د. ${appointment.doctor.user.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الخدمة</div>
            <div class="info-value">${appointment.service.name}</div>
          </div>
        </div>

        <div class="details-section">
          <h3 class="details-title">سبب الزيارة</h3>
          <div class="details-text">${appointment.reasonForVisit || 'لا يوجد سبب محدد'}</div>
        </div>

        <div class="details-section">
          <h3 class="details-title">ملاحظات الطبيب / التشخيص</h3>
          <div class="details-text">${appointment.notes || 'لا توجد ملاحظات مسجلة'}</div>
        </div>

        <div class="footer">
          <p>هذا التقرير تم إصداره آلياً من نظام إدارة العيادات</p>
          <p>تاريخ الإصدار: ${new Date().toLocaleString('ar-SA')}</p>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="medical-record-${appointment.id}.pdf"`,
      },
    });

  } catch (error) {
    return handleApiError(error);
  }
}
