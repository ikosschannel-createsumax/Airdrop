/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

export default function RunningReferralTicker() {
  const [ticks, setTicks] = useState([
    { id: 1, inviter: "AlphaDigger_77", recruit: "Nova_31", bonus: "Rp 45,000" },
    { id: 2, inviter: "LunaHunter_12", recruit: "Stardust_9", bonus: "Rp 100,000" },
    { id: 3, inviter: "MegaReactor_9", recruit: "ZetaMiner", bonus: "Rp 25,000" },
    { id: 4, inviter: "GigaMiner_X", recruit: "PixelBoy_0", bonus: "Rp 200,000" },
  ]);

  useEffect(() => {
    const listInviters = ["Sultan_Kaltim", "BetaFusion", "ZekeXMiner", "NusaCore_Master", "IdMiner_Max", "BorSakti", "GemLuster", "RiauGold_X", "JavaDrill", "BaliOren"];
    const listRecruits = ["IndoMiner_99", "PlutoDrill", "GemShine", "VortexDriller", "Krakatoa", "SundaGold", "CyberAura", "SatoshiLover", "IndoGold_99", "VoxelGamer"];
    const interval = setInterval(() => {
      const rInviter = listInviters[Math.floor(Math.random() * listInviters.length)];
      const rRecruit = listRecruits[Math.floor(Math.random() * listRecruits.length)];
      const bonusAmountPresets = [10000, 20000, 30000, 50000, 100000, 150000, 200000];
      const rBonus = bonusAmountPresets[Math.floor(Math.random() * bonusAmountPresets.length)];
      
      setTicks((prev) => {
        const next = [
          { id: Date.now(), inviter: rInviter, recruit: rRecruit, bonus: `Rp ${rBonus.toLocaleString("id-ID")}` },
          ...prev.slice(0, 3)
        ];
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="live-referral-ticker" className="w-full bg-[#111422] border border-amber-500/20 rounded-2xl p-3 select-none relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 text-left animate-fade-in shadow-lg">
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded leading-none">
          LIVE REFERRAL REWARDS RUNNING
        </span>
      </div>
      <div className="flex-1 overflow-hidden h-6 relative min-w-0">
        <div className="flex gap-4 md:justify-end whitespace-nowrap text-[11px] font-mono text-gray-400 font-medium">
          {ticks.map((t, idx) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 bg-gray-950/70 border border-gray-800/85 px-3 py-1 rounded-lg">
              <span className="text-white font-bold">{t.inviter}</span>
              <span className="text-gray-500">invited</span>
              <span className="text-teal-400 font-bold">{t.recruit}</span>
              <span className="text-gray-500">and got</span>
              <span className="text-yellow-400 font-black">{t.bonus}</span>
              <span className="text-green-400 font-bold text-[9px] uppercase tracking-wider bg-green-500/20 border border-green-500/20 px-1.5 py-0.2 rounded leading-none">EARNED</span>
              <span className="text-[9px] text-[#556]">{idx === 0 ? "Just now" : `${idx * 16}s ago`}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
