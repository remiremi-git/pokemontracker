"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import CombatantsTable from "@/components/tables/combatantstable";
import RemoveCombatantModal from "@/components/modals/RemoveCombatantModal";
import PriorityModal from "./modals/PriorityModal";
import NextTurnOverrideModal from "./modals/NextTurnOverrideModal";
import EditCombatantModal from "@/components/modals/EditCombatantModal";
import StatStageModifierModal from "@/components/modals/StatStageModifierModal";
import DirectDamageModal from "@/components/modals/DirectDamageModal";
import DamageCalculatorModal from "@/components/modals/DamageCalculatorModal";
import SettingsModal from "./modals/SettingsModal";
import NoncombatantDrawer from "./tables/noncombatantsdrawer";
import SecondaryStatusModal from "./modals/SecondaryStatusModal";
import AbilityDetailsModal from "@/components/modals/AbilityDetailsModal";
import { useAbilityDetails } from "@/lib/useAbilityDetails";
import HistoryModal, { HistoryEntry } from "@/components/modals/HistoryModal";
import AddTrainerModal from "@/components/modals/AddTrainerModal";

// ✅ NEW: Weather UI uses Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ✅ NEW: persistence + campaigns
import { useCampaignPersistence } from "@/lib/persistence/useCampaignPersistence";
import CampaignPickerModal from "@/components/CampaignPickerModal";
import POKEMON_DATA from "@/data/pokemon_stats_genV.json";
import computeDerivedStats from "@/lib/computeDerivedStats";
import { applyNatureToBaseStats, buildNatureMap } from "@/lib/natureUtils";

type Trainer = {
  id: string;
  name: string;
  color?: string;
  notionId?: string | null;
};

type DrawerState = "closed" | "preview" | "full";

// ✅ NEW: Weather
export type WeatherType =
  | "None"
  | "Rain"
  | "Hail"
  | "Sandstorm"
  | "Fog"
  | "Harsh Sunlight"
  | "Strong Winds";


  const DEFAULT_WEATHER: WeatherState = {
    type: "None",
    turnsRemaining: 0,
    isPermanent: false,
  };
  

export type WeatherState = {
  type: WeatherType;
  turnsRemaining: number;
  isPermanent: boolean;
};

type AppState = {
  // battle core
  combatants: any[];
  noncombatants: any[];
  trainers: Trainer[];
  historyEntries: HistoryEntry[];

  activeIndex: number;
  round: number;

  drawerState: DrawerState;

  turnsTakenThisRound: number[];
  swappingCombatantIndex: number | null;

  // settings that should persist
  stabMultiplier: number;
  effectivityScaling: string;

  // ✅ NEW: weather that should persist
  weather: WeatherState;
};

const WEATHER_TYPES: WeatherType[] = [
  "None",
  "Rain",
  "Harsh Sunlight",
  "Hail",
  "Sandstorm",
  "Fog",
  "Strong Winds",
];

