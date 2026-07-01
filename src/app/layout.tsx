import type { Metadata } from "next";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://traaake.fr"),
  title: "TraaaKe — Créateur de contenu Microsoft Flight Simulator",
  description: "Classement, gagnants et concours screenshot hebdomadaire de TraaaKe, créateur de contenu sur Microsoft Flight Simulator.",
  icons: { icon: "/logo.png" },
  openGraph: {
    type: "website",
    url: "https://traaake.fr",
    siteName: "TraaaKe",
    title: "TraaaKe — Créateur de contenu Microsoft Flight Simulator",
    description: "Classement, gagnants et concours screenshot hebdomadaire de TraaaKe, créateur de contenu sur Microsoft Flight Simulator.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "TraaaKe" }],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary",
    title: "TraaaKe — Créateur de contenu Microsoft Flight Simulator",
    description: "Classement, gagnants et concours screenshot hebdomadaire de TraaaKe, créateur de contenu sur Microsoft Flight Simulator.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-background text-text-primary antialiased">
        {children}
        <GoogleAnalytics gaId="G-159G3KNPYS" />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0d1628",
              border: "1px solid #1e3a5f",
              color: "#f0f4f8",
            },
          }}
        />
      </body>
    </html>
  );
}
