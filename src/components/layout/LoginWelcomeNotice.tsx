"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/copy";
import { dismissLoginNotice, isLoginNoticePending } from "@/lib/login-notice";

export function LoginWelcomeNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoginNoticePending()) setOpen(true);
  }, []);

  function close() {
    dismissLoginNotice();
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      eyebrow={BRAND}
      title="Comunicado del sistema"
      onClose={close}
    >
      <p className="text-sm leading-relaxed text-[var(--text-2)]">
        La corporación Borant está preparando la mazmorra, cualquier cosa rara o
        incompleta que vea está sujeta a cambios. Muchas gracias por la paciencia.
      </p>
      <div className="mt-6 flex justify-end">
        <Button type="button" variant="neon" onClick={close}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
}
