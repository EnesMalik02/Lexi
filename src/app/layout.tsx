import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans", // CSS değişkeni olarak kullanmak istersen
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lexi - Kelime Tekrar Uygulaması",
  description: "Kelime öğrenme ve tekrar uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${workSans.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
