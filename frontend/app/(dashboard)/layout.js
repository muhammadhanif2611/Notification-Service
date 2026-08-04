// Dashboard App Klien — Layout
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO (Fase 4): Sidebar + Header navigasi dashboard */}
      <main className="p-6">{children}</main>
    </div>
  );
}
