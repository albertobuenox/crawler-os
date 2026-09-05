"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onSessionPresence,
  retainSessionBus,
  type SessionPeer,
} from "@/lib/session-bus";

export function useSessionPresence(sessionId: string | undefined) {
  const [peers, setPeers] = useState<SessionPeer[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setPeers([]);
      return;
    }
    const release = retainSessionBus(sessionId);
    const off = onSessionPresence(sessionId, setPeers);
    return () => {
      off();
      release();
    };
  }, [sessionId]);

  return useMemo(() => {
    const crawlerIds = new Set(
      peers.filter((peer) => peer.role === "crawler" && peer.crawlerId).map((peer) => peer.crawlerId as string)
    );
    return {
      peers,
      crawlerIds,
      masterOnline: peers.some((peer) => peer.role === "dm"),
      crawlerOnline: crawlerIds.size,
    };
  }, [peers]);
}
