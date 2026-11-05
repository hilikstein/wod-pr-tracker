"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBar, IconPeople, IconPerson, IconRings, IconStar } from "./Icons";

const TABS = [
  { href: "/", label: "Board", icon: <IconStar filled /> },
  { href: "/benchmarks", label: "WODs", icon: <IconRings /> },
  { href: "/lifts", label: "Iron", icon: <IconBar /> },
  { href: "/account", label: "Me", icon: <IconPerson /> },
];

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = isAdmin ? [...TABS, { href: "/admin", label: "People", icon: <IconPeople /> }] : TABS;
  return (
    <nav className="dock">
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : undefined}>
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
