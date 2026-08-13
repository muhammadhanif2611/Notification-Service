import AuthGuard from "@/components/AuthGuard";
import ClientSidebar from "@/components/client/ClientSidebar";
import ClientHeader from "@/components/client/ClientHeader";

/**
 * DashboardLayout — Layout wrapper untuk Client User (Developer Portal).
 * DESIGN.md: Sidebar 240px sticky + Top Header + Content max-w-7xl p-6 space-y-6.
 * AuthGuard memastikan hanya user ter-autentikasi yang bisa akses.
 */
export default function DashboardLayout({ children }) {
  return (
    <AuthGuard requiredRole="user">
      <div className="flex min-h-screen bg-[var(--neutral-bg)]">
        <ClientSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ClientHeader />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
