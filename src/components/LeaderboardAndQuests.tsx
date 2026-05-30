/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Achievement, MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { Award, CheckCircle, Gift, Bomb, Zap, Sparkles, Clock, Globe } from "lucide-react";

interface LeaderboardAndQuestsProps {
  profile: MinerProfile;
  achievements: Achievement[];
  onClaimAchievement: (id: string, reward: number) => void;
  onBuyTool: (toolId: 'dynamite' | 'magnet', cost: number) => void;
  dynamiteCount: number;
  magnetCount: number;
  onAddBalances: (ldrDelta: number, rupiahDelta: number) => void;
  triggerNotification?: (message: string) => void;
}

interface Competitor {
  rank: number;
  username: string;
  minerTag: string;
  avatar: string;
  role: string;
  score: number;
  ldrBalance: number;
}

export default function LeaderboardAndQuests({
  profile,
  achievements,
  onClaimAchievement,
  onBuyTool,
  dynamiteCount,
  magnetCount,
  onAddBalances,
  triggerNotification
}: LeaderboardAndQuestsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'quests' | 'shop'>('leaderboard');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recentGains, setRecentGains] = useState<Record<string, { score: number; coins: number; expiry: number }>>({});

  // Social media task states
  const [tgChannelClaimed, setTgChannelClaimed] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_channel_claimed_${profile.minerTag}` : "ldr_social_channel_claimed";
    return localStorage.getItem(key) === "true";
  });
  const [tgGroupClaimed, setTgGroupClaimed] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_group_claimed_${profile.minerTag}` : "ldr_social_group_claimed";
    return localStorage.getItem(key) === "true";
  });
  const [tgChannelClicked, setTgChannelClicked] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_channel_clicked_${profile.minerTag}` : "ldr_social_channel_clicked";
    return localStorage.getItem(key) === "true";
  });
  const [tgGroupClicked, setTgGroupClicked] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_group_clicked_${profile.minerTag}` : "ldr_social_group_clicked";
    return localStorage.getItem(key) === "true";
  });

  const handleClaimChannelReward = () => {
    if (tgChannelClaimed) return;
    playUpgradeSound();
    onAddBalances(0, 5000);
    setTgChannelClaimed(true);
    const key = profile.minerTag ? `ldr_social_channel_claimed_${profile.minerTag}` : "ldr_social_channel_claimed";
    localStorage.setItem(key, "true");
    if (triggerNotification) {
      triggerNotification("🎉 Successfully claimed Social Media Join reward of Rp 5,000!");
    }
  };

  const handleClaimGroupReward = () => {
    if (tgGroupClaimed) return;
    playUpgradeSound();
    onAddBalances(0, 1000);
    setTgGroupClaimed(true);
    const key = profile.minerTag ? `ldr_social_group_claimed_${profile.minerTag}` : "ldr_social_group_claimed";
    localStorage.setItem(key, "true");
    if (triggerNotification) {
      triggerNotification("🎉 Successfully claimed Social Media Network reward of Rp 1,000!");
    }
  };

  // Cost configs matching actions
  const DYNAMITE_COST = 12;
  const MAGNET_COST = 18;

  // Generate rival competitor profiles and update their scores dynamically over time
  useEffect(() => {
    const defaultCompetitors: Competitor[] = [
      { rank: 1, username: "Sultan_Kaltim", minerTag: "sultan#8812", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sultan", role: "driller", score: 18500, ldrBalance: 12450 },
      { rank: 2, username: "CryptoDrill", minerTag: "cryptodrill#2291", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cryptodrill", role: "broker", score: 12100, ldrBalance: 6120 },
      { rank: 3, username: "ZekeXMiner", minerTag: "zekex#4492", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=zekex", role: "geologist", score: 9800, ldrBalance: 3220 },
      { rank: 4, username: "NusaCore_Master", minerTag: "nusacore#5561", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=nusa", role: "driller", score: 7150, ldrBalance: 1180 },
      { rank: 5, username: "IdMiner_Max", minerTag: "idminer#9902", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=idminermax", role: "broker", score: 4300, ldrBalance: 980 },
      { rank: 6, username: "BorSakti", minerTag: "borsakti#1032", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=borsakti", role: "geologist", score: 2800, ldrBalance: 450 },
      { rank: 7, username: "GemLuster", minerTag: "gemluster#7705", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=gemluster", role: "broker", score: 1200, ldrBalance: 180 }
    ];

    // Load persisted leaderboard data
    let currentComps = defaultCompetitors;
    const cached = localStorage.getItem("ldr_leaderboard_competitors");
    if (cached) {
      try {
        currentComps = JSON.parse(cached);
      } catch (e) {
        currentComps = defaultCompetitors;
      }
    }

    // Daily offline progression increment calculation
    const lastUpdateStr = localStorage.getItem("ldr_leaderboard_last_update");
    const nowTime = Date.now();
    
    if (lastUpdateStr) {
      const lastUpdate = parseInt(lastUpdateStr, 10);
      const elapsedMs = nowTime - lastUpdate;
      const elapsedDays = Math.max(0, elapsedMs / (24 * 60 * 60 * 1000));
      
      if (elapsedDays > 0.01) { // Apply progression even if user was away for more than ~15 mins
        currentComps = currentComps.map((comp) => {
          const multiplier = comp.rank === 1 ? 2.0 : comp.rank <= 3 ? 1.5 : 1.0;
          const scorePerDay = (Math.floor(Math.random() * 800) + 400) * multiplier;
          const coinsPerDay = (Math.floor(Math.random() * 50) + 20) * multiplier;

          const addedScore = Math.floor(scorePerDay * elapsedDays);
          const addedCoin = Math.floor(coinsPerDay * elapsedDays);

          return {
            ...comp,
            score: comp.score + addedScore,
            ldrBalance: comp.ldrBalance + addedCoin
          };
        });
      }
    }

    setCompetitors(currentComps);
    localStorage.setItem("ldr_leaderboard_competitors", JSON.stringify(currentComps));
    localStorage.setItem("ldr_leaderboard_last_update", nowTime.toString());

    // Dynamic timer ticker to simulate active players
    const interval = setInterval(() => {
      setCompetitors((prev) => {
        const updated = prev.map((comp) => {
          if (Math.random() < 0.45) {
            const addedScore = Math.floor(Math.random() * 120) + 20;
            const addedCoin = Math.floor(Math.random() * 8) + 2;

            setRecentGains((prevGains) => ({
              ...prevGains,
              [comp.minerTag]: {
                score: addedScore,
                coins: addedCoin,
                expiry: Date.now() + 2500
              }
            }));

            return {
              ...comp,
              score: comp.score + addedScore,
              ldrBalance: comp.ldrBalance + addedCoin
            };
          }
          return comp;
        });

        localStorage.setItem("ldr_leaderboard_competitors", JSON.stringify(updated));
        localStorage.setItem("ldr_leaderboard_last_update", Date.now().toString());
        return updated;
      });
    }, 5000);

    const cleanInterval = setInterval(() => {
      setRecentGains((prev) => {
        const next: Record<string, any> = {};
        let updated = false;
        const now = Date.now();
        Object.keys(prev).forEach((k) => {
          if (prev[k].expiry > now) {
            next[k] = prev[k];
          } else {
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanInterval);
    };
  }, []);

  const getLeaderboardRanks = (): Competitor[] => {
    const userCompetitor: Competitor = {
      rank: 0,
      username: `${profile.username} (You)`,
      minerTag: profile.minerTag,
      avatar: profile.avatar,
      role: profile.role,
      score: profile.highScore,
      ldrBalance: Math.floor(profile.ldrBalance)
    };

    const combined = [...competitors, userCompetitor];
    combined.sort((a, b) => b.score - a.score);

    return combined.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  };

  const currentRankedList = getLeaderboardRanks();
  const userRankPosition = currentRankedList.findIndex(c => c.minerTag === profile.minerTag) + 1;

  const handlePurchaseTool = (toolId: 'dynamite' | 'magnet', cost: number) => {
    if (profile.ldrBalance < cost) return;
    playClickSound();
    onBuyTool(toolId, cost);
  };

  return (
    <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 max-w-5xl mx-auto font-sans">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-gray-800 mb-5">
        <button
          onClick={() => { playClickSound(); setActiveSubTab('leaderboard'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'leaderboard'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🏆 LIVE LEADERBOARD
        </button>
        <button
          onClick={() => { playClickSound(); setActiveSubTab('quests'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'quests'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🎁 DAILY QUESTS & TASKS
        </button>
        <button
          onClick={() => { playClickSound(); setActiveSubTab('shop'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'shop'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🛒 EMERGENCY ITEM SHOP
        </button>
      </div>

      {/* RENDER TAB CONTENTS */}

      {/* 1. Leaderboard panel */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-amber-500/5 p-4 border border-amber-500/25 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <Award size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wide">YOUR INSTANT STANDINGS STATUS:</h4>
                <div className="text-sm font-bold text-white mt-0.5">
                  Currently ranked <span className="text-amber-400">#{userRankPosition} global</span> with a high score of {profile.highScore.toLocaleString()} Pts!
                </div>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">UPDATES: LIVE DATA SYNC</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] font-mono text-gray-500 uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Miner Station</th>
                  <th className="py-2.5 px-3">Specialization</th>
                  <th className="py-2.5 px-3 text-right">High Score</th>
                  <th className="py-2.5 px-3 text-right">LDR Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {currentRankedList.map((item) => {
                  const isUser = item.minerTag === profile.minerTag;
                  return (
                    <tr 
                      key={item.minerTag}
                      className={`hover:bg-gray-800/25 transition ${
                        isUser ? "bg-amber-500/5 text-amber-300 font-semibold border-y border-amber-500/20" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold leading-none ${
                          item.rank === 1 ? "bg-yellow-500 text-black px-1.5" :
                          item.rank === 2 ? "bg-gray-400 text-black px-1.5" :
                          item.rank === 3 ? "bg-amber-600 text-black px-1.5" : "text-gray-500"
                        }`}>
                          #{item.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={item.avatar} 
                            alt={item.username} 
                            className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 pointer-events-none" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className={`block truncate ${isUser ? "text-amber-400 font-bold" : "text-white"}`}>
                              {item.username}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {item.minerTag}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono uppercase bg-gray-900 border border-gray-800 p-0.5 px-1.5 rounded text-gray-400">
                          {item.role === 'driller' ? "Drill Master" : item.role === 'geologist' ? "Geologist" : "Gem Broker"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-200">
                        <div className="flex flex-col items-end justify-center min-h-[36px]">
                          <span className="transition-all duration-300">{item.score.toLocaleString()} Pts</span>
                          {recentGains[item.minerTag] && (
                            <span className="text-[10px] text-emerald-400 font-bold animate-bounce block shrink-0 select-none">
                              +{recentGains[item.minerTag].score} Pts
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-500 font-semibold">
                        <div className="flex flex-col items-end justify-center min-h-[36px]">
                          <span className="transition-all duration-300">🪙 {item.ldrBalance.toLocaleString()} LDR</span>
                          {recentGains[item.minerTag] && (
                            <span className="text-[10px] text-amber-300 font-bold animate-pulse block shrink-0 select-none">
                              +{recentGains[item.minerTag].coins} LDR
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Quests / Achievements claim panel (Merged Social Media + Achievements) */}
      {activeSubTab === 'quests' && (
        <div className="space-y-4">
          <div className="text-left mb-2">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Daily Quests & Mining Achievements</h4>
            <p className="text-xs text-gray-400">Complete the specific targets below to claim extra LDR Coin subventions or instant Rupiah bonuses directly to your mining vault.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* Ach 1: Social Media Join Task (Directly merged here) */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              tgChannelClaimed
                ? "border-gray-850 bg-gray-950/25 opacity-70"
                : "border-amber-500/20 bg-[#161a29]"
            }`}>
              <div className="flex items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Social Task
                  </span>
                  <h4 className={`text-sm font-bold mt-2 ${tgChannelClaimed ? "text-gray-500 line-through" : "text-white"}`}>
                    Join Official Telegram Channel
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                    Subscribe to the official Galaxxe Mining core network to receive real-time news, promos, and system updates.
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-2.5 truncate break-all">
                    Link: <a href="https://t.me/galaxxetambang" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">t.me/galaxxetambang</a>
                  </p>
                </div>
                {tgChannelClaimed ? (
                  <span className="p-1 rounded-full bg-gray-900 border border-gray-880 text-emerald-500 shrink-0">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0 animate-bounce">
                    <Sparkles size={14} />
                  </span>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center pt-2.5 border-t border-gray-800/50">
                <span className="text-[10px] font-mono font-bold text-semibold text-emerald-400 uppercase">
                  REWARD: 💸 Rp 5,000 (Rupiah)
                </span>

                <div className="flex gap-2 shrink-0">
                  {!tgChannelClaimed && (
                    <a
                      href="https://t.me/galaxxetambang"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                        setTgChannelClicked(true);
                        const key = profile.minerTag ? `ldr_social_channel_clicked_${profile.minerTag}` : "ldr_social_channel_clicked";
                        localStorage.setItem(key, "true");
                      }}
                      className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold transition shadow leading-none flex items-center justify-center text-center"
                    >
                      VISIT LINK
                    </a>
                  )}

                  {tgChannelClaimed ? (
                    <button 
                      disabled 
                      className="py-1 px-2.5 rounded bg-gray-900 border border-gray-850 text-gray-600 text-[10px] font-mono cursor-not-allowed font-medium"
                    >
                      CLAIMED
                    </button>
                  ) : tgChannelClicked ? (
                    <button 
                      onClick={handleClaimChannelReward}
                      className="py-1 px-2.5 rounded bg-green-500 text-black hover:bg-green-400 active:scale-95 text-[10px] font-mono font-black transition shadow animate-pulse"
                    >
                      CLAIM NOW!
                    </button>
                  ) : (
                    <button 
                      disabled 
                      className="py-1 px-2.5 rounded bg-gray-800 text-gray-500 text-[10px] font-mono cursor-not-allowed border border-gray-750 font-medium"
                      title="Please visit the Telegram channel first"
                    >
                      LOCKED
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ach 2: Social Media Group Network Task (Directly merged here) */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              tgGroupClaimed
                ? "border-gray-850 bg-gray-950/25 opacity-70"
                : "border-amber-500/20 bg-[#161a29]"
            }`}>
              <div className="flex items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Social Task
                  </span>
                  <h4 className={`text-sm font-bold mt-2 ${tgGroupClaimed ? "text-gray-500 line-through" : "text-white"}`}>
                    Interact in Community Group
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                    Join the secondary global community group chat to discuss mining strategies and coordinate with co-miners.
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-2.5 truncate break-all">
                    Link: <a href="https://t.me/+q55cAm07WI1lZjk1" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">t.me/galaxxetambang_group</a>
                  </p>
                </div>
                {tgGroupClaimed ? (
                  <span className="p-1 rounded-full bg-gray-900 border border-gray-880 text-emerald-500 shrink-0">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0 animate-bounce">
                    <Sparkles size={14} />
                  </span>
                )}
              </div>

              <div className="mt-4 flex justify-between items-center pt-2.5 border-t border-gray-800/50">
                <span className="text-[10px] font-mono font-bold text-semibold text-emerald-400 uppercase">
                  REWARD: 💸 Rp 1,000 (Rupiah)
                </span>

                <div className="flex gap-2 shrink-0">
                  {!tgGroupClaimed && (
                    <a
                      href="https://t.me/+q55cAm07WI1lZjk1"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                        setTgGroupClicked(true);
                        const key = profile.minerTag ? `ldr_social_group_clicked_${profile.minerTag}` : "ldr_social_group_clicked";
                        localStorage.setItem(key, "true");
                      }}
                      className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold transition shadow leading-none flex items-center justify-center text-center"
                    >
                      VISIT LINK
                    </a>
                  )}

                  {tgGroupClaimed ? (
                    <button 
                      disabled 
                      className="py-1 px-2.5 rounded bg-gray-900 border border-gray-850 text-gray-600 text-[10px] font-mono cursor-not-allowed font-medium"
                    >
                      CLAIMED
                    </button>
                  ) : tgGroupClicked ? (
                    <button 
                      onClick={handleClaimGroupReward}
                      className="py-1 px-2.5 rounded bg-green-500 text-black hover:bg-green-400 active:scale-95 text-[10px] font-mono font-black transition shadow animate-pulse"
                    >
                      CLAIM NOW!
                    </button>
                  ) : (
                    <button 
                      disabled 
                      className="py-1 px-2.5 rounded bg-gray-800 text-gray-500 text-[10px] font-mono cursor-not-allowed border border-gray-750 font-medium"
                      title="Please visit the Telegram group first"
                    >
                      LOCKED
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Achievements items */}
            {achievements.map((ach) => {
              const progressPct = Math.min(100, Math.floor((ach.current / ach.target) * 100));
              const isFinished = ach.current >= ach.target;

              return (
                <div 
                  key={ach.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    ach.completed 
                      ? "border-gray-850 bg-gray-950/20 opacity-70" 
                      : isFinished 
                        ? "border-green-500 bg-green-500/5 animate-pulse" 
                        : "border-gray-800 bg-[#161a29]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Game Milestone
                      </span>
                      <h4 className={`text-sm font-bold mt-2 ${ach.completed ? "text-gray-500 line-through" : "text-white"}`}>
                        {ach.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                    {ach.completed ? (
                      <span className="p-1 rounded-full bg-gray-905 border border-gray-850 text-gray-650 shrink-0">
                        <CheckCircle size={16} />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                        <Gift size={16} />
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mb-1">
                      <span>Progress: {ach.current.toLocaleString()}/{ach.target.toLocaleString()}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          ach.completed ? "bg-gray-700" : isFinished ? "bg-green-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center pt-2 border-t border-gray-800/50">
                    <span className="text-[10px] font-mono font-bold text-green-400 uppercase">
                      REWARD: 🪙 +{ach.reward} LDR
                    </span>

                    {ach.completed ? (
                      <button 
                        disabled 
                        className="py-1 px-3 rounded bg-gray-900 border border-gray-850 text-gray-600 text-xs font-mono cursor-not-allowed font-medium"
                      >
                        CLAIMED
                      </button>
                    ) : isFinished ? (
                      <button 
                        onClick={() => { playUpgradeSound(); onClaimAchievement(ach.id, ach.reward); }}
                        className="py-1 px-3 rounded bg-green-500 text-[#0d0f14] hover:brightness-105 active:scale-95 text-xs font-mono font-bold transition shadow"
                      >
                        CLAIM NOW!
                      </button>
                    ) : (
                      <button 
                        disabled 
                        className="py-1 px-3 rounded bg-gray-800 text-gray-500 text-xs font-mono cursor-not-allowed border border-gray-750 font-medium"
                      >
                        LOCK
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 3. Items / Booster Shop panel */}
      {activeSubTab === 'shop' && (
        <div className="space-y-4 text-left">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Tactical Mining Equipment Depot</h4>
            <p className="text-xs text-gray-400">Upgrade tactical blast accessories and electromagnetic triggers to clear unwanted low-tier debris in the fusion board!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Dynamite Card item */}
            <div className="p-4 rounded-xl border border-gray-800 bg-[#161a29] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl shrink-0">
                  <Bomb size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Item: Mining Dynamite Grenade</h4>
                    <span className="text-[9px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 p-0.5 px-2 rounded-full">
                      Owned: {dynamiteCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">
                    Instantly obliterates all level 0 (Coal) and level 1 (Copper) blocks choking up the reactor grid. Use wisely to prevent Game Over disasters!
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 border-t sm:border-t-0 border-gray-800/60 pt-2.5 sm:pt-0 shrink-0">
                <div className="font-mono text-xs font-semibold text-gray-450">
                  Cost: 🪙 {DYNAMITE_COST} LDR
                </div>
                <button
                  onClick={() => handlePurchaseTool('dynamite', DYNAMITE_COST)}
                  disabled={profile.ldrBalance < DYNAMITE_COST}
                  className={`w-full sm:w-auto py-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profile.ldrBalance >= DYNAMITE_COST
                      ? "bg-red-500 text-white hover:bg-red-650 active:scale-95 shadow"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-750"
                  }`}
                >
                  <span>BUY ITEM</span>
                </button>
              </div>
            </div>

            {/* Magnet Card item */}
            <div className="p-4 rounded-xl border border-gray-800 bg-[#161a29] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl shrink-0">
                  <Zap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Item: Fusion Electromagnet</h4>
                    <span className="text-[9px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 p-0.5 px-2 rounded-full">
                      Owned: {magnetCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">
                    Pulls matching nearby moderate-tier ores with strong force, automatically fusing them to launch combo cascades and free up valuable space.
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 border-t sm:border-t-0 border-gray-800/60 pt-2.5 sm:pt-0 shrink-0">
                <div className="font-mono text-xs font-semibold text-gray-450">
                  Cost: 🪙 {MAGNET_COST} LDR
                </div>
                <button
                  onClick={() => handlePurchaseTool('magnet', MAGNET_COST)}
                  disabled={profile.ldrBalance < MAGNET_COST}
                  className={`w-full sm:w-auto py-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profile.ldrBalance >= MAGNET_COST
                      ? "bg-blue-500 text-white hover:bg-blue-650 active:scale-95 shadow"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-750"
                  }`}
                >
                  <span>BUY ITEM</span>
                </button>
              </div>
            </div>

          </div>

          <div className="bg-[#181d2c] border border-gray-800 p-4 rounded-xl mt-4 flex items-start gap-3">
            <span className="p-1 px-2.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-mono text-[11px] rounded uppercase font-bold tracking-widest shrink-0 mt-0.5">
              LOGISTICAL TIP:
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Dynamite is absolutely critical when elements climb near the <span className="text-red-400">Danger Line</span> trigger. Ensure you keep a handful of boosters ready to protect your session. You can also get free items by completing of Milestone Quests listed in achievements dashboard.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
