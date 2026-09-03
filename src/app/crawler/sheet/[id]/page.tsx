"use client";

import { useParams } from "next/navigation";
import { CrawlerSheetScreen } from "../CrawlerSheetScreen";

export default function CrawlerSheetByIdPage() {
  const { id } = useParams<{ id: string }>();
  return <CrawlerSheetScreen crawlerId={id} />;
}
