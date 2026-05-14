"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
    {
        href: "/dashboard/rules",
        label: "Rules",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/approvals",
        label: "Approvals",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <div className="flex min-h-screen bg-gray-950 text-white">
            <aside className="w-56 border-r border-gray-800 p-4 flex flex-col shrink-0">
                <div className="flex items-center gap-2 px-2 mb-8">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="font-semibold text-sm">Guardrails</span>
                </div>

                <nav className="flex flex-col gap-1 flex-1">
                    {NAV.map(({ href, label, icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                pathname === href
                                    ? "bg-indigo-600 text-white"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                        >
                            {icon}
                            {label}
                        </Link>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                </button>
            </aside>

            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
