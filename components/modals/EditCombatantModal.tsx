import React, { useState, useEffect } from "react";
import MoveDetailsModal from "./MoveDetailsModal";
import { useAllMoves } from "@/lib/useAllMoves";
import { useMoveDetails } from "@/lib/useMoveDetails";
import { Button } from "@/components/ui/button";
import computeDerivedStats from "@/lib/computeDerivedStats";
import DamageCalculatorModal, { WeatherState } from "@/components/modals/DamageCalculatorModal";
import { useAllAbilities } from "@/lib/useAllAbilities";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useModalAnimation } from "./useModalAnimation";
import { useAllNatures } from "@/lib/useAllNatures";
import { applyNatureToBaseStats, buildNatureMap } from "@/lib/natureUtils";
import POKEMON_DATA from "@/data/pokemon_stats_genV.json";

interface Trainer {
  id: string;
  name: string;
  notionId?: string | null;
}

interface EditCombatantModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatant: any;
  onConfirm: (updatedCombatant: any) => void;
  onDuplicate?: (duplicateCombatant: any) => void;
  trainers: Trainer[];
  onAddTrainer: (name: string) => string;
  context?: "combatant" | "noncombatant";
  mode?: "add" | "edit";

  // ✅ NEW
  combatants: any[];
  applyDamage: (damageResults: { index: number; damage: number }[]) => void;
  stabMultiplier: number;
  effectivityScaling: string;
  onFlashDamage: (indices: number[]) => void;
  onLogHistory?: (entry: { title: string; lines: string[] }) => void;
  weather?: WeatherState;
}


