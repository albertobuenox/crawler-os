"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEV_LOGIN, DEV_SESSION_CODE } from "@/lib/dev";

export default function JoinSessionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState(DEV_LOGIN ? DEV_SESSION_CODE : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc("join_session_by_code", {
        p_code: code.toUpperCase(),
      });
      if (rpcError) {
        const msg = rpcError.message.toLowerCase();
        if (msg.includes("session not found")) throw new Error("Sesión no encontrada");
        if (msg.includes("not authenticated")) throw new Error("No autenticado");
        throw rpcError;
      }

      router.push("/crawler");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sesión no encontrada");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <GlassPanel className="w-full max-w-md" title="CÓDIGO DE PISO" subtitle="Introduce la sesión que creó el Dungeon Master">
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Código de sesión"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FLOOR-XXXX"
            className="font-mono-system text-center text-lg tracking-widest"
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button variant="neon" className="w-full" loading={loading} type="submit">
            Unirse a la sesión
          </Button>
        </form>
      </GlassPanel>
    </main>
  );
}
