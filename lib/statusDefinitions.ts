export const STATUS_DEFINITIONS: Record<string, string> = {
  watching:
    "Just sourced, on the radar. Little or no research done yet. The longlist.",
  researching:
    "Actively being researched. This is where the deep work happens: financials, management, AI moat, ecosystem position, partnerships, catalysts.",
  active_watch:
    "Research is done and scored. Real conviction exists. Deliberately waiting for the right entry, price, timing, a derisking catalyst, not waiting for more information.",
  invested: "Real capital deployed.",
  passed: "Evaluated and rejected, with a recorded reason.",
  exited: "Was invested, no longer is.",
};

export const STATUS_TIER_ORDER: Record<string, number> = {
  active_watch: 0,
  researching: 1,
  watching: 2,
};
