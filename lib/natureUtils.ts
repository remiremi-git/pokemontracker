type BaseStats = {
  baseHP: number;
  baseAttack: number;
  baseDefense: number;
  baseSpAttack: number;
  baseSpDefense: number;
  baseSpeed: number;
};

export type NatureEntry = {
  name: string;
  increasedStat?: string | null;
  decreasedStat?: string | null;
};

const STAT_KEY_MAP: Record<string, keyof BaseStats> = {
  Attack: "baseAttack",
  Defense: "baseDefense",
  Speed: "baseSpeed",
  "Special Attack": "baseSpAttack",
  "Special Defense": "baseSpDefense",
};

export function buildNatureMap(list: NatureEntry[]) {
  const map = new Map<string, NatureEntry>();
  for (const n of list) {
    if (n?.name) map.set(n.name, n);
  }
  return map;
}

export function applyNatureToBaseStats(
  baseStats: BaseStats,
  natureName: string | null | undefined,
  natureMap?: Map<string, NatureEntry>
) {
  if (!natureName || !natureMap) return baseStats;
  const nature = natureMap.get(natureName);
  if (!nature) return baseStats;

  const next: BaseStats = { ...baseStats };

  const inc = nature.increasedStat ?? "";
  const dec = nature.decreasedStat ?? "";

  const incKey = STAT_KEY_MAP[inc];
  const decKey = STAT_KEY_MAP[dec];

  if (incKey) next[incKey] = (next[incKey] ?? 0) + 5;
  if (decKey) next[decKey] = (next[decKey] ?? 0) - 5;

  return next;
}
