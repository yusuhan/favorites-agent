import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "收藏夹 Agent",
  description: "把散落在各个 App 里的收藏变成能问答、会提醒的个人知识库",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
