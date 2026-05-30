/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MiningRig } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { Cpu, Layers, Zap, Bot, Rocket, ChevronsUp, AlertTriangle, Flame } from "lucide-react";

interface InteractiveRigProps {
  rigs: MiningRig[];
  ldrBalance: number;
  onBuyRig: (rigId: string) => void;
  onUpgradeRig: (rigId: string) => void;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

// Custom animated SVG visualizers replacing the static icons!
const MachineVisualizer = ({ id, active }: { id: string; active: boolean }) => {
  if (id === "belt") {
    // Conveyor Sifter Visual
    return (
      <div className="relative shrink-0 select-none">
        <svg className="w-16 h-16 bg-[#10131e] rounded-xl border border-gray-800 p-1 shadow-inner" viewBox="0 0 64 64">
          <style dangerouslySetInnerHTML={{__html: `
            .conveyor-belt-line {
              stroke-dasharray: 6 4;
              animation: conveyorMove 1s linear infinite;
            }
            @keyframes conveyorMove {
              from { stroke-dashoffset: 20; }
              to { stroke-dashoffset: 0; }
            }
            .ore-dot-1 { animation: oreMove1 2s infinite linear; }
            .ore-dot-2 { animation: oreMove2 1.8s infinite linear; }
            @keyframes oreMove1 {
              0% { cx: 16; cy: 25; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { cx: 48; cy: 25; opacity: 0; }
            }
            @keyframes oreMove2 {
              0% { cx: 20; cy: 40; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { cx: 44; cy: 40; opacity: 0; }
            }
          `}} />
          {/* Machine Body */}
          <rect x="8" y="14" width="48" height="36" rx="4" fill="#1b2030" stroke={active ? "#14b8a6" : "#475569"} strokeWidth="1.5" />
          
          {/* Conveyor Tracks */}
          <line x1="14" y1="25" x2="50" y2="25" stroke={active ? "#0f766e" : "#334155"} strokeWidth="5" strokeLinecap="round" />
          {active && <line x1="14" y1="25" x2="50" y2="25" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" className="conveyor-belt-line" />}
          
          <line x1="18" y1="40" x2="46" y2="40" stroke={active ? "#0f766e" : "#334155"} strokeWidth="5" strokeLinecap="round" />
          {active && <line x1="18" y1="40" x2="46" y2="40" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" className="conveyor-belt-line" />}
          
          {/* Rolling Gears */}
          <circle cx="15" cy="25" r="3" fill="#475569" className={active ? "animate-spin" : ""} style={{ transformOrigin: '15px 25px' }} />
          <circle cx="49" cy="25" r="3" fill="#475569" className={active ? "animate-spin" : ""} style={{ transformOrigin: '49px 25px' }} />
          
          {/* Ore particles traveling */}
          {active && (
            <>
              <circle r="2" fill="#fbbf05" className="ore-dot-1" />
              <circle r="2.5" fill="#f59e0b" className="ore-dot-2" />
            </>
          )}

          {/* Sifter Screen overlay at the end */}
          <path d="M46 20 L52 28" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <path d="M48 20 L54 28" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {active && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        )}
      </div>
    );
  } else if (id === "drill") {
    // Steam-Powered Drill Visual
    return (
      <div className="relative shrink-0 select-none">
        <svg className="w-16 h-16 bg-[#10131e] rounded-xl border border-gray-800 p-1 shadow-inner" viewBox="0 0 64 64">
          <style dangerouslySetInnerHTML={{__html: `
            .dri-shaft {
              animation: drillPiston 0.6s ease-in-out infinite alternate;
            }
            .dri-steam {
              animation: steamPuff 1.2s infinite linear;
              transform-origin: 32px 14px;
            }
            @keyframes drillPiston {
              0% { transform: translateY(-3px); }
              100% { transform: translateY(5px); }
            }
            @keyframes steamPuff {
              0% { transform: translateY(0) scale(0.6); opacity: 0; }
              30% { opacity: 0.7; }
              100% { transform: translateY(-16px) scale(1.3); opacity: 0; }
            }
          `}} />
          {/* Boiler Backing */}
          <rect x="14" y="24" width="36" height="26" rx="3" fill="#2d3748" stroke={active ? "#10b981" : "#4a5568"} strokeWidth="1.5" />
          
          {/* Steam pipe */}
          <path d="M30 24 v-8 h4 v8" fill="none" stroke="#4a5568" strokeWidth="2" />
          {active && <circle cx="32" cy="14" r="4" fill="#e2e8f0" opacity="0.8" className="dri-steam" />}

          {/* Drill Core Piston and bit */}
          <g className={active ? "dri-shaft" : ""}>
            <rect x="29" y="30" width="6" height="15" fill="#718096" />
            {/* Spinning drill parts */}
            <path d="M26 45 L38 45 L32 54 Z" fill={active ? "#fbbf24" : "#4a5568"} className={active ? "animate-pulse" : ""} />
            <line x1="28" y1="48" x2="36" y2="48" stroke="#334155" strokeWidth="1.5" />
            <line x1="30" y1="51" x2="34" y2="51" stroke="#334155" strokeWidth="1.5" />
          </g>

          {/* Static machinery pressure dial */}
          <circle cx="21" cy="32" r="3" fill="#1a202c" stroke="#4a5568" strokeWidth="1" />
          <line x1="21" y1="32" x2="23" y2="30" stroke={active ? "#ef4444" : "#718096"} strokeWidth="1" />
        </svg>
        {active && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>
    );
  } else if (id === "laser") {
    // Plasma Meltdown Rig Visual
    return (
      <div className="relative shrink-0 select-none">
        <svg className="w-16 h-16 bg-[#10131e] rounded-xl border border-gray-800 p-1 shadow-inner" viewBox="0 0 64 64">
          <style dangerouslySetInnerHTML={{__html: `
            .laser-pulse-line {
              animation: laserPulse 0.4s infinite alternate;
            }
            .containment-ring {
              animation: ringPulse 1.5s infinite;
              transform-origin: 32px 25px;
            }
            @keyframes laserPulse {
              0% { opacity: 0.3; stroke-width: 1.5; }
              100% { opacity: 1; stroke-width: 4; }
            }
            @keyframes ringPulse {
              0% { transform: scale(0.8); opacity: 0.9; }
              100% { transform: scale(1.4); opacity: 0; }
            }
          `}} />
          {/* Laser Rig Body */}
          <path d="M16 16 h32 l-6 16 h-20 z" fill="#1e293b" stroke={active ? "#3b82f6" : "#475569"} strokeWidth="1.5" />
          
          {/* Emitter coil */}
          <rect x="26" y="32" width="12" height="6" rx="1" fill="#475569" />

          {/* Containment bubble */}
          <circle cx="32" cy="25" r="10" fill="none" stroke={active ? "#60a5fa" : "#334155"} strokeWidth="1" opacity="0.5" />
          {active && <circle cx="32" cy="25" r="10" fill="none" stroke="#2563eb" strokeWidth="2" className="containment-ring" />}

          {/* Active bright laser energy beam */}
          {active ? (
            <>
              <line x1="32" y1="38" x2="32" y2="54" stroke="#60a5fa" strokeWidth="3" className="laser-pulse-line" strokeLinecap="round" />
              <line x1="32" y1="38" x2="32" y2="54" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
              {/* Splattering collision waves */}
              <ellipse cx="32" cy="54" rx="8" ry="2" fill="#60a5fa" className="animate-pulse" />
            </>
          ) : (
            <line x1="32" y1="38" x2="32" y2="54" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
          )}
        </svg>
        {active && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )}
      </div>
    );
  } else if (id === "neural_miner") {
    // Neural AI Miner Bot Visual
    return (
      <div className="relative shrink-0 select-none">
        <svg className="w-16 h-16 bg-[#10131e] rounded-xl border border-gray-800 p-1 shadow-inner" viewBox="0 0 64 64">
          <style dangerouslySetInnerHTML={{__html: `
            .bot-eye-left, .bot-eye-right {
              animation: eyeBlink 3s infinite;
              transform-origin: 24px 30px;
            }
            .bot-eye-right {
              transform-origin: 40px 30px;
            }
            .bot-data-node {
              animation: botPulse 1s infinite alternate;
            }
            @keyframes botPulse {
              0% { fill: #f59e0b; opacity: 0.6; }
              100% { fill: #ec4899; opacity: 1; }
            }
            @keyframes eyeBlink {
              0%, 90%, 100% { transform: scaleY(1); }
              95% { transform: scaleY(0.1); }
            }
          `}} />
          {/* Cybernetic dome/head */}
          <rect x="14" y="16" width="36" height="32" rx="8" fill="#1e1b4b" stroke={active ? "#ec4899" : "#475569"} strokeWidth="1.5" />
          
          {/* Circuit wire patterns */}
          <path d="M18 20 h28 v6 h-28 z" fill="#0f172a" />
          <line x1="32" y1="16" x2="32" y2="10" stroke={active ? "#f43f5e" : "#475569"} strokeWidth="2" />
          <circle cx="32" cy="9" r="2.5" fill={active ? "#ec4899" : "#475569"} className={active ? "animate-ping" : ""} />

          {/* Blinking robotic visor eyes */}
          {active ? (
            <>
              <rect x="21" y="27" width="6" height="6" rx="1" fill="#ec4899" className="bot-eye-left" />
              <rect x="37" y="27" width="6" height="6" rx="1" fill="#ec4899" className="bot-eye-right" />
              {/* Smiling mouth grid points */}
              <rect x="26" y="38" width="12" height="2" rx="0.5" fill="#f43f5e" />
            </>
          ) : (
            <>
              <line x1="21" y1="30" x2="27" y2="30" stroke="#475569" strokeWidth="2" />
              <line x1="37" y1="30" x2="43" y2="30" stroke="#475569" strokeWidth="2" />
              <line x1="28" y1="38" x2="36" y2="38" stroke="#475569" strokeWidth="1.5" />
            </>
          )}

          {/* Microprocessor micro data light nodes */}
          {active && (
            <>
              <circle cx="18" cy="42" r="1.5" className="bot-data-node" />
              <circle cx="46" cy="42" r="1.5" className="bot-data-node" style={{ animationDelay: '0.5s' }} />
            </>
          )}
        </svg>
        {active && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
        )}
      </div>
    );
  }
  return null;
};

export default function InteractiveRig({
  rigs,
  ldrBalance,
  onBuyRig,
  onUpgradeRig
}: InteractiveRigProps) {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showDamageNotice, setShowDamageNotice] = useState(false);
  const [isSwinging, setIsSwinging] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Manual mineral clicker (classic idle mechanics)
  const handleManualClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    playClickSound();

