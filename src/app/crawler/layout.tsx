import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CrawlerBottomNav } from "@/components/layout/Nav";

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

  if (profile?.role === "ia") redirect("/ia");

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <div className="relative z-[var(--z-shell)] min-h-screen pb-[72px] lg:pb-0">
      {children}
      <CrawlerBottomNav unread={count ?? 0} />
    </div>
  );
}
