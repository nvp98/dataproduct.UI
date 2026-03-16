const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  // Remove existing group spaces, then try parse.
  // Keep simple to avoid breaking odd inputs.
  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

/** Format as "1 234 567" (space group) for readability. */
export const formatNumberGroup = (value: unknown): string => {
  const n = toNumberOrNull(value);
  if (n === null) return value === null || value === undefined ? "" : String(value);

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const [intPartRaw, fracRaw] = String(abs).split(".");
  const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return fracRaw ? `${sign}${intPart}.${fracRaw}` : `${sign}${intPart}`;
};

/** Format as "1 234 567" (narrow no-break space group separator). */
export const formatNumberVN = (value: unknown): string => {
  const n = toNumberOrNull(value);
  if (n === null) return value === null || value === undefined ? "" : String(value);
  return new Intl.NumberFormat("fr-FR").format(n);
};

export const formatByKind = (kind: string | undefined, value: unknown): string => {
  if (!kind) return value === null || value === undefined ? "" : String(value);
  switch (kind) {
    case "number-group":
      return formatNumberGroup(value);
    default:
      return value === null || value === undefined ? "" : String(value);
  }
};

