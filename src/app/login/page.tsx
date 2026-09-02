"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { UserRole } from "@/lib/types";
import { authErrorEs } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { Cpu, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<UserRole>("crawler");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, display_name: email.split("@")[0] } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from("profiles").update({ role }).eq("id", data.user.id);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ role }).eq("id", user.id);
      }

      if (role === "ia") router.push("/ia");
      else router.push("/join");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? authErrorEs(err.message)
          : "Acceso denegado. The System no reconoce a este crawler."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <GlassPanel className="relative z-10 w-full max-w-[440px]" title="THE SYSTEM" subtitle="CRAWLER OS">
        <div className="mb-6 grid grid-cols-2 gap-2">
          {(
            [
              { r: "ia" as const, label: "La IA", icon: Cpu, glow: "var(--glow-cyan)" },
              { r: "crawler" as const, label: "Crawler", icon: User, glow: "var(--glow-magenta)" },
            ] as const
          ).map(({ r, label, icon: Icon, glow }) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "well flex flex-col items-center gap-2 rounded-xl p-4 transition-all",
                role === r && "border-[var(--stroke-cyan-hot)]"
              )}
              style={role === r ? { boxShadow: glow } : undefined}
            >
              <Icon size={24} className={role === r ? "text-[var(--cyan-400)]" : "text-[var(--text-3)]"} />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Identificador"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button
            type="submit"
            variant={role === "ia" ? "session" : "energy"}
            className="w-full"
            loading={loading}
          >
            {isSignup ? "Registrarse" : role === "ia" ? "Conectar" : "Entrar al dungeon"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-[var(--text-3)] hover:text-[var(--text-1)]"
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? "¿Ya estás dentro? Entrar" : "¿Crawler nuevo? Registrarse"}
        </button>
      </GlassPanel>
    </main>
  );
}
