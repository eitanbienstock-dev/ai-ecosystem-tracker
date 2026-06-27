export const STATUS_DEFINITIONS: Record<string, string> = {
  watched: "Being tracked and researched, not yet funded. Manually ranked, move candidates up or down to reflect priority.",
  holding: "Real capital deployed. Position entered through the promote flow.",
  exited: "Previously held, all shares sold.",
  archived: "No longer active, either evaluated and passed on, or previously invested and since exited.",
  // Legacy values kept as fallbacks
  pipeline: "Being tracked and researched, not yet funded.",
  invested: "Real capital deployed.",
};

// Leverage asks a durability question: once things settle, is this hard to
// displace, or could a customer or partner switch to a competitor without
// much pain? Trajectory asks a momentum question: is the position visibly
// building right now, regardless of whether that build-out proves durable.
// They are deliberately separate axes; a strengthening trajectory does not
// mean the leverage question is resolving favorably.
export const LEVERAGE_DEFINITIONS: Record<string, string> = {
  hard_to_replace:
    "Real switching costs exist. Once embedded, a customer or partner would find it expensive or slow to move to a competitor.",
  commoditized:
    "Limited switching costs. A customer or partner could move to a competitor without much friction.",
  contested:
    "Assessed and genuinely balanced: real switching-cost signals alongside real displacement risk, evidence pointing both ways rather than not yet looked at.",
};

export const TRAJECTORY_DEFINITIONS: Record<string, string> = {
  strengthening:
    "The position is visibly building right now, new partnerships, expanding scope, deeper embedding, regardless of whether that embedding ultimately proves durable.",
  stable:
    "Holding steady. No clear build-out or erosion happening right now.",
  weakening:
    "Losing ground. Partners pulling back, scope narrowing, or competitive encroachment visibly increasing.",
};

export const INSIDER_SIGNAL_DEFINITIONS: Record<string, string> = {
  net_buying:
    "Insiders were net buyers over the trailing window per Form 4 filings. The strongest management-conviction signal available, since open-market purchases are rare and discretionary.",
  net_selling:
    "Insiders were net sellers over the trailing window. Common and often routine (diversification, pre-scheduled 10b5-1 plans), so weigh against context rather than reading as automatic negative.",
  mixed_or_neutral:
    "No clear net direction, or activity dominated by routine vesting and pre-scheduled plans rather than discretionary open-market decisions.",
};
