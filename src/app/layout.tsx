import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem('theme') || 'dark';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var shouldBeDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
    document.documentElement.style.colorScheme = shouldBeDark ? 'dark' : 'light';
  } catch (_) {}
})();
`;

export const metadata: Metadata = {
  title: "Denclinic - اكتشف العيادات",
  description: "تطبيق حجز المواعيد الطبية الذكي - حجز مواعيد التطبيب بسهولة عبر هاتفك",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Denclinic",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Denclinic",
    description: "تطبيق حجز المواعيد الطبية الذكي",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0070f3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full flex flex-col" suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
