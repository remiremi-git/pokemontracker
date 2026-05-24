import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import computeDerivedStats from "@/lib/computeDerivedStats";
import { TYPE_ICON_MAP } from "@/lib/typeicons";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useModalAnimation } from "./useModalAnimation";

interface Trainer {
  id: string;
  name: string;
  color?: string;
  notionId?: string | null;
}

interface EditNoncombatantModalProps {
  isOpen: boolean;
  onClose: () => void;
  noncombatant: any;
  onConfirm: (updatedNoncombatant: any) => void;
  trainers: Trainer[];
  onAddTrainer: (name: string) => string;
}

export default function EditNoncombatantModal({
  isOpen,
  onClose,
  noncombatant,
  onConfirm,
  trainers,
  onAddTrainer,
}: EditNoncombatantModalProps) {
  const [name, setName] = useState("");
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [customTrainerName, setCustomTrainerName] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [trainerOpen, setTrainerOpen] = useState(false);

  const [isMinion, setIsMinion] = useState(noncombatant?.isMinion ?? false);

  const [level, setLevel] = useState(5);
  const [baseHP, setBaseHP] = useState(10);
  const [baseSpeed, setBaseSpeed] = useState(10);
  const [baseAttack, setBaseAttack] = useState(10);
  const [baseDefense, setBaseDefense] = useState(10);
  const [baseSpAttack, setBaseSpAttack] = useState(10);
  const [baseSpDefense, setBaseSpDefense] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const POKEMON_TYPES = [
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
    "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
    "Dragon", "Dark", "Steel"
  ];

  useEffect(() => {
    if (isOpen && noncombatant) {
      setName(noncombatant.name ?? "");
      setTrainerId(noncombatant.trainerId ?? null);
      const trainerName =
        trainers.find((t) => t.id === noncombatant.trainerId)?.name ?? "";
      setTrainerSearch(trainerName);
      setLevel(noncombatant.level ?? 5);

      setIsMinion(noncombatant.isMinion ?? false);

      setBaseHP(noncombatant.baseStats?.baseHP ?? 10);
      setBaseSpeed(noncombatant.baseStats?.baseSpeed ?? 10);
      setBaseAttack(noncombatant.baseStats?.baseAttack ?? 10);
      setBaseDefense(noncombatant.baseStats?.baseDefense ?? 10);
      setBaseSpAttack(noncombatant.baseStats?.baseSpAttack ?? 10);
      setBaseSpDefense(noncombatant.baseStats?.baseSpDefense ?? 10);

      setSelectedTypes(noncombatant.types ?? []);
    }
  }, [isOpen, noncombatant, trainers]);

  const handleTrainerSelect = (id: string, name: string) => {
    setTrainerId(id);
    setCustomTrainerName("");
    setTrainerSearch(name);
    setTrainerOpen(false);
  };

  const isTrainerValid =
    trainerId !== null &&
    trainerId !== "" &&
    (trainerId !== "new" || customTrainerName.trim() !== "");

  const isNameValid = name.trim() !== "";
  const isTypeValid = selectedTypes.length > 0;
  const isValid = isNameValid && isTrainerValid && isTypeValid;

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

  const handleSave = () => {
    const baseStats = {
      baseHP,
      baseSpeed,
      baseAttack,
      baseDefense,
      baseSpAttack,
      baseSpDefense,
    };

    const derived = computeDerivedStats({ level, ...baseStats });

    // Apply minion HP multiplier
    const finalStats = {
      ...derived,
      maxHP: isMinion ? derived.maxHP * 3 : derived.maxHP,
      HP: isMinion ? derived.maxHP * 3 : derived.HP,
    };

    const finalTrainerId =
      trainerId === "new" && customTrainerName.trim()
        ? onAddTrainer(customTrainerName.trim())
        : trainerId;

    onConfirm({
      ...noncombatant,
      name: name.trim() || "Unknown",
      level,
      baseStats,
      types: selectedTypes,
      trainerId: finalTrainerId ?? null,
      isMinion,               // ⭐ MUST SAVE THIS
      totalStats: finalStats, // ⭐ with HP multiplier applied
    });

    onClose();
  };

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  return (
    <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-2">Edit Noncombatant</h2>

      <div className="flex flex-col space-y-2 mb-4">
        <label className="block mb-1">
          Name: <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full text-center bg-gray-700 border rounded p-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {name.trim() === "" && (
          <p className="text-red-500 text-sm">A name is required.</p>
        )}

        {/* Trainer Dropdown */}
        <label className="block mt-2">
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
            <CommandList className={`max-h-32 overflow-y-auto ${trainerOpen ? "" : "hidden"}`}>
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
            className="mt-2 w-full text-center bg-gray-700 text-white border rounded p-1"
            placeholder="New trainer name"
            value={customTrainerName}
            onChange={(e) => setCustomTrainerName(e.target.value)}
            onBlur={handleConfirmTrainer}
          />
        )}

        {(!trainerId ||
          (trainerId === "new" && customTrainerName.trim() === "")) && (
          <p className="text-red-500 text-sm mt-1">
            A trainer must be selected or entered.
          </p>
        )}

        {/* Minion toggle */}
        <label className="flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            checked={isMinion}
            onChange={(e) => setIsMinion(e.target.checked)}
          />
          <span>Minion Group (pooled health ×3)</span>
        </label>

        {/* Types */}
        <div>
          <label className="block mb-1">
            Type(s): <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {POKEMON_TYPES.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  className={`p-1 rounded bg-gray-700 hover:bg-blue-600 ${
                    selected ? "ring-2 ring-yellow-400" : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTypes((prev) =>
                      prev.includes(type)
                        ? prev.filter((t) => t !== type)
                        : prev.length < 2
                        ? [...prev, type]
                        : prev
                    );
                  }}
                >
                  <Image
                    src={TYPE_ICON_MAP[type] || "/type_icons/NormalIC_FRLG.png"}
                    alt={type}
                    width={32}
                    height={32}
                  />
                </button>
              );
            })}
          </div>

          {selectedTypes.length === 0 && (
            <p className="text-red-500 text-sm mt-1">
              At least one type must be selected.
            </p>
          )}
        </div>

        {/* Level */}
        <label className="flex justify-center items-center mt-1">
          <span className="mr-2">Level:</span>
          <input
            type="number"
            className="w-20 p-1 bg-gray-700 text-white text-center"
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
          />
        </label>

        {/* Base Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[{ label: "Base HP", value: baseHP, setter: setBaseHP },
            { label: "Base Speed", value: baseSpeed, setter: setBaseSpeed },
            { label: "Base Attack", value: baseAttack, setter: setBaseAttack },
            { label: "Base Defense", value: baseDefense, setter: setBaseDefense },
            { label: "Base Sp. Atk", value: baseSpAttack, setter: setBaseSpAttack },
            { label: "Base Sp. Def", value: baseSpDefense, setter: setBaseSpDefense },
          ].map(({ label, value, setter }) => (
            <label key={label} className="flex justify-between items-center">
              <span>{label}:</span>
              <input
                type="number"
                className="ml-2 w-20 p-1 bg-gray-700 text-white text-center"
                value={value}
                onChange={(e) => setter(parseInt(e.target.value) || 1)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between mt-4">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className={`bg-green-500 hover:bg-green-600 ${
            !isValid ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!isValid}
        >
          Save
        </Button>
      </div>
    </div>
  );
}


