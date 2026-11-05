import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="auth-shell" style={{ backgroundImage: `url(${site.basePath}/photos/login.jpg)` }}>
      <div className="auth-copy">
        <p className="kicker">{site.name}</p>
        <h1>
          Personal
          <br />
          Bests
        </h1>
        <p className="lede mt-4">Named WODs, heavy days, and the numbers you keep coming back to.</p>
        <div className="mt-8">
          <LoginForm />
          <p className="lede mt-4">New here? Ask the person who runs this site for an invite link.</p>
        </div>
      </div>
    </main>
  );
}
