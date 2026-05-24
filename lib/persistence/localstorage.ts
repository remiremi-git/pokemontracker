// lib/persistence/localstorage.ts
import type { CampaignId, CampaignMeta, CampaignRecord } from "./types";

const STORAGE_PREFIX = "pokemon-tracker";
const INDEX_KEY = `${STORAGE_PREFIX}:campaignIndex:v1`;
const ACTIVE_KEY = `${STORAGE_PREFIX}:activeCampaignId:v1`;
const CAMPAIGN_KEY = (id: CampaignId) => `${STORAGE_PREFIX}:campaign:${id}:v1`;

const VERSION = 1;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function now() {
  return Date.now();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readIndex(): CampaignMeta[] {
  if (!isBrowser()) return [];
  const parsed = safeParse<CampaignMeta[]>(localStorage.getItem(INDEX_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function writeIndex(index: CampaignMeta[]) {
  if (!isBrowser()) return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function upsertMeta(meta: CampaignMeta) {
  const index = readIndex();
  const i = index.findIndex((m) => m.id === meta.id);
  const next = [...index];
  if (i >= 0) next[i] = meta;
  else next.push(meta);
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  writeIndex(next);
}

function removeMeta(id: CampaignId) {
  const index = readIndex().filter((m) => m.id !== id);
  writeIndex(index);
}

function genId(): CampaignId {
  return `c_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export interface CampaignStore<TState> {
  list(): Promise<CampaignMeta[]>;
  getActiveId(): Promise<CampaignId | null>;
  setActiveId(id: CampaignId | null): Promise<void>;

  create(name: string, initialState: TState): Promise<CampaignId>;
  load(id: CampaignId): Promise<TState>;
  save(id: CampaignId, state: TState): Promise<void>;

  rename(id: CampaignId, name: string): Promise<void>;
  remove(id: CampaignId): Promise<void>;
  duplicate(id: CampaignId, newName: string): Promise<CampaignId>;

  exportCampaign(id: CampaignId): Promise<string>;
  importCampaign(json: string): Promise<CampaignId>;
}

// ✅ This is the named export your hook expects
export function createLocalStorageCampaignStore<TState>(): CampaignStore<TState> {
  return {
    async list() {
      return readIndex();
    },

    async getActiveId() {
      if (!isBrowser()) return null;
      return localStorage.getItem(ACTIVE_KEY);
    },

    async setActiveId(id) {
      if (!isBrowser()) return;
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    },

    async create(name, initialState) {
      if (!isBrowser()) throw new Error("localStorage unavailable (not in browser)");
      const id = genId();
      const meta: CampaignMeta = {
        id,
        name: name.trim() || "Untitled Campaign",
        createdAt: now(),
        updatedAt: now(),
        version: VERSION,
      };

      const record: CampaignRecord<TState> = { meta, state: initialState };
      localStorage.setItem(CAMPAIGN_KEY(id), JSON.stringify(record));
      upsertMeta(meta);

      const active = await this.getActiveId();
      if (!active) await this.setActiveId(id);

      return id;
    },

    async load(id) {
      if (!isBrowser()) throw new Error("localStorage unavailable (not in browser)");
      const record = safeParse<CampaignRecord<TState>>(localStorage.getItem(CAMPAIGN_KEY(id)));
      if (!record) throw new Error(`Campaign not found: ${id}`);
      return record.state;
    },

    async save(id, state) {
      if (!isBrowser()) return;

      const existing = safeParse<CampaignRecord<TState>>(localStorage.getItem(CAMPAIGN_KEY(id)));
      if (!existing) throw new Error(`Campaign not found: ${id}`);

      const meta: CampaignMeta = {
        ...existing.meta,
        updatedAt: now(),
        version: VERSION,
      };

      const record: CampaignRecord<TState> = { meta, state };
      localStorage.setItem(CAMPAIGN_KEY(id), JSON.stringify(record));
      upsertMeta(meta);
    },

    async rename(id, name) {
      if (!isBrowser()) return;

      const existing = safeParse<CampaignRecord<TState>>(localStorage.getItem(CAMPAIGN_KEY(id)));
      if (!existing) throw new Error(`Campaign not found: ${id}`);

      const meta: CampaignMeta = {
        ...existing.meta,
        name: name.trim() || existing.meta.name,
        updatedAt: now(),
      };

      const record: CampaignRecord<TState> = { meta, state: existing.state };
      localStorage.setItem(CAMPAIGN_KEY(id), JSON.stringify(record));
      upsertMeta(meta);
    },

    async remove(id) {
      if (!isBrowser()) return;

      localStorage.removeItem(CAMPAIGN_KEY(id));
      removeMeta(id);

      const active = await this.getActiveId();
      if (active === id) {
        const remaining = readIndex();
        const nextActive = remaining[0]?.id ?? null;
        await this.setActiveId(nextActive);
      }
    },

    async duplicate(id, newName) {
      const state = await this.load(id);
      const metas = await this.list();
      const src = metas.find((m) => m.id === id);

      const name =
        (newName && newName.trim()) ||
        (src ? `${src.name} (Copy)` : "Untitled Campaign (Copy)");

      return this.create(name, state);
    },

    async exportCampaign(id) {
      if (!isBrowser()) throw new Error("localStorage unavailable (not in browser)");
      const raw = localStorage.getItem(CAMPAIGN_KEY(id));
      if (!raw) throw new Error(`Campaign not found: ${id}`);
      return raw;
    },

    async importCampaign(json) {
      if (!isBrowser()) throw new Error("localStorage unavailable (not in browser)");
      const parsed = safeParse<CampaignRecord<TState>>(json);
      if (!parsed?.meta?.name) throw new Error("Invalid campaign JSON");

      const newId = genId();
      const meta: CampaignMeta = {
        id: newId,
        name: parsed.meta.name.trim() || "Imported Campaign",
        createdAt: now(),
        updatedAt: now(),
        version: VERSION,
      };

      const record: CampaignRecord<TState> = { meta, state: parsed.state };
      localStorage.setItem(CAMPAIGN_KEY(newId), JSON.stringify(record));
      upsertMeta(meta);
      await this.setActiveId(newId);

      return newId;
    },
  };
}
