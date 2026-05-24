"use client";

import { useState } from "react";
import InitiativeTracker from "@/components/InitiativeTracker";
import NoncombatantDrawer from "@/components/tables/noncombatantsdrawer";

export default function Home() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="flex h-screen">
        {/* Noncombatant Drawer - Always Occupies Space */}
        <div
          className={`transition-all duration-300 ${
            isDrawerOpen ? "w-80" : "w-12"
          }`}
        >
          <NoncombatantDrawer setIsDrawerOpen={setIsDrawerOpen} />
        </div>

        {/* Initiative Tracker - Adjusts Based on Drawer State */}
        <div className="transition-all duration-300 flex-1">
          <InitiativeTracker />
        </div>
      </main>
    </div>
  );
}
