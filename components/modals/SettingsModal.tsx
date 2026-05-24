import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllMoves } from "@/lib/useAllMoves";
import { useModalAnimation } from "./useModalAnimation";



interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stabMultiplier: number;
  setStabMultiplier: (value: number) => void;
  effectivityScaling: string;
  setEffectivityScaling: (value: string) => void;
}





export default function SettingsModal({
  isOpen,
  onClose,
  stabMultiplier,
  setStabMultiplier,
  effectivityScaling,
  setEffectivityScaling,
}: SettingsModalProps) {
  const [localStabMultiplier, setLocalStabMultiplier] = useState(stabMultiplier);
  const [localEffectivityScaling, setLocalEffectivityScaling] = useState(effectivityScaling);
  const { refreshMoves } = useAllMoves();
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const handleSave = () => {
    setStabMultiplier(localStabMultiplier);
    setEffectivityScaling(localEffectivityScaling);
    onClose();
  };

  return (
    <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-4">Settings</h2>

      {/* STAB Multiplier Input */}
      <div className="mb-2">
        <label className="block mb-1">STAB Multiplier:</label>
        <input
          type="number"
          className="w-full text-center bg-gray-700 border rounded p-1"
          value={localStabMultiplier}
          min={1}
          max={2}
          step={0.01}
          onChange={(e) => setLocalStabMultiplier(parseFloat(e.target.value) || 1.25)}
        />
      </div>

      {/* Effectivity Scaling Dropdown */}
      <div className="mb-2">
        <label className="block mb-1">Effectivity Scaling:</label>
        <Select value={localEffectivityScaling} onValueChange={setLocalEffectivityScaling}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Scaling" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Strong">Strong (2x/0.5x)</SelectItem>
            <SelectItem value="Weak">Weak (1.5x/0.75x)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save & Close Buttons */}
      <div className="flex justify-between mt-4">
        <Button onClick={handleSave} className="bg-green-500 hover:bg-green-600">
          Save
        </Button>
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
      </div>

      <Button
        className="bg-purple-700 hover:bg-purple-800"
        onClick={refreshMoves}
      >
        Refresh Moves From Notion
      </Button>
      
    </div>
  );
}