export default function EditCombatantModal({
  isOpen,
  onClose,
  combatant,
  onConfirm,
  onDuplicate,
  trainers,
  onAddTrainer,
  context = "combatant",
  mode = "edit",

  // ✅ ADD THESE
  combatants,
  applyDamage,
  stabMultiplier,
  effectivityScaling,
  onFlashDamage,
  onLogHistory,
  weather,
}: EditCombatantModalProps) {
  const contextLabel = context === "noncombatant" ? "Noncombatant" : "Combatant";
  const formatHeightImperial = (heightMeters?: number | null) => {
    if (typeof heightMeters !== "number" || !Number.isFinite(heightMeters) || heightMeters <= 0) {
      return null;
    }

    const totalInches = heightMeters * 39.3701;
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round(totalInches - feet * 12);

    if (inches === 12) {
      feet += 1;
      inches = 0;
    }

    return `${feet} ft ${inches} in`;
  };

const formatWeightImperial = (weightKg?: number | null) => {
    if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) {
      return null;
    }

    const pounds = weightKg * 2.20462;
    return `${pounds.toFixed(1)} lb`;
  };

  const toggleMinion = (checked: boolean) => {
    setIsMinion(checked);
    if (checked) setIsBoss(false);
  };
  
  const toggleBoss = (checked: boolean) => {
    setIsBoss(checked);
    if (checked) setIsMinion(false);
  };

  const POKEMON_TYPES = [
    "Normal","Fire","Water","Electric","Grass","Ice","Fighting",
    "Poison","Ground","Flying","Psychic","Bug","Rock","Ghost",
    "Dragon","Dark","Steel","Shadow",
  ];



  const [name, setName] = useState("");
  const [level, setLevel] = useState(5);
  const defaultBaseStats = {
    baseHP: 10,
    baseSpeed: 10,
    baseAttack: 10,
    baseDefense: 10,
    baseSpAttack: 10,
    baseSpDefense: 10,
  };
  const [baseStats, setBaseStats] = useState(defaultBaseStats);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [customTrainerName, setCustomTrainerName] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [abilityName, setAbilityName] = useState<string>("");
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [itemName, setItemName] = useState<string>("");
  const [natureName, setNatureName] = useState<string>("");
  const [natureSearch, setNatureSearch] = useState("");
  const [natureOpen, setNatureOpen] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [speciesSearch, setSpeciesSearch] = useState("");

  const [isMinion, setIsMinion] = useState<boolean>(combatant?.isMinion ?? false);
  const [isBoss, setIsBoss] = useState<boolean>(combatant?.isBoss ?? false);


  const [combatantMoves, setCombatantMoves] = useState<string[]>([]);
  const [moveSearch, setMoveSearch] = useState("");

  const { moves: allMoves, loading: movesLoading } = useAllMoves();
  const { fetchMove } = useMoveDetails();
  const { abilities, loading: abilitiesLoading } = useAllAbilities();
  const { natures, loading: naturesLoading } = useAllNatures();

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedMoveDetails, setSelectedMoveDetails] = useState<any | null>(null);

  // ✅ Only show split view AFTER user clicks button
  const [showMoveDamageCalc, setShowMoveDamageCalc] = useState(false);

  // Filtered move list
  const filteredMoves =
    movesLoading || moveSearch.trim() === ""
      ? []
      : allMoves.filter((m: any) =>
          m.name &&
          m.name.trim().toLowerCase().includes(moveSearch.trim().toLowerCase())
        );

  const handleSpeciesSelect = (species: string) => {
    setSelectedSpecies(species);
    setSpeciesSearch(species);

    const data = (POKEMON_DATA as any[]).find((p) => p.name === species);
    if (!data) return;

    setName(species);
    setSelectedTypes(data.types || []);
    setBaseStats({
      baseHP: data.baseStats.baseHP * 10,
      baseAttack: data.baseStats.baseAttack * 10,
      baseDefense: data.baseStats.baseDefense * 10,
      baseSpAttack: data.baseStats.baseSpAttack * 10,
      baseSpDefense: data.baseStats.baseSpDefense * 10,
      baseSpeed: data.baseStats.baseSpeed * 10,
    });
  };

  async function openMoveDetails(moveName: string) {
    setMoveModalOpen(true);
    setShowMoveDamageCalc(false); // ✅ start NOT split
    setSelectedMoveDetails(null);

    try {
      const details = await fetchMove(moveName);
      setSelectedMoveDetails(details);
      setShowMoveDamageCalc(details?.category?.trim().toLowerCase() !== "status");
    } catch (e) {
      console.error("Error fetching move:", e);
    }
  }

  function addMoveToCombatant(moveName: string) {
    setCombatantMoves((prev) => (prev.includes(moveName) ? prev : [...prev, moveName]));
    setMoveSearch("");
  }

  useEffect(() => {
    if (combatant) {
      setName(combatant.name);
      setLevel(combatant.level);
      setBaseStats(combatant.baseStats ?? defaultBaseStats);
      setSelectedTypes(combatant.types || []);
      setTrainerId(combatant.trainerId ?? null);
      const trainerName =
        trainers.find((t) => t.id === combatant.trainerId)?.name ?? "";
      setTrainerSearch(trainerName);
      setCombatantMoves(combatant.moves ?? []);
      setIsMinion(combatant.isMinion ?? false);
      setIsBoss(combatant.isBoss ?? false);
      const abilityText = typeof combatant.ability === "string" ? combatant.ability : "";
      setAbilityName(abilityText);
      setAbilitySearch(abilityText);
      const itemText = typeof combatant.item === "string" ? combatant.item : "";
      setItemName(itemText);
      const natureText = typeof combatant.nature === "string" ? combatant.nature : "";
      setNatureName(natureText);
      setNatureSearch(natureText);

    }
  }, [combatant, trainers]);

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const isTrainerValid =
    trainerId !== null &&
    trainerId !== "" &&
    (trainerId !== "new" || customTrainerName.trim() !== "");

  const isNameValid = name.trim() !== "";
  const isTypeValid = selectedTypes.length > 0;
  const isValid = isNameValid && isTrainerValid && isTypeValid;

  const buildUpdatedCombatant = (options?: { clearSecondaryStatuses?: boolean }) => {
    const natureAdjusted = applyNatureToBaseStats(
      baseStats,
      natureName || null,
      natureMap
    );
    const updatedTotalStats = computeDerivedStats({ level, ...natureAdjusted });
    const recalculatedPP = level + 15;

    let maxHP = updatedTotalStats.maxHP;

// Apply modifiers (Boss ×2, Minion ×3)
if (isBoss) maxHP = maxHP * 2;
if (isMinion) maxHP = maxHP * 3;

// Keep current HP but clamp to new max (always full HP on add)
const isAddMode = mode === "add";
const priorHP = isAddMode ? maxHP : combatant?.totalStats?.HP ?? maxHP;
const newHP = Math.min(priorHP, maxHP);

    const secondaryStatuses = options?.clearSecondaryStatuses ? [] : combatant?.secondaryStatuses;

    return {
      ...combatant,
      isMinion,
      isBoss,
      name: name.trim(),
      level,
      baseStats,
      types: selectedTypes,
      trainerId,
      secondaryStatuses,
      moves: combatantMoves,
      ability: abilityName || null,
      item: itemName.trim() || null,
      nature: natureName || null,
      totalStats: {
        ...updatedTotalStats,
        maxHP,
        HP: newHP,
        PP: recalculatedPP,
        maxPP: recalculatedPP,
      },
    };
  };

  const handleSave = () => {
    onConfirm(buildUpdatedCombatant({ clearSecondaryStatuses: true }));
    onClose();
  };

  const handleDuplicate = () => {
    if (!onDuplicate) return;
    const duplicatedCombatant = buildUpdatedCombatant({ clearSecondaryStatuses: false });
    delete duplicatedCombatant.id;
    delete duplicatedCombatant.uid;
    onDuplicate(duplicatedCombatant);

    onClose();
  };

  const handleTrainerSelect = (id: string, name: string) => {
    setTrainerId(id);
    setCustomTrainerName("");
    setTrainerSearch(name);
    setTrainerOpen(false);
  };

  const handleConfirmTrainer = () => {
    if (customTrainerName.trim()) {
      const newId = onAddTrainer(customTrainerName.trim());
      setTrainerId(newId);
      setTrainerSearch(customTrainerName.trim());
    }
  };

  const abilitySearchValue = abilitySearch || "";
  const abilityMatches =
    abilitySearchValue.length >= 2 && !abilitiesLoading && Array.isArray(abilities)
      ? abilities.filter((a: any) =>
          a.name.toLowerCase().includes(abilitySearchValue.toLowerCase())
        )
      : [];
  const natureMap = buildNatureMap(Array.isArray(natures) ? natures : []);
  const natureSearchValue = natureSearch || "";
  const natureMatches =
    natureSearchValue.length >= 1 && !naturesLoading && Array.isArray(natures)
      ? natures.filter((n: any) =>
          n.name.toLowerCase().includes(natureSearchValue.toLowerCase())
        )
      : [];

  const trainerSearchValue = trainerSearch || "";
  const trainerMatches = trainers.filter((t) =>
    t.name.toLowerCase().includes(trainerSearchValue.toLowerCase())
  );

  return (
    <>
      <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] z-50 max-h-[85vh] overflow-hidden ${modalAnimClass}`}>
        <h2 className="text-lg font-bold mb-4">
          {mode === "add" ? "Add" : "Edit"} {contextLabel}
        </h2>

        <div className="grid grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto pr-2">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {mode === "add" && (
              <div>
                <label className="block mb-1">Species:</label>
                <div className="bg-gray-800 rounded">
                  <Command>
                    <CommandInput
                      placeholder="Search Pokémon..."
                      className="w-full p-2 bg-gray-700 text-white border-none rounded"
                      value={speciesSearch}
                      onValueChange={(val) => setSpeciesSearch(val)}
                    />
                  <CommandList className="max-h-24 overflow-y-auto">
                      {speciesSearch.length >= 3 &&
                        speciesSearch !== selectedSpecies &&
                        (POKEMON_DATA as any[])
                          .filter((p) => p.name.toLowerCase().includes(speciesSearch.toLowerCase()))
                          .map((p) => (
                            <CommandItem
                              key={p.name}
                              value={p.name}
                              onSelect={(val) => handleSpeciesSelect(val)}
                              className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                            >
                              {p.name}
                            </CommandItem>
                          ))}
                    </CommandList>
                  </Command>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block mb-1">
                Name: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full bg-gray-700 text-white p-1 rounded text-center"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {!isNameValid && <p className="text-red-500 text-sm">A name is required.</p>}
            </div>

            {/* Ability + Item */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">Ability:</label>
                <div className="bg-gray-800 rounded">
                  <Command>
                    <CommandInput
                      placeholder="Search abilities..."
                      className="w-full p-2 bg-gray-700 text-white border-none rounded"
                      value={abilitySearchValue}
                      onValueChange={(val) => {
                        setAbilitySearch(val);
                        setAbilityName(val);
                      }}
                      onFocus={() => setAbilityOpen(true)}
                      onBlur={() => setTimeout(() => setAbilityOpen(false), 150)}
                    />
                    <CommandList className={`max-h-24 overflow-y-auto ${abilityOpen ? "" : "hidden"}`}>
                      {abilityMatches.map((a: any) => (
                        <CommandItem
                          key={a.name}
                          value={a.name}
                          onSelect={(val) => {
                            setAbilityName(val);
                            setAbilitySearch(val);
                          }}
                          className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                        >
                          {a.name}
                          {a.category ? ` (${a.category})` : ""}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </div>
              </div>

              <div>
                <label className="block mb-1">Item:</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 text-white p-1 rounded text-center"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Leftovers"
                />
              </div>
            </div>

            {/* Trainer */}
            <div>
              <label className="block mb-1">
                Trainer: <span className="text-red-500">*</span>
              </label>
              <div className="bg-gray-800 rounded">
                <Command>
                  <CommandInput
                    placeholder="Search trainers..."
                    className="w-full p-2 bg-gray-700 text-white border-none rounded"
                    value={trainerSearchValue}
                    onValueChange={(val) => {
                      setTrainerSearch(val);
                      setTrainerOpen(true);
                    }}
                    onFocus={() => setTrainerOpen(true)}
                    onBlur={() => setTimeout(() => setTrainerOpen(false), 150)}
                  />
                  <CommandList className={`max-h-24 overflow-y-auto ${trainerOpen ? "" : "hidden"}`}>
                    <CommandItem
                      value="new-trainer"
                      onSelect={() => {
                        const trimmed = trainerSearchValue.trim();
                        setTrainerId("new");
                        setCustomTrainerName(trimmed);
                        setTrainerSearch(trimmed);
                        setTrainerOpen(false);
                      }}
                      className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                    >
                      Add new...
                    </CommandItem>
                    {trainerMatches.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() => handleTrainerSelect(t.id, t.name)}
                        className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                      >
                        {t.name}
                      </CommandItem>
                    ))}
                    {trainerMatches.length === 0 && trainerSearchValue.trim() !== "" && (
                      <div className="px-2 py-1 text-sm text-gray-400">No results.</div>
                    )}
                  </CommandList>
                </Command>
              </div>

              {trainerId === "new" && (
                <input
                  type="text"
                  placeholder="New trainer name"
                  className="w-full bg-gray-700 text-white border rounded p-1 mt-2"
                  value={customTrainerName}
                  onChange={(e) => setCustomTrainerName(e.target.value)}
                  onBlur={handleConfirmTrainer}
                />
              )}
            </div>

            {/* Level + Minion/Boss + Height/Weight (compact) */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-gray-200">Level:</span>
                <input
                  type="number"
                  className="w-16 bg-gray-700 text-white p-1 rounded text-center"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                />
              </div>
              {(formatHeightImperial(combatant?.height) ||
                formatWeightImperial(combatant?.weight)) && (
                <div className="flex flex-wrap items-center gap-3">
                  {formatHeightImperial(combatant?.height) && (
                    <span>
                      <span className="font-semibold text-gray-200">Height:</span>{" "}
                      {formatHeightImperial(combatant?.height)}
                    </span>
                  )}
                  {formatWeightImperial(combatant?.weight) && (
                    <span>
                      <span className="font-semibold text-gray-200">Weight:</span>{" "}
                      {formatWeightImperial(combatant?.weight)}
                    </span>
                  )}
                </div>
              )}

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isMinion}
                  onChange={(e) => toggleMinion(e.target.checked)}
                />
                <span>Minion (HP x3)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isBoss}
                  onChange={(e) => toggleBoss(e.target.checked)}
                />
                <span>Boss (HP x2)</span>
              </label>
            </div>

            <div className="hidden">
            {/* Height / Weight (imperial) */}
            {(formatHeightImperial(combatant?.height) || formatWeightImperial(combatant?.weight)) && (
              <div className="text-sm text-gray-300 space-y-1">
                {formatHeightImperial(combatant?.height) && (
                  <div>
                    <span className="font-semibold text-gray-200">Height:</span>{" "}
                    {formatHeightImperial(combatant?.height)}
                  </div>
                )}
                {formatWeightImperial(combatant?.weight) && (
                  <div>
                    <span className="font-semibold text-gray-200">Weight:</span>{" "}
                    {formatWeightImperial(combatant?.weight)}
                  </div>
                )}
              </div>
            )}

            {/* Minion */}
            <label className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                checked={isMinion}
                onChange={(e) => toggleMinion(e.target.checked)}

              />
              <span>Minion Group (pooled health ×3)</span>
            </label>

{/* Boss */}
<label className="flex items-center space-x-2 mt-2">
  <input
    type="checkbox"
    checked={isBoss}
    onChange={(e) => toggleBoss(e.target.checked)}

  />
  <span>Boss Pokémon (max HP ×2)</span>
</label>
            </div>


            {/* Base Stats */}
            <details className="bg-gray-800 border border-gray-700 rounded p-3" open={false}>
              <summary className="cursor-pointer text-sm font-semibold text-gray-200">
                Stats
              </summary>
              <div className="mt-3">
                <label className="block mb-1 text-sm text-gray-200">Nature:</label>
                <div className="bg-gray-700 rounded">
                  <Command>
                    <CommandInput
                      placeholder="Search natures..."
                      className="w-full p-2 bg-gray-700 text-white border-none rounded"
                      value={natureSearchValue}
                      onValueChange={(val) => {
                        setNatureSearch(val);
                        setNatureName(val);
                      }}
                      onFocus={() => setNatureOpen(true)}
                      onBlur={() => setTimeout(() => setNatureOpen(false), 150)}
                    />
                    <CommandList className={`max-h-24 overflow-y-auto ${natureOpen ? "" : "hidden"}`}>
                      {natureMatches.map((n: any) => (
                        <CommandItem
                          key={n.name}
                          value={n.name}
                          onSelect={(val) => {
                            setNatureName(val);
                            setNatureSearch(val);
                          }}
                          className="cursor-pointer px-2 py-1 hover:bg-gray-600"
                        >
                          {n.name}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(baseStats ?? defaultBaseStats).map(([stat, value]) => (
                  <label key={stat} className="flex justify-between items-center">
                    <span>{stat.replace("base", "Base ")}:</span>
                    <input
                      type="number"
                      className="ml-2 w-20 bg-gray-700 text-white p-1 rounded"
                      value={value as number}
                      onChange={(e) =>
                        setBaseStats((prev) => ({
                          ...prev,
                          [stat]: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </details>

            {mode !== "add" && (
              <details className="bg-gray-800 border border-gray-700 rounded p-3" open={false}>
                <summary className="cursor-pointer text-sm font-semibold text-gray-200">
                  Types
                </summary>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  {POKEMON_TYPES.map((type) => {
                    const checked = selectedTypes.includes(type);
                    return (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextChecked = e.target.checked;
                            setSelectedTypes((prev) =>
                              nextChecked ? [...prev, type] : prev.filter((t) => t !== type)
                            );
                          }}
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Move Search */}
            <div>
              <h3 className="text-lg font-bold text-yellow-300 mb-2">Add Move</h3>

              <div className="bg-gray-800 rounded p-2 border border-gray-700">
                <input
                  type="text"
                  placeholder="Search moves..."
                  value={moveSearch}
                  onChange={(e) => setMoveSearch(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded mb-2"
                />

                <div className="max-h-40 overflow-y-auto">
                  {moveSearch.trim() !== "" &&
                    filteredMoves.map((m: any, idx: number) => (
                      <button
                        key={idx}
                        className="w-full text-left px-2 py-1 hover:bg-gray-600 rounded text-white"
                        onClick={() => addMoveToCombatant(m.name)}
                      >
                        {m.name}
                      </button>
                    ))}

                  {moveSearch.trim() !== "" && filteredMoves.length === 0 && (
                    <p className="text-gray-400 italic px-2">No results.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Moves Known */}
            <div>
              <h3 className="text-lg font-bold text-yellow-300 mb-2">Moves Known</h3>

              {combatantMoves.length > 0 ? (
                <ul className="space-y-2">
                  {combatantMoves.map((moveName, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700"
                    >
                      <span>{moveName}</span>

                      <div className="flex space-x-2">
                        <Button
                          className="bg-blue-700 hover:bg-blue-600 text-xs px-2 py-1"
                          onClick={() => openMoveDetails(moveName)}
                        >
                          View
                        </Button>

                        <Button
                          className="bg-red-700 hover:bg-red-600 text-xs px-2 py-1"
                          onClick={() =>
                            setCombatantMoves((prev) => prev.filter((m) => m !== moveName))
                          }
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic">No moves assigned.</p>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between mt-6">
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {onDuplicate && (
              <Button
                onClick={handleDuplicate}
                className={`bg-blue-500 hover:bg-blue-600 ${
                  !isValid ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!isValid}
              >
                Duplicate
              </Button>
            )}
            <Button
              onClick={handleSave}
              className={`bg-green-500 hover:bg-green-600 ${
                !isValid ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!isValid}
            >
              {mode === "add" ? "Add" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <MoveDetailsModal
  isOpen={moveModalOpen}
  onClose={() => {
    setMoveModalOpen(false);
    setShowMoveDamageCalc(false);
  }}
  move={selectedMoveDetails}
  showDamageCalcButton={true}
  onOpenDamageCalc={() => setShowMoveDamageCalc(true)}
  // ✅ only render a right panel when actually opened
  childrenRight={
    showMoveDamageCalc ? (
      <div className="h-full">
        <DamageCalculatorModal
          isOpen={true}
          onClose={() => setShowMoveDamageCalc(false)}
          combatants={combatants}                 // ✅ all combatants (fixes defenders list)
          applyDamage={applyDamage}
          stabMultiplier={stabMultiplier}
          effectivityScaling={effectivityScaling}
          onFlashDamage={onFlashDamage}
          defaultAttackerName={combatant?.name ?? null}
          defaultMoveType={selectedMoveDetails?.type ?? null}
          defaultMoveCategory={selectedMoveDetails?.category ?? null}
          weather={weather}
          onLogHistory={onLogHistory}
          embedded={true}                         // ✅ render inside right panel, not centered modal
        />
      </div>
    ) : null
  }
/>

    </>
  );
}






