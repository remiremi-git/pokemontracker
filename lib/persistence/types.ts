// lib/persistence/types.ts
export type CampaignId = string;

export type CampaignMeta = {
  id: CampaignId;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number; // for migrations later
};

export type CampaignRecord<TState> = {
  meta: CampaignMeta;
  state: TState;
};
