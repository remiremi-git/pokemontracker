// lib/persistence/useCampaignPersistence.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CampaignId, CampaignMeta } from "./types";
import { createLocalStorageCampaignStore } from "./localstorage"

type Options<TState> = {
  initialState: TState;
  state: TState;
  setState: (s: TState) => void;
  debounceMs?: number;
};

export function useCampaignPersistence<TState>({
  initialState,
  state,
  setState,
  debounceMs = 500,
}: Options<TState>) {
  const store = useMemo(() => createLocalStorageCampaignStore<TState>(), []);

  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [activeId, setActiveId] = useState<CampaignId | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // prevent autosave from firing immediately on hydration
  const didHydrateRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const refreshList = useCallback(async () => {
    const list = await store.list();
    setCampaigns(list);
  }, [store]);

  const hydrate = useCallback(async () => {
    setIsHydrating(true);
    setError(null);
    try {
      await refreshList();
      const active = await store.getActiveId();
      if (active) {
        setActiveId(active);
        const loaded = await store.load(active);
        setState(loaded);
      } else {
        // No campaigns yet; keep initial state
        setActiveId(null);
        setState(initialState);
      }
      didHydrateRef.current = true;
    } catch (e: any) {
      setError(e?.message ?? "Failed to load campaigns");
      didHydrateRef.current = true;
    } finally {
      setIsHydrating(false);
    }
  }, [initialState, refreshList, setState, store]);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave of active campaign
  useEffect(() => {
    if (!didHydrateRef.current) return;
    if (!activeId) return; // nothing to autosave yet

    // clear pending
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await store.save(activeId, state);
        await refreshList();
      } catch (e: any) {
        setError(e?.message ?? "Autosave failed");
      }
    }, debounceMs);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [activeId, debounceMs, refreshList, state, store]);

  const createCampaign = useCallback(
    async (name: string) => {
      setError(null);
      const id = await store.create(name, initialState);
      setActiveId(id);
      await store.setActiveId(id);
      await refreshList();
      // load it (it was created with initialState but keep consistent flow)
      const loaded = await store.load(id);
      setState(loaded);
      return id;
    },
    [initialState, refreshList, setState, store]
  );

  const loadCampaign = useCallback(
    async (id: CampaignId) => {
      setError(null);
      // flush pending save before switching
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      await store.setActiveId(id);
      setActiveId(id);

      const loaded = await store.load(id);
      setState(loaded);
      await refreshList();
    },
    [refreshList, setState, store]
  );

  const renameCampaign = useCallback(
    async (id: CampaignId, name: string) => {
      setError(null);
      await store.rename(id, name);
      await refreshList();
    },
    [refreshList, store]
  );

  const deleteCampaign = useCallback(
    async (id: CampaignId) => {
      setError(null);
      // flush pending save
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      await store.remove(id);
      const nextActive = await store.getActiveId();
      setActiveId(nextActive);

      if (nextActive) {
        const loaded = await store.load(nextActive);
        setState(loaded);
      } else {
        setState(initialState);
      }
      await refreshList();
    },
    [initialState, refreshList, setState, store]
  );

  const duplicateCampaign = useCallback(
    async (id: CampaignId, newName?: string) => {
      setError(null);
      const newId = await store.duplicate(id, newName || "");
      setActiveId(newId);
      await store.setActiveId(newId);
      const loaded = await store.load(newId);
      setState(loaded);
      await refreshList();
      return newId;
    },
    [refreshList, setState, store]
  );

  const exportCampaign = useCallback(
    async (id: CampaignId) => {
      setError(null);
      return store.exportCampaign(id);
    },
    [store]
  );

  const importCampaign = useCallback(
    async (json: string) => {
      setError(null);
      const newId = await store.importCampaign(json);
      setActiveId(newId);
      const loaded = await store.load(newId);
      setState(loaded);
      await refreshList();
      return newId;
    },
    [refreshList, setState, store]
  );

  return {
    campaigns,
    activeId,
    isHydrating,
    error,

    refreshList,
    createCampaign,
    loadCampaign,
    renameCampaign,
    deleteCampaign,
    duplicateCampaign,
    exportCampaign,
    importCampaign,
  };
}
