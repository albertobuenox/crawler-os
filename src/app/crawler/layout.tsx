import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrawlerDiceLayer } from "@/components/hud/CrawlerDiceLayer";
import { SceneDiceProvider } from "@/components/hud/SceneDiceProvider";
import { CrawlerAdminLock } from "@/components/layout/CrawlerAdminLock";
import { CrawlerBottomNav } from "@/components/layout/Nav";
import { CrawlerHeader } from "@/components/layout/CrawlerHeader";
import { LoginWelcomeNotice } from "@/components/layout/LoginWelcomeNotice";
import { SessionLiveRoot } from "@/components/layout/SessionLiveRoot";

export default async function CrawlerLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role === "dm") redirect("/dm");

  return (
    <SceneDiceProvider>
      <SessionLiveRoot role="crawler">
      <LoginWelcomeNotice />
      <div className="relative z-[var(--z-shell)] flex h-dvh flex-col pb-[72px] lg:pb-0">
        <CrawlerAdminLock>
          <CrawlerHeader />
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 overflow-auto">{children}</div>
            <CrawlerDiceLayer />
          </div>
          <CrawlerBottomNav />
        </CrawlerAdminLock>
      </div>
      </SessionLiveRoot>
    </SceneDiceProvider>
  );
}
