import { InviteForm } from "@/components/InviteForm";
import { openInvite } from "@/lib/users";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invite = openInvite(token);
  return (
    <main className="auth-shell" style={{ backgroundImage: `url(${site.basePath}/photos/login.jpg)` }}>
      <div className="auth-copy">
        <p className="kicker">{site.name}</p>
        {invite ? (
          <>
            <h1>
              {invite.kind === "signup" ? (<>Join<br />in</>) : (<>New<br />sign-in</>)}
            </h1>
            <p className="lede mt-4">
              {invite.kind === "signup"
                ? "Pick a username and a password, or use a passkey. Your results are private to your account."
                : "Set a new password or add a new passkey. Your other signed-in devices will be signed out."}
            </p>
            <div className="mt-8">
              <InviteForm token={token} kind={invite.kind} username={invite.username} />
            </div>
          </>
        ) : (
          <>
            <h1>
              Link
              <br />
              expired
            </h1>
            <p className="lede mt-4">This invite was already used, revoked or ran out of time. Ask for a new one.</p>
          </>
        )}
      </div>
    </main>
  );
}
