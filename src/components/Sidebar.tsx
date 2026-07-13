"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Megaphone,
  Sparkles,
  Database,
  LogOut,
} from "lucide-react";
import ConsultoriaBadge from "./ConsultoriaBadge";

const NAV = [
  { href: "/pauta", label: "Pauta Meta", icon: Megaphone },
  { href: "/chat", label: "Chat IA", icon: Sparkles },
  { href: "/datos", label: "Datos", icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-grun-950 text-grun-100 flex flex-col min-h-screen sticky top-0 max-h-screen">
      <div className="p-4">
        <div className="bg-white rounded-xl px-3 py-2.5 flex justify-center">
          <Image src="/grun-logo.jpg" alt="Grün Store" width={120} height={60} priority />
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-lima text-grun-950"
                  : "text-grun-200 hover:bg-grun-800 hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 space-y-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-grun-300 hover:bg-grun-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
        <ConsultoriaBadge />
      </div>
    </aside>
  );
}
