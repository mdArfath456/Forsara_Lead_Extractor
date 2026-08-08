/**
 * Simple rule-based lead score to help staff triage large result sets.
 * Not stored in the DB — computed on read so it's always consistent with
 * current data (e.g. after enrichment adds an email, score updates for free).
 */
export function computeLeadScore(lead) {
  let score = 0;
  if (lead.phone) score += 20;
  if (lead.website) score += 20;
  if (lead.email) score += 25; // enriched contact is the strongest signal
  if (typeof lead.googleRating === 'number' && lead.googleRating > 4) score += 20;
  if (typeof lead.reviewCount === 'number' && lead.reviewCount > 20) score += 15;

  return Math.min(score, 100);
}

export function scoreTier(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Attaches `score` and `scoreTier` to a lead object (mutates and returns). */
export function withScore(leadObj) {
  const score = computeLeadScore(leadObj);
  return { ...leadObj, score, scoreTier: scoreTier(score) };
}
