"use client";

import { useState } from "react";
import { Book, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function FloatingUtilityMenu() {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[var(--z-toast)]">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)] p-1 shadow-[var(--shadow-glass)] backdrop-blur-xl">
        <span
          aria-hidden="true"
          title="Documentación (próximamente)"
          className="flex h-8 w-8 cursor-default items-center justify-center rounded-full text-[var(--cyan-700)]"
        >
          <Book size={15} strokeWidth={1.75} />
        </span>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,59,92,0.12)] hover:text-[var(--danger)] disabled:opacity-45"
        >
          <LogOut size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
