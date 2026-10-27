"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Brain,
  Bot,
  FileText,
  Settings,
  LogOut,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
  { name: "AI Prediction", href: "/dashboard/predict", icon: Brain },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-blue-600" />
            <span className="text-lg font-bold text-slate-900">AI Lung</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <Stethoscope className="h-7 w-7 text-blue-600" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("rounded-md p-1 hover:bg-slate-100", collapsed && "mx-auto mt-0")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={collapsed ? item.name : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
