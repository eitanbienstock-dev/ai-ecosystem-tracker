export const STATUS_DEFINITIONS: Record<string, string> = {
  invested: "Real capital deployed.",
  pipeline: "Being tracked and researched, not yet funded. Manually ranked, move candidates up or down to reflect priority.",
  archived: "No longer active, either evaluated and passed on, or previously invested and since exited.",
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
  unclear:
    "Genuine evidence on both sides, real switching-cost signals alongside real displacement risk, not yet resolved either way.",
};

export const TRAJECTORY_DEFINITIONS: Record<string, string> = {
  strengthening:
    "The position is visibly building right now, new partnerships, expanding scope, deeper embedding, regardless of whether that embedding ultimately proves durable.",
  stable:
    "Holding steady. No clear build-out or erosion happening right now.",
  weakening:
    "Losing ground. Partners pulling back, scope narrowing, or competitive encroachment visibly increasing.",
};
