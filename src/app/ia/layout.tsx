import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IANavRail, IATopBar } from "@/components/layout/Nav";
import { castSession } from "@/lib/utils";

export default async function IALayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ia") redirect("/crawler");

  const { data: member } = await supabase
    .from("session_members")
    .select("sessions(code, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = castSession(member?.sessions);

  return (
    <div className="relative z-[var(--z-shell)] flex min-h-screen">
      <IANavRail />
      <div className="flex min-h-screen flex-1 flex-col">
        <IATopBar sessionCode={session?.code} sessionName={session?.name} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
