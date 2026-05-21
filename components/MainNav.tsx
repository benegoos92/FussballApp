"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",        label: "Start",    icon: "🏠", exact: true },
  { href: "/kalender", label: "Kalender", icon: "📅" },
  { href: "/termine",  label: "Termine",  icon: "📌" },
  { href: "/spieler",  label: "Spieler",  icon: "👥" },
  { href: "/strafen",  label: "Strafen",  icon: "💸" },
  { href: "/kasse",    label: "Kasse",    icon: "💰" },
  { href: "/dienste",  label: "Dienste",  icon: "🔧" },
  { href: "/trikots",  label: "Trikots",  icon: "👕" },
];

export default function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="flex overflow-x-auto scrollbar-none mt-2 border-t border-green-800/60">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2.5 text-[10px] font-medium whitespace-nowrap transition-all border-b-2 min-w-[52px] ${
              active
                ? "border-green-300 text-white bg-white/10"
                : "border-transparent text-green-400 hover:text-green-200 hover:bg-white/5"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
