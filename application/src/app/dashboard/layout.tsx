import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await verifyToken(token);
  if (!user) {
    redirect("/login");
  }

  const userData = {
    name: (user.name as string) || "Medical Practitioner",
    email: (user.email as string) || "",
    role: (user.role as string) || "DOCTOR",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={userData} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
