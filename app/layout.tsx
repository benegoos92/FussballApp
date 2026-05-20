import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FussballApp",
  description: "Terminverwaltung für dein Fussballteam",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-green-700 text-white shadow">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <h1 className="text-xl font-bold tracking-wide">FussballApp</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
