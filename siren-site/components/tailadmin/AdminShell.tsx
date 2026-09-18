"use client";

import { Bell, ChevronDown, LogOut, Menu, Moon, RefreshCw, Search, Sun, X } from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Dropdown } from "./ui/dropdown/Dropdown";
import { DropdownItem } from "./ui/dropdown/DropdownItem";
import Link from "next/link";

export type TailAdminNavItem = { id: string; label: string; icon: ElementType };
export type TailAdminNavGroup = { label: string; items: TailAdminNavItem[] };

type ShellProps = {
  activeId: string; groups: TailAdminNavGroup[]; onNavigate: (id: string) => void;
  compact: boolean; onCompactChange: (value: boolean) => void; title: string; theme: string;
  onThemeChange: (value: string) => void;
  profile: { firstName?: string; lastName?: string; email?: string; role?: string } | null;
  busy: boolean; onRefresh: () => void; notificationCount: number; notificationContent: ReactNode;
  children: ReactNode; onSignOut: () => void;
};

/**
 * TailAdmin AppSidebar/AppHeader markup adapted to the existing admin engine.
 * This component owns no domain data: every navigation, refresh and sign-out
 * action continues to call the application callbacks supplied by AdminConsole.
 */
export default function AdminShell({ activeId, groups, onNavigate, compact, onCompactChange, title, theme, onThemeChange, profile, busy, onRefresh, notificationCount, notificationContent, children, onSignOut }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const initials = `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}` || profile?.email?.[0]?.toUpperCase() || "A";
  const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || profile?.email || "Admin";
  const expanded = !compact || mobileOpen;
  const darkMode = theme !== "light";
  const shellStyle = { backgroundColor: darkMode ? "#0c111d" : "#f9fafb", color: darkMode ? "#f9fafb" : "#101828" };
  const surfaceStyle = { backgroundColor: darkMode ? "#101828" : "#ffffff" };

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);
  useEffect(() => {
    const root = document.documentElement; const wasDark = root.classList.contains("dark");
    root.classList.toggle("dark", theme === "midnight" || theme === "graphite");
    return () => { root.classList.toggle("dark", wasDark); };
  }, [theme]);

  const toggleSidebar = () => { if (window.innerWidth >= 1280) onCompactChange(!compact); else setMobileOpen((open) => !open); };
  const navigate = (id: string) => {
    if ((window as Window & { sirenAdminDirty?: boolean }).sirenAdminDirty && !window.confirm("Saqlanmagan o‘zgarishlar bor. Chiqsangiz ular yo‘qoladi. Davom etasizmi?")) return;
    const url = new URL(window.location.href);
    if (id.startsWith("content-")) { url.searchParams.set("section", "content"); url.searchParams.set("content", id.slice("content-".length)); }
    else { url.searchParams.set("section", id); url.searchParams.delete("content"); }
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    onNavigate(id); setMobileOpen(false);
  };
  const sideWidth = "w-72.5";

  return <div className="siren-tailadmin-root min-h-screen bg-gray-50 font-outfit font-normal normal-case text-gray-900 dark:bg-gray-950 dark:text-white/90" style={shellStyle}>
    {mobileOpen && <button aria-label="Menyuni yopish" className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed top-0 left-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 ${sideWidth} ${expanded ? "translate-x-0" : "-translate-x-full"}`} style={{ ...surfaceStyle, borderColor: "#e4e7ec" }}>
      <div className={`flex py-8 ${expanded ? "justify-start" : "justify-center"}`}>
        <Link href="/" className="flex items-center gap-2 text-gray-900 dark:text-white" style={{ color: darkMode ? "#ffffff" : "#101828" }}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">S</span>
          {expanded && <span className="whitespace-nowrap text-lg font-semibold tracking-tight">SIREN Admin</span>}
        </Link>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <nav className="mb-6 flex flex-col gap-6">
          {groups.map((group) => <section key={group.label}>
            <h2 className={`mb-4 flex text-xs leading-5 text-gray-400 uppercase ${expanded ? "justify-start" : "justify-center"}`}>{expanded ? group.label : "•••"}</h2>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => { const Icon = item.icon; const active = item.id === activeId; return <li key={item.id}>
                <button type="button" title={item.label} onClick={() => navigate(item.id)} style={{ color: active ? (darkMode ? "#9cb9ff" : "#465fff") : (darkMode ? "#d0d5dd" : "#344054") }} className={`group flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${expanded ? "justify-start px-3" : "justify-center px-0"} ${active ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"}`}>
                  <Icon size={19} className={active ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"} />
                  {expanded && <span className="truncate">{item.label}</span>}
                </button>
              </li>; })}
            </ul>
          </section>)}
        </nav>
      </div>
      <div className="border-t border-gray-200 py-4 dark:border-gray-800" style={{ borderColor: "#e4e7ec" }}>
        <button type="button" title="Chiqish" onClick={onSignOut} className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 ${expanded ? "justify-start px-3" : "justify-center px-0"}`}><LogOut size={19} />{expanded && <span>Chiqish</span>}</button>
      </div>
    </aside>
    <div className={`min-h-screen transition-all duration-300 ease-in-out ${compact ? "xl:ml-0" : "xl:ml-72.5"}`}>
      <header className="sticky top-0 z-30 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" style={{ ...surfaceStyle, borderColor: "#e4e7ec" }}>
        <div className="flex w-full grow flex-col items-center justify-between xl:flex-row xl:px-6">
          <div className="flex w-full items-center gap-3 border-b border-gray-200 px-3 py-3 xl:border-b-0 xl:px-0 xl:py-4 dark:border-gray-800">
            <button type="button" aria-label="Menyuni ochish" onClick={toggleSidebar} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 lg:h-11 lg:w-11 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5" style={{ borderColor: "#cbd5e1", color: "#475467" }}>{mobileOpen ? <X size={20} /> : <Menu size={19} />}</button>
            <div className="relative ml-auto hidden xl:block xl:ml-4"><Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-600" /><input ref={searchRef} type="search" placeholder="Qidirish..." className="h-11 w-107.5 rounded-lg border border-gray-200 bg-transparent py-2.5 pr-14 pl-12 text-sm text-gray-800 shadow-theme-xs outline-hidden placeholder:text-gray-600 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90" style={{ borderColor: "#cbd5e1", color: "#344054" }} /><span className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/3" style={{ borderColor: "#cbd5e1", color: "#475467" }}>⌘ K</span></div>
            <h1 className="truncate text-base font-semibold text-gray-800 xl:hidden dark:text-white/90">{title}</h1>
          </div>
          <div className="flex w-full items-center justify-end gap-3 px-4 py-3 xl:w-auto xl:px-0 xl:py-4">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300" style={{ borderColor: "#cbd5e1", color: "#475467" }}><span>{theme === "light" ? <Sun size={17} /> : <Moon size={17} />}</span><select value={theme} onChange={(event) => onThemeChange(event.target.value)} className="bg-transparent text-sm font-medium text-gray-700 outline-hidden"><option value="light">Light</option><option value="midnight">Dark</option><option value="graphite">Contrast</option><option value="forest">Brand</option></select></label>
            <div className="relative"><button type="button" aria-label="Bildirishnomalar" onClick={() => setNotificationsOpen((open) => !open)} className="dropdown-toggle relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5" style={{ borderColor: "#cbd5e1", color: "#475467" }}><Bell size={19} />{notificationCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-brand-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{notificationCount > 9 ? "9+" : notificationCount}</span>}</button><Dropdown isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} className="w-80 overflow-hidden">{notificationContent}</Dropdown></div>
            <button type="button" onClick={onRefresh} disabled={busy} className="hidden h-10 items-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 sm:flex"><RefreshCw size={17} className={busy ? "animate-spin" : ""} />Yangilash</button>
            <div className="relative"><button type="button" onClick={() => setProfileOpen((open) => !open)} className="dropdown-toggle flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">{initials}</span><span className="hidden text-left sm:block"><b className="block max-w-36 truncate text-sm font-semibold text-gray-700 dark:text-gray-300" style={{ color: "#344054" }}>{name}</b></span><ChevronDown size={16} className="hidden text-gray-600 sm:block" /></button><Dropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} className="grid w-60 gap-2 p-4"><b className="truncate text-sm">{profile?.email || name}</b><span className="text-xs text-gray-500">{profile?.role ?? "Admin"}</span><DropdownItem onClick={onSignOut} baseClassName="mt-2 flex items-center gap-2 border-t border-gray-100 pt-3 text-sm font-medium text-error-500 dark:border-gray-800"><LogOut size={16} />Chiqish</DropdownItem></Dropdown></div>
          </div>
        </div>
      </header>
      <main className="tailadmin-page-content mx-auto max-w-360 p-4 md:p-6" style={shellStyle}>{children}</main>
    </div>
  </div>;
}
