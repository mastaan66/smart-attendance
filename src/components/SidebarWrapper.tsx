"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  GraduationCap,
  MonitorPlay,
  ShieldCheck,
  LogOut,
} from "lucide-react";

export default function SidebarWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  // Hide sidebar on landing, login, and signup pages
  const isPublicPath = pathname === "/" || pathname?.startsWith("/auth");

  if (isPublicPath) {
    return (
      <main style={{ width: "100%", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
        {children}
      </main>
    );
  }

  const isTeacher = userRole === "TEACHER";
  const isStudent = userRole === "STUDENT";
  const isAdmin = userRole === "ADMIN";

  // Build role-specific nav items
  const navItems = isTeacher
    ? [
        { href: "/teacher", label: "Teacher Console", icon: MonitorPlay },
        { href: "/classes", label: "Classes & Geofences", icon: BookOpen },
        { href: "/leave-requests", label: "Leave Requests", icon: ClipboardList },
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : isAdmin
    ? [
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : [
        // Default: Student
        { href: "/student", label: "My Dashboard", icon: LayoutDashboard },
        { href: "/leave-requests", label: "Leave Requests", icon: ClipboardList },
        { href: "/settings", label: "Settings", icon: Settings },
      ];

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border-color)" }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "var(--zoom-blue)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <GraduationCap size={20} />
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: 600 }}>Smart Campus</h1>
          </Link>

          {/* Role badge */}
          {userRole && (
            <div
              style={{
                marginTop: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: "20px",
                backgroundColor:
                  isTeacher
                    ? "rgba(139, 92, 246, 0.12)"
                    : isAdmin
                    ? "rgba(239, 68, 68, 0.10)"
                    : "rgba(11, 92, 255, 0.10)",
                color:
                  isTeacher
                    ? "#7c3aed"
                    : isAdmin
                    ? "#dc2626"
                    : "var(--zoom-blue)",
              }}
            >
              <ShieldCheck size={12} />
              {userRole}
            </div>
          )}
        </div>

        <nav style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${pathname === href ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: "12px" }}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: "24px", borderTop: "1px solid var(--border-color)", marginTop: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="sidebar-link"
            style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
          >
            <LogOut size={18} />
            Logout
          </button>
          <ThemeToggle />
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-item ${pathname === href ? "active" : ""}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
