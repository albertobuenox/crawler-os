"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ResourceEditorRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(id ? `/dm/resources?edit=${id}` : "/dm/resources");
  }, [id, router]);

  return null;
}
