export const STATUS_DEFINITIONS: Record<string, string> = {
  watching:
    "Just sourced, on the radar. Little or no research done yet. The longlist.",
  researching:
    "Actively or fully researched, financials, management, AI moat, ecosystem position, partnerships, catalysts, and scored. Being researched and being scored is not the same as being promoted: this is the default home for anything researched, even when the research is complete.",
  active_watch:
    "Explicitly promoted, by you, usually prompted by something genuinely new (a catalyst resolving, a re-score moving meaningfully, an anchor partner's posture shifting). A high score alone does not put something here, a deliberate decision does.",
  invested: "Real capital deployed.",
  passed: "Evaluated and rejected, with a recorded reason.",
  exited: "Was invested, no longer is.",
};

export const STATUS_TIER_ORDER: Record<string, number> = {
  active_watch: 0,
  researching: 1,
  watching: 2,
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
