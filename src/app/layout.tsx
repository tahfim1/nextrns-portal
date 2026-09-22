import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NextRNS Portal | Employee Task Management",
  description:
    "NextRNS Employee Task Management Portal — Submit, track, and manage your work with proof uploads.",
  keywords: ["NextRNS", "task management", "employee portal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="relative w-full overflow-x-hidden min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
