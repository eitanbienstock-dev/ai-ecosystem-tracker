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
