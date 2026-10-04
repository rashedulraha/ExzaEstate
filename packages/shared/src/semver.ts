/**
 * Semantic version comparison utilities for client compatibility checks.
 * Follows SemVer 2.0 (major.minor.patch).
 */

export function parseSemver(version: string): [number, number, number] {
  const clean = version.trim().replace(/^v/i, '').split('-')[0] ?? '';
  const parts = clean.split('.').map((p) => {
    const parsed = parseInt(p, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

/**
 * Checks if a given client version satisfies the minimum supported version.
 * If clientVersion is missing or empty, returns true (web browser / unconstrained).
 */
export function isClientVersionSupported(
  clientVersion: string | undefined | null,
  minSupportedVersion: string,
): boolean {
  if (!clientVersion || typeof clientVersion !== 'string' || clientVersion.trim() === '') {
    return true;
  }
  return compareSemver(clientVersion, minSupportedVersion) >= 0;
}
