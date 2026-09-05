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

  useEffect(() => {
    if (!active) return;
    if (pathname.startsWith("/crawler/table")) return;
    router.replace("/crawler/table");
  }, [active, pathname, router]);

  return (
    <CrawlerAdminLockContext.Provider value={active}>
      {children}
      <AdminInRoomOverlay active={active} />
    </CrawlerAdminLockContext.Provider>
  );
}
