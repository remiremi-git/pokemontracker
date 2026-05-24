"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface NextTurnOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatants: any[];
  suggested: number | null;
  chosen: number | null;
  setChosen: (index: number | null) => void;
  onConfirm: (index: number | null) => void;
  turnsTakenThisRound: number[];
  activeIndex: number;
}

const NextTurnOverrideModal: React.FC<NextTurnOverrideModalProps> = ({
  isOpen,
  onClose,
  combatants,
  suggested,
  chosen,
  setChosen,
  onConfirm,
  turnsTakenThisRound,
  activeIndex,
}) => {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender || suggested === null || combatants.length === 0) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  // 1️⃣ Determine eligible candidates BEFORE rendering dropdown
  const availableIndices: number[] = combatants
    .map((_, i) => i)
    .filter(
      (i) =>
        i !== activeIndex &&                   // exclude current active mon
        !turnsTakenThisRound.includes(i)       // exclude mons who've already acted
    );

  // If somehow nothing is left, do not render
  if (availableIndices.length === 0) return null;

  // 2️⃣ Helper: compute effective speed (with stage modifiers)
  function getEffectiveSpeed(c: any) {
    const stage = c.stageModifiers?.Speed ?? 0;
    let modified = Math.floor(
      c.totalStats.Speed *
        (stage > 0 ? (2 + stage) / 2 : 2 / (2 - stage))
    );
    if (c.status?.name === "Paralysis") {
      modified = Math.floor(modified / 2);
    }
    return modified;
  }

  // 3️⃣ Determine selected index/text value for <select>
  const selectedIndex = chosen ?? suggested;
  const selectedValue = selectedIndex.toString();

  return (
    <div className={`fixed top-1/2 left-1/2 z-50 w-96 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-1/2 p-4 ${modalAnimClass}`}>
      <h2 className="text-xl font-bold mb-3 text-center">
        Choose Next Combatant
      </h2>

      <p className="text-gray-300 mb-2 text-center">
        Suggested:{" "}
        <span className="text-yellow-400 font-bold">
          {combatants[suggested]?.name}
        </span>
      </p>

      {/* 4️⃣ Dropdown with priority + speed */}
      <select
        className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
        value={selectedValue}
        onChange={(e) => {
          const idx = parseInt(e.target.value, 10);
          setChosen(Number.isNaN(idx) ? null : idx);
        }}
      >
        {availableIndices.map((i) => {
          const c = combatants[i];
          const effSpeed = getEffectiveSpeed(c);
          const prio = c.priority ?? 0;

          return (
            <option key={i} value={i.toString()}>
              {`P${prio} — Spd ${effSpeed} — ${c.name}`}
            </option>
          );
        })}
      </select>

      <div className="flex justify-between mt-4">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selectedIndex)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
};

export default NextTurnOverrideModal;
