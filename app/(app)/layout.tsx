import { pageUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await pageUser();
  return (
    <div className="app-frame">
      {children}
      <BottomNav isAdmin={user.role === "admin"} />
    </div>
  );
}
