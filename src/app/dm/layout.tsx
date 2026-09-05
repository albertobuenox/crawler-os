import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DMNavRail, DMTopBar } from "@/components/layout/Nav";
import { FloatingUtilityMenu } from "@/components/layout/FloatingUtilityMenu";
import { CommandPaletteRoot } from "@/components/layout/CommandPalette";
import { DMSceneChat } from "@/components/hud/DMSceneChat";
import { LoginWelcomeNotice } from "@/components/layout/LoginWelcomeNotice";
import { MasterPinnedOverlays } from "@/components/dm/MasterPinnedOverlays";
import { castSession } from "@/lib/utils";

export default async function DMLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role !== "dm") redirect("/crawler/table");

  const { data: member } = await supabase
    .from("session_members")
    .select("sessions(code, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = castSession(member?.sessions);

  return (
    <CommandPaletteRoot>
      <LoginWelcomeNotice />
      <div className="relative z-[var(--z-shell)] flex min-h-screen">
        <DMNavRail />
        <div className="relative z-0 flex min-h-screen min-w-0 flex-1 flex-col">
          <DMTopBar sessionCode={session?.code} sessionName={session?.name} />
          <main className="flex-1 overflow-auto px-10 py-8 pl-16">{children}</main>
        </div>
        <FloatingUtilityMenu />
        <DMSceneChat />
        <MasterPinnedOverlays />
      </div>
    </CommandPaletteRoot>
  );
}
