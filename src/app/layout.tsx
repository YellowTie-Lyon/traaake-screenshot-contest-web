import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraaaKe Concours Screenshot",
  description: "Classement et gagnants du concours screenshot hebdomadaire TraaaKe MSFS",
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
