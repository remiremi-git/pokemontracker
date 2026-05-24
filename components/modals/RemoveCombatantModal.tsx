import React from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface RemoveCombatantModalProps {
  isOpen: boolean;
  combatantName: string;
  isCombatant: boolean;
  onConfirm: () => void;
  onSaveToDrawer?: () => void;
  onCancel: () => void;
}

export default function RemoveCombatantModal({
  isOpen,
  combatantName,
  isCombatant,
  onConfirm,
  onSaveToDrawer,
  onCancel,
}: RemoveCombatantModalProps) {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";
  const backdropAnimClass = state === "closing" ? "backdrop-exit" : "backdrop-enter";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="relative w-96">
        <div
          className={`absolute inset-0 bg-black/50 ${backdropAnimClass}`}
          onClick={onCancel}
        />
        <div className={`relative z-10 bg-gray-900 border border-gray-500 rounded-lg p-6 text-white ${modalAnimClass}`}>
        <h2 className="text-xl font-bold mb-4 text-center">
          Remove {combatantName}?
        </h2>
        <p className="text-center mb-6">
          What would you like to do with this combatant?
        </p>

        <div className="flex justify-between space-x-2">
          <Button
            className="bg-red-600 hover:bg-red-700 w-1/2"
            onClick={onConfirm}
          >
            Delete
          </Button>

          {isCombatant && onSaveToDrawer && (
            <Button
              className="bg-yellow-400 hover:bg-yellow-500 text-black w-1/2"
              onClick={onSaveToDrawer}
            >
              Save to Drawer
            </Button>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
