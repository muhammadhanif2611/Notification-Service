// Admin Dashboard — Layout
export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* TODO (Fase 5): Sidebar + Header navigasi admin */}
      <main className="p-6">{children}</main>
    </div>
  );
}
