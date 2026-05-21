import type { Metadata } from "next";
import "./globals.css";
import MainNav from "@/components/MainNav";

export const metadata: Metadata = {
  title: "SG Stuttgart West",
  description: "Mannschaftsverwaltung SG Stuttgart West",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-green-950 text-white sticky top-0 z-40 shadow-xl">
          <div className="max-w-5xl mx-auto px-4 pt-3 pb-0 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center text-xl shadow-inner border-2 border-green-500 shrink-0">
              ⚽
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base leading-tight">SG Stuttgart West</div>
              <div className="text-green-400 text-xs">Kreisliga A1 Stuttgart · 2025/26</div>
            </div>
          </div>
          <MainNav />
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
