import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrawlerBottomNav } from "@/components/layout/Nav";
import { FloatingUtilityMenu } from "@/components/layout/FloatingUtilityMenu";

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
    <div className="relative z-[var(--z-shell)] min-h-screen pb-[72px] lg:pb-0">
      {children}
      <FloatingUtilityMenu />
      <CrawlerBottomNav />
    </div>
  );
}
