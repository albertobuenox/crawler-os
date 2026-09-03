import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrawlerBottomNav } from "@/components/layout/Nav";
import { CrawlerHeader } from "@/components/layout/CrawlerHeader";

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
    <div className="relative z-[var(--z-shell)] flex h-dvh flex-col pb-[72px] lg:pb-0">
      <CrawlerHeader />
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-auto">{children}</div>
      </div>
      <CrawlerBottomNav />
    </div>
  );
}
