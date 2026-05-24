"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import EditCombatantModal from "../modals/EditCombatantModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPE_ICON_MAP } from "@/lib/typeicons";
import { Pencil, Trash } from "lucide-react";

export default function NoncombatantDrawer(props: any) {
  const {
    drawerState = "closed",
    setDrawerState = () => {},
    noncombatants = [],
    combatants = [],
    addNoncombatant,
    editNoncombatant,
    removeNoncombatant,
    updateNoncombatantStatus,
    updateNoncombatantHP,
    updateNoncombatantPP,
    addCombatant,
    trainers = [],
    onAddTrainer,
    onUpdateTrainerNotionId = () => {},
    onSyncFromNotion = async () => {},
    onRenameTrainer = () => {},
    onDeleteTrainer = () => {},
    onPurgeUnassignedPokemon = () => {},
    onOpenAddTrainer = () => {},
    getTrainerNameById = () => "—",
    applyDamage,
    stabMultiplier,
    effectivityScaling,
    onFlashDamage,
    onLogHistory,
    weather,
    swappingCombatantIndex = null,
    handleSwap = () => {},
  } = props;

  const swappingTrainerId =
    swappingCombatantIndex !== null
      ? combatants[swappingCombatantIndex]?.trainerId
      : null;

  const visibleNoncombatants =
    swappingTrainerId !== null
      ? noncombatants.filter((mon: any) => mon.trainerId === swappingTrainerId)
      : noncombatants;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNoncombatant, setEditingNoncombatant] = useState<any | null>(null);
  const [trainerFilter, setTrainerFilter] = useState("");
  const lastTrainerFilterRef = useRef("");
  const trainerFilterRef = useRef(trainerFilter);
  const wasSwappingRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [renamingTrainerId, setRenamingTrainerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const lastCollapsedRef = useRef<Record<string, boolean> | null>(null);

  const anyNoncombatantHasStatus = noncombatants?.some((mon: any) => mon.status) ?? false;

  const filteredNoncombatants = useMemo(() => {
    const filterValue = trainerFilter.trim().toLowerCase();
    if (!filterValue) return visibleNoncombatants;

    return visibleNoncombatants.filter((mon: any) => {
      const trainerName =
        typeof getTrainerNameById === "function"
          ? getTrainerNameById(mon.trainerId)
          : mon.trainerId ?? "â€”";
      return String(trainerName ?? "").toLowerCase().includes(filterValue);
    });
  }, [visibleNoncombatants, trainerFilter, getTrainerNameById]);

  useEffect(() => {
    trainerFilterRef.current = trainerFilter;
  }, [trainerFilter]);

  // ✅ Group by trainer (include trainers with zero mons)
  const grouped = useMemo(() => {
    const map = new Map<string, { trainerId: string | null; trainerName: string; mons: any[] }>();

    const showEmptyTrainers = trainerFilter.trim() === "" && swappingTrainerId === null;

    if (showEmptyTrainers) {
      for (const t of trainers) {
        if (!t?.id || !t?.name) continue;
        map.set(t.id, { trainerId: t.id, trainerName: t.name, mons: [] });
      }
    }

    for (const mon of filteredNoncombatants) {
      const trainerId = mon.trainerId ?? null;
      const trainerName =
        typeof getTrainerNameById === "function"
          ? getTrainerNameById(trainerId)
          : trainerId ?? "—";

      const key = trainerId ?? trainerName;
      if (!map.has(String(key))) {
        map.set(String(key), { trainerId: trainerId ?? null, trainerName: trainerName || "—", mons: [] });
      }
      const entry = map.get(String(key)) as { trainerId: string | null; trainerName: string; mons: any[] };
      entry.mons.push(mon);
    }

    const entries = Array.from(map.values()).sort((a, b) => {
      if (a.trainerName === "—") return 1;
      if (b.trainerName === "—") return -1;
      return a.trainerName.localeCompare(b.trainerName);
    });

    for (const entry of entries) {
      entry.mons.sort((m1, m2) => String(m1.name ?? "").localeCompare(String(m2.name ?? "")));
    }

    return entries; // [ { trainerId, trainerName, mons }, ... ]
  }, [filteredNoncombatants, getTrainerNameById, trainers, trainerFilter, swappingTrainerId]);

  const groupKeysSig = useMemo(
    () => grouped.map((g) => g.trainerId ?? g.trainerName).join("|"),
    [grouped]
  );

  useEffect(() => {
    if (swappingTrainerId && !wasSwappingRef.current) {
      lastTrainerFilterRef.current = trainerFilterRef.current;
      const trainerName =
        typeof getTrainerNameById === "function"
          ? getTrainerNameById(swappingTrainerId)
          : swappingTrainerId;
      setTrainerFilter(String(trainerName ?? "").trim());
      lastCollapsedRef.current = collapsed;
      setCollapsed((prev) => {
        const next: Record<string, boolean> = { ...prev };
        for (const g of grouped) {
          const key = g.trainerId ?? g.trainerName;
          next[key] = key !== swappingTrainerId;
        }
        return next;
      });
    } else if (!swappingTrainerId && wasSwappingRef.current) {
      setTrainerFilter(lastTrainerFilterRef.current || "");
      if (lastCollapsedRef.current) {
        setCollapsed(lastCollapsedRef.current);
      }
    }
    wasSwappingRef.current = !!swappingTrainerId;
  }, [swappingTrainerId, getTrainerNameById, grouped, collapsed]);
  


  // When the group list changes (e.g. swap mode filter), default all to expanded
  // When the group list changes (e.g. swap mode filter), default missing groups to expanded.
// Guarded so it doesn't trigger an infinite render loop.
  useEffect(() => {
    setCollapsed((prev) => {
      const names = grouped.map((g) => g.trainerId ?? g.trainerName);
      const nameSet = new Set(names);

    let changed = false;
    const next: Record<string, boolean> = { ...prev };

    // Add missing keys (default expanded = false)
    for (const name of names) {
      if (next[name] === undefined) {
        next[name] = false;
        changed = true;
      }
    }

    // Remove keys that no longer exist
    for (const k of Object.keys(next)) {
      if (!nameSet.has(k)) {
        delete next[k];
        changed = true;
      }
    }

    return changed ? next : prev;
  });
}, [groupKeysSig]);

  useEffect(() => {
    if (drawerState !== "closed") return;
    setCollapsed((prev) => {
      let changed = false;
      const next: Record<string, boolean> = { ...prev };
      for (const g of grouped) {
        const key = g.trainerId ?? g.trainerName;
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [drawerState, grouped]);

  const toggleGroup = (groupKey: string) => {
    setCollapsed((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  async function handleSync() {
    setSyncError(null);
    setSyncing(true);
    try {
      await onSyncFromNotion();
    } catch (err: any) {
      setSyncError(err?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const allCollapsed =
    grouped.length > 0 &&
    grouped.every((g) => collapsed[g.trainerId ?? g.trainerName]);

  const toggleAllGroups = () => {
    const nextValue = !allCollapsed;
    setCollapsed((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of grouped) {
        const key = g.trainerId ?? g.trainerName;
        next[key] = nextValue;
      }
      return next;
    });
  };

  // ✅ We still need the original idx because your update/remove functions use array index
  const getGlobalIndex = (mon: any) => {
    // Prefer stable id if you have one
    if (mon?.uid) {
      const byUid = noncombatants.findIndex((m: any) => m?.uid === mon.uid);
      if (byUid !== -1) return byUid;
    }
    if (mon?.id) {
      const byId = noncombatants.findIndex((m: any) => m?.id === mon.id);
      if (byId !== -1) return byId;
    }
  
    // Fallback: match by (trainerId + name + level) which is usually unique enough for now
    return noncombatants.findIndex((m: any) =>
      (m?.trainerId ?? null) === (mon?.trainerId ?? null) &&
      String(m?.name ?? "") === String(mon?.name ?? "") &&
      Number(m?.level ?? 0) === Number(mon?.level ?? 0)
    );
  };

  const getStableKey = (mon: any) =>
    String(
      mon?.uid ??
        mon?.notionId ??
        mon?.id ??
        `${mon?.trainerId ?? "none"}:${mon?.name ?? "unknown"}:${mon?.level ?? 0}`
    );

  const emptyNoncombatant = {
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
  

  // For proper colSpan across both drawer modes
  const colCountFull = 7 + (anyNoncombatantHasStatus ? 1 : 0); // Trainer+Name+HP+PP+Status+Remove+Add (+ optional Turns)
  const colCountPreview = 3; // Trainer + Name + Add

  return (
    <div
      className={`fixed top-0 left-0 z-50 h-screen bg-gray-900 border-r border-gray-500 transition-all duration-300 ${
        drawerState === "closed" ? "w-12" : drawerState === "preview" ? "w-80" : "w-screen"
      } overflow-hidden`}
    >
      {/* Drawer Toggle Buttons */}
      <div
        className="fixed top-1/2 transform -translate-y-1/2 z-50 flex items-center transition-all duration-300"
        style={{
          left:
            drawerState === "closed"
              ? "10px"
              : drawerState === "preview"
              ? "calc(20rem - 28px)"
              : "calc(100vw - 40px)",
        }}
      >
        {drawerState === "preview" ? (
          <>
            <button
              onClick={() => {
                setDrawerState("closed");
                if (typeof props.setSwappingCombatantIndex === "function") {
                  props.setSwappingCombatantIndex(null);
                }
              }}
              className="p-2 text-white bg-gray-700 rounded-l-full shadow-lg"
            >
              ❮
            </button>
            <button
              onClick={() => setDrawerState("full")}
              className="p-2 text-white bg-gray-700 rounded-r-full shadow-lg"
            >
              ❯
            </button>
          </>
        ) : (
          <button
            onClick={() => setDrawerState("preview")}
            className="p-2 text-white bg-gray-700 rounded-full shadow-lg"
          >
            {drawerState === "closed" ? "❯" : "❮"}
          </button>
        )}
      </div>

      {drawerState !== "closed" && (
        // ✅ Scrollable drawer content
        <div className="p-4 text-white h-full overflow-y-auto">
          <h2 className="text-lg font-bold">Noncombatants</h2>

          <Button
            onClick={() => setShowAddModal(true)}
            className="mt-2 w-full bg-green-500 hover:bg-green-600"
          >
            + Add Noncombatant
          </Button>
          <Button
            onClick={onOpenAddTrainer}
            className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700"
          >
            + Add Trainer
          </Button>
          <Button
            onClick={handleSync}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync From Notion"}
          </Button>
          <Button
            onClick={() => {
              const ok = confirm("Purge all Pokémon without a trainer?");
              if (!ok) return;
              onPurgeUnassignedPokemon();
            }}
            className="mt-2 w-full bg-red-700 hover:bg-red-800"
          >
            Purge Unassigned Pokémon
          </Button>
          {syncError && <div className="mt-1 text-xs text-red-300">{syncError}</div>}
          <input
            type="text"
            className="mt-2 w-full p-2 bg-gray-800 text-white border border-gray-600 rounded"
            placeholder="Filter by trainer..."
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-2 w-32 text-left">
                    <button
                      type="button"
                      onClick={toggleAllGroups}
                      className="inline-flex items-center gap-2"
                      title={allCollapsed ? "Expand all trainers" : "Collapse all trainers"}
                    >
                      <span>{allCollapsed ? ">" : "v"}</span>
                      <span>Trainer</span>
                    </button>
                  </th>
                  <th className="p-2 w-32 text-left">Name</th>
                  {drawerState === "full" && (
                    <>
                      <th className="p-2 w-20 text-center">HP</th>
                      <th className="p-2 w-20 text-center">PP</th>
                      <th className="p-2 w-24 text-center">Status</th>
                      {anyNoncombatantHasStatus && (
                        <th className="p-2 w-16 text-center">Turns</th>
                      )}
                      <th className="p-2 w-16 text-center">Remove</th>
                    </>
                  )}
                  <th className="p-2 w-16 text-center">Add</th>
                </tr>
              </thead>

              <tbody>
                {grouped.map((group) => {
                  const trainerName = group.trainerName;
                  const trainerId = group.trainerId;
                  const mons = group.mons;
                  const isCollapsed = !!collapsed[trainerId ?? trainerName];

                  return (
                    <React.Fragment key={trainerId ?? trainerName}>
                      {/* Group header row */}
                      <tr className="bg-gray-800">
                        <td
                          colSpan={drawerState === "full" ? colCountFull : colCountPreview}
                          className="p-2"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleGroup(trainerId ?? trainerName)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleGroup(trainerId ?? trainerName);
                              }
                            }}
                            className="w-full flex items-center justify-between cursor-pointer"
                            title={isCollapsed ? "Expand group" : "Collapse group"}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-200">
                                {isCollapsed ? "▸" : "▾"}
                              </span>
                              {renamingTrainerId === trainerId ? (
                                <input
                                  type="text"
                                  className="w-40 bg-gray-700 text-white border border-gray-600 rounded px-2 py-0.5 text-xs"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="font-bold text-yellow-200">
                                  {trainerName}
                                </span>
                              )}
                              <span className="text-xs text-gray-300">
                                ({mons.length})
                              </span>
                            </div>

                            <div
                              className="flex items-center gap-2 text-xs text-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-gray-400">
                                {isCollapsed ? "Show" : "Hide"}
                              </span>
                              {drawerState === "full" && (
                                <>
                                  {renamingTrainerId === trainerId ? (
                                    <>
                                      <button
                                        className="px-2 py-0.5 rounded bg-green-700 text-white"
                                        onClick={() => {
                                          const trainerRecord = trainers.find(
                                            (t: any) => t.id === trainerId
                                          );
                                          if (!trainerRecord) return;
                                          const nextName = renameValue.trim();
                                          if (!nextName) return;
                                          onRenameTrainer(trainerRecord.id, nextName);
                                          setRenamingTrainerId(null);
                                          setRenameValue("");
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="px-2 py-0.5 rounded bg-gray-700 text-white"
                                        onClick={() => {
                                          setRenamingTrainerId(null);
                                          setRenameValue("");
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="px-2 py-0.5 rounded bg-blue-700 text-white"
                                        onClick={() => {
                                          const trainerRecord = trainers.find(
                                            (t: any) => t.id === trainerId
                                          );
                                          if (!trainerRecord) return;
                                          setRenamingTrainerId(trainerRecord.id);
                                          setRenameValue(trainerRecord.name ?? "");
                                        }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        className="px-2 py-0.5 rounded bg-red-700 text-white"
                                        onClick={() => {
                                          const trainerRecord = trainers.find(
                                            (t: any) => t.id === trainerId
                                          );
                                          if (!trainerRecord) return;
                                          const ok = confirm(
                                            `Delete trainer "${trainerRecord.name}"?`
                                          );
                                          if (!ok) return;
                                          onDeleteTrainer(trainerRecord.id);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                  <span className="text-gray-400">Notion ID</span>
                                  <input
                                    type="text"
                                    className="w-56 bg-gray-700 text-white border border-gray-600 rounded px-2 py-0.5 text-xs"
                                    value={
                                      trainers.find((t: any) => t.id === trainerId)?.notionId ?? ""
                                    }
                                    onChange={(e) => {
                                      const trainerRecord = trainers.find(
                                        (t: any) => t.id === trainerId
                                      );
                                      if (!trainerRecord) return;
                                      onUpdateTrainerNotionId(trainerRecord.id, e.target.value);
                                    }}
                                    placeholder="Notion Trainer ID"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {!isCollapsed &&
                        mons.map((mon: any, localIdx: number) => {
                          const idx = getGlobalIndex(mon);

                          const maxHP = mon.totalStats.maxHP ?? 0;
                          const maxPP = mon.totalStats.maxPP ?? (mon.level * 5 + 10);
                          const hp = mon.totalStats.HP ?? maxHP;
                          const pp = mon.totalStats.PP ?? maxPP;

                          return (
                            <tr key={`${getStableKey(mon)}:${idx}:${localIdx}`} className="border-b">
                              <td className="p-2 text-left">{trainerName}</td>

                              <td className="p-2 text-white">
                                <div className="flex items-start space-x-2">
                                  <button
                                    onClick={() => setEditingNoncombatant(mon)}
                                    className="mt-0.5 text-blue-400 hover:text-blue-600"
                                    title="Edit"
                                  >
                                    <Pencil size={16} />
                                  </button>

                                  <div className="flex flex-col items-start">
                                    <span>{mon.name}</span>

                                    <div className="mt-1 flex items-center gap-2">
                                      {mon.ability && (
                                        <span className="text-xs text-gray-300 underline">
                                          {mon.ability}
                                        </span>
                                      )}

                                      {drawerState === "full" && (
                                        <div className="flex space-x-1">
                                          {mon.types?.map((type: string) => (
                                            <Image
                                              key={type}
                                              src={TYPE_ICON_MAP[type] || "/type_icons/NormalIC_FRLG.png"}
                                              alt={type}
                                              width={20}
                                              height={20}
                                              className="inline-block"
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {drawerState === "full" && (
                                <>
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <input
                                        type="number"
                                        className="w-16 text-center border rounded bg-gray-700 text-white"
                                        value={Number(mon?.totalStats?.HP ?? 0)}
                                        onChange={(e) => {
                                          const parsed = parseInt(e.target.value, 10);
                                          const safeHP = isNaN(parsed) ? 0 : parsed;
                                          const max = Number(mon?.totalStats?.maxHP ?? 0);
                                          updateNoncombatantHP(idx, Math.max(0, Math.min(safeHP, max)));
                                        }}
                                      />
                                      <span className="text-gray-400">
                                        / {maxHP}
                                        {mon.isMinion && (
                                          <span className="text-yellow-400 ml-1">
                                            ({Math.max(
                                              1,
                                              Math.ceil((mon.totalStats.HP / mon.totalStats.maxHP) * 4)
                                            )}{" "}
                                            minions)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <input
                                        type="number"
                                        className="w-16 text-center border rounded bg-gray-700 text-white"
                                        value={Number(pp)}
                                        onChange={(e) => {
                                          const parsed = parseInt(e.target.value, 10);
                                          const safePP = isNaN(parsed) ? 0 : parsed;
                                          updateNoncombatantPP(idx, Math.max(0, Math.min(safePP, maxPP)));
                                        }}
                                      />
                                      <span className="text-gray-400">/ {maxPP}</span>
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    <Select
                                      value={mon.status?.name ?? "None"}
                                      onValueChange={(value) =>
                                        updateNoncombatantStatus(idx, value, mon.status?.turns ?? 3)
                                      }
                                    >
                                      <SelectTrigger className="w-24 mx-auto text-center text-white">
                                        <SelectValue placeholder="Status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="None">None</SelectItem>
                                        {["Burn", "Frostbite", "Paralysis", "Poison", "Drowsy"].map((s) => (
                                          <SelectItem key={s} value={s}>
                                            {s}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>

                                  {anyNoncombatantHasStatus && (
                                    <td className="p-2 text-center">
                                      {mon.status && (
                                        <input
                                          type="number"
                                          className="w-16 text-center border rounded bg-gray-700 text-white"
                                          value={mon.status.turns}
                                          onChange={(e) => {
                                            const parsed = parseInt(e.target.value, 10);
                                            if (isNaN(parsed) || parsed <= 0) {
                                              updateNoncombatantStatus(idx, "None", 0);
                                            } else {
                                              updateNoncombatantStatus(idx, mon.status.name, parsed);
                                            }
                                          }}
                                        />
                                      )}
                                    </td>
                                  )}

                                  <td className="p-2 text-center">
                                    <button
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => removeNoncombatant(idx)}
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </td>
                                </>
                              )}

                              <td className="p-2 text-center">
                                {typeof props.swappingCombatantIndex === "number" ? (
                                  <Button onClick={() => props.handleSwap(mon)}>
                                    Swap
                                  </Button>
                                ) : (
                                  <Button
  onClick={() => {
    addCombatant(mon);

    const globalIdx = getGlobalIndex(mon);
    if (globalIdx >= 0) {
      removeNoncombatant(globalIdx);
    } else {
      console.warn("Could not find noncombatant to remove after adding:", mon);
    }
  }}
  disabled={hp === 0}
>
  Add
</Button>

                                )}
                                
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modals */}
          {showAddModal && (
            <EditCombatantModal
              isOpen={true}
              onClose={() => setShowAddModal(false)}
              combatant={emptyNoncombatant}
              context="noncombatant"
              mode="add"
              onConfirm={(newMon: any) => {
                addNoncombatant({
                  ...newMon,
                  status: newMon?.status ?? null,
                });
                setShowAddModal(false);
              }}
              trainers={trainers}
              onAddTrainer={onAddTrainer}
              combatants={combatants}
              applyDamage={applyDamage}
              stabMultiplier={stabMultiplier}
              effectivityScaling={effectivityScaling}
              onFlashDamage={onFlashDamage}
              weather={weather}
              onLogHistory={onLogHistory}
            />
          )}

          {editingNoncombatant && (
            <EditCombatantModal
              isOpen={true}
              onClose={() => setEditingNoncombatant(null)}
              combatant={editingNoncombatant}
              context="noncombatant"
              onConfirm={(updatedMon: any) => {
                editNoncombatant(updatedMon);
                setEditingNoncombatant(null);
              }}
              onDuplicate={(duplicateMon: any) => {
                addNoncombatant(duplicateMon);
                setEditingNoncombatant(null);
              }}
              trainers={trainers}
              onAddTrainer={onAddTrainer}
              combatants={combatants}
              applyDamage={applyDamage}
              stabMultiplier={stabMultiplier}
              effectivityScaling={effectivityScaling}
              onFlashDamage={onFlashDamage}
              weather={weather}
              onLogHistory={onLogHistory}
            />
          )}
        </div>
      )}
    </div>
  );
}


