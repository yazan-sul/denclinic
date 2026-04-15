import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear the authentication cookie by setting it to expire
    const response = NextResponse.json(
      { success: true, message: 'تم تسجيل الخروج بنجاح' },
      { status: 200 }
    );

    // Clear the authToken cookie
    response.cookies.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // This expires the cookie immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