    // Trigger tool swing animation
    setIsSwinging(true);
    setTimeout(() => setIsSwinging(false), 200);

    const now = Date.now();
    // Manual tapping speed limit check (anti-macro aesthetic warning)
    if (now - lastClickTime < 80) {
      setShowDamageNotice(true);
      setTimeout(() => setShowDamageNotice(false), 800);
    }
    setLastClickTime(now);

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    const pickaxeLevel = rigs.find(r => r.id === "pickaxe")?.level || 1;
    const clickPayoutVal = 0.001 * pickaxeLevel;

    // Track when coins are successfully mined (every 5 clicks)
    if (newClickCount > 0 && newClickCount % 5 === 0) {
      onUpgradeRig("manual_tap_payout"); // internal trigger caught in parent App
      
      // Floating text reward for successfully mining coins!
      const newFloat: FloatingText = {
        id: Date.now() + Math.random(),
        x: Math.random() * 80 - 40, // random offset
        y: Math.random() * 40 - 80,
        text: `🪙 +${clickPayoutVal.toFixed(3)} LDR`
      };
      setFloatingTexts((prev) => [...prev, newFloat]);
      
      // Clear after animation completes
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== newFloat.id));
      }, 1400);
    } else {
      // Small dust particle indicator on hits that are not full reward payouts
      const newFloat: FloatingText = {
        id: Date.now() + Math.random(),
        x: Math.random() * 60 - 30,
        y: -30,
        text: "⚡ HIT!"
      };
      setFloatingTexts((prev) => [...prev, newFloat]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== newFloat.id));
      }, 800);
    }
  };

  const activeRigs = rigs.filter(r => r.category === "passive");
  const gearRigs = rigs.filter(r => r.category === "active");

  const totalPassiveLps = activeRigs.reduce((acc, r) => acc + (r.count * r.ldrPerSec * (r.level * 0.5 + 0.5)), 0);

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-5xl mx-auto py-2 font-sans">
      
      {/* Visual Animation & Clicker Column (Left side) */}
      <div className="flex-1 bg-[#111420] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between items-center text-center relative overflow-hidden shrink-0 w-full max-w-[420px] mx-auto min-h-[460px]">
        {/* Decorative Grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        <div className="w-full relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-[#5c6a85] bg-[#0c0d15] px-2 py-1 rounded border border-gray-850">
              RIG STATUS: ACTIVE & ONLINE
            </span>
            <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
              ⚡ PASIVE FLOW: {totalPassiveLps.toFixed(1)} LDR/s
            </span>
          </div>

          <div className="h-px bg-gray-800/60 my-4" />
        </div>

        {/* Dynamic clicker element */}
        <div className="relative my-4 flex flex-col items-center">
          
          {/* Floating Indicators Container */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
            {floatingTexts.map((f) => (
              <span
                key={f.id}
                className="absolute font-mono text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 select-none animate-float-up text-center drop-shadow-md text-nowrap"
                style={{
                  left: `calc(50% + ${f.x}px)`,
                  top: `calc(40% + ${f.y}px)`,
                }}
              >
                {f.text}
              </span>
            ))}
          </div>

          {/* Animated Drilling lasers / energy rings */}
          {totalPassiveLps > 0 && (
            <div className="absolute -inset-10 bg-amber-500/5 rounded-full filter blur-xl animate-pulse pointer-events-none" />
          )}
          {totalPassiveLps > 5 && (
            <div className="absolute -inset-16 border border-dashed border-teal-500/15 rounded-full animate-spin pointer-events-none" />
          )}

          {/* Swinging Mining Tool Animation */}
          <div className="relative">
            <div 
              className={`absolute -top-6 -right-6 text-amber-400 transition-transform duration-100 origin-bottom-left z-35 pointer-events-none ${
                isSwinging ? "rotate-[-45deg] scale-125" : "rotate-[15deg] scale-100"
              }`}
            >
              <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/30 shadow-md">
                <Rocket className="w-8 h-8 rotate-45 text-amber-500" />
              </div>
            </div>

            {/* Central manual mining asteroid */}
            <button
              onClick={handleManualClick}
              className="w-44 h-44 rounded-full bg-gradient-to-br from-gray-805 via-zinc-800 to-stone-900 border-4 border-gray-700 shadow-xl shadow-black/80 flex flex-col items-center justify-center p-4 relative group hover:border-amber-500 active:scale-95 transition duration-150 relative z-20 outline-none"
              style={{
                boxShadow: totalPassiveLps > 0 ? "0 0 25px rgba(245, 158, 11, 0.15)" : ""
              }}
            >
              {/* Spinning inner drill overlay depending on passive rigs */}
              <div className={`absolute inset-4 border-2 border-dashed ${totalPassiveLps > 0 ? "border-amber-500/20 animate-spin" : "border-transparent"}`} />

              <Flame className="text-gray-500 group-hover:text-amber-400 group-hover:scale-110 transition duration-305 mb-1" size={28} />
              <span className="text-xs font-black text-white tracking-widest uppercase">SMASH OUT</span>
              <span className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase">Manual mining tap</span>

              {/* Click counts feedback bubble */}
              <span className="absolute bottom-4 bg-[#0d0f14] px-2 py-0.5 rounded-full border border-gray-750 font-mono text-[9px] text-amber-500 font-bold group-hover:bg-amber-500/10 group-hover:text-amber-400">
                Taps: {clickCount}
              </span>
            </button>
          </div>

          {/* Click Progress Indicator visual ring bar */}
          <div className="w-full max-w-[260px] bg-[#090b10] p-2.5 rounded-xl border border-gray-850 mt-5">
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1 leading-none">
              <span>COIN INJECTOR</span>
              <span className="text-amber-500 font-extrabold">{clickCount % 5} / 5 CLICKS</span>
            </div>
            <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-850">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-150"
                style={{ width: `${(clickCount % 5) * 20}%` }}
              />
            </div>
          </div>

          {/* Anti-macro / high speed warning alert */}
          {showDamageNotice ? (
            <div className="absolute -bottom-8 bg-amber-950/95 border border-amber-500 text-amber-300 font-mono text-[9px] py-1 px-2.5 rounded shadow-lg z-30 animate-pulse flex items-center gap-1">
              <AlertTriangle size={11} />
              <span>DRILL HOT! OVERCLOCK TAP</span>
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 font-mono mt-4 max-w-[280px]">
              Every 5 taps triggers an auxiliary LDR coin payout proportional to your pickaxe level!
            </p>
          )}
        </div>

        {/* Schematic animated rigs statistics */}
        <div className="w-full bg-[#0d0f13] border border-gray-850 p-3 rounded-xl mt-4 text-left">
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">
            Active Mining Equipment Inventory:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {rigs.map((r) => (
              <div key={r.id} className="p-1.5 bg-[#141822] border border-gray-850 rounded flex justify-between items-center">
                <span className="text-gray-400 text-[11px] truncate">{r.name}</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  {r.id === "pickaxe" ? `Lv.${r.level}` : `x${r.count}`}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Upgrade Store List (Right column) */}
      <div className="flex-1 space-y-5 bg-[#131722] p-5 border border-gray-800 rounded-2xl text-left">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 leading-none">
            <ChevronsUp className="text-amber-400" size={20} />
            <span>RIG AUTOMATION & UPGRADES</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            Spend your LDR Coins here to construct high-yield automated passive engines or level up manual utilities.
          </p>
        </div>

        {/* Tab Group titles */}
        <div className="space-y-3">
          
          {/* Active pickaxe gear */}
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block mb-2 px-1">
              🛠️ MANUAL UPGRADES & UTILITIES:
            </span>
            {gearRigs.map((rig) => {
              return (
                <div 
                  key={rig.id}
                  className="p-3.5 rounded-xl border border-gray-800 bg-[#171c2a] flex items-center justify-between gap-4"
                >
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Rocket size={20} />
                  </div>
                  <div className="grow min-w-0">
                    <h4 className="text-sm font-bold text-white truncate leading-tight">
                      {rig.name} <span className="text-xs font-mono text-amber-400 font-bold ml-1">Lv {rig.level}</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                       Effect: Merge gain +{rig.level * 15}%. Manual tap: {(0.001 * rig.level).toFixed(3)} LDR per 5 clicks.
                    </p>
                  </div>
                  <button
                    onClick={() => { playUpgradeSound(); onUpgradeRig(rig.id); }}
                    disabled={ldrBalance < rig.cost * rig.level}
                    className={`py-2 px-3 rounded-lg text-xs font-bold shrink-0 transition flex flex-col items-center ${
                      ldrBalance >= rig.cost * rig.level
                        ? "bg-amber-500 text-[#0d0f14] hover:brightness-105 active:scale-95"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wide leading-none">UPGRADE</span>
                    <span className="font-mono text-[11px] mt-0.5 font-extrabold leading-none">
                      🪙 {(rig.cost * rig.level).toFixed(0)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-gray-800/50" />

          {/* Passive rig engines */}
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#3498db] uppercase block mb-2 px-1">
              🏭 AUTOMATED PASSIVE RIG STREAMS (IDLE AUTO-YIELD):
            </span>
            <div className="space-y-3">
              {activeRigs.map((rig) => {
                const currentYieldSpeed = rig.count * rig.ldrPerSec * (rig.level * 0.5 + 0.5);
                const isAffordableBuy = ldrBalance >= rig.cost;

                return (
                  <div 
                    key={rig.id} 
                    className="p-3.5 bg-[#171d2b] border border-gray-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden"
                  >
                    {/* Background glow decoration if rig count > 0 */}
                    {rig.count > 0 && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/5 rounded-full blur-lg pointer-events-none" />
                    )}

                    <div className="flex items-start gap-3.5 grow min-w-0">
                      {/* Interactive Visual machine outputting animation dynamically */}
                      <MachineVisualizer id={rig.id} active={rig.count > 0} />

                      <div className="min-w-0 grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {rig.name}
                          </h4>
                          {rig.count > 0 && (
                            <span className="text-[10px] font-mono font-black text-teal-400 bg-teal-500/10 p-0.5 px-1.5 rounded border border-teal-500/20">
                              Owned x{rig.count}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                          {rig.description}
                        </p>
                        <div className="flex items-center gap-3.5 mt-2 text-[10px] font-mono flex-wrap">
                          <span className="text-gray-400">Unit Yield: <span className="text-green-400 font-bold">+{rig.ldrPerSec} LDR/s</span></span>
                          {rig.count > 0 && (
                            <span className="text-teal-400 font-bold bg-teal-500/5 p-0.5 rounded leading-none border border-teal-500/10 whitespace-nowrap">
                              Total Performance: {currentYieldSpeed.toFixed(2)}/s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-stretch md:items-end justify-between md:justify-center gap-2.5 pt-2 border-t md:border-t-0 border-gray-800 shrink-0">
                      <div className="font-mono text-[10px] text-gray-500 self-center md:self-auto">
                        Unit Price: <span className="text-white font-bold">🪙 {rig.cost} LDR</span>
                      </div>
                      <button
                        onClick={() => { playUpgradeSound(); onBuyRig(rig.id); }}
                        disabled={!isAffordableBuy}
                        className={`py-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isAffordableBuy
                            ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:brightness-105 active:scale-95"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50"
                        }`}
                      >
                        <span>BUY UNIT FOR</span>
                        <span className="font-mono">🪙{rig.cost}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
