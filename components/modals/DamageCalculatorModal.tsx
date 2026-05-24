import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModalAnimation } from "./useModalAnimation";

// ✅ optional import type (keeps this file compatible even if you move types later)
export type WeatherType =
  | "None"
  | "Rain"
  | "Hail"
  | "Sandstorm"
  | "Fog"
  | "Harsh Sunlight"
  | "Strong Winds";

 

export type WeatherState = {
  type: WeatherType;
  turnsRemaining: number;
  isPermanent: boolean;
};

interface DamageCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatants: any[];
  applyDamage: (damageResults: { index: number; damage: number }[]) => void;
  stabMultiplier: number;
  effectivityScaling: string;
  onFlashDamage: (indices: number[]) => void;
  defaultAttackerName?: string | null;
  defaultMoveType?: string | null;
  defaultMoveCategory?: string | null;
  embedded?: boolean;

  // ✅ NEW (optional so other callers don’t break)
  weather?: WeatherState;
  onLogHistory?: (entry: { title: string; lines: string[] }) => void;
}

function getModifiedStat(
  base: number,
  stage: number,
  isCritical: boolean,
  isAttack: boolean,
  attackerStatus: string | null,
  statKey: string,
  ignoreStatus: boolean
): number {
  // Crit stage rules: ignore negative attack stages and positive defense stages
  if (isCritical) {
    if (isAttack && stage < 0) stage = 0;
    if (!isAttack && stage > 0) stage = 0;
  }

  let modified =
    stage === 0
      ? base
      : stage > 0
      ? base * ((2 + stage) / 2)
      : base * (2 / (2 - stage));

  // Attacker status modifiers
  if (!ignoreStatus) {
    if (attackerStatus === "Burn" && isAttack && statKey === "Attack") modified *= 0.5;
    if (attackerStatus === "Frostbite" && !isAttack && statKey === "SpecialAttack") modified *= 0.5;
  }

  return modified;
}

const POKEMON_TYPES = [
  "Normal","Fire","Water","Electric","Grass","Ice","Fighting",
  "Poison","Ground","Flying","Psychic","Bug","Rock","Ghost",
  "Dragon","Dark","Steel","Shadow",
];

const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Ice: 0.5, Flying: 2, Ground: 2, Grass: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Ghost: 0 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Rock: 2, Bug: 0.5, Flying: 0, Steel: 2 },
  Flying: { Electric: 0.5, Fighting: 2, Bug: 2, Grass: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
};

function normalizeWeather(weather?: WeatherState): WeatherState {
  if (!weather) return { type: "None", turnsRemaining: 0, isPermanent: false };
  if (!weather.type) return { type: "None", turnsRemaining: 0, isPermanent: false };
  return weather;
}

function getTypeEffectiveness(moveType: string, defenderTypes: string[], weather?: WeatherState): number {
  if (moveType === "Shadow") return 1;
  const w = normalizeWeather(weather);

  let eff = 1;
  defenderTypes.forEach((t) => {
    // ✅ Strong Winds: Electric/Ice/Rock are neutral vs Flying (ignore Flying multiplier only)
    if (
      w.type === "Strong Winds" &&
      t === "Flying" &&
      (moveType === "Electric" || moveType === "Ice" || moveType === "Rock")
    ) {
      eff *= 1;
      return;
    }

    eff *= TYPE_EFFECTIVENESS[moveType]?.[t] ?? 1;
  });

  return eff;
}

function getWeatherDamageMultiplier(weather: WeatherState, moveType: string): { mult: number; note?: string } {
  if (weather.type === "Rain") {
    if (moveType === "Water") return { mult: 1.5, note: "Rain boosted Water" };
    if (moveType === "Fire") return { mult: 0.5, note: "Rain weakened Fire" };
  }

  if (weather.type === "Harsh Sunlight") {
    if (moveType === "Fire") return { mult: 1.5, note: "Sun boosted Fire" };
    if (moveType === "Water") return { mult: 0.5, note: "Sun weakened Water" };
  }

  return { mult: 1 };
}

