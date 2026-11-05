import { AdminClient } from "@/components/AdminClient";
import { PageHero } from "@/components/PageHero";
import { pageAdmin } from "@/lib/auth";
import { listInvites, listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await pageAdmin();
  const now = new Date().toISOString();
  const invites = listInvites().map((i) => ({
    id: i.id,
    note: i.note,
    kind: i.kind,
    username: i.username,
    created_at: i.created_at,
    expires_at: i.expires_at,
    status: i.used_at ? "used" : i.revoked_at ? "revoked" : i.expires_at < now ? "expired" : "open",
    used_by_name: i.used_by_name,
  }));
  return (
    <main>
      <PageHero image="favorites.jpg" kicker="Admin" title="People" lede="Invite friends to this site and manage who can sign in." />
      <div className="page-body space-y-5">
        <AdminClient
          me={admin.id}
          users={listUsers().map((u) => ({ id: u.id, username: u.username, role: u.role, entries: u.entries, last_login_at: u.last_login_at, disabled: !!u.disabled_at }))}
          invites={invites}
        />
      </div>
    </main>
  );
}