export default function InitiativeTracker() {
  // ✅ NEW: single persisted state object
  const initialState: AppState = useMemo(
    () => ({
      combatants: [],
      noncombatants: [],
      trainers: [
        {
          id: "351cd294-66e3-4a37-9f11-73441e9ef2ff",
          name: "Wild Pokemon",
          color: undefined,
        },
      ],
      historyEntries: [],
      activeIndex: -1,
      round: 0,
      drawerState: "closed",
      turnsTakenThisRound: [],
      swappingCombatantIndex: null,

      stabMultiplier: 1.4,
      effectivityScaling: "Weak",

      // ✅ NEW: weather default
      weather: {
        type: "None",
        turnsRemaining: 0,
        isPermanent: false,
      },
    }),
    []
  );

  const [appState, setAppState] = useState<AppState>(initialState);

  const pokemonByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of POKEMON_DATA as any[]) {
      if (p?.name) map.set(p.name, p);
    }
    return map;
  }, []);

  const normalizeNotionId = (id: string) => id.replace(/-/g, "").trim().toLowerCase();

  const createLocalUid = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const ensureUid = (mon: any) => {
    if (!mon) return mon;
    const notionId = mon?.notionId ? normalizeNotionId(String(mon.notionId)) : "";
    const uid = mon?.uid ?? (notionId ? `notion:${notionId}` : `local:${createLocalUid()}`);
    return { ...mon, uid };
  };

  const ensureUidList = (list: any[]) => list.map((mon) => ensureUid(mon));

  const isSameMon = (a: any, b: any) => {
    if (a?.uid && b?.uid) return a.uid === b.uid;
    if (a?.notionId && b?.notionId) {
      return normalizeNotionId(String(a.notionId)) === normalizeNotionId(String(b.notionId));
    }
    return a?.name === b?.name;
  };

  const getSpeciesName = (name?: string) => {
    if (!name) return null;
    if (pokemonByName.has(name)) return name;
    const trimmed = name.replace(/ \d+$/, "");
    return pokemonByName.has(trimmed) ? trimmed : null;
  };

  const getNotionTextValue = (value?: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

  const getDefinedBaseStatOverrides = (baseStats?: any) => {
    const next: Record<string, number> = {};
    if (!baseStats || typeof baseStats !== "object") return next;

    for (const key of [
      "baseHP",
      "baseAttack",
      "baseDefense",
      "baseSpAttack",
      "baseSpDefense",
      "baseSpeed",
    ]) {
      const value = baseStats[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        next[key] = value;
      }
    }

    return next;
  };

  const backfillHeightWeight = (list: any[]) =>
    list.map((c) => {
      if (!c) return c;
      const needsHeight = typeof c.height !== "number";
      const needsWeight = typeof c.weight !== "number";
      if (!needsHeight && !needsWeight) return c;

      const speciesName = getSpeciesName(c.name);
      if (!speciesName) return c;
      const data = pokemonByName.get(speciesName);
      if (!data) return c;

      return {
        ...c,
        height: needsHeight && typeof data.height === "number" ? data.height : c.height,
        weight: needsWeight && typeof data.weight === "number" ? data.weight : c.weight,
      };
    });

  const normalizeAbilityValue = (ability: any) => {
    if (typeof ability === "string") return ability;
    if (ability && typeof ability.name === "string") return ability.name;
    return null;
  };

  const normalizeAbilities = (list: any[]) =>
    list.map((c) => {
      if (!c) return c;
      if (typeof c.ability === "string" || c.ability === null || c.ability === undefined) {
        return c;
      }
      return {
        ...c,
        ability: normalizeAbilityValue(c.ability),
      };
    });

  const setAppStateFromCampaign = (next: AppState) => {
    setAppState({
      ...next,
      combatants: ensureUidList(
        normalizeAbilities(backfillHeightWeight(next.combatants ?? []))
      ),
      noncombatants: ensureUidList(
        normalizeAbilities(backfillHeightWeight(next.noncombatants ?? []))
      ),
      historyEntries: next.historyEntries ?? [],
      weather: next.weather ?? DEFAULT_WEATHER,
    });
  };

  // ===== Convenience “setters” to minimize refactor pain =====
  const combatants = appState.combatants;
  const noncombatants = appState.noncombatants;
  const trainers = appState.trainers;
  const historyEntries = appState.historyEntries ?? [];
  const activeIndex = appState.activeIndex;
  const round = appState.round;
  const drawerState = appState.drawerState;
  const turnsTakenThisRound = appState.turnsTakenThisRound;
  const swappingCombatantIndex = appState.swappingCombatantIndex;
  const stabMultiplier = appState.stabMultiplier;
  const effectivityScaling = appState.effectivityScaling;

  // ✅ NEW
  const weather = appState.weather ?? DEFAULT_WEATHER;


  const setCombatants = (updater: any[] | ((prev: any[]) => any[])) => {
    setAppState((prev) => ({
      ...prev,
      combatants: typeof updater === "function" ? (updater as any)(prev.combatants) : updater,
    }));
  };

  const setNoncombatants = (updater: any[] | ((prev: any[]) => any[])) => {
    setAppState((prev) => ({
      ...prev,
      noncombatants: typeof updater === "function" ? (updater as any)(prev.noncombatants) : updater,
    }));
  };

  const setTrainers = (updater: Trainer[] | ((prev: Trainer[]) => Trainer[])) => {
    setAppState((prev) => ({
      ...prev,
      trainers: typeof updater === "function" ? (updater as any)(prev.trainers) : updater,
    }));
  };

  const setActiveIndex = (updater: number | ((prev: number) => number)) => {
    setAppState((prev) => ({
      ...prev,
      activeIndex: typeof updater === "function" ? (updater as any)(prev.activeIndex) : updater,
    }));
  };

  const setHistoryEntries = (
    updater: HistoryEntry[] | ((prev: HistoryEntry[]) => HistoryEntry[])
  ) => {
    setAppState((prev) => ({
      ...prev,
      historyEntries:
        typeof updater === "function"
          ? (updater as any)(prev.historyEntries ?? [])
          : updater,
    }));
  };

  const setRound = (updater: number | ((prev: number) => number)) => {
    setAppState((prev) => ({
      ...prev,
      round: typeof updater === "function" ? (updater as any)(prev.round) : updater,
    }));
  };

  const setDrawerState = (updater: DrawerState | ((prev: DrawerState) => DrawerState)) => {
    setAppState((prev) => ({
      ...prev,
      drawerState: typeof updater === "function" ? (updater as any)(prev.drawerState) : updater,
    }));
  };

  const setTurnsTakenThisRound = (updater: number[] | ((prev: number[]) => number[])) => {
    setAppState((prev) => ({
      ...prev,
      turnsTakenThisRound:
        typeof updater === "function" ? (updater as any)(prev.turnsTakenThisRound) : updater,
    }));
  };

  const setSwappingCombatantIndex = (
    updater: number | null | ((prev: number | null) => number | null)
  ) => {
    setAppState((prev) => ({
      ...prev,
      swappingCombatantIndex:
        typeof updater === "function" ? (updater as any)(prev.swappingCombatantIndex) : updater,
    }));
  };

  const setStabMultiplier = (updater: number | ((prev: number) => number)) => {
    setAppState((prev) => ({
      ...prev,
      stabMultiplier: typeof updater === "function" ? (updater as any)(prev.stabMultiplier) : updater,
    }));
  };

  const setEffectivityScaling = (updater: string | ((prev: string) => string)) => {
    setAppState((prev) => ({
      ...prev,
      effectivityScaling:
        typeof updater === "function" ? (updater as any)(prev.effectivityScaling) : updater,
    }));
  };

  // ✅ NEW
  const setWeather = (updater: WeatherState | ((prev: WeatherState) => WeatherState)) => {
    setAppState((prev) => {
      const prevWeather = prev.weather ?? DEFAULT_WEATHER;
  
      return {
        ...prev,
        weather: typeof updater === "function" ? (updater as any)(prevWeather) : updater,
      };
    });
  };
  

  // ✅ NEW: campaign persistence hook
  const campaign = useCampaignPersistence<AppState>({
    initialState,
    state: appState,
    setState: setAppStateFromCampaign,
    debounceMs: 600,
  });

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  // ========== Status Damage States (UI-only, not persisted) ==========
  const [statusDamageSummary, setStatusDamageSummary] = useState<
    { name: string; amount: number; source: string }[]
  >([]);
  const [showStatusDamageModal, setShowStatusDamageModal] = useState(false);

  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [prioritySelections, setPrioritySelections] = useState<Record<string, boolean>>({});

  const [damageFlashIndices, setDamageFlashIndices] = useState<number[]>([]);

  // nextturnmodal states (UI-only)
  const [nextTurnModalOpen, setNextTurnModalOpen] = useState(false);
  const [suggestedNextIndex, setSuggestedNextIndex] = useState<number | null>(null);
  const [chosenNextIndex, setChosenNextIndex] = useState<number | null>(null);

  // ========== Edit / Settings State (UI-only for modal open) ==========
  const [editingCombatantIndex, setEditingCombatantIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbilityDetails, setShowAbilityDetails] = useState(false);
  const [selectedAbilityName, setSelectedAbilityName] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);

  const { ability, loading: abilityLoading, fetchAbility } = useAbilityDetails();

  // ========== Modal Controls ==========
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [damageTargetIndex, setDamageTargetIndex] = useState<number | null>(null);

  // ========== Stat Modifier State ==========
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedCombatantName, setSelectedCombatantName] = useState<string | null>(null);

  // secondary status modal
  const [secondaryStatusModalIndex, setSecondaryStatusModalIndex] = useState<number | null>(null);
  const openStatusModal = (index: number) => setSecondaryStatusModalIndex(index);
  const closeStatusModal = () => setSecondaryStatusModalIndex(null);

  const updateSecondaryStatuses = (index: number, newStatuses: { name: string; turns?: number }[]) => {
    setCombatants((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        secondaryStatuses: [...newStatuses],
      };
      return updated;
    });
  };

  function healAllCombatants() {
    setCombatants((prev) =>
      prev.map((c) => ({
        ...c,
        totalStats: {
          ...c.totalStats,
          HP: c.totalStats.maxHP,
        },
      }))
    );

    setNoncombatants((prev) =>
      prev.map((c) => ({
        ...c,
        totalStats: {
          ...c.totalStats,
          HP: c.totalStats.maxHP,
          PP: c.totalStats.maxPP,
        },
        status: null,
        secondaryStatuses: [],
      }))
    );
  }

  function endCombat() {
    addHistoryEntry("End Combat", []);
    setRound(0);
    setActiveIndex(-1);
    setTurnsTakenThisRound([]);
  
    // clear weather at end combat
    setWeather({
      type: "None",
      turnsRemaining: 0,
      isPermanent: false,
    });
  
    setCombatants((prev) =>
      prev.map((c) => ({
        ...c,
        // clear volatile statuses
        secondaryStatuses: [],
  
        // clear all stat stage changes
        stageModifiers: {
          Attack: 0,
          Defense: 0,
          SpecialAttack: 0,
          SpecialDefense: 0,
          Speed: 0,
          Accuracy: 0,
          Evasion: 0,
        },
  
        // optional: clear priority flags
        priority: 0,
      }))
    );
  }
  

  function applyPrioritySelections() {
    setCombatants((prev) =>
      prev.map((c) => ({
        ...c,
        priority: prioritySelections[c.name] ? 1 : 0,
      }))
    );

    setPrioritySelections({});
    setPriorityModalOpen(false);

    // Re-sort combatants
    setCombatants((prev) =>
      [...prev].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;

        const aSpeed = getModifiedSpeed(a);
        const bSpeed = getModifiedSpeed(b);

        return bSpeed - aSpeed;
      })
    );

    setTurnsTakenThisRound([]);

    const firstMover = 0;
    setSuggestedNextIndex(firstMover);
    setChosenNextIndex(firstMover);

    setNextTurnModalOpen(true);
  }

  function beginBattle() {
    addHistoryEntry("Begin Combat", []);
    setRound(1);
    setActiveIndex(-1);
    setTurnsTakenThisRound([]);
    setCombatants((prev) => prev.map((c) => ({ ...c, priority: 0 })));
    setPriorityModalOpen(true);
    addHistoryEntry("Round 1 Start", []);
  }

  function handleNextTurnConfirmed(nextIndex: number | null) {
    if (nextIndex === null) return;

    setNextTurnModalOpen(false);

    if (turnsTakenThisRound.length > 0) processEndOfTurnEffects();

    setTurnsTakenThisRound((updated) => {
      const remaining = combatants
        .map((_, i) => i)
        .filter((i) => !updated.includes(i));

      if (remaining.length === 0) {
        endRoundAndStartNext();
        return updated;
      }

      advanceToCombatant(nextIndex);
      return updated;
    });
  }

  function processEndOfTurnEffects() {
    setCombatants((prev) => {
      let updatedCombatants = [...prev];
      const damageLog: { name: string; amount: number; source: string }[] = [];
  
      updatedCombatants = updatedCombatants.map((c, i) => {
        let newC = { ...c, totalStats: { ...c.totalStats } };
  
        const maxHP = c.totalStats?.maxHP ?? 1;
  
        // ---- Primary status end-of-turn handling (only active mon) ----
        if (i === activeIndex && c.status) {
          let turnsLeft = (c.status.turns ?? 1) - 1;
  
          if (c.status.name === "Badly Poisoned") {
            turnsLeft = (c.status.turns ?? 0) + 1;
          }
  
          if (["Burn", "Poison", "Frostbite"].includes(c.status.name)) {
            const dmg = Math.floor(maxHP / 8);
            const currentHP = newC.totalStats?.HP ?? 0;
            newC.totalStats.HP = Math.max(0, currentHP - dmg);
            damageLog.push({ name: c.name, amount: dmg, source: c.status.name });
          }
  
          if (c.status.name === "Badly Poisoned") {
            const poisonTurns = turnsLeft;
            const dmg = Math.floor((maxHP / 16) * poisonTurns);
            const currentHP = newC.totalStats?.HP ?? 0;
            newC.totalStats.HP = Math.max(0, currentHP - dmg);
            damageLog.push({ name: c.name, amount: dmg, source: "Badly Poisoned" });
          }
  
          newC.status =
            ["Badly Poisoned"].includes(c.status.name) || turnsLeft > 0
              ? { ...c.status, turns: turnsLeft }
              : null;
        }
  
        // ---- Secondary statuses end-of-turn handling (only active mon) ----
        if (i === activeIndex && Array.isArray(c.secondaryStatuses)) {
          const newSecondary = c.secondaryStatuses
            .map((s: any) => {
              let newS = { ...s };
  
              if (s.name === "Cursed") {
                const dmg = Math.floor(maxHP / 4);
                const currentHP = newC.totalStats?.HP ?? 0;
                newC.totalStats.HP = Math.max(0, currentHP - dmg);
                damageLog.push({ name: c.name, amount: dmg, source: "Cursed" });
              }
  
              if (typeof s.turns === "number") {
                newS.turns = s.turns - 1;
              }
  
              return newS;
            })
            .filter((s: any) => s.turns === undefined || s.turns > 0);
  
          newC.secondaryStatuses = newSecondary;
        }
  
        // ✅ NEW: Weather chip damage (only active mon)
        if (i === activeIndex) {
          const w = weather ?? { type: "None", turnsRemaining: 0, isPermanent: false };
          const types: string[] = Array.isArray(c.types) ? c.types : [];
  
          if (w.type === "Hail") {
            const isIce = types.includes("Ice");
            if (!isIce) {
              const dmg = Math.floor(maxHP / 16);
              if (dmg > 0) {
                const currentHP = newC.totalStats?.HP ?? 0;
                newC.totalStats.HP = Math.max(0, currentHP - dmg);
                damageLog.push({ name: c.name, amount: dmg, source: "Hail" });
              }
            }
          }
  
          if (w.type === "Sandstorm") {
            const immune = types.includes("Rock") || types.includes("Ground") || types.includes("Steel");
            if (!immune) {
              const dmg = Math.floor(maxHP / 16);
              if (dmg > 0) {
                const currentHP = newC.totalStats?.HP ?? 0;
                newC.totalStats.HP = Math.max(0, currentHP - dmg);
                damageLog.push({ name: c.name, amount: dmg, source: "Sandstorm" });
              }
            }
          }
  
          // Fog: no effect
          // Rain/Sun: handled in damage calculator only
          // Strong Winds: handled in damage calculator only
        }
  
        return newC;
      });
  
      if (damageLog.length > 0) {
        setStatusDamageSummary(damageLog);
        setShowStatusDamageModal(true);
      }
  
      return updatedCombatants;
    });
  }
  

  function advanceToCombatant(index: number) {
    let newActive = index;

    if (newActive >= combatants.length) newActive = 0;

    setActiveIndex(newActive);
  }

  // ✅ NEW: decrement weather at end-of-round
  function tickWeatherAtEndOfRound() {
    setWeather((prev) => {
      if (prev.type === "None") return prev;
      if (prev.isPermanent) return prev;

      const nextTurns = Math.max(0, (prev.turnsRemaining ?? 0) - 1);

      if (nextTurns === 0) {
        return { type: "None", turnsRemaining: 0, isPermanent: false };
      }

      return { ...prev, turnsRemaining: nextTurns };
    });
  }

  function endRoundAndStartNext() {
    processEndOfTurnEffects();

    // ✅ NEW: weather decrements when a round ends
    tickWeatherAtEndOfRound();

    setTurnsTakenThisRound([]);
    setRound((r) => {
      const nextRound = r + 1;
      addHistoryEntry(`Round ${nextRound} Start`, []);
      return nextRound;
    });

    setCombatants((prev) => prev.map((c) => ({ ...c, priority: 0 })));

    setPriorityModalOpen(true);
    setActiveIndex(-1);
  }

  function markCurrentAsTaken() {
    setTurnsTakenThisRound((prev) => {
      if (activeIndex < 0) return prev;
      if (!prev.includes(activeIndex)) return [...prev, activeIndex];
      return prev;
    });
  }

  // ---------------------------------------------------------------------------
  // ---------------------- Noncombatant Functions -----------------------------
  // ---------------------------------------------------------------------------

  function addNoncombatant(newNoncombatant: any) {
    const fallbackPP = (newNoncombatant.level ?? 1) + 15;

    const updated = ensureUid({
      ...newNoncombatant,
      types: newNoncombatant.types || [],
      totalStats: {
        ...newNoncombatant.totalStats,
        HP: newNoncombatant.totalStats?.HP ?? 1,
        maxHP: newNoncombatant.totalStats?.maxHP ?? 1,
        PP: newNoncombatant.totalStats?.PP ?? fallbackPP,
        maxPP: newNoncombatant.totalStats?.maxPP ?? fallbackPP,
      },
    });

    setNoncombatants((prev) => [...prev, updated]);
  }

  function editNoncombatant(updatedNoncombatant: any) {
    const withUid = ensureUid(updatedNoncombatant);
    setNoncombatants((prev) =>
      prev.map((mon) => (isSameMon(mon, withUid) ? withUid : mon))
    );
  }

  function removeNoncombatant(index: number) {
    setNoncombatants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateNoncombatantPP(index: number, newPP: number) {
    setNoncombatants((prev) =>
      prev.map((mon, i) =>
        i === index
          ? {
              ...mon,
              totalStats: {
                ...mon.totalStats,
                PP: Math.max(0, Math.min(newPP, mon.totalStats.maxPP)),
              },
            }
          : mon
      )
    );
  }

  function updateNoncombatantHP(index: number, newHP: number) {
    setNoncombatants((prev) =>
      prev.map((mon, i) =>
        i === index
          ? {
              ...mon,
              totalStats: {
                ...mon.totalStats,
                HP: Math.max(0, Math.min(newHP, mon.totalStats.maxHP)),
              },
            }
          : mon
      )
    );
  }

  function updateNoncombatantStatus(index: number, status: string, turns: number) {
    setNoncombatants((prev) =>
      prev.map((mon, i) => {
        if (i !== index) return mon;
        return {
          ...mon,
          status: status !== "None" ? { name: status, turns } : null,
        };
      })
    );
  }

  function getTrainerNameById(trainerId: string): string {
    const trainer = trainers.find((t) => t.id === trainerId);
    return trainer?.name ?? "—";
  }

  function addTrainer(name: string): string {
    const newTrainer = {
      id: crypto.randomUUID(),
      name,
      notionId: null,
    };
    setTrainers((prev) => [...prev, newTrainer]);
    return newTrainer.id;
  }

  function updateTrainerNotionId(trainerId: string, notionId: string) {
    setTrainers((prev) =>
      prev.map((t) => (t.id === trainerId ? { ...t, notionId } : t))
    );
  }

  function renameTrainer(trainerId: string, name: string) {
    setTrainers((prev) =>
      prev.map((t) => (t.id === trainerId ? { ...t, name } : t))
    );
  }

  function deleteTrainer(trainerId: string) {
    setTrainers((prev) => prev.filter((t) => t.id !== trainerId));
    setCombatants((prev) =>
      prev.map((c) => (c.trainerId === trainerId ? { ...c, trainerId: null } : c))
    );
    setNoncombatants((prev) =>
      prev.map((c) => (c.trainerId === trainerId ? { ...c, trainerId: null } : c))
    );
  }

  function addTrainerWithNotionId(name: string, notionId: string | null) {
    const id = addTrainer(name);
    if (notionId) {
      updateTrainerNotionId(id, notionId);
    }
  }

  function purgeUnassignedPokemon() {
    setCombatants((prev) => prev.filter((c) => !!c.trainerId));
    setNoncombatants((prev) => prev.filter((c) => !!c.trainerId));
  }

  function getModifiedSpeed(combatant: any): number {
    const stage = combatant.stageModifiers?.Speed ?? 0;
    const baseVal = combatant.totalStats?.Speed ?? 0;
    let modified = Math.floor(baseVal * (stage > 0 ? (2 + stage) / 2 : 2 / (2 - stage)));
    if (combatant.status?.name === "Paralysis") {
      modified = Math.floor(modified / 2);
    }
    return modified;
  }

  function sortCombatantsBySpeed(list: any[]): any[] {
    return list
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        const aSpeed = getModifiedSpeed(a.c);
        const bSpeed = getModifiedSpeed(b.c);
        if (bSpeed !== aSpeed) return bSpeed - aSpeed;
        return a.i - b.i;
      })
      .map(({ c }) => c);
  }

  function sortCombatantsByPriorityAndSpeed(list: any[]): any[] {
    return list
      .map((c, i) => ({ c, i }))
      .sort((a, b) => {
        if (b.c.priority !== a.c.priority) return b.c.priority - a.c.priority;
        const aSpeed = getModifiedSpeed(a.c);
        const bSpeed = getModifiedSpeed(b.c);
        if (bSpeed !== aSpeed) return bSpeed - aSpeed;
        return a.i - b.i;
      })
      .map(({ c }) => c);
  }

  function sortCombatantsAndFixActive(combatants: any[], activeIdx: number) {
    const activeCombatant = combatants[activeIdx];
    const sorted = sortCombatantsByPriorityAndSpeed(combatants);
    const foundIndex = activeCombatant ? sorted.findIndex((c) => c === activeCombatant) : -1;
    const fallbackIndex = sorted.length === 0 ? 0 : Math.max(0, Math.min(activeIdx, sorted.length - 1));
    return {
      sorted,
      newActiveIndex: foundIndex >= 0 ? foundIndex : fallbackIndex,
    };
  }

  useEffect(() => {
    setAppState((prev) => {
      if (prev.combatants.length <= 1) return prev;

      const sorted = sortCombatantsBySpeed(prev.combatants);
      let isSameOrder = true;

      for (let i = 0; i < sorted.length; i += 1) {
        if (sorted[i] !== prev.combatants[i]) {
          isSameOrder = false;
          break;
        }
      }

      if (isSameOrder) return prev;

      if (prev.round === 0 || prev.activeIndex < 0) {
        return {
          ...prev,
          combatants: sorted,
          activeIndex: -1,
        };
      }

      const activeName = prev.combatants[prev.activeIndex]?.name;
      const foundIndex =
        typeof activeName === "string"
          ? sorted.findIndex((c) => c?.name === activeName)
          : -1;
      const fallbackIndex =
        sorted.length === 0 ? 0 : Math.max(0, Math.min(prev.activeIndex, sorted.length - 1));

      return {
        ...prev,
        combatants: sorted,
        activeIndex: foundIndex >= 0 ? foundIndex : fallbackIndex,
      };
    });
  }, [combatants, activeIndex]);

  // ---------------------------------------------------------------------------
  // ------------------------ Combatant Functions ------------------------------
  // ---------------------------------------------------------------------------

  function handleFlashDamage(indices: number[]) {
    setDamageFlashIndices(indices);
    setTimeout(() => setDamageFlashIndices([]), 500);
  }

  function confirmRemoveCombatant(index: number) {
    setCombatants((prev) => prev.filter((_, i) => i !== index));
    setRemoveIndex(null);
  }

  function getUniqueCombatantName(existing: any[], baseName: string) {
    let uniqueName = baseName || "Unknown";
    let count = 1;

    while (existing.some((mon) => mon.name === uniqueName)) {
      uniqueName = `${baseName || "Unknown"} ${count}`;
      count++;
    }

    return uniqueName;
  }

  function addCombatantToList(newCombatant: any) {
    setCombatants((prev) => {
      if (!prev) return [newCombatant];

      const baseName = newCombatant.name.trim();
      const uniqueName = getUniqueCombatantName(prev, baseName);

      const updatedCombatant = ensureUid({
        ...newCombatant,
        name: uniqueName,
        types: newCombatant.types || [],
        totalStats: {
          ...newCombatant.totalStats,
          HP: newCombatant.totalStats.HP ?? 1,
          maxHP: newCombatant.totalStats.maxHP ?? 1,
          PP: newCombatant.totalStats.PP ?? (newCombatant.level + 15),
          maxPP: newCombatant.totalStats.maxPP ?? (newCombatant.level + 15),
          priority: 0,
        },
      });

      return [...prev].concat(updatedCombatant).sort((a, b) => b.totalStats.Speed - a.totalStats.Speed);
    });
  }

  function computeTotalsForSync(mon: any, natureMap?: Map<string, any>) {
    const level = mon.level ?? 1;
    const rawBase = mon.baseStats ?? {};
    const baseStats = {
      baseHP: Number.isFinite(rawBase.baseHP) ? rawBase.baseHP : 10,
      baseAttack: Number.isFinite(rawBase.baseAttack) ? rawBase.baseAttack : 10,
      baseDefense: Number.isFinite(rawBase.baseDefense) ? rawBase.baseDefense : 10,
      baseSpAttack: Number.isFinite(rawBase.baseSpAttack) ? rawBase.baseSpAttack : 10,
      baseSpDefense: Number.isFinite(rawBase.baseSpDefense) ? rawBase.baseSpDefense : 10,
      baseSpeed: Number.isFinite(rawBase.baseSpeed) ? rawBase.baseSpeed : 10,
    };
    const adjustedBase = applyNatureToBaseStats(baseStats, mon.nature, natureMap);
    const derived = computeDerivedStats({ level, ...adjustedBase });
    const isBoss = !!mon.isBoss;
    const isMinion = !!mon.isMinion;

    let maxHP = derived.maxHP ?? 1;
    if (isBoss) maxHP *= 2;
    if (isMinion) maxHP *= 3;

    const priorHP = mon.totalStats?.HP ?? maxHP;
    const maxPP = level + 15;
    const priorPP = mon.totalStats?.PP ?? maxPP;

    return {
      ...derived,
      maxHP,
      HP: Math.min(priorHP, maxHP),
      maxPP,
      PP: Math.min(priorPP, maxPP),
    };
  }

  async function syncFromNotion() {
    let natureMap: Map<string, any> | undefined = undefined;
    try {
      const res = await fetch("/api/all-natures", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        natureMap = buildNatureMap(Array.isArray(data?.natures) ? data.natures : []);
      }
    } catch {
      // ignore nature fetch errors; sync still works without nature adjustments
    }
    const trainerNotionIds = trainers
      .map((t) => (t.notionId ?? "").trim())
      .filter((id) => id.length > 0)
      .map(normalizeNotionId);

    if (trainerNotionIds.length === 0) return;

    const res = await fetch("/api/sync-pokemon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerNotionIds }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to sync from Notion");
    }

    const data = await res.json();
    const records = Array.isArray(data?.pokemon) ? data.pokemon : [];

    const trainerIdByNotionId = new Map(
      trainers
        .filter((t) => (t.notionId ?? "").trim().length > 0)
        .map((t) => [normalizeNotionId(String(t.notionId)), t.id])
    );

    setAppState((prev) => {
      const nextCombatants = [...prev.combatants];
      const nextNoncombatants = [...prev.noncombatants];

      const combatantIndexByNotionId = new Map<string, number>();
      const noncombatantIndexByNotionId = new Map<string, number>();

      nextCombatants.forEach((m, i) => {
        const id = m?.notionId ? normalizeNotionId(String(m.notionId)) : "";
        if (id) combatantIndexByNotionId.set(id, i);
      });
      nextNoncombatants.forEach((m, i) => {
        const id = m?.notionId ? normalizeNotionId(String(m.notionId)) : "";
        if (id) noncombatantIndexByNotionId.set(id, i);
      });

      for (const rec of records) {
        const trainerId = trainerIdByNotionId.get(
          normalizeNotionId(String(rec.trainerNotionId ?? ""))
        );
        if (!trainerId) continue;

        const recNotionId = rec?.notionId ? normalizeNotionId(String(rec.notionId)) : "";
        if (!recNotionId) continue;

        const combatantIndex = combatantIndexByNotionId.get(recNotionId);
        const noncombatantIndex = noncombatantIndexByNotionId.get(recNotionId);

        const existing =
          typeof combatantIndex === "number"
            ? nextCombatants[combatantIndex]
            : typeof noncombatantIndex === "number"
            ? nextNoncombatants[noncombatantIndex]
            : null;

        const speciesName =
          getNotionTextValue(rec.speciesName) ??
          getNotionTextValue(existing?.speciesName) ??
          getSpeciesName(rec.name) ??
          getSpeciesName(existing?.name) ??
          null;
        const speciesLookupName = getSpeciesName(speciesName ?? undefined);
        const speciesData = speciesLookupName ? pokemonByName.get(speciesLookupName) : null;

        const mergedBaseStats = {
          ...getDefinedBaseStatOverrides(existing?.baseStats),
          ...getDefinedBaseStatOverrides(rec.baseStats),
        };
        const merged = {
          ...existing,
          notionId: rec.notionId,
          trainerId,
          name: rec.name ?? existing?.name,
          level: rec.level ?? existing?.level,
          baseStats: mergedBaseStats,
          ability: rec.ability ?? existing?.ability ?? null,
          moves: rec.moves ?? existing?.moves ?? [],
          nature: rec.nature ?? existing?.nature ?? null,
          speciesName,
          types: speciesData?.types ?? existing?.types ?? [],
          height: typeof speciesData?.height === "number" ? speciesData.height : existing?.height,
          weight: typeof speciesData?.weight === "number" ? speciesData.weight : existing?.weight,
        };

        const totalStats = computeTotalsForSync(merged, natureMap);
        const updated = ensureUid({ ...merged, totalStats });

        if (typeof combatantIndex === "number") {
          nextCombatants[combatantIndex] = updated;
        } else if (typeof noncombatantIndex === "number") {
          nextNoncombatants[noncombatantIndex] = updated;
        } else {
          nextNoncombatants.push(updated);
        }
      }

      return {
        ...prev,
        combatants: nextCombatants,
        noncombatants: nextNoncombatants,
      };
    });
  }

  function handleAddCombatant(newCombatant: any) {
    addCombatantToList(newCombatant);

    setShowAddModal(false);
  }

  function handleEditCombatant(updatedCombatant: any) {
    const withUid = ensureUid(updatedCombatant);
    setCombatants((prev) =>
      prev.map((c) => (isSameMon(c, withUid) ? withUid : c))
    );
  }

  function updateHP(index: number, newHP: number) {
    setCombatants((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              totalStats: {
                ...c.totalStats,
                HP: Math.max(0, Math.min(newHP, c.totalStats.maxHP)),
              },
            }
          : c
      )
    );
  }

  function updatePP(index: number, newPP: number) {
    setCombatants((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              totalStats: {
                ...c.totalStats,
                PP: Math.max(0, Math.min(newPP, c.totalStats.maxPP)),
              },
            }
          : c
      )
    );
  }

  function adjustStage(combatantIndex: number, stat: string, delta: number) {
    setAppState((prev) => {
      const updatedCombatants = prev.combatants.map((combatant, idx) => {
        if (idx !== combatantIndex) return combatant;

        const oldStage = combatant.stageModifiers?.[stat] ?? 0;
        const newStage = Math.max(-6, Math.min(6, oldStage + delta));
        return {
          ...combatant,
          stageModifiers: {
            ...combatant.stageModifiers,
            [stat]: newStage,
          },
        };
      });

      if (stat !== "Speed") {
        return {
          ...prev,
          combatants: updatedCombatants,
        };
      }

      const { sorted, newActiveIndex } = sortCombatantsAndFixActive(
        updatedCombatants,
        prev.activeIndex
      );

      return {
        ...prev,
        combatants: sorted,
        activeIndex: newActiveIndex,
      };
    });
  }

  function handleStatusChange(index: number, status: string, turns: number) {
    setCombatants((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, status: status !== "None" ? { name: status, turns } : null } : c
      )
    );
  }

  function applyDirectDamage(damage: number) {
    if (damageTargetIndex === null) return;

    setCombatants((prev) =>
      prev.map((c, i) =>
        i === damageTargetIndex
          ? {
              ...c,
              totalStats: {
                ...c.totalStats,
                HP: Math.max(0, c.totalStats.HP - damage),
              },
            }
          : c
      )
    );
    setDamageTargetIndex(null);
  }

  function applyDamage(damageResults: { index: number; damage: number }[]) {
    setCombatants((prev) =>
      prev.map((c, i) => {
        const dmgEntry = damageResults.find((d) => d.index === i);
        if (!dmgEntry) return c;
        return {
          ...c,
          totalStats: {
            ...c.totalStats,
            HP: Math.max(0, c.totalStats.HP - dmgEntry.damage),
          },
        };
      })
    );
  }

  function openAbilityDetails(name: string) {
    setSelectedAbilityName(name);
    setShowAbilityDetails(true);
    fetchAbility(name);
  }

  function addHistoryEntry(title: string, lines: string[]) {
    setHistoryEntries((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title,
        lines,
      },
      ...prev,
    ]);
  }

  const emptyCombatant = {
    name: "",
    level: 5,
    baseStats: {
      baseHP: 10,
      baseSpeed: 10,
      baseAttack: 10,
      baseDefense: 10,
      baseSpAttack: 10,
      baseSpDefense: 10,
    },
    types: [],
    trainerId: null,
    moves: [],
    ability: "",
    item: "",
    nature: "",
    isMinion: false,
    isBoss: false,
    secondaryStatuses: [],
    totalStats: {
      HP: 1,
      maxHP: 1,
      PP: 1,
      maxPP: 1,
    },
  };

  const selectedCombatantIndex =
    selectedCombatantName === null
      ? null
      : combatants.findIndex((c) => c?.name === selectedCombatantName);
  const selectedCombatant =
    selectedCombatantIndex !== null && selectedCombatantIndex >= 0
      ? combatants[selectedCombatantIndex]
      : null;

  return (
    <div className="p-4 bg-gradient-to-b from-blue-900 to-gray-800 min-h-screen border-4 border-yellow-500 rounded-lg shadow-lg font-['PokemonFRLG']">
      {/* Top Buttons */}
      <div className="flex space-x-4 mb-4">
        <Button onClick={() => setCampaignModalOpen(true)}>Campaigns…</Button>

        <Button onClick={() => setShowSettings(true)} className="ml-auto">
          Settings
        </Button>

        <Button onClick={() => setShowAddModal(true)}>Add Combatant</Button>

        <Button onClick={endCombat} className="bg-red-700 hover:bg-red-800 text-white">
          End Combat
        </Button>

        <Button onClick={healAllCombatants} className="bg-green-600 hover:bg-green-700 text-white">
          Heal All
        </Button>

        <Button onClick={() => setShowDamageModal(true)} className="ml-auto">
          Damage Calculator
        </Button>
        <Button onClick={() => setShowHistory(true)}>
          History
        </Button>
      </div>

      {/* Optional: show hydration/persistence errors */}
      {campaign.isHydrating ? (
        <div className="mb-3 text-xs text-white/80">Loading campaign…</div>
      ) : null}
      {campaign.error ? (
        <div className="mb-3 text-xs text-red-200">Save system: {campaign.error}</div>
      ) : null}

      {/* Round / Next Turn + Weather */}
      <div className="flex items-center space-x-4 mb-4">
        {round === 0 ? (
          <Button onClick={beginBattle} className="bg-green-600 hover:bg-green-700">
            Begin Battle
          </Button>
        ) : (
          <Button
            onClick={() => {
              markCurrentAsTaken();

              const updatedRemaining = combatants
                .map((_, i) => i)
                .filter((i) => i !== activeIndex)
                .filter((i) => !turnsTakenThisRound.includes(i));

              if (updatedRemaining.length === 0) {
                endRoundAndStartNext();
                return;
              }

              const next = updatedRemaining[0];
              setSuggestedNextIndex(next);
              setChosenNextIndex(next);
              setNextTurnModalOpen(true);
            }}
          >
            Next Turn
          </Button>
        )}

        <span className="text-white text-lg">Round {round}</span>

        {/* ✅ Weather Controls */}
        <div className="ml-auto flex items-center gap-3 bg-black/20 border border-white/20 rounded px-3 py-2">
          <div className="text-white text-sm font-semibold">Weather</div>

          <div className="w-44">
            <Select
              value={weather.type}
              onValueChange={(val) => {
                const nextType = val as WeatherType;

                if (nextType === "None") {
                  setWeather({ type: "None", turnsRemaining: 0, isPermanent: false });
                  return;
                }

                setWeather((prev) => ({
                  ...prev,
                  type: nextType,
                  // if switching from None -> something, give a sensible default
                  turnsRemaining: prev.type === "None" ? 5 : Math.max(1, prev.turnsRemaining ?? 5),
                }));
              }}
            >
              <SelectTrigger className="w-full text-white">
  <SelectValue className="text-white" placeholder="Select Weather" />
</SelectTrigger>

              <SelectContent>
                {WEATHER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="inline-flex items-center gap-2 text-white text-sm select-none">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={weather.isPermanent}
              disabled={weather.type === "None"}
              onChange={() => {
                setWeather((prev) => {
                  if (prev.type === "None") return prev;
                  const nextPerm = !prev.isPermanent;
                  return {
                    ...prev,
                    isPermanent: nextPerm,
                    turnsRemaining: nextPerm ? prev.turnsRemaining : Math.max(1, prev.turnsRemaining || 5),
                  };
                });
              }}
            />
            Permanent
          </label>

          <div className="flex items-center gap-2">
            <span className="text-white text-sm">Turns</span>
            <input
              type="number"
              className="w-16 text-center bg-gray-700 border rounded p-1 text-white"
              value={weather.turnsRemaining}
              min={0}
              disabled={weather.type === "None" || weather.isPermanent}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setWeather((prev) => {
                  if (prev.type === "None") return prev;
                  if (prev.isPermanent) return prev;
                  const nextTurns = Number.isFinite(n) ? Math.max(0, n) : 0;
                  return { ...prev, turnsRemaining: nextTurns };
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Noncombatant Drawer */}
      <NoncombatantDrawer
        drawerState={drawerState}
        setDrawerState={setDrawerState}
        noncombatants={noncombatants}
        combatants={combatants}
        addNoncombatant={addNoncombatant}
        editNoncombatant={editNoncombatant}
        removeNoncombatant={removeNoncombatant}
        updateNoncombatantStatus={updateNoncombatantStatus}
        updateNoncombatantHP={updateNoncombatantHP}
        updateNoncombatantPP={updateNoncombatantPP}
        addCombatant={handleAddCombatant}
        getTrainerNameById={getTrainerNameById}
        trainers={trainers}
        onAddTrainer={addTrainer}
        onUpdateTrainerNotionId={updateTrainerNotionId}
        onSyncFromNotion={syncFromNotion}
        onRenameTrainer={renameTrainer}
        onDeleteTrainer={deleteTrainer}
        onPurgeUnassignedPokemon={purgeUnassignedPokemon}
        onOpenAddTrainer={() => setShowAddTrainerModal(true)}
        applyDamage={applyDamage}
        stabMultiplier={stabMultiplier}
        effectivityScaling={effectivityScaling}
        onFlashDamage={handleFlashDamage}
          weather={weather}
          onLogHistory={(entry: { title: string; lines: string[] }) => addHistoryEntry(entry.title, entry.lines)}
        swappingCombatantIndex={swappingCombatantIndex}
        setSwappingCombatantIndex={setSwappingCombatantIndex}
        handleSwap={(noncombatantToSwapIn: any) => {
          if (swappingCombatantIndex === null) return;

          const outgoing = {
            ...combatants[swappingCombatantIndex],
            secondaryStatuses: [],
            stageModifiers: {
              Attack: 0,
              Defense: 0,
              SpecialAttack: 0,
              SpecialDefense: 0,
              Speed: 0,
              Accuracy: 0,
              Evasion: 0,
            },
          };

          setAppState((prev) => {
            const combatantsWithoutOutgoing = prev.combatants.filter(
              (_, i) => i !== swappingCombatantIndex
            );
            const baseName = String(noncombatantToSwapIn.name ?? "").trim() || "Unknown";
            let uniqueName = baseName;
            let count = 1;

            while (combatantsWithoutOutgoing.some((mon) => mon.name === uniqueName)) {
              uniqueName = `${baseName} ${count}`;
              count++;
            }

            const fallbackPP = (noncombatantToSwapIn.level ?? 1) + 15;
            const updatedCombatant = {
              ...noncombatantToSwapIn,
              name: uniqueName,
              types: noncombatantToSwapIn.types || [],
              totalStats: {
                ...noncombatantToSwapIn.totalStats,
                HP: noncombatantToSwapIn.totalStats?.HP ?? 1,
                maxHP: noncombatantToSwapIn.totalStats?.maxHP ?? 1,
                PP: noncombatantToSwapIn.totalStats?.PP ?? fallbackPP,
                maxPP: noncombatantToSwapIn.totalStats?.maxPP ?? fallbackPP,
              },
              priority: 0,
            };

            const sortedCombatants = [...combatantsWithoutOutgoing, updatedCombatant].sort(
              (a, b) => b.totalStats.Speed - a.totalStats.Speed
            );

            let nextActiveIndex = prev.activeIndex;
            if (prev.activeIndex === swappingCombatantIndex) {
              const swappedIndex = sortedCombatants.findIndex((c) => c === updatedCombatant);
              nextActiveIndex = swappedIndex >= 0 ? swappedIndex : 0;
            } else {
              const activeCombatant = prev.combatants[prev.activeIndex];
              const foundIndex = activeCombatant
                ? sortedCombatants.findIndex((c) => c === activeCombatant)
                : -1;
              nextActiveIndex =
                foundIndex >= 0
                  ? foundIndex
                  : Math.max(0, Math.min(prev.activeIndex, sortedCombatants.length - 1));
            }

            return {
              ...prev,
              combatants: sortedCombatants,
              activeIndex: nextActiveIndex,
            };
          });

          setNoncombatants((prev) =>
            prev.filter((mon) => !isSameMon(mon, noncombatantToSwapIn))
          );
          setNoncombatants((prev) => [...prev, outgoing]);

          setSwappingCombatantIndex(null);
          setDrawerState("closed");
        }}
      />

      {/* Combatants Table */}
      <CombatantsTable
        combatants={combatants}
        activeIndex={activeIndex}
        turnsTakenThisRound={turnsTakenThisRound}
        inCombat={round > 0}
        onOpenAbilityDetails={openAbilityDetails}
        setRemoveIndex={setRemoveIndex}
        setSelectedStat={setSelectedStat}
        setSelectedCombatantName={setSelectedCombatantName}
        updateHP={updateHP}
        updatePP={updatePP}
        handleStatusChange={handleStatusChange}
        setDamageTargetIndex={setDamageTargetIndex}
        setEditingCombatantIndex={setEditingCombatantIndex}
        isDrawerOpen={drawerState !== "closed"}
        setSwappingCombatantIndex={setSwappingCombatantIndex}
        setDrawerState={setDrawerState}
        swappingCombatantIndex={swappingCombatantIndex}
        updateSecondaryStatuses={updateSecondaryStatuses}
        openStatusModal={openStatusModal}
        damageFlashIndices={damageFlashIndices}
      />

      {/* Remove Combatant Modal */}
      <RemoveCombatantModal
        isOpen={removeIndex !== null}
        combatantName={removeIndex !== null ? combatants[removeIndex].name : ""}
        isCombatant={true}
        onConfirm={() => removeIndex !== null && confirmRemoveCombatant(removeIndex)}
        onSaveToDrawer={() => {
          if (removeIndex !== null) {
            const removedMon = combatants[removeIndex];
            confirmRemoveCombatant(removeIndex);
            addNoncombatant({
              ...removedMon,
              stageModifiers: {
                Attack: 0,
                Defense: 0,
                SpecialAttack: 0,
                SpecialDefense: 0,
                Speed: 0,
                Accuracy: 0,
                Evasion: 0,
              },
            });
          }
        }}
        onCancel={() => setRemoveIndex(null)}
      />

      <NextTurnOverrideModal
        isOpen={nextTurnModalOpen}
        onClose={() => setNextTurnModalOpen(false)}
        combatants={combatants}
        suggested={suggestedNextIndex}
        chosen={chosenNextIndex}
        setChosen={setChosenNextIndex}
        onConfirm={handleNextTurnConfirmed}
        turnsTakenThisRound={turnsTakenThisRound}
        activeIndex={activeIndex}
      />

      <PriorityModal
        isOpen={priorityModalOpen}
        onClose={() => setPriorityModalOpen(false)}
        combatants={combatants}
        selections={prioritySelections}
        setSelections={setPrioritySelections}
        onConfirm={applyPrioritySelections}
      />

      {/* Add Combatant Modal (Edit layout) */}
      {showAddModal && (
        <EditCombatantModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          combatant={emptyCombatant}
          context="combatant"
          mode="add"
          onConfirm={(newCombatant: any) => {
            addCombatantToList(newCombatant);
            setShowAddModal(false);
          }}
          trainers={trainers}
          onAddTrainer={addTrainer}
          combatants={combatants}
          applyDamage={applyDamage}
          stabMultiplier={stabMultiplier}
          effectivityScaling={effectivityScaling}
          onFlashDamage={handleFlashDamage}
          weather={weather}
          onLogHistory={(entry: { title: string; lines: string[] }) => addHistoryEntry(entry.title, entry.lines)}
        />
      )}

      {/* Stat Stage Modifier Modal */}
      <StatStageModifierModal
        isOpen={selectedStat !== null && selectedCombatantIndex !== null && selectedCombatantIndex >= 0}
        selectedStat={selectedStat}
        combatantIndex={selectedCombatantIndex}
        combatant={selectedCombatant}
        onClose={() => {
          setSelectedStat(null);
          setSelectedCombatantName(null);
        }}
        adjustStage={adjustStage}
      />

      {/* Direct Damage Modal */}
      {damageTargetIndex !== null && (
        <DirectDamageModal
          isOpen={true}
          onClose={() => setDamageTargetIndex(null)}
          combatant={combatants[damageTargetIndex]}
          applyDamage={applyDirectDamage}
        />
      )}

      {secondaryStatusModalIndex !== null && (
        <SecondaryStatusModal
          isOpen={true}
          onClose={closeStatusModal}
          combatant={combatants[secondaryStatusModalIndex]}
          updateStatuses={(newStatuses: any) =>
            updateSecondaryStatuses(secondaryStatusModalIndex, newStatuses)
          }
        />
      )}

      {editingCombatantIndex !== null && (
        <EditCombatantModal
          isOpen={true}
          onClose={() => setEditingCombatantIndex(null)}
          combatant={combatants[editingCombatantIndex]}
          context="combatant"
          onConfirm={(updatedCombatant: any) => {
            setAppState((prev) => {
              const updatedCombatants = prev.combatants.map((c, i) =>
                i === editingCombatantIndex ? updatedCombatant : c
              );
              const { sorted, newActiveIndex } = sortCombatantsAndFixActive(
                updatedCombatants,
                prev.activeIndex
              );
              return {
                ...prev,
                combatants: sorted,
                activeIndex: newActiveIndex,
              };
            });
            setEditingCombatantIndex(null);
          }}
          onDuplicate={(duplicateCombatant: any) => {
            addCombatantToList(duplicateCombatant);
            setEditingCombatantIndex(null);
          }}
          trainers={trainers}
          onAddTrainer={addTrainer}
          combatants={combatants}
          applyDamage={applyDamage}
          stabMultiplier={stabMultiplier}
          effectivityScaling={effectivityScaling}
          onFlashDamage={handleFlashDamage}
          weather={weather}
          onLogHistory={(entry: { title: string; lines: string[] }) => addHistoryEntry(entry.title, entry.lines)}
        />
      )}

      <AbilityDetailsModal
        isOpen={showAbilityDetails}
        onClose={() => {
          setShowAbilityDetails(false);
          setSelectedAbilityName(null);
        }}
        ability={ability}
        loading={abilityLoading || (showAbilityDetails && !ability && !!selectedAbilityName)}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        entries={historyEntries}
        onClear={() => setHistoryEntries([])}
      />

      <AddTrainerModal
        isOpen={showAddTrainerModal}
        onClose={() => setShowAddTrainerModal(false)}
        onConfirm={addTrainerWithNotionId}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        stabMultiplier={stabMultiplier}
        setStabMultiplier={setStabMultiplier}
        effectivityScaling={effectivityScaling}
        setEffectivityScaling={setEffectivityScaling}
      />

      {/* Damage Calculator Modal */}
      <DamageCalculatorModal
        isOpen={showDamageModal}
        onClose={() => setShowDamageModal(false)}
        combatants={combatants}
        applyDamage={applyDamage}
        stabMultiplier={stabMultiplier}
        effectivityScaling={effectivityScaling}
        onFlashDamage={handleFlashDamage}
        weather={weather}
        onLogHistory={(entry: { title: string; lines: string[] }) => addHistoryEntry(entry.title, entry.lines)}
      />

      {showStatusDamageModal && (
        <div className="fixed top-1/2 left-1/2 z-50 w-80 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-1/2 p-4">
          <h2 className="text-lg font-bold mb-3 text-center">Status Damage</h2>
          <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
            {statusDamageSummary.map((entry, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  <strong>{entry.name}</strong>
                  <span className="text-gray-400 italic ml-1">({entry.source})</span>
                </span>
                <span className="text-red-400">-{entry.amount} HP</span>
              </li>
            ))}
          </ul>
          <div className="text-center mt-4">
            <Button onClick={() => setShowStatusDamageModal(false)} className="bg-gray-600 hover:bg-gray-700">
              OK
            </Button>
          </div>
        </div>
      )}

      {/* ✅ NEW: Campaign picker modal */}
      <CampaignPickerModal
        isOpen={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
        campaigns={campaign.campaigns}
        activeId={campaign.activeId}
        onCreate={async (name: string) => {
          await campaign.createCampaign(name);
        }}
        onLoad={async (id: string) => {
          await campaign.loadCampaign(id);
        }}
        onRename={async (id: string, name: string) => {
          await campaign.renameCampaign(id, name);
        }}
        onDelete={async (id: string) => {
          await campaign.deleteCampaign(id);
        }}
        onDuplicate={async (id: string) => {
          await campaign.duplicateCampaign(id);
        }}
        onExport={async (id: string) => {
          return campaign.exportCampaign(id);
        }}
        onImport={async (json: string) => {
          await campaign.importCampaign(json);
        }}
        error={campaign.error}
      />
    </div>
  );
}



