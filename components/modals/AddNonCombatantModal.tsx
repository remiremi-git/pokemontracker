"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import computeDerivedStats from "@/lib/computeDerivedStats";
import { TYPE_ICON_MAP } from "@/lib/typeicons";
import POKEMON_DATA from "@/data/pokemon_stats_genV.json";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useModalAnimation } from "./useModalAnimation";

interface Trainer {
  id: string;
  name: string;
  color?: string;
  notionId?: string | null;
}

interface AddNoncombatantModalProps {
  isOpen: boolean;
  onClose: () => void;
  addNoncombatant: (noncombatantData: any) => void;
  trainers: Trainer[];
  onAddTrainer: (name: string) => string;
}

export default function AddNoncombatantModal({
  isOpen,
  onClose,
  addNoncombatant,
  trainers,
  onAddTrainer,
}: AddNoncombatantModalProps) {
  const [name, setName] = useState("");
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [customTrainerName, setCustomTrainerName] = useState("");
  const [trainerSearch, setTrainerSearch] = useState("");
  const [trainerOpen, setTrainerOpen] = useState(false);

  const [level, setLevel] = useState(5);
  const [baseHP, setBaseHP] = useState(10);
  const [baseSpeed, setBaseSpeed] = useState(10);
  const [baseAttack, setBaseAttack] = useState(10);
  const [baseDefense, setBaseDefense] = useState(10);
  const [baseSpAttack, setBaseSpAttack] = useState(10);
  const [baseSpDefense, setBaseSpDefense] = useState(10);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isMinion, setIsMinion] = useState(false);

  const isTrainerValid =
    trainerId !== null &&
    trainerId !== "" &&
    (trainerId !== "new" || customTrainerName.trim() !== "");

  const isNameValid = name.trim() !== "";
  const isTypeValid = selectedTypes.length > 0;
  const isValid = isTrainerValid && isNameValid && isTypeValid;

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

  const handleSpeciesSelect = (species: string) => {
    const data = POKEMON_DATA.find((p) => p.name === species);
    if (!data) return;

    setName(species);
    setSelectedTypes(data.types || []);
    setBaseHP(data.baseStats.baseHP * 10);
    setBaseAttack(data.baseStats.baseAttack * 10);
    setBaseDefense(data.baseStats.baseDefense * 10);
    setBaseSpAttack(data.baseStats.baseSpAttack * 10);
    setBaseSpDefense(data.baseStats.baseSpDefense * 10);
    setBaseSpeed(data.baseStats.baseSpeed * 10);

    setSearchTerm(""); // auto-hide dropdown
  };

  const handleAdd = () => {
    const baseStats = {
      baseHP,
      baseSpeed,
      baseAttack,
      baseDefense,
      baseSpAttack,
      baseSpDefense,
    };

    const derived = computeDerivedStats({ level, ...baseStats });

    // ⭐ Apply minion multiplier to max HP AND initial HP
    const finalStats = {
      ...derived,
      maxHP: isMinion ? derived.maxHP * 3 : derived.maxHP,
      HP: isMinion ? derived.maxHP * 3 : derived.HP,
    };

    let finalTrainerId = trainerId;
    if (trainerId === "new" && customTrainerName.trim()) {
      finalTrainerId = onAddTrainer(customTrainerName.trim());
    }

    addNoncombatant({
      name: name.trim() || "Unknown",
      level,
      baseStats,
      types: selectedTypes,
      trainerId: finalTrainerId ?? null,
      isMinion,
      totalStats: finalStats, // ⭐ Save HP multiplier
      secondaryStatuses: [],
      status: null,
    });

    onClose();
  };

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const POKEMON_TYPES = [
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
    "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
    "Dragon", "Dark", "Steel",
  ];

  return (
    <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-2">Add Noncombatant</h2>

      <div className="flex flex-col space-y-2 mb-4">

        {/* Species Autocomplete */}
        <label className="block mb-1">Species:</label>
        <div className="bg-gray-800 rounded mb-2">
          <Command>
            <CommandInput
              placeholder="Search Pokémon..."
              className="w-full p-2 bg-gray-700 text-white rounded"
              onValueChange={(val) => setSearchTerm(val)}
            />
            <CommandList className="max-h-32 overflow-y-auto">
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

        {/* Name Input */}
        <label className="block mb-1">
          Name: <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full text-center bg-gray-700 border rounded p-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {!isNameValid && (
          <p className="text-red-500 text-sm">A name is required.</p>
        )}

        {/* Trainer */}
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
            placeholder="New trainer name"
            className="w-full bg-gray-700 text-white border rounded p-1 mt-1"
            value={customTrainerName}
            onChange={(e) => setCustomTrainerName(e.target.value)}
            onBlur={handleConfirmTrainer}
          />
        )}
        {!isTrainerValid && (
          <p className="text-red-500 text-sm">
            A trainer must be selected or entered.
          </p>
        )}

        {/* Minion checkbox */}
        <label className="flex items-center space-x-2 mt-2">
          <input
            type="checkbox"
            checked={isMinion}
            onChange={(e) => setIsMinion(e.target.checked)}
          />
          <span>Minion Group (pooled health ×3)</span>
        </label>

        {/* Types */}
        <label className="block mb-1 mt-2">
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
        {!isTypeValid && (
          <p className="text-red-500 text-sm mt-1">
            At least one type must be selected.
          </p>
        )}

        {/* Level */}
        <label className="block text-center mt-2">
          Level:
          <input
            type="number"
            className="block mx-auto w-20 p-1 mt-1 text-center bg-gray-700 text-white rounded"
            value={level}
            onChange={(e) => setLevel(parseFloat(e.target.value) || 1)}
          />
        </label>

        {/* Base Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2">
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
          onClick={handleAdd}
          disabled={!isValid}
          className={`bg-green-500 hover:bg-green-600 ${
            !isValid ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Add
        </Button>
      </div>
    </div>
  );
}


