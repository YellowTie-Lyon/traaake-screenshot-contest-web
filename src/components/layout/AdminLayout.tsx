import { AdminSidebar } from "./AdminSidebar";
import { Badge } from "@/components/ui/badge";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        {/* Top bar */}
        <header className="h-16 border-b border-border glass flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          <Badge variant="draft">Admin</Badge>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
