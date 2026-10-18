import { Outlet } from "react-router";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

/**
 * Shell for every signed-in admin screen: sidebar, header, and the
 * routed screen in the main area.
 */
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <div className="flex min-h-screen flex-col pl-64">
        <AdminHeader />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
