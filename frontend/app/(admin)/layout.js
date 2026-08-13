import AuthGuard from "@/components/AuthGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

/**
 * AdminLayout — Layout wrapper untuk Platform Admin.
 * Sesuai DESIGN.md: Sidebar (240px sticky) + Top Header + Content Area (max-w-7xl, p-6, space-y-6).
 */
export default function AdminLayout({ children }) {
  return (
    <AuthGuard requiredRole="admin">
      <div className="flex min-h-screen bg-[var(--neutral-bg)]">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AdminHeader />

          {/* Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