function getWeatherSpDefMultiplier(weather: WeatherState, defenderTypes: string[], isPhysical: boolean): { mult: number; note?: string } {
  if (isPhysical) return { mult: 1 };

  if (weather.type === "Hail") {
    if (Array.isArray(defenderTypes) && defenderTypes.includes("Ice")) {
      return { mult: 1.5, note: "Hail boosted Ice Sp. Def" };
    }
  }

  if (weather.type === "Sandstorm") {
    if (Array.isArray(defenderTypes) && defenderTypes.includes("Rock")) {
      return { mult: 1.5, note: "Sandstorm boosted Rock Sp. Def" };
    }
  }

  return { mult: 1 };
}

function getWeatherDisplay(weather: WeatherState): string {
  if (weather.type === "None") return "None";
  if (weather.isPermanent) return `${weather.type} (Permanent)`;
  return `${weather.type} (${weather.turnsRemaining} turn${weather.turnsRemaining === 1 ? "" : "s"} left)`;
}

function getWeatherEndTurnReminder(weather: WeatherState): string | null {
  if (weather.type === "Hail") {
    return "Hail: Non-Ice Pokémon take 1/16 max HP at end of their turn.";
  }
  if (weather.type === "Sandstorm") {
    return "Sandstorm: Non-Rock/Ground/Steel Pokémon take 1/16 max HP at end of their turn.";
  }
  return null;
}

function getEffectivenessLabel(eff: number): string {
  if (eff === 4) return "4x effective";
  if (eff > 1) return "Super effective";
  if (eff === 0.25) return "4x ineffective";
  if (eff < 1 && eff > 0) return "Not very effective";
  if (eff === 0) return "No effect";
  return "";
}

function getEffectivenessBanner(eff: number, defenderName?: string): string {
  if (eff === 4) return "It's 4x effective!";
  if (eff > 1) return "It's super effective!";
  if (eff === 0.25) return "It's 4x ineffective...";
  if (eff < 1 && eff > 0) return "It's not very effective...";
  if (eff === 0) return `It didn't affect ${defenderName ?? "the target"}!`;
  return "";
}

const STAT_LABELS: Record<string, string> = {
  Attack: "Attack",
  Defense: "Defense",
  SpecialAttack: "Sp. Atk",
  SpecialDefense: "Sp. Def",
  Accuracy: "Accuracy",
  Evasion: "Evasion",
};

function formatStageValue(stage: number): string {
  return stage > 0 ? `+${stage}` : `${stage}`;
}

function getStageClass(stage: number): string {
  if (stage > 0) return "border-green-400/50 bg-green-500/10 text-green-200";
  if (stage < 0) return "border-red-400/50 bg-red-500/10 text-red-200";
  return "border-gray-500 bg-gray-700 text-gray-200";
}

