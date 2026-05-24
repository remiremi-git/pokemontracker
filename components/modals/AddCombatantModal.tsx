import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import computeDerivedStats from "@/lib/computeDerivedStats";
import POKEMON_DATA from "@/data/pokemon_stats_genV.json";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAllAbilities } from "@/lib/useAllAbilities";
import { useAllNatures } from "@/lib/useAllNatures";
import { applyNatureToBaseStats, buildNatureMap } from "@/lib/natureUtils";
import { useModalAnimation } from "./useModalAnimation";

interface Trainer {
  id: string;
  name: string;
  notionId?: string | null;
}

interface AddCombatantModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: "combatant" | "noncombatant";
  onConfirm: (combatantData: {
    name: string;
    level: number;
    baseStats: {
      baseHP: number;
      baseSpeed: number;
      baseAttack: number;
      baseDefense: number;
      baseSpAttack: number;
      baseSpDefense: number;
    };
    types: string[];
    totalStats: any;
    trainerId?: string;
    isMinion?: boolean;
    isBoss?: boolean;
    secondaryStatuses: [];
    height?: number | null;
    weight?: number | null;
    ability?: string | null;
    item?: string | null;
    nature?: string | null;
  }) => void;
  trainers: Trainer[];
  onAddTrainer: (name: string) => string;
}

