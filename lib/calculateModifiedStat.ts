export function calculateModifiedStat(base: number, stage: number) {
    if (stage === 0) return base;
    const multiplier = Math.max(2, 2 + stage) / Math.max(2, 2 - stage);
    return Math.floor(base * multiplier);
  }
  