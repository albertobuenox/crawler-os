"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function JoinSessionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("join_session_by_code", {
        p_code: code.toUpperCase(),
      });
      if (rpcError) throw rpcError;

      const sessionId = (data as { session_id: string }).session_id;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: crawler } = await supabase
          .from("crawlers")
          .select("id")
          .eq("session_id", sessionId)
          .is("owner_user_id", null)
          .limit(1)
          .maybeSingle();

        if (crawler) {
          await supabase
            .from("crawlers")
            .update({ owner_user_id: user.id })
            .eq("id", crawler.id);
          await supabase
            .from("session_members")
            .update({ crawler_id: crawler.id })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);
        }
      }

      router.push("/crawler");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session not found");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <GlassPanel className="w-full max-w-md" title="FLOOR CODE" subtitle="Enter the session La IA created">
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Session code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FLOOR-XXXX"
            className="font-mono-system text-center text-lg tracking-widest"
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button variant="neon" className="w-full" loading={loading} type="submit">
            Join Session
          </Button>
        </form>
      </GlassPanel>
    </main>
  );
}
