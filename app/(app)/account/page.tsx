import { AccountClient } from "@/components/AccountClient";
import { PageHero } from "@/components/PageHero";
import { pageUser } from "@/lib/auth";
import { listCredentials } from "@/lib/users";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await pageUser();
  return (
    <main>
      <PageHero image="favorites.jpg" kicker={user.role === "admin" ? "Admin" : "Member"} title={user.username} />
      <div className="page-body space-y-5">
        <AccountClient
          hasPassword={user.has_password}
          passkeysEnabled={site.passkeys}
          credentials={listCredentials(user.id).map((c) => ({ id: c.id, label: c.label, created_at: c.created_at, last_used_at: c.last_used_at }))}
        />
      </div>
    </main>
  );
}
