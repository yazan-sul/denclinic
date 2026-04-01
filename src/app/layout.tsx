import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata: Metadata = {
  title: "My App",
  description: "Your app description",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <html>
        <body className="bg-background text-foreground transition-colors duration-300 min-h-screen">
          {children}
        </body>
      </html>
    </ThemeProvider>
  );
}
