import React from "react";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TYPE_ICON_MAP } from "@/lib/typeicons";
import { Trash, ArrowLeftRight, ArrowUp, ArrowDown } from "lucide-react";
import { BadgePlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function calculateDisplayStat(combatant: any, stat: string) {
  const stage = combatant.stageModifiers?.[stat] ?? 0;

  if (stat === "Accuracy" || stat === "Evasion") {
    if (stage === 0) {
      return { displayValue: "--", colorClass: "text-white" };
    } else {
      const colorClass = stage > 0 ? "text-green-400" : "text-red-400";
      const stageText = stage > 0 ? `+${stage}` : `${stage}`;
      return { displayValue: `(${stageText})`, colorClass };
    }
  }

  const baseVal = combatant.totalStats?.[stat] || 0;
  let modifiedVal = Math.floor(
    baseVal * (stage > 0 ? (2 + stage) / 2 : 2 / (2 - stage))
  );
  if (stat === "Speed" && combatant.status?.name === "Paralysis") {
    modifiedVal = Math.floor(modifiedVal / 2);
  }

  let colorClass = "text-white";
  if (stage > 0) colorClass = "text-green-400";
  if (stage < 0) colorClass = "text-red-400";

  let stageText = "";
  if (stage !== 0) {
    stageText = stage > 0 ? `(+${stage})` : `(${stage})`;
  }

  return {
    displayValue: `${modifiedVal}${stageText ? " " + stageText : ""}`,
    colorClass,
  };
}




// NEW: numeric version for comparisons (uses stage-modified stat)
function getModifiedStatValue(combatant: any, stat: string): number {
  const stage = combatant.stageModifiers?.[stat] ?? 0;
  const baseVal = combatant.totalStats?.[stat] ?? 0;

  // Accuracy/Evasion not part of the comparison set; but keep safe anyway:
  if (stat === "Accuracy" || stat === "Evasion") return baseVal;

  let modifiedVal = Math.floor(
    baseVal * (stage > 0 ? (2 + stage) / 2 : 2 / (2 - stage))
  );
  if (stat === "Speed" && combatant.status?.name === "Paralysis") {
    modifiedVal = Math.floor(modifiedVal / 2);
  }
  return modifiedVal;
}

// NEW: determines whether Speed is max/min among combat stats (ties count)
function getSpeedArrowKind(combatant: any): "up" | "down" | "none" {
  const stats = ["Speed", "Attack", "Defense", "SpecialAttack", "SpecialDefense"] as const;
  const values = stats.map((s) => getModifiedStatValue(combatant, s));
  const speedVal = values[0];
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  const isMax = speedVal === maxVal;
  const isMin = speedVal === minVal;

  // If all stats are equal, show nothing
  if (isMax && isMin) return "none";

  if (isMax) return "up";
  if (isMin) return "down";
  return "none";
}


interface CombatantsTableProps {
  combatants: any[];
  activeIndex: number;
  turnsTakenThisRound: number[];
  inCombat: boolean;
  onOpenAbilityDetails?: (abilityName: string) => void;
  setRemoveIndex: (index: number | null) => void;
  setSelectedStat: (stat: string | null) => void;
  setSelectedCombatantName: (name: string | null) => void;
  updateHP: (index: number, newHP: number) => void;
  updatePP: (index: number, newPP: number) => void;
  handleStatusChange: (index: number, status: string, turns: number) => void;
  updateSecondaryStatuses: (index: number, newStatuses: { name: string; turns?: number }[]) => void;
  setDamageTargetIndex: (index: number | null) => void;
  setEditingCombatantIndex: (index: number | null) => void;
  isDrawerOpen: boolean;
  swappingCombatantIndex: number | null;
  setSwappingCombatantIndex: (index: number | null) => void;
  setDrawerState: React.Dispatch<React.SetStateAction<"closed" | "preview" | "full">>;
  openStatusModal: (index: number) => void;
  damageFlashIndices: number[];
}




const STATUS_EFFECTS = ["Burn", "Frostbite", "Paralysis", "Poison", "Drowsy", "Badly Poisoned"];
const STATUS_COLORS: Record<string, string> = {
  Burn: "border-red-500",
  Frostbite: "border-blue-500",
  Paralysis: "border-yellow-500",
  Poison: "border-purple-500",
  Drowsy: "border-gray-500",
  "Badly Poisoned": "border-pink-500",
};
const SECONDARY_STATUSES = [
  "Confused",
  "Cursed",
  "Embargoed",
  "Flinched",
  "Identified",
  "Immobilized",
  "Infatuated",
  "Slowed",
  "Trapped",
  "Grabbed",
  "Bleeding",
  "Frightened",
];
const VOLATILE_STATUS_ICONS: Record<string, string> = {
  Confused: "💫",
  Cursed: "☠️",
  Embargoed: "🚫",
  Flinched: "😖",
  Identified: "🔍",
  Immobilized: "⛓️",
  Infatuated: "❤️",
  Slowed: "🐢",
  Trapped: "🪤",
  Grabbed: "🤜",
  Bleeding: "🩸",
  Frightened: "😱",
};

const CombatantsTable: React.FC<CombatantsTableProps> = ({
  combatants,
  activeIndex,
  turnsTakenThisRound,
  inCombat,
  onOpenAbilityDetails,
  setRemoveIndex,
  setSelectedStat,
  setSelectedCombatantName,
  updateHP,
  updatePP,
  handleStatusChange,
  updateSecondaryStatuses,
  setDamageTargetIndex,
  setEditingCombatantIndex,
  isDrawerOpen,
  setSwappingCombatantIndex,
  setDrawerState,
  swappingCombatantIndex,
  openStatusModal,
  damageFlashIndices
}) => {
  const anyCombatantHasStatus = combatants.some((c) => !!c.status);


  const speedCounts = React.useMemo(() => {
    const counts = new Map<number, number>();
  
    for (const c of combatants) {
      const speed = getModifiedStatValue(c, "Speed");
      counts.set(speed, (counts.get(speed) ?? 0) + 1);
    }
  
    return counts;
  }, [combatants]);
  

  return (
    <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
      <thead>
        <tr className="bg-black text-white">
          <th className="p-2">Name</th>
          <th className="p-2">HP</th>
          <th className="p-2">PP</th>
          <th className="p-2">Speed</th>
          <th className="p-2">Attack</th>
          <th className="p-2">Defense</th>
          <th className="p-2">Sp. Attack</th>
          <th className="p-2">Sp. Defense</th>
          <th className="p-2">Accuracy</th>
          <th className="p-2">Evasion</th>
          <th className="p-2">Status</th>
          {anyCombatantHasStatus && <th className="p-2">Turns</th>}
          <th className="p-2">Volatile</th>
          <th className="p-2">Swap</th>
          <th className="p-2">Remove</th>
        </tr>
      </thead>

      <tbody>
        {combatants.map((combatant, idx) => {
          return (
            <tr
              key={combatant?.uid ?? idx}
              className={`text-center border-4 ${
                combatant.status
                  ? STATUS_COLORS[combatant.status.name] || "border-transparent"
                  : "border-transparent"
              }`}
            >
              {/* Name */}
              <td
                className={`p-2 font-bold flex items-center space-x-2 text-white ${
                  idx === activeIndex ? "relative z-10" : ""
                }`}
              >
                {inCombat && (
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-gray-500"
                    checked={turnsTakenThisRound.includes(idx)}
                    readOnly
                    title="Taken turn"
                  />
                )}
                <div className="flex flex-col items-start">
                  <div className="flex items-center space-x-2">
                    {/* Name is clickable to edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCombatantIndex(idx);
                      }}
                      className={`text-left cursor-pointer hover:underline ${
                        idx === activeIndex && !isDrawerOpen ? "animate-pulse text-yellow-500" : ""
                      }`}
                      title="Edit combatant"
                    >
                      {combatant.priority === 1 && (
                        <span className="text-yellow-300 text-lg mr-1" title="Priority Move">
                          ⚡
                        </span>
                      )}
                      {combatant.isBoss && (
                        <span className="text-red-300 text-lg mr-1" title="Boss Pokémon (max HP ×2)">
                          👑
                        </span>
                      )}
                      {combatant.name}
                    </button>

                    {/* Keep direct-damage targeting accessible (since name click is now edit) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDamageTargetIndex(idx);
                      }}
                      className="text-xs text-red-300 hover:text-red-100"
                      title="Direct damage…"
                    >
                      🎯
                    </button>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    {combatant.ability && (
                      <button
                        type="button"
                        className="text-xs text-gray-300 hover:text-gray-200 underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAbilityDetails?.(combatant.ability);
                        }}
                        title="View ability details"
                      >
                        {combatant.ability}
                      </button>
                    )}
                    {combatant.item && (
                      <span className="text-xs text-amber-300">
                        [{combatant.item}]
                      </span>
                    )}

                    <div className="flex space-x-1">
                      {combatant.types.map((type: string) => (
                        <Image
                          key={type}
                          src={TYPE_ICON_MAP[type] || "/type_icons/NormalIC_FRLG.png"}
                          alt={type}
                          width={24}
                          height={24}
                          className="inline-block"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </td>

              {/* HP */}
              <td className="p-2">
                <div className="flex items-center space-x-2 justify-center">
                  <input
                    type="number"
                    className={`w-16 text-center border rounded text-white transition-colors duration-500 ${
                      damageFlashIndices.includes(idx) ? "bg-red-500" : "bg-gray-700"
                    }`}
                    value={combatant.totalStats.HP ?? 0}
                    onChange={(e) => {
                      let newHP = parseInt(e.target.value) || 0;
                      newHP = Math.min(999, Math.min(newHP, combatant.totalStats.maxHP ?? 0));
                      updateHP(idx, newHP);
                    }}
                    onBlur={(e) => {
                      let trimmedHP = Math.min(parseInt(e.target.value, 10) || 0, combatant.totalStats.maxHP ?? 0);
                      updateHP(idx, trimmedHP);
                    }}
                  />

{(() => {
  const hp = combatant.totalStats.HP ?? 0;
  const max = combatant.totalStats.maxHP ?? 1;
  const pct = Math.max(0, Math.min(100, Math.round((hp / max) * 100)));

  // Color rules:
  // - red at 20% and under
  // - yellow at 21-50%
  // - otherwise default (boss tint if boss, else gray)
  const pctClass =
  pct <= 20
    ? "text-red-300 font-semibold"
    : pct <= 50
    ? "text-yellow-200 font-semibold"
    : "text-gray-400";

      

  return (
    <span className={pctClass}>
      / {combatant.totalStats.maxHP ?? 0} ({pct}%)
      {combatant.isMinion && (() => {
        const ratio = hp / max;

        let minions = 0;
        if (ratio > 0.75) minions = 4;
        else if (ratio > 0.5) minions = 3;
        else if (ratio > 0.25) minions = 2;
        else if (ratio > 0) minions = 1;

        return (
          <span className="ml-1 text-yellow-300 italic">
            ({minions} minion{minions !== 1 ? "s" : ""})
          </span>
        );
      })()}
    </span>
  );
})()}


                </div>
              </td>

              {/* PP */}
              <td className="p-2">
                <div className="flex items-center space-x-2 justify-center">
                  <input
                    type="number"
                    className="w-16 text-center border rounded text-white bg-gray-700"
                    value={combatant.totalStats.PP ?? 0}
                    onChange={(e) => {
                      let newPP = parseInt(e.target.value) || 0;
                      newPP = Math.min(newPP, combatant.totalStats.maxPP ?? 0);
                      updatePP(idx, newPP);
                    }}
                    onBlur={(e) => {
                      let trimmedPP = Math.min(parseInt(e.target.value, 10) || 0, combatant.totalStats.maxPP ?? 0);
                      updatePP(idx, trimmedPP);
                    }}
                  />
                  <span className="text-gray-400">/ {combatant.totalStats.maxPP ?? 0}</span>
                </div>
              </td>

              {/* Other Stats */}
              {["Speed", "Attack", "Defense", "SpecialAttack", "SpecialDefense", "Accuracy", "Evasion"].map((stat) => {
                const { displayValue, colorClass } = calculateDisplayStat(combatant, stat);

                // NEW: arrow only on Speed cell
                const arrowKind = stat === "Speed" ? getSpeedArrowKind(combatant) : "none";

                return (
                  <td
  key={stat}
  className={`p-2 cursor-pointer ${colorClass} ${
    stat === "Speed" &&
    (speedCounts.get(getModifiedStatValue(combatant, "Speed")) ?? 0) > 1
      ? "ring-1 ring-yellow-400/40"
      : ""
  }`}
                    onClick={() => {
                      setSelectedStat(stat);
                      setSelectedCombatantName(combatant?.name ?? null);
                    }}
                  >
                    {stat === "Speed" ? (() => {
  const speedVal = getModifiedStatValue(combatant, "Speed");
  const isTied = (speedCounts.get(speedVal) ?? 0) > 1;

  return (
    <span className="inline-flex items-center justify-center gap-1">
      {arrowKind === "up" && <ArrowUp size={14} />}
      {arrowKind === "down" && <ArrowDown size={14} />}

      <span>{displayValue}</span>

      {isTied && (
        <span
          className="ml-1 inline-flex items-center rounded px-1.5 py-0.5
                     text-[10px] font-bold
                     bg-yellow-500/20 text-yellow-200
                     border border-yellow-400/40"
          title="Speed tie"
        >
          TIE
        </span>
      )}
    </span>
  );
})() : (
  displayValue
)}

                  </td>
                );
              })}

              {/* Status */}
              <td className="p-2">
                <Select
                  value={combatant.status ? combatant.status.name : "None"}
                  onValueChange={(value) =>
                    handleStatusChange(idx, value, combatant.status?.turns ?? 1)
                  }
                >
                  <SelectTrigger className="w-24 mx-auto text-center text-white bg-gray-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    {STATUS_EFFECTS.map((effect) => (
                      <SelectItem key={effect} value={effect}>
                        {effect}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>

              {/* Turns */}
              {anyCombatantHasStatus && (
                <td className="p-2">
                  {combatant.status && (
                    <input
                      type="number"
                      className="w-16 text-center border rounded text-white bg-gray-700"
                      value={combatant.status.turns}
                      onChange={(e) => {
                        const turns = parseInt(e.target.value) || 0;
                        if (turns <= 0) {
                          handleStatusChange(idx, "None", 0);
                        } else {
                          handleStatusChange(idx, combatant.status.name, turns);
                        }
                      }}
                    />
                  )}
                </td>
              )}

              {/* Secondary Statuses (Volatile) */}
              <td className="p-2">
                <div className="flex flex-wrap justify-center gap-1 items-center">
                  {combatant.secondaryStatuses?.map((status: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center px-2 py-1 bg-purple-700 text-white text-xs rounded shadow cursor-pointer hover:bg-purple-600"
                      title={`${status.name} (${status.turns ?? "∞"} turn${status.turns === 1 ? "" : "s"})`}
                      onClick={() => openStatusModal(idx)}
                    >
                      <span className="mr-1">{VOLATILE_STATUS_ICONS[status.name] || "❓"}</span>
                      <span>{status.turns ?? "-"}</span>
                    </div>
                  ))}

                  <button
                    onClick={() => openStatusModal(idx)}
                    className="ml-1 px-1 py-0.5 text-xs text-green-300 bg-green-800 rounded hover:bg-green-700"
                    title="Add/Manage"
                  >
                    +
                  </button>
                </div>
              </td>

              {/* Swapping */}
              <td className="p-2 text-center">
                <button
                  onClick={() => {
                    if (swappingCombatantIndex === idx) {
                      setSwappingCombatantIndex(null);
                      setDrawerState("closed");
                    } else {
                      setSwappingCombatantIndex(idx);
                      setDrawerState("preview");
                    }
                  }}
                  className={`
                    ml-2 p-2 rounded-full border border-yellow-400
                    text-yellow-400 hover:bg-yellow-500/20 transition
                    ${swappingCombatantIndex === idx ? "animate-pulse ring-2 ring-yellow-400" : ""}
                  `}
                  title="Swap Pokémon"
                >
                  <ArrowLeftRight size={16} className="text-yellow-400" />
                </button>
              </td>

              {/* Remove */}
              <td className="p-2">
                <button className="text-red-500 hover:text-red-700" onClick={() => setRemoveIndex(idx)}>
                  <Trash size={16} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default CombatantsTable;