export default function DamageCalculatorModal({
  isOpen,
  onClose,
  combatants,
  applyDamage,
  stabMultiplier,
  effectivityScaling,
  onFlashDamage,
  defaultAttackerName = null,
  defaultMoveType,
  defaultMoveCategory = null,
  embedded = false,
  weather,
  onLogHistory,
}: DamageCalculatorModalProps) {
  const safeCombatants = Array.isArray(combatants) ? combatants : [];
  const activeWeather = useMemo(() => normalizeWeather(weather), [weather]);

  const [attackerIndex, setAttackerIndex] = useState<number | null>(null);
  const [defenderIndices, setDefenderIndices] = useState<number[]>([]);
  const [movePower, setMovePower] = useState(50);
  const [isPhysical, setIsPhysical] = useState(true);
  const [moveType, setMoveType] = useState<string>("Normal");
  const [isCritical, setIsCritical] = useState(false);
  const [effectiveAtkStat, setEffectiveAtkStat] = useState<"Auto" | "Attack" | "SpecialAttack">("Auto");
  const [effectiveDefStat, setEffectiveDefStat] = useState<"Auto" | "Defense" | "SpecialDefense">("Auto");
  const [ignoreStatus, setIgnoreStatus] = useState(false);
  const [overrideEffectivity, setOverrideEffectivity] = useState<
    "Auto" | "Immune" | "QuadIneffective" | "Ineffective" | "Normal" | "Super" | "Quad"
  >("Auto");

  const [isRecoil, setIsRecoil] = useState(false);
  const [minionMultipliers, setMinionMultipliers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isOpen) return;

    setDefenderIndices([]);
    setMovePower(50);
    setIsPhysical(
      typeof defaultMoveCategory === "string" &&
        defaultMoveCategory.trim().toLowerCase() === "special"
        ? false
        : true
    );
    setMoveType(
      typeof defaultMoveType === "string" && defaultMoveType.trim()
        ? defaultMoveType
        : "Normal"
    );
    setIsCritical(false);
    setIsRecoil(false);
    setMinionMultipliers({});
    setEffectiveAtkStat("Auto");
    setEffectiveDefStat("Auto");
    setIgnoreStatus(false);
    setOverrideEffectivity("Auto");

    if (defaultAttackerName) {
      const idx = safeCombatants.findIndex(
        (c) => c?.name?.trim() === defaultAttackerName.trim()
      );
      setAttackerIndex(idx >= 0 ? idx : null);
    } else {
      setAttackerIndex(null);
    }
  }, [isOpen, defaultAttackerName, defaultMoveCategory, defaultMoveType, safeCombatants]);

  // ✅ If attacker changes, ensure it cannot remain selected as a defender
  useEffect(() => {
    if (attackerIndex === null) return;
    setDefenderIndices((prev) => prev.filter((i) => i !== attackerIndex));
  }, [attackerIndex]);

  useEffect(() => {
    setMinionMultipliers((prev) => {
      let changed = false;
      const next: Record<number, number> = { ...prev };

      for (const key of Object.keys(next)) {
        const idx = Number(key);
        if (!defenderIndices.includes(idx)) {
          delete next[idx];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [defenderIndices]);

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  function isDrowsy(defender: any): boolean {
    if (defender?.status?.name === "Drowsy") return true;
    if (!Array.isArray(defender?.secondaryStatuses)) return false;
    return defender.secondaryStatuses.some((s: any) => s?.name === "Drowsy");
  }

  function hasStatus(mon: any, statusName: string): boolean {
    if (mon?.status?.name === statusName) return true;
    if (!Array.isArray(mon?.secondaryStatuses)) return false;
    return mon.secondaryStatuses.some((s: any) => s?.name === statusName);
  }

  function getDamageStatKeys() {
    const baseAtkKey = isPhysical ? "Attack" : "SpecialAttack";
    const baseDefKey = isPhysical ? "Defense" : "SpecialDefense";
    return {
      attackStat: effectiveAtkStat === "Auto" ? baseAtkKey : effectiveAtkStat,
      defenseStat: effectiveDefStat === "Auto" ? baseDefKey : effectiveDefStat,
    };
  }

  function getStageEntries(defender: any) {
    if (!attacker && !defender) return [];

    const { attackStat, defenseStat } = getDamageStatKeys();
    const entries: { key: string; label: string; stage: number; ignored?: boolean }[] = [];

    const attackerName = attacker?.name ?? "Attacker";
    const defenderName = defender?.name ?? "Defender";
    const attackStage = attacker?.stageModifiers?.[attackStat] ?? 0;
    const defenseStage = defender?.stageModifiers?.[defenseStat] ?? 0;
    const accuracyStage = attacker?.stageModifiers?.Accuracy ?? 0;
    const evasionStage = defender?.stageModifiers?.Evasion ?? 0;

    if (attackStage !== 0) {
      entries.push({
        key: "attack",
        label: `${attackerName} ${STAT_LABELS[attackStat] ?? attackStat}`,
        stage: attackStage,
        ignored: isCritical && attackStage < 0,
      });
    }

    if (defenseStage !== 0) {
      entries.push({
        key: "defense",
        label: `${defenderName} ${STAT_LABELS[defenseStat] ?? defenseStat}`,
        stage: defenseStage,
        ignored: isCritical && defenseStage > 0,
      });
    }

    if (accuracyStage !== 0) {
      entries.push({
        key: "accuracy",
        label: `${attackerName} Accuracy`,
        stage: accuracyStage,
      });
    }

    if (evasionStage !== 0) {
      entries.push({
        key: "evasion",
        label: `${defenderName} Evasion`,
        stage: evasionStage,
      });
    }

    return entries;
  }

  function formatHpChange(mon: any, damage: number) {
    const currentHP = Math.max(0, Math.round(mon?.totalStats?.HP ?? 0));
    const nextHP = Math.max(0, currentHP - Math.max(0, Math.round(damage || 0)));
    return `${currentHP} -> ${nextHP}`;
  }

  function calculateDamage(attacker: any, defender: any, moveTypeInner: string, crit: boolean) {
    const { attackStat: statKey, defenseStat: defKey } = getDamageStatKeys();

    const baseA = attacker?.totalStats?.[statKey] ?? 1;
    const baseD = defender?.totalStats?.[defKey] ?? 1;

    const stageA = attacker?.stageModifiers?.[statKey] ?? 0;
    const stageD = defender?.stageModifiers?.[defKey] ?? 0;

    const attackerStatus = attacker?.status?.name ?? null;
    const isAttack = statKey === "Attack";

    const A = getModifiedStat(baseA, stageA, crit, isAttack, attackerStatus, statKey, ignoreStatus);

    let D = getModifiedStat(baseD, stageD, crit, false, null, defKey, false);

    // ✅ Weather defensive boosts (Special Defense only)
    const spDefWeather = getWeatherSpDefMultiplier(activeWeather, defender?.types ?? [], isPhysical);
    D *= spDefWeather.mult;

    const level = attacker?.level ?? 1;

    let dmg = (((2 * (level / 5) + 2) * movePower * A) / (50 * D)) + 2;

    // STAB
    const stabApplied = Array.isArray(attacker?.types) && attacker.types.includes(moveTypeInner);
    if (stabApplied) dmg *= stabMultiplier;

    // ✅ Weather offensive boost/nerf (Rain/Sun)
    const weatherOff = getWeatherDamageMultiplier(activeWeather, moveTypeInner);
    dmg *= weatherOff.mult;

    // Effectiveness + scaling
    let eff: number;
    if (overrideEffectivity !== "Auto") {
      const overrideMap: Record<string, number> = {
        Immune: 0,
        QuadIneffective: 0.25,
        Ineffective: 0.5,
        Normal: 1,
        Super: 2,
        Quad: 4,
      };
      eff = overrideMap[overrideEffectivity] ?? 1;
    } else {
      eff = getTypeEffectiveness(moveTypeInner, defender?.types ?? [], activeWeather);
    }

    if (effectivityScaling === "Weak") {
      if (eff === 2) eff = 1.5;
      else if (eff === 0.5) eff = 0.75;
    }
    if (eff === 0) return 0;
    dmg *= eff;

    // Crit
    if (crit) dmg *= 2;

    // Defender status modifiers
    if (isDrowsy(defender)) dmg *= 1.5;

    return Math.max(1, Math.round(dmg));
  }

  const attacker = attackerIndex !== null ? safeCombatants[attackerIndex] : null;
  const attackerIsConfused = hasStatus(attacker, "Confused");
  const attackerIsBleeding = hasStatus(attacker, "Bleeding");

  const damageResults = defenderIndices.map((index) => {
    const defender = safeCombatants[index];
    if (!attacker || !defender) return { index, damage: 0 };
    const baseDamage = calculateDamage(attacker, defender, moveType, isCritical);
    const multiplier =
      defender?.isMinion && Number.isFinite(minionMultipliers[index])
        ? Math.max(1, Math.round(minionMultipliers[index]))
        : 1;
    return {
      index,
      damage: baseDamage === 0 ? 0 : Math.max(1, Math.round(baseDamage * multiplier)),
      multiplier,
    };
  });

  // ✅ Recoil = 1/3 of TOTAL damage dealt to defenders
  const totalDamageDealt = damageResults.reduce((sum, r) => sum + (r.damage || 0), 0);
  const recoilDamage =
    isRecoil && attackerIndex !== null && damageResults.length > 0
      ? Math.max(1, Math.round(totalDamageDealt / 3))
      : 0;

  const wrapperClass = embedded
    ? "w-full"
    : "fixed top-1/2 left-1/2 z-50 w-[32rem] max-w-[95vw] transform -translate-x-1/2 -translate-y-1/2";

  const weatherReminder = getWeatherEndTurnReminder(activeWeather);

  function formatHistoryLines() {
    const lines: string[] = [];
    const attackerName = attacker?.name ?? "Attacker";
    const moveName = `${moveType} ${isPhysical ? "Physical" : "Special"} (Power ${movePower})`;

    lines.push(`Attacker: ${attackerName}`);
    lines.push(`Move: ${moveName}`);

    if (attackerIsConfused) {
      lines.push(`Confused: ${attackerName} is confused.`);
    }
    if (attackerIsBleeding) {
      lines.push("Bleeding - Subtract HP for PP Spent");
    }
    if (damageResults.some(({ index }) => isDrowsy(safeCombatants[index]))) {
      lines.push("Drowsy: Defenders take +50% damage.");
    }
    if (weatherReminder) {
      lines.push(weatherReminder);
    }

    for (const { index, damage, multiplier } of damageResults) {
      const defender = safeCombatants[index];
      const defenderName = defender?.name ?? `#${index + 1}`;
      const eff = getTypeEffectiveness(moveType, defender?.types ?? [], activeWeather);

      const effMsg = getEffectivenessLabel(eff);

      const tags: string[] = [];
      if (effMsg) tags.push(effMsg);
      if (attacker && Array.isArray(attacker.types) && attacker.types.includes(moveType)) {
        tags.push("STAB");
      }
      if (isDrowsy(defender)) tags.push("Drowsy +50%");
      if (defender?.isMinion && multiplier && multiplier > 1) {
        tags.push(`${multiplier}x minion`);
      }

      const tagText = tags.length > 0 ? ` (${tags.join(", ")})` : "";
      lines.push(`${defenderName} takes ${damage} damage (${formatHpChange(defender, damage)})${tagText}.`);

      const stageEntries = getStageEntries(defender);
      if (stageEntries.length > 0) {
        lines.push(
          `Stage modifiers: ${stageEntries
            .map((entry) => `${entry.label} ${formatStageValue(entry.stage)}${entry.ignored ? " ignored by crit" : ""}`)
            .join(", ")}.`
        );
      }
    }

    if (isRecoil && attackerIndex !== null && damageResults.length > 0) {
      lines.push(`${attackerName} takes ${recoilDamage} recoil (1/3 of ${totalDamageDealt}).`);
    }

    return lines;
  }

  return (
    <div
      className={`${wrapperClass} bg-gray-900 text-white border border-gray-500 rounded p-4 max-h-[85vh] overflow-hidden ${modalAnimClass}`}
    >
      <div className="overflow-y-auto pr-2 max-h-[calc(85vh-2rem)]">
        {/* Attacker */}
        <div className="mb-2">
          <label className="block mb-1">Attacker:</label>
          <Select
            value={attackerIndex !== null ? String(attackerIndex) : ""}
            onValueChange={(val) => setAttackerIndex(parseInt(val, 10))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Attacker" />
            </SelectTrigger>
            <SelectContent>
              {safeCombatants.map((mon, idx) => {
                const name = mon?.name ?? `#${idx + 1}`;
                const ability = mon?.ability ? ` (${mon.ability})` : "";
                const item = mon?.item ? ` [${mon.item}]` : "";
                return (
                  <SelectItem key={idx} value={String(idx)}>
                    {`${name}${ability}${item}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Defenders */}
        <div className="mb-2">
          <label className="block mb-1">Defenders:</label>
          <div className="bg-gray-800 p-2 rounded-md max-h-40 overflow-y-auto">
            {safeCombatants.map((mon, idx) => {
              if (attackerIndex !== null && idx === attackerIndex) return null;

              return (
                <label key={idx} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    checked={defenderIndices.includes(idx)}
                    onChange={() => {
                      const willSelect = !defenderIndices.includes(idx);
                      setDefenderIndices((prev) =>
                        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                      );
                      if (mon?.isMinion) {
                        setMinionMultipliers((prev) => {
                          if (willSelect) {
                            return {
                              ...prev,
                              [idx]: Number.isFinite(prev[idx]) ? prev[idx] : 1,
                            };
                          }
                          const next = { ...prev };
                          delete next[idx];
                          return next;
                        });
                      }
                    }}
                  />
                  <span>
                    {mon?.name ?? `#${idx + 1}`}
                    {mon?.ability ? ` (${mon.ability})` : ""}
                    {mon?.item ? ` [${mon.item}]` : ""}
                  </span>
                  {mon?.isMinion && defenderIndices.includes(idx) && (
                    <span className="ml-auto flex items-center gap-2 text-xs text-gray-300">
                      <span>Minion Multiplier</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-16 text-center border rounded bg-gray-700 text-white"
                        value={minionMultipliers[idx] ?? 1}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          const safeValue = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
                          setMinionMultipliers((prev) => ({ ...prev, [idx]: safeValue }));
                        }}
                      />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Move Power */}
        <div className="mb-2">
          <label className="block mb-1">Move Power:</label>
          <input
            type="number"
            className="w-full text-center bg-gray-700 border rounded p-1"
            value={movePower}
            min={1}
            max={250}
            onChange={(e) =>
              setMovePower(Math.max(1, Math.min(250, parseInt(e.target.value, 10) || 1)))
            }
          />
        </div>

        {/* Category */}
        <div className="mb-2 flex justify-between items-center">
          <label>Category:</label>
          <Button onClick={() => setIsPhysical(!isPhysical)} className="bg-blue-500 hover:bg-blue-600">
            {isPhysical ? "Physical" : "Special"}
          </Button>
        </div>

        {/* Move Type */}
        <div className="mb-2">
          <label className="block mb-1">Move Type:</label>
          <Select value={moveType} onValueChange={(val) => setMoveType(val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Move Type" />
            </SelectTrigger>
            <SelectContent>
              {POKEMON_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Crit */}
        <div className="mb-4">
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={isCritical}
              onChange={() => setIsCritical(!isCritical)}
            />
            <span>Critical Hit (2×, ignore bad stage changes)</span>
          </label>
        </div>

        {/* Recoil */}
        <div className="mb-4">
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={isRecoil}
              onChange={() => setIsRecoil(!isRecoil)}
            />
            <span>Recoil (attacker takes 1/3 of total damage dealt)</span>
          </label>
        </div>

        {/* Advanced Settings */}
        <details className="mb-4 bg-gray-800 border border-gray-700 rounded p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-200">
            Advanced Settings
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <label className="text-gray-200">Effective Attacker Stat</label>
              <select
                className="bg-gray-700 text-white rounded px-2 py-1"
                value={effectiveAtkStat}
                onChange={(e) => setEffectiveAtkStat(e.target.value as any)}
              >
                <option value="Auto">Auto</option>
                <option value="Attack">Attack</option>
                <option value="SpecialAttack">Special Attack</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-gray-200">Effective Defender Stat</label>
              <select
                className="bg-gray-700 text-white rounded px-2 py-1"
                value={effectiveDefStat}
                onChange={(e) => setEffectiveDefStat(e.target.value as any)}
              >
                <option value="Auto">Auto</option>
                <option value="Defense">Defense</option>
                <option value="SpecialDefense">Special Defense</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-gray-200">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={ignoreStatus}
                onChange={() => setIgnoreStatus(!ignoreStatus)}
              />
              Ignore Status (Burn/Frostbite stat drops)
            </label>

            <div className="flex items-center justify-between gap-3">
              <label className="text-gray-200">Override Type Effectivity</label>
              <select
                className="bg-gray-700 text-white rounded px-2 py-1"
                value={overrideEffectivity}
                onChange={(e) => setOverrideEffectivity(e.target.value as any)}
              >
                <option value="Auto">Auto</option>
                <option value="Quad">Quad Effective</option>
                <option value="Super">Super Effective</option>
                <option value="Normal">Normal</option>
                <option value="Ineffective">Ineffective</option>
                <option value="QuadIneffective">Quad Ineffective</option>
                <option value="Immune">Immune</option>
              </select>
            </div>
          </div>
        </details>

        {/* Preview */}
        {damageResults.length > 0 && (
          <div className="mt-4 bg-gray-800 p-2 rounded">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-bold">Damage Preview</h3>
              <span className="text-xs text-gray-300">Weather: {getWeatherDisplay(activeWeather)}</span>
            </div>

            {weatherReminder && (
              <p className="text-xs text-gray-300 mb-2">{weatherReminder}</p>
            )}

            {attackerIsConfused && (
              <div className="mb-2 rounded border border-yellow-400/60 bg-yellow-500/10 px-2 py-1 text-yellow-200 text-sm">
                Confused: {attacker?.name ?? "Attacker"} is confused. Total damage to defenders:{" "}
                <span className="font-semibold text-yellow-100">{totalDamageDealt}</span>.
              </div>
            )}

            {attackerIsBleeding && (
              <div className="mb-2 rounded border border-red-400/60 bg-red-500/10 px-2 py-1 text-red-200 text-sm">
                Bleeding - Subtract HP for PP Spent
              </div>
            )}

            {damageResults.some(({ index }) => isDrowsy(safeCombatants[index])) && (
              <div className="mb-2 rounded border border-pink-400/60 bg-pink-500/10 px-2 py-1 text-pink-200 text-sm">
                Drowsy: Defenders take +50% damage.
              </div>
            )}

            {damageResults.map(({ index, damage, multiplier }) => {
              const defender = safeCombatants[index];

              const eff = getTypeEffectiveness(moveType, defender?.types ?? [], activeWeather);

              const stabApplied =
                attacker && Array.isArray(attacker.types) && attacker.types.includes(moveType);
              const attackerStatus = attacker?.status?.name ?? null;

              const effMsg = getEffectivenessBanner(eff, defender?.name);

              const weatherOff = getWeatherDamageMultiplier(activeWeather, moveType);
              const spDefWeather = getWeatherSpDefMultiplier(activeWeather, defender?.types ?? [], isPhysical);

              const weatherTags: string[] = [];
              if (weatherOff.note) weatherTags.push(weatherOff.note);
              if (spDefWeather.note) weatherTags.push(spDefWeather.note);

              if (
                activeWeather.type === "Strong Winds" &&
                (moveType === "Electric" || moveType === "Ice" || moveType === "Rock") &&
                Array.isArray(defender?.types) &&
                defender.types.includes("Flying")
              ) {
                weatherTags.push("Strong Winds made Flying neutral");
              }

              const stageEntries = getStageEntries(defender);

              return (
                <div key={index} className="mb-3 last:mb-1">
                  <p className="mb-1">
                  {defender?.name} takes{" "}
                  <span className="text-red-400 font-bold">{damage}</span> damage{" "}
                  <span className="text-gray-300">({formatHpChange(defender, damage)})</span>.{" "}
                  {effMsg && <span className="text-yellow-400 ml-1">{effMsg}</span>}
                  {stabApplied && <span className="text-blue-400 ml-1">(STAB)</span>}
                  {attackerStatus === "Burn" && isPhysical && (
                    <span className="text-orange-400 ml-1">(Burned – Attack halved)</span>
                  )}
                  {attackerStatus === "Frostbite" && !isPhysical && (
                    <span className="text-cyan-300 ml-1">(Frostbitten – Sp. Atk halved)</span>
                  )}
                  {isDrowsy(defender) && (
                    <span className="text-pink-400 ml-1">(Drowsy – +50% damage)</span>
                  )}
                  {defender?.isMinion && multiplier && multiplier > 1 && (
                    <span className="text-yellow-300 ml-1">({multiplier}x minion)</span>
                  )}
                  {weatherTags.length > 0 && (
                    <span className="text-emerald-300 ml-1">
                      ({weatherTags.join(", ")})
                    </span>
                  )}
                  </p>
                  {stageEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {stageEntries.map((entry) => (
                        <span
                          key={entry.key}
                          className={`rounded border px-1.5 py-0.5 ${getStageClass(entry.stage)}`}
                        >
                          {entry.label} {formatStageValue(entry.stage)}
                          {entry.ignored ? " (ignored by crit)" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Recoil preview line */}
            {isRecoil && attackerIndex !== null && (
              <p className="mt-2">
                {safeCombatants[attackerIndex]?.name} takes{" "}
                <span className="text-red-400 font-bold">{recoilDamage}</span> recoil damage{" "}
                <span className="text-gray-300">(1/3 of {totalDamageDealt} total)</span>.
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-4 flex justify-between">
          <Button
            onClick={() => {
              const resultsToApply = [...damageResults];

              // Apply recoil to the attacker
              if (isRecoil && attackerIndex !== null && damageResults.length > 0) {
                resultsToApply.push({ index: attackerIndex, damage: recoilDamage });
              }

              applyDamage(resultsToApply);
              onFlashDamage(resultsToApply.map((r) => r.index));
              if (onLogHistory && damageResults.length > 0) {
                onLogHistory({
                  title: "Damage Calculator",
                  lines: formatHistoryLines(),
                });
              }
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            Apply Damage
          </Button>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

