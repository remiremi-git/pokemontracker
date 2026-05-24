import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface PriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatants: any[];
  selections: Record<string, boolean>;
  setSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onConfirm: () => void;
}

export default function PriorityModal({
  isOpen,
  onClose,
  combatants,
  selections,
  setSelections,
  onConfirm,
}: PriorityModalProps) {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const toggle = (name: string) => {
    setSelections((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className={`fixed top-1/2 left-1/2 z-50 w-96 bg-gray-800 text-white border border-gray-600 rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-1/2 p-4 ${modalAnimClass}`}>
      <h2 className="text-xl font-bold mb-3 text-center">
        Priority Moves This Round
      </h2>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {combatants.map((c, idx) => (
          <label key={idx} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={!!selections[c.name]}
              onChange={() => toggle(c.name)}
            />
            <span>{c.name}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between mt-4">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
          Cancel
        </Button>
        <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
          Confirm
        </Button>
      </div>
    </div>
  );
}
