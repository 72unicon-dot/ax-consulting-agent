/**
 * Compute a 0-100 progress value for a KPI given its baseline, current, and
 * target values. Returns null when any of the three is missing, so callers can
 * render "—" instead of a bogus bar.
 *
 * The direction is inferred from baseline → target: a shrinking KPI (defect
 * rate, cost) and a growing KPI (revenue, adoption) both read as 100% when
 * current has reached target. The result is clamped to [0, 100] so noisy
 * measurements do not overflow the bar.
 */
export function computeProgress(
  baseline: number | null,
  current: number | null,
  target: number | null,
): number | null {
  if (baseline == null || current == null || target == null) return null;
  if (baseline === target) return current === target ? 100 : 0;
  const raw = ((current - baseline) / (target - baseline)) * 100;
  return Math.max(0, Math.min(100, raw));
}
