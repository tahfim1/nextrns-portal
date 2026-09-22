"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// Toast context
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const AdminToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useAdminToast() {
  return useContext(AdminToastContext);
}

const adminNavItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    label: "All Tasks",
    href: "/admin/tasks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/admin/clients",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    label: "Employees",
    href: "/admin/employees",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/admin/history",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("nextrns-user");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            sessionStorage.setItem("nextrns-user", JSON.stringify(data.user));
          }
        })
        .catch(() => {});
    }
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("nextrns-user");
    router.push("/login");
  };

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      <div className="gradient-bg min-h-screen flex min-w-0">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-screen w-72 glass-card rounded-none border-r border-glass-border flex flex-col transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Brand */}
          <div className="p-6 border-b border-glass-border">
            <div className="flex items-center justify-center w-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl p-4 shadow-lg shadow-amber-500/10 border border-white/5">
              <img src="/logo.png" alt="NextRNS" className="w-full h-auto max-w-[180px] drop-shadow-md" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/20"
                      : "text-text-secondary hover:text-text-primary hover:bg-glass-hover"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="border-t border-glass-border my-3" />

            {/* Switch to Employee View */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-glass-hover transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              Employee View
            </Link>
          </nav>

          {/* Admin section */}
          <div className="p-4 border-t border-glass-border">
            <div className="flex items-center gap-3 mb-3">
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Admin" 
                  className="w-10 h-10 rounded-full object-cover" 
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: user?.avatarColor || "#f59e0b" }}
                >
                  {user?.displayName?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.displayName || "Loading..."}</p>
                <p className="text-xs text-amber-400 capitalize">{user?.designation || user?.role || "Administrator"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-text-secondary hover:text-red-400 hover:bg-red-500/10 border border-glass-border transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-screen relative lg:ml-72">
          {/* Top bar (mobile) */}
          <header className="lg:hidden sticky top-0 z-30 glass-card rounded-none border-b border-glass-border p-4 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-glass-hover transition-colors">
              <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-lg p-2 px-4 shadow-md border border-white/5">
                <img src="/logo.png" alt="NextRNS" className="h-5 w-auto drop-shadow-sm" />
              </div>
              <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/20 text-[10px] uppercase font-bold tracking-wider">ADMIN</span>
            </div>
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="Admin" 
                className="w-8 h-8 rounded-full object-cover" 
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: user?.avatarColor || "#f59e0b" }}
              >
                {user?.displayName?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </header>

          <div className="p-4 lg:p-8 relative z-10">{children}</div>
        </main>

        {/* Toast container */}
        <div className="fixed top-4 right-4 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-enter glass-card px-5 py-3 flex items-center gap-3 text-sm min-w-[280px] ${
                toast.type === "success" ? "border-green-500/30" : toast.type === "error" ? "border-red-500/30" : "border-blue-500/30"
              }`}
            >
              {toast.type === "success" && (
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <span className="text-text-primary">{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminToastContext.Provider>
  );
}
