"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GrantPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(id ? `/dm/crawlers?give=${id}` : "/dm/crawlers");
  }, [id, router]);

  return null;
}
