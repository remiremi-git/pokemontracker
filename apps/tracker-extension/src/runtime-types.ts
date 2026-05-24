export type RuntimeMove = {
  id: string;
  name: string;
  normalizedName: string;
  type: string;
  category: string;
  effect: string;
  ppCost: number | null;
  range: string;
  tags: string[];
  tier1: string;
  tier2: string;
  tier3: string;
};

export type RuntimeAbility = {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  effect: string;
};

export type RuntimeMoveDataset = {
  version: string;
  updatedAt: string;
  moves: RuntimeMove[];
};

export type RuntimeAbilityDataset = {
  version: string;
  updatedAt: string;
  abilities: RuntimeAbility[];
};

export type RuntimeDataManifest = {
  version: string;
  updatedAt: string;
  urls: {
    moves: string;
    abilities: string;
  };
};
