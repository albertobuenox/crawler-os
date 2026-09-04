"use client";

import { useEffect } from "react";
import type { CreateKind } from "@/lib/command-palette";

export const DM_OPEN_CREATE = "dm-open-create";

export function requestCreate(kind: CreateKind) {
  window.dispatchEvent(new CustomEvent(DM_OPEN_CREATE, { detail: { kind } }));
}

export function useCreateRequest(kind: CreateKind, onOpen: () => void) {
  useEffect(() => {
    function onEvent(event: Event) {
      const detail = (event as CustomEvent<{ kind?: CreateKind }>).detail;
      if (detail?.kind === kind) onOpen();
    }
    window.addEventListener(DM_OPEN_CREATE, onEvent);
    return () => window.removeEventListener(DM_OPEN_CREATE, onEvent);
  }, [kind, onOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    onOpen();
    params.delete("new");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [onOpen]);
}
