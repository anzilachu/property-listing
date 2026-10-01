import { FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button, Field, Panel } from "../components/ui";
import { supabase } from "../lib/supabase";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) {
    return <Navigate to="/admin" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase!.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const redirectTo = searchParams.get("redirect") || "/admin";
    navigate(redirectTo.startsWith("/admin") ? redirectTo : "/admin", { replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <Panel title="PropHub Admin" eyebrow="Super admin" className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-500/10 text-emerald-700">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="text-sm leading-6 text-ink-700/68 dark:text-ivory-100/65">
            Sign in to manage agencies, integrations, and client portal access.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error ? <p className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <Button busy={busy} type="submit">Sign in</Button>
        </form>
      </Panel>
    </main>
  );
}
