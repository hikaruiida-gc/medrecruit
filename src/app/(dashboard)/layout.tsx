import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#F7FBFC]">
      <Sidebar
        userName={session.user?.name}
        organizationName={(session.user as Record<string, unknown>)?.organizationName as string}
      />
      <main className="md:pl-60">
        <div className="sticky top-0 z-20 flex items-center justify-end px-6 py-3 bg-[#F7FBFC]/80 backdrop-blur-sm border-b border-[#D6E6F2]">
          <NotificationBell />
        </div>
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
