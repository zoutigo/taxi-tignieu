import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isActive = session?.user?.isActive !== false;
  const isAdminLike = Boolean(
    session?.user?.isAdmin || session?.user?.isManager || session?.user?.isDriver
  );
  if (!isActive || !isAdminLike) {
    redirect("/");
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
