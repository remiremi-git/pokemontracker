import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useModalAnimation } from "./useModalAnimation";

interface DirectDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  combatant: any;
  applyDamage: (damage: number) => void;
}

const DirectDamageModal: React.FC<DirectDamageModalProps> = ({
  isOpen,
  onClose,
  combatant,
  applyDamage,
}) => {
  const { shouldRender, state } = useModalAnimation(isOpen);
  if (!shouldRender || !combatant) return null;

  const modalAnimClass = state === "closing" ? "modal-exit" : "modal-enter";

  const maxHP = combatant.totalStats.maxHP;
  const damageAmounts = [
    { fraction: 1 / 16, label: "1/16" },
    { fraction: 1 / 8, label: "1/8" },
    { fraction: 1 / 4, label: "1/4" },
    { fraction: 1 / 2, label: "1/2" },
  ];

  const [customDamage, setCustomDamage] = useState<number | "">("");

  return (
    <div className={`fixed bg-gray-900 text-white border border-gray-500 rounded p-4 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${modalAnimClass}`}>
      <h2 className="text-lg font-bold mb-2">Apply Direct Damage</h2>
      <p className="mb-4">{combatant.name} (Max HP: {maxHP})</p>

      {/* Quick damage buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {damageAmounts.map(({ fraction, label }) => (
          <Button
            key={label}
            onClick={() => applyDamage(Math.floor(maxHP * fraction))}
            className="bg-red-500 hover:bg-red-600"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Manual Damage Input */}
      <div className="flex flex-col items-center mt-4 border-t border-gray-600 pt-4">
        <label className="mb-2 text-sm">Enter Custom Damage:</label>
        <input
          type="number"
          className="w-20 p-1 text-center bg-gray-700 text-white border border-gray-500 rounded"
          value={customDamage}
          onChange={(e) => setCustomDamage(e.target.value ? parseInt(e.target.value) : "")}
        />
        <Button
          onClick={() => {
            if (customDamage && customDamage > 0) {
              applyDamage(customDamage);
              setCustomDamage("");
            }
          }}
          className="mt-2 bg-red-500 hover:bg-red-600"
        >
          Apply
        </Button>
      </div>

      <div className="mt-4 flex justify-center">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

export default DirectDamageModal;
