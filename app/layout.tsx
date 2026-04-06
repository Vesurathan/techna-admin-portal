import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/components/Providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Techna Admin Portal",
  description: "Techna Technical Institute Admin Portal",
  // Tab icon: `app/icon.png` (Techna smart-tech logo). Avoid `app/favicon.ico` or the Next default overrides.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
