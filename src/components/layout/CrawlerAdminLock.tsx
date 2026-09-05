"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminInRoomOverlay } from "@/components/hud/AdminInRoomOverlay";
import { useAdminInRoom, useCrawlerSessionId } from "@/hooks/useAdminInRoom";

const CrawlerAdminLockContext = createContext(false);

export function useCrawlerAdminLocked() {
  return useContext(CrawlerAdminLockContext);
}

export function CrawlerAdminLock({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sessionId = useCrawlerSessionId();
  const { active } = useAdminInRoom(sessionId);

  const onScene = pathname.startsWith("/crawler/table");
  const headerAllowed =
    pathname.startsWith("/crawler/sheet") || pathname.startsWith("/crawler/notifications");

  useEffect(() => {
    if (!active) return;
    if (onScene || headerAllowed) return;
    router.replace("/crawler/table");
  }, [active, headerAllowed, onScene, router]);

  return (
    <CrawlerAdminLockContext.Provider value={active}>
      {children}
      <AdminInRoomOverlay active={active && onScene} />
    </CrawlerAdminLockContext.Provider>
  );
}
