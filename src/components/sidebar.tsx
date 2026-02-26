"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  Building2,
  Heart,
  Download,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/positions", label: "募集職種", icon: Briefcase },
  { href: "/applicants", label: "応募者管理", icon: Users },
  { href: "/salary-benchmark", label: "適正給与", icon: DollarSign },
  { href: "/competitors", label: "競合比較", icon: Building2 },
  { href: "/compatibility", label: "相性診断", icon: Heart },
  { href: "/export", label: "エクスポート", icon: Download },
];

interface SidebarProps {
  userName?: string;
  organizationName?: string;
}

export function Sidebar({ userName, organizationName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-[#4A7FB5]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">MedRecruit</h1>
            <p className="text-xs text-white/70 truncate max-w-[160px]">
              {organizationName || "医療機関採用管理"}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[#4A7FB5] text-white shadow-sm"
                  : "text-white/80 hover:bg-[#4A7FB5]/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#4A7FB5]">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2",
            isActive("/settings")
              ? "bg-[#4A7FB5] text-white shadow-sm"
              : "text-white/80 hover:bg-[#4A7FB5]/50 hover:text-white"
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span>設定</span>
        </Link>
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{userName || "ユーザー"}</p>
          <p className="text-xs text-white/60">管理者</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-[#4A7FB5]/50 hover:text-white transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>ログアウト</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-[#769FCD] text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-60 bg-[#769FCD] flex flex-col z-40 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
