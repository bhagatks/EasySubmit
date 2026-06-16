import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasySubmit.ai",
  description: "Automate applications with a self-learning AI engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
