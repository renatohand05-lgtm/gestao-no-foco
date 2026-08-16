export function isMissingRelation(
  error: { message?: string; code?: string } | null | undefined,
  table?: string,
): boolean {
  if (!error?.message && !error?.code) return false;
  const msg = `${error.code ?? ""} ${error.message ?? ""}`;
  if (/PGRST205|schema cache|does not exist|could not find the table/i.test(msg)) {
    return table ? new RegExp(table, "i").test(msg) || true : true;
  }
  return false;
}

export function isMissingColumn(
  error: { message?: string } | null | undefined,
): boolean {
  const msg = error?.message ?? "";
  return /column|schema cache|Could not find/i.test(msg);
}
