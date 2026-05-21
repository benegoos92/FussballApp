"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/kalender", label: "Kalender" },
  { href: "/termine", label: "Termine" },
  { href: "/spieler", label: "Spieler" },
  { href: "/strafen", label: "Strafen & Kasse" },
  { href: "/dienste", label: "Dienste" },
  { href: "/trikots", label: "Trikots" },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex border-b border-gray-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
