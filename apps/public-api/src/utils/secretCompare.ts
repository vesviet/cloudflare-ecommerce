/**
 * Compares a caller-supplied secret against an expected value without letting
 * the position of the first differing byte affect the comparison time.
 */
export const secretEquals = (a: string | undefined | null, b: string | undefined | null): boolean => {
  if (!a || !b) return false;

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const length = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return mismatch === 0;
};

/**
 * Returns true when `candidate` matches any entry of a comma-separated allow list.
 */
export const matchesAnySecret = (candidate: string | undefined | null, allowList: string): boolean => {
  if (!candidate) return false;

  let matched = false;
  for (const entry of allowList.split(',')) {
    const expected = entry.trim();
    if (!expected) continue;
    // Check every entry so the number of comparisons does not reveal the match.
    if (secretEquals(candidate, expected)) {
      matched = true;
    }
  }

  return matched;
};