export default function AddCombatantModal({
  isOpen,
  onClose,
  context = "combatant",
  onConfirm,
  trainers,
  onAddTrainer,
}: AddCombatantModalProps) {
  const contextLabel = context === "noncombatant" ? "Noncombatant" : "Combatant";
  const [name, setName] = useState("");
  const [level, setLevel] = useState(5);
  const [baseHP, setBaseHP] = useState(10);
  const [baseSpeed, setBaseSpeed] = useState(10);
  const [baseAttack, setBaseAttack] = useState(10);
  const [baseDefense, setBaseDefense] = useState(10);
  const [baseSpAttack, setBaseSpAttack] = useState(10);
  const [baseSpDefense, setBaseSpDefense] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [customTrainerName, setCustomTrainerName] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [trainerOpen, setTrainerOpen] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [isMinion, setIsMinion] = useState(false);
  const [heightMeters, setHeightMeters] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [abilityName, setAbilityName] = useState<string>("");
  const { abilities, loading: abilitiesLoading } = useAllAbilities();
  const { natures, loading: naturesLoading } = useAllNatures();
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [itemName, setItemName] = useState<string>("");
  const [natureName, setNatureName] = useState<string>("");
  const [natureSearch, setNatureSearch] = useState("");
  const [natureOpen, setNatureOpen] = useState(false);


  const handleSpeciesSelect = (species: string) => {
    setSelectedSpecies(species);
    setSearchTerm(""); // ✅ Clear input, which hides the dropdown
  
    const data = POKEMON_DATA.find((p) => p.name === species);
    if (!data) return;
  
    setName(species);
    setSelectedTypes(data.types || []);
    setBaseHP(data.baseStats.baseHP*10);
    setBaseAttack(data.baseStats.baseAttack*10);
    setBaseDefense(data.baseStats.baseDefense*10);
    setBaseSpAttack(data.baseStats.baseSpAttack*10);
    setBaseSpDefense(data.baseStats.baseSpDefense*10);
    setBaseSpeed(data.baseStats.baseSpeed*10);
    setHeightMeters(typeof data.height === "number" ? data.height : null);
    setWeightKg(typeof data.weight === "number" ? data.weight : null);
  };
   // ✅ This closing brace was missing!
  
  const [searchTerm, setSearchTerm] = useState("");

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

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const handleAdd = () => {
    const baseStats = {
      baseHP, baseSpeed, baseAttack, baseDefense, baseSpAttack, baseSpDefense,
    };
    const natureAdjusted = applyNatureToBaseStats(
      baseStats,
      natureName || null,
      natureMap
    );

    // First compute normal stats
    const totalStats = computeDerivedStats({ level, ...natureAdjusted });
  
    // Apply the minion HP multiplier
    const finalStats = {
      ...totalStats,
      maxHP: isMinion ? totalStats.maxHP * 3 : totalStats.maxHP,
      HP: isMinion ? totalStats.maxHP * 3 : totalStats.HP,
    };
  
    onConfirm({
      name: name.trim() || "Unknown",
      level,
      baseStats,
      types: selectedTypes,
      totalStats: finalStats,
      trainerId: trainerId ?? undefined,
      isMinion,                 // ⭐ NEW FLAG
      secondaryStatuses: [],
      height: heightMeters,
      weight: weightKg,
      ability: abilityName || null,
      item: itemName.trim() || null,
      nature: natureName || null,
    });
  
    onClose();
  };
  

  const isTrainerValid =
  trainerId !== null && trainerId !== "" && (trainerId !== "new" || customTrainerName.trim() !== "");

const isNameValid = name.trim() !== "";

const isTypeValid = selectedTypes.length > 0;


const isValid = isNameValid && isTrainerValid && isTypeValid;




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

  const trainerSearchValue = trainerSearch || "";
  const trainerMatches = trainers.filter((t) =>
    t.name.toLowerCase().includes(trainerSearchValue.toLowerCase())
  );

  return (
    <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] max-h-[85vh] overflow-hidden ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-3">Add {contextLabel}</h2>

      <div className="grid grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto pr-2">
        {/* LEFT COLUMN */}
        <div className="space-y-3">
          {/* Species Autocomplete */}
          <div>
            <label className="block mb-1">Species:</label>
            <div className="bg-gray-800 rounded">
              <Command>
                <CommandInput
                  placeholder="Search Pokémon..."
                  className="w-full p-2 bg-gray-700 text-white border-none rounded"
                  onValueChange={(val) => setSearchTerm(val)}
                />
                <CommandList className="max-h-24 overflow-y-auto">
                  {searchTerm.length >= 3 &&
                    POKEMON_DATA.filter((p) =>
                      p.name.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((p) => (
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

          {/* Name */}
          <div>
            <label className="block mb-1">Name: <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full text-center bg-gray-700 border rounded p-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {name.trim() === "" && <p className="text-red-500 text-sm">A name is required.</p>}
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
                className="w-full text-center bg-gray-700 border rounded p-1"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Leftovers"
              />
            </div>
          </div>

          {/* Trainer */}
          <div>
            <label className="block mb-1">Trainer: <span className="text-red-500">*</span></label>
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
            {(!trainerId || (trainerId === "new" && customTrainerName.trim() === "")) && (
              <p className="text-red-500 text-sm mt-1">A trainer must be selected or entered.</p>
            )}
          </div>

          {/* Level + Minion */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-gray-200">Level:</span>
              <input
                type="number"
                className="w-16 p-1 bg-gray-700 text-white text-center"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
              />
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isMinion}
                onChange={(e) => setIsMinion(e.target.checked)}
              />
              <span>Minion Group (pooled health ×3)</span>
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-3">
          <details className="bg-gray-800 border border-gray-700 rounded p-3" open={false}>
            <summary className="cursor-pointer text-sm font-semibold text-gray-200">
              Stats
            </summary>
            <div className="mt-3">
              <label className="block mb-1 text-sm text-gray-200">Nature:</label>
              <div className="bg-gray-800 rounded mb-2">
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

            <div className="grid grid-cols-2 gap-2">
              {[{ label: "Base HP", value: baseHP, setter: setBaseHP },
                { label: "Base Speed", value: baseSpeed, setter: setBaseSpeed },
                { label: "Base Attack", value: baseAttack, setter: setBaseAttack },
                { label: "Base Defense", value: baseDefense, setter: setBaseDefense },
                { label: "Base Sp. Atk", value: baseSpAttack, setter: setBaseSpAttack },
                { label: "Base Sp. Def", value: baseSpDefense, setter: setBaseSpDefense },
              ].map(({ label, value, setter }) => (
                <label key={label} className="flex justify-between items-center">
                  <span className="text-sm">{label}:</span>
                  <input
                    type="number"
                    className="ml-2 w-20 p-1 bg-gray-700 text-white"
                    value={value}
                    onChange={(e) => setter(parseFloat(e.target.value) || 1)}
                  />
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-between mt-4">
        <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
          Cancel
        </Button>
        <Button
  onClick={handleAdd}
  className={`bg-green-500 hover:bg-green-600 ${!isValid ? "opacity-50 cursor-not-allowed" : ""}`}
  disabled={!isValid}
>
  Add
</Button>


      </div>
    </div>
  );
}


