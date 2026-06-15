import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth/session";
import { BottomNav } from "@/components/admin/BottomNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* pb clears the fixed bottom nav (min-h-14 + padding + safe area) */}
      <main className="mx-auto w-full max-w-md px-5 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
