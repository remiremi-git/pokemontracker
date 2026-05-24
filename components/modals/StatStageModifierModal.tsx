import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface StatStageModifierModalProps {
  isOpen: boolean;
  selectedStat: string | null;
  combatantIndex: number | null; // ✅ Accept combatantIndex as a prop
  combatant: any | null;
  onClose: () => void;
  adjustStage: (combatantIndex: number, stat: string, delta: number) => void;
}

const StatStageModifierModal: React.FC<StatStageModifierModalProps> = ({
  isOpen,
  selectedStat,
  combatantIndex, // ✅ Now received properly
  combatant,
  onClose,
  adjustStage,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender || !selectedStat || !combatant || combatantIndex === null) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 ${backdropAnimClass}`} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 outline-none ${modalAnimClass}`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-2">
          Adjust {selectedStat} for {combatant.name}
        </h2>
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={() => {
              console.log(`Decrease ${selectedStat} for ${combatant.name}`);
              adjustStage(combatantIndex, selectedStat, -1); // ✅ Use combatantIndex
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            -1
          </Button>
          <span>{combatant.stageModifiers?.[selectedStat] ?? 0}</span>
          <Button
            onClick={() => {
              console.log(`Increase ${selectedStat} for ${combatant.name}`);
              adjustStage(combatantIndex, selectedStat, +1); // ✅ Use combatantIndex
            }}
            className="bg-green-500 hover:bg-green-600"
          >
            +1
          </Button>
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
};

export default StatStageModifierModal;

