import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Providers from "./providers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

/*
Driveline is a car-based social media plaform that allows users to connect to other people in their community with similar automotive interests.
*/

export const metadata: Metadata = {
  title: "Driveline | Drive Together",
  description:
    "Driveline is a car-based social media plaform that allows users to connect to other people in their community with similar automotive interests.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.className} dark antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-screen flex-nowrap">{children}</div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
