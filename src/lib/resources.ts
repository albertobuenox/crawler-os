/** Lore / factual text. Always visible to the Master, even if empty. */
export function resourceDescriptionLabel(
  resource: { description?: string | null } | null | undefined,
  empty = "Sin descripción.",
): string {
  return resource?.description?.trim() || empty;
}

/** Player-facing blurb: description first, then System voice, then extras. */
export function resourceBlurb(
  resource: { description?: string | null; system_copy?: string | null } | null | undefined,
  extras: Array<string | null | undefined> = [],
  empty = "Sin descripción.",
): string {
  for (const part of [resource?.description, resource?.system_copy, ...extras]) {
    const text = part?.trim();
    if (text) return text;
  }
  return empty;
}
