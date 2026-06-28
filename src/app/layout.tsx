import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { getPortfolioMetadata } from "@/lib/storage";
import Navigation from "./Navigation";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const name = "Van-Nhan Nguyen";
  const bio = "Aspiring photographer";
  
  return {
    title: `${name} | Photography Portfolio`,
    description: bio,
    keywords: ["photography", "portfolio", "gallery", "fine art", "high-resolution"],
    authors: [{ name }],
    openGraph: {
      title: `${name} | Photography Portfolio`,
      description: bio,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const metadata = await getPortfolioMetadata();

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col sm:flex-row bg-bg-base text-text-main font-sans selection:bg-text-main selection:text-bg-base">
        <Suspense fallback={
          <div className="w-full sm:w-48 shrink-0 p-6 sm:px-6 sm:py-10 text-[10px] tracking-widest font-bold text-text-light uppercase">
            LOADING...
          </div>
        }>
          <Navigation categories={metadata.categories} folders={metadata.folders || []} />
        </Suspense>


        {/* Immersive Photo Grid Display Area on the Right */}
        <div className="flex-grow flex flex-col min-h-screen">
          <main className="flex-grow">
            {children}
          </main>
          <Analytics />
        </div>
      </body>
    </html>
  );
}
