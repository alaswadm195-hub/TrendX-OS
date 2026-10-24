/**
 * Canonical comparison key for client phone numbers.
 * Egyptian mobile numbers can be entered as 01..., 201..., +201... or 00201....
 * This is for matching, not display: keep the original phone formatting in the DB.
 */
export function normalizeClientPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";

  const withoutInternationalPrefix = digits.startsWith("0020")
    ? digits.slice(2)
    : digits;

  if (/^201[0125]\d{8}$/.test(withoutInternationalPrefix)) {
    return `0${withoutInternationalPrefix.slice(2)}`;
  }

  if (/^1[0125]\d{8}$/.test(withoutInternationalPrefix)) {
    return `0${withoutInternationalPrefix}`;
  }

  return withoutInternationalPrefix;
}
