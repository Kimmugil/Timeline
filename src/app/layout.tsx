import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "게임 이슈 타임라인",
  description: "Internal game analytics dashboard",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
