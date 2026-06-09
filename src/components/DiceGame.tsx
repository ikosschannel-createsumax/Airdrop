/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound, playGameOverSound, playPowerupSound } from "../utils/audio";
import { 
  Dices, 
  Swords, 
  Users, 
  Coins, 
  Wallet, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Info, 
  TrendingUp, 
  Zap, 
  Flame, 
  User, 
  AlertTriangle,
  Trophy,
  Activity,
  UserCheck,
  RefreshCw,
  Award
} from "lucide-react";
import { fetchAllUsersFromFirebase } from "../utils/firebase";

interface DiceGameProps {
  profile: MinerProfile;
  onAddBalances: (ldrDelta: number, rupiahDelta: number) => void;
  onUpdateHighScore?: (ptsDelta: number) => void;
  triggerNotification: (msg: string) => void;
}

interface OnlinePlayer {
  username: string;
  minerTag: string;
  role: string;
  score: number;
  avatar: string;
  isReal: boolean;
}

interface LiveChallengeLog {
  id: string;
  time: string;
  player1: string;
  player2: string;
  betType: 'ldr' | 'rupiah';
  betAmount: number;
  roll1: number;
  roll2: number;
  winner: string;
}

interface BotDuelActivity {
  id: string;
  p1: string;
  p2: string;
  betType: 'ldr' | 'rupiah';
  betAmount: number;
  roll1: number;
  roll2: number;
  status: 'ROLLING 🎲' | 'PREPARATION ⚔️' | 'COMPLETED ✅';
  progress: number; // 0 - 100
  winner: string;
}

interface FallingCoin {
  id: string;
  left: number;
  delay: number;
  size: number;
}

export default function DiceGame({ profile, onAddBalances, onUpdateHighScore, triggerNotification }: DiceGameProps) {
  // Sound controls
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Betting state
  const [betCurrency, setBetCurrency] = useState<'ldr' | 'rupiah'>('ldr');
  const [betAmountStr, setBetAmountStr] = useState<string>("1");
  const [selectedOpponent, setSelectedOpponent] = useState<OnlinePlayer | null>(null);

  // Online Players & Matchmaking state
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(142);

  // 10 Second countdown before automatic roll starts
  const [countdown, setCountdown] = useState<number | null>(null);

  // Matchmaking cinematic waiting states
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectStep, setConnectStep] = useState<number>(0);
  const [connectingToName, setConnectingToName] = useState<string>("");

  // Interactive matchmaking steps: Find -> Found -> Confirm Ready -> Wait for opponent ready -> Roll
  const [playerReady, setPlayerReady] = useState<boolean>(false);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);
  const [isWaitingForOpponentReady, setIsWaitingForOpponentReady] = useState<boolean>(false);

  // Rolling state
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [myRoll, setMyRoll] = useState<number | null>(null);
  const [opponentRoll, setOpponentRoll] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [tempMyRoll, setTempMyRoll] = useState<number>(5);
  const [tempOpponentRoll, setTempOpponentRoll] = useState<number>(5);

  // Effect to manage 10 seconds auto roll countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      handleRollDice();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, playerReady, opponentReady, isRolling]);

  // Win streak counter and high-stakes multiplier reward modifier
  const [winStreak, setWinStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);

  // Coins explosion particles list
  const [coinsRain, setCoinsRain] = useState<FallingCoin[]>([]);

  // Live roll stream simulator logs
  const [liveMatches, setLiveMatches] = useState<LiveChallengeLog[]>([]);

  // Real-time active simulated background Bot Duel cards to look completely occupied & alive!
  const [botDuels, setBotDuels] = useState<BotDuelActivity[]>([
    { id: "b1", p1: "Sultan_Kaltim", p2: "BaliOren_99", betType: 'ldr', betAmount: 4.5, roll1: 0, roll2: 0, status: 'ROLLING 🎲', progress: 40, winner: "" },
    { id: "b2", p1: "CryptoDrill", p2: "CyberDigger", betType: 'rupiah', betAmount: 18000, roll1: 0, roll2: 0, status: 'PREPARATION ⚔️', progress: 10, winner: "" }
  ]);

  // Sound Synthesizer function for dice rolling (click-clacks slowing down)
  const synthDiceRollSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Simulate multiple clacks
      for (let i = 0; i < 15; i++) {
        const delay = i * 0.10 + (Math.pow(i, 1.9) * 0.012);
        if (delay > 1.6) break;
        
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = i % 2 === 0 ? "sine" : "triangle";
          // High frequency tech metallic clack
          osc.frequency.setValueAtTime(420 + (12 - i) * 65, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.05);
          
          gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.06);
        }, delay * 1000);
      }
    } catch (e) {
      // AudioContext fails gracefully
    }
  };

  const synthResultSound = (result: 'win' | 'lose' | 'tie') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (result === 'win') {
        // Bright winning cosmic arpeggio (C E G C E G)
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.38);
          }, idx * 70);
        });
      } else if (result === 'lose') {
        // SAD heavy mechanical grinding descending buzzer
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else {
        // Futuristic double pulse for parity tie
        [330, 330].forEach((freq, idx) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
          }, idx * 120);
        });
      }
    } catch (_) {}
  };

  // Matchmaking connect handler with cool waiting tickers
  const handleSelectOpponent = (player: OnlinePlayer) => {
    if (isRolling || isConnecting) return;
    playClickSound();

    // Reset rolls and set connecting state
    setIsConnecting(true);
    setConnectStep(0);
    setConnectingToName(player.username);
    setSelectedOpponent(null);
    setPlayerReady(false);
    setOpponentReady(false);
    setIsWaitingForOpponentReady(false);
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);

    // Speed steps for cinematic wait
    setTimeout(() => {
      setConnectStep(1);
    }, 450);

    setTimeout(() => {
      setConnectStep(2);
    }, 950);

    setTimeout(() => {
      setConnectStep(3);
    }, 1450);

    setTimeout(() => {
      setSelectedOpponent(player);
      setIsConnecting(false);
      triggerNotification(`⚔️ Terhubung! Tantangan duel Anda diterima oleh ${player.username}.`);
    }, 1900);
  };

  // Load online players with clean exclusions
  const loadOnlinePlayers = async () => {
    setIsLoadingPlayers(true);
    try {
      const firebaseUsers = await fetchAllUsersFromFirebase();
      
      const fallbackSeeds: OnlinePlayer[] = [
        { username: "Sultan_Kaltim", minerTag: "sultan#8812", role: "broker", score: 28500, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sultan", isReal: false },
        { username: "BaliOren_99", minerTag: "baliorentag#1104", role: "driller", score: 24100, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=baliorentag", isReal: false },
        { username: "CryptoDrill", minerTag: "cryptodrill#2291", role: "broker", score: 21100, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cryptodrill", isReal: false },
        { username: "CyberDigger", minerTag: "cyberdigger#4004", role: "driller", score: 8400, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cyberdigger", isReal: false },
        { username: "LunaHunter", minerTag: "lunahunter#7722", role: "geologist", score: 3200, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=lunahunter", isReal: false },
        { username: "WiraGravel", minerTag: "wira#1029", role: "driller", score: 1450, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=wira", isReal: false },
        { username: "RigProtector_RI", minerTag: "rigprotec#999", role: "broker", score: 5500, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=rigprot", isReal: false },
        { username: "JavaCore_Gems", minerTag: "javacore#119", role: "geologist", score: 1200, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=javacore", isReal: false },
      ];

      // Format clean users
      const activeUserLower = profile.username?.toLowerCase().trim();

      const realUsers: OnlinePlayer[] = firebaseUsers
        .filter(u => {
          if (!u.username) return false;
          const uNameLower = u.username.toLowerCase().trim();
          if (activeUserLower && uNameLower === activeUserLower) return false;
          return true;
        })
        .map(u => ({
          username: u.username,
          minerTag: u.minerTag || `${u.username.toLowerCase()}#${Math.floor(1000 + Math.random() * 9000)}`,
          role: u.role || "driller",
          score: u.highScore || 0,
          avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
          isReal: true
        }));

      const combined = [...realUsers, ...fallbackSeeds];
      const shuffled = combined.sort(() => 0.5 - Math.random()).slice(0, 7);
      setOnlinePlayers(shuffled);
      setOnlineCount(120 + Math.floor(Math.random() * 45));
    } catch (err) {
      console.error("Failed to fetch leaderboard online players:", err);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  useEffect(() => {
    loadOnlinePlayers();

    // Setup initial logs
    const initialLogs: LiveChallengeLog[] = [
      { id: "1", time: "18:41", player1: "Sultan_Kaltim", player2: "BaliOren_99", betType: 'ldr', betAmount: 2.0, roll1: 8, roll2: 5, winner: "Sultan_Kaltim" },
      { id: "2", time: "18:42", player1: "CryptoDrill", player2: "CyberDigger", betType: 'rupiah', betAmount: 15000, roll1: 9, roll2: 9, winner: "SERI (Refund)" },
      { id: "3", time: "18:43", player1: "JavaCore_Gems", player2: "LunaHunter", betType: 'ldr', betAmount: 0.5, roll1: 3, roll2: 7, winner: "LunaHunter" }
    ];
    setLiveMatches(initialLogs);

    // Bot Duels active background ticker interval
    const duelEngineInterval = setInterval(() => {
      runBackgroundDuelTick();
    }, 1800);

    return () => {
      clearInterval(duelEngineInterval);
    };
  }, []);

  // Background Live bot simulation tick engine to output real-time continuous combats!
  const runBackgroundDuelTick = () => {
    setBotDuels(prev => {
      return prev.map(duel => {
        let nextProg = duel.progress + Math.floor(15 + Math.random() * 25);
        let nextStatus = duel.status;
        let nextRoll1 = duel.roll1;
        let nextRoll2 = duel.roll2;
        let nextWinner = duel.winner;

        if (nextProg >= 100) {
          nextProg = 100;
          nextStatus = 'COMPLETED ✅';
          
          if (nextRoll1 === 0) {
            nextRoll1 = Math.floor(1 + Math.random() * 9);
            nextRoll2 = Math.floor(1 + Math.random() * 9);
            if (nextRoll1 > nextRoll2) {
              nextWinner = duel.p1;
            } else if (nextRoll2 > nextRoll1) {
              nextWinner = duel.p2;
            } else {
              nextWinner = "SERI (Refund)";
            }

            // Flush this duel into the bottom list stream nicely!
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const streamItem: LiveChallengeLog = {
              id: Math.random().toString(),
              time: timeStr,
              player1: duel.p1,
              player2: duel.p2,
              betType: duel.betType,
              betAmount: duel.betAmount,
              roll1: nextRoll1,
              roll2: nextRoll2,
              winner: nextWinner
            };
            
            // Push to state stream list in timeout
            setTimeout(() => {
              setLiveMatches(prevLogs => [streamItem, ...prevLogs.slice(0, 6)]);
              
              // Recycle and generate a brand-new duel in place of this slot!
              recycleBotDuelSlot(duel.id);
            }, 1000);
          }
        } else if (nextProg > 45) {
          nextStatus = 'ROLLING 🎲';
        } else {
          nextStatus = 'PREPARATION ⚔️';
        }

        return {
          ...duel,
          progress: nextProg,
          status: nextStatus,
          roll1: nextRoll1,
          roll2: nextRoll2,
          winner: nextWinner
        };
      });
    });
  };

  // Replace a finished bot card with a fresh pairing!
  const recycleBotDuelSlot = (slotId: string) => {
    const list = [
      "Sultan_Kaltim", "BaliOren_99", "CryptoDrill", "CyberDigger", "LunaHunter", 
      "JavaCore_Gems", "RigProtector_RI", "WiraGravel", "Sultan_Madura", "XRayMiner", "AstroBoy",
      "Kombat_Junior", "BatuBara_King", "GravelGamer", "CyberGeologist", "Srikandi_Rig"
    ];
    
    const p1 = list[Math.floor(Math.random() * list.length)];
    let p2 = list[Math.floor(Math.random() * list.length)];
    while (p2 === p1) {
      p2 = list[Math.floor(Math.random() * list.length)];
    }

    const betType = Math.random() > 0.55 ? 'ldr' : 'rupiah';
    const betAmount = betType === 'ldr' 
      ? parseFloat((0.2 + Math.random() * 4).toFixed(1))
      : Math.floor(1 + Math.random() * 25) * 1000;

    setBotDuels(prev => {
      return prev.map(card => {
        if (card.id === slotId) {
          return {
            id: slotId,
            p1,
            p2,
            betType,
            betAmount,
            roll1: 0,
            roll2: 0,
            status: 'PREPARATION ⚔️',
            progress: 0,
            winner: ""
          };
        }
        return card;
      });
    });
  };

  // Trigger floating party coins on grand win!
  const triggerGoldRain = () => {
    const freshCoins = Array.from({ length: 22 }).map((_, i) => ({
      id: `c_${Date.now()}_${i}`,
      left: Math.random() * 95,
      delay: Math.random() * 1.5,
      size: Math.floor(14 + Math.random() * 18)
    }));
    setCoinsRain(freshCoins);
    
    // Clear coins after animation finishes
    setTimeout(() => {
      setCoinsRain([]);
    }, 4000);
  };

  // Quick preset modifiers
  const applyPresetBet = (val: string) => {
    playClickSound();
    if (val === "MIN") {
      setBetAmountStr(betCurrency === 'ldr' ? "0.1" : "500");
    } else if (val === "MAX") {
      const mVal = betCurrency === 'ldr' ? Math.floor(profile.ldrBalance) : profile.rupiahBalance;
      setBetAmountStr(mVal > 0 ? mVal.toString() : "1");
    } else {
      const curr = parseFloat(betAmountStr) || 0;
      const add = parseFloat(val);
      const res = Math.max(0, curr + add);
      setBetAmountStr(betCurrency === 'ldr' ? res.toFixed(1) : Math.floor(res).toString());
    }
  };

  const handleCurrencyToggle = (curr: 'ldr' | 'rupiah') => {
    playClickSound();
    setBetCurrency(curr);
    setBetAmountStr(curr === 'ldr' ? "1" : "5000");
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);
  };

  // Cancel / Reset Matchmaking state
  const handleCancelMatch = () => {
    playClickSound();
    setSelectedOpponent(null);
    setIsConnecting(false);
    setPlayerReady(false);
    setOpponentReady(false);
    setIsWaitingForOpponentReady(false);
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);
    setCountdown(null);
  };

  // 1. CARI LAWAN DUEL DADU - Start Radar Search Matchmaker
  const handleStartSearch = async () => {
    if (isRolling || isConnecting || selectedOpponent) return;

    const betVal = parseFloat(betAmountStr);
    if (isNaN(betVal) || betVal <= 0) {
      triggerNotification("⚠️ Nominal taruhan tidak valid!");
      return;
    }

    // Check balance validation upfront prior to starting search
    if (betCurrency === 'ldr') {
      if (profile.ldrBalance < betVal) {
        triggerNotification(`⚠️ Koin LDR Anda tidak cukup! Kurang ${(betVal - profile.ldrBalance).toFixed(2)} LDR.`);
        return;
      }
      if (betVal < 0.1) {
        triggerNotification(`⚠️ Batas taruhan LDR minimal adalah 0.1 LDR!`);
        return;
      }
    } else {
      const rpSum = profile.rupiahBalance || 0;
      if (rpSum < betVal) {
        triggerNotification(`⚠️ Saldo Rupiah Anda tidak cukup! Kurang Rp ${(betVal - rpSum).toLocaleString("id-ID")}.`);
        return;
      }
      if (betVal < 500) {
        triggerNotification(`⚠️ Batas taruhan Rupiah minimal adalah Rp 500!`);
        return;
      }
    }

    playClickSound();

    // Select opponent dynamically from onlinePlayers pool
    let candidatePool = [...onlinePlayers];
    if (candidatePool.length === 0) {
      candidatePool = [
        { username: "Sultan_Kaltim", minerTag: "sultan#8812", role: "broker", score: 28500, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sultan", isReal: false },
        { username: "BaliOren_99", minerTag: "baliorentag#1104", role: "driller", score: 24100, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=baliorentag", isReal: false },
        { username: "CryptoDrill", minerTag: "cryptodrill#2291", role: "broker", score: 21100, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cryptodrill", isReal: false },
        { username: "CyberDigger", minerTag: "cyberdigger#4004", role: "driller", score: 8400, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cyberdigger", isReal: false },
        { username: "LunaHunter", minerTag: "lunahunter#7722", role: "geologist", score: 3200, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=lunahunter", isReal: false },
        { username: "WiraGravel", minerTag: "wira#1029", role: "driller", score: 1450, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=wira", isReal: false }
      ];
    }
    
    // Pick random opponent representing real / not-really players
    const matchOpponent = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    // Setup matchmaking states
    setIsConnecting(true);
    setConnectStep(0);
    setConnectingToName(matchOpponent.username);
    setSelectedOpponent(null);
    setPlayerReady(false);
    setOpponentReady(false);
    setIsWaitingForOpponentReady(false);
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);

    // Sequential premium tickers for high-spec feel
    setTimeout(() => {
      setConnectStep(1);
    }, 450);

    setTimeout(() => {
      setConnectStep(2);
    }, 950);

    setTimeout(() => {
      setConnectStep(3);
    }, 1450);

    // Match connected - opponent found! ("Lawan ditemukan")
    setTimeout(() => {
      setSelectedOpponent(matchOpponent);
      setIsConnecting(false);
      triggerNotification(`⚔️ Lawan ditemukan: ${matchOpponent.username}! Klik tombol READY di bawah.`);
      playUpgradeSound();
    }, 1900);
  };

  // 2. TOMBOL READY - Player confirms readiness and waits for opponent setup
  const handleConfirmReady = () => {
    if (!selectedOpponent || playerReady) return;
    playClickSound();
    setPlayerReady(true);
    setIsWaitingForOpponentReady(true);
    triggerNotification(`👍 Anda siap! Menunggu lawan bersedia...`);

    // Simulate opponent ready confirmation after delay
    setTimeout(() => {
      setOpponentReady(true);
      setIsWaitingForOpponentReady(false);
      triggerNotification(`🔥 Lawan READY! Dadu otomatis berputar dalam 10 detik atau klik MULAI PUTAR DADU!`);
      playPowerupSound();
      setCountdown(10); // Start 10 seconds automatic countdown
    }, 1200);
  };

  // 2.5. REMATCH BUTTON ACTION - Resets readiness to let you play again with same matched player
  const handleRematch = () => {
    playClickSound();
    setPlayerReady(false);
    setOpponentReady(false);
    setIsWaitingForOpponentReady(false);
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);
    setCountdown(null);
    triggerNotification(`🔄 Mengajak rematch ${selectedOpponent?.username || "lawan"}! Klik READY saat Anda siap.`);
  };

  // 3. MULAI PUTAR DADU - Visual dice spin animation
  const handleRollDice = () => {
    if (isRolling || !selectedOpponent || !playerReady || !opponentReady) return;

    setCountdown(null); // Cancel automatic countdown if triggered manually

    const betVal = parseFloat(betAmountStr);
    if (isNaN(betVal) || betVal <= 0) {
      triggerNotification("⚠️ Nominal taruhan tidak lengkap!");
      return;
    }

    // Balance check
    if (betCurrency === 'ldr') {
      if (profile.ldrBalance < betVal) {
        triggerNotification(`⚠️ Koin LDR Anda tidak cukup!`);
        return;
      }
    } else {
      const rpSum = profile.rupiahBalance || 0;
      if (rpSum < betVal) {
        triggerNotification(`⚠️ Saldo Rupiah Anda tidak cukup!`);
        return;
      }
    }

    // Deduct bet amount immediately to guarantee stakes locked
    if (betCurrency === 'ldr') {
      onAddBalances(-betVal, 0);
    } else {
      onAddBalances(0, -betVal);
    }

    // Start rolling animation
    setIsRolling(true);
    setGameResult(null);
    setMyRoll(null);
    setOpponentRoll(null);
    synthDiceRollSound();

    let cycles = 0;
    const intervalTime = 80;
    const totalCycles = 18;

    const rollTimer = setInterval(() => {
      setTempMyRoll(Math.floor(1 + Math.random() * 9));
      setTempOpponentRoll(Math.floor(1 + Math.random() * 9));
      cycles++;

      if (cycles >= totalCycles) {
        clearInterval(rollTimer);
        
        const finalMyRoll = Math.floor(1 + Math.random() * 9);
        const finalOpponentRoll = Math.floor(1 + Math.random() * 9);

        setMyRoll(finalMyRoll);
        setOpponentRoll(finalOpponentRoll);
        setTempMyRoll(finalMyRoll);
        setTempOpponentRoll(finalOpponentRoll);

        let finalRes: 'win' | 'lose' | 'tie' = 'tie';
        if (finalMyRoll > finalOpponentRoll) {
          finalRes = 'win';
        } else if (finalMyRoll < finalOpponentRoll) {
          finalRes = 'lose';
        }

        setGameResult(finalRes);
        synthResultSound(finalRes);

        // Payouts & Miner Highscore Composition updates
        if (finalRes === 'win') {
          const nextStreak = winStreak + 1;
          setWinStreak(nextStreak);
          if (nextStreak > maxStreak) {
            setMaxStreak(nextStreak);
          }

          const bonusPct = Math.min(0.25, nextStreak * 0.05);
          const prizeAmt = betVal * 2;
          const streakBonusVal = betVal * bonusPct;
          const totalPrize = prizeAmt + streakBonusVal;

          const ptsReward = 150 + Math.min(50, nextStreak * 10);
          onUpdateHighScore?.(ptsReward);

          if (betCurrency === 'ldr') {
            onAddBalances(totalPrize, 0);
            triggerNotification(`🎉 MENANG MUTLAK! Roll [${finalMyRoll}] vs [${finalOpponentRoll}]. +${betVal.toFixed(2)} LDR & streak bonus +${streakBonusVal.toFixed(2)} LDR! (+${ptsReward} Pts Highscore 🔥)`);
          } else {
            onAddBalances(0, totalPrize);
            triggerNotification(`🎉 MENANG MUTLAK! Roll [${finalMyRoll}] vs [${finalOpponentRoll}]. +Rp ${betVal.toLocaleString("id-ID")} & streak bonus +Rp ${streakBonusVal.toLocaleString("id-ID")}! (+${ptsReward} Pts Highscore 🔥)`);
          }

          triggerGoldRain();
          playUpgradeSound();

        } else if (finalRes === 'tie') {
          const ptsReward = 20;
          onUpdateHighScore?.(ptsReward);

          if (betCurrency === 'ldr') {
            onAddBalances(betVal, 0);
            triggerNotification(`🤝 HASIL SERI! Roll sama [${finalMyRoll}]. Dana taruhan dikembalikan. (+${ptsReward} Pts Highscore 🤝)`);
          } else {
            onAddBalances(0, betVal);
            triggerNotification(`🤝 HASIL SERI! Roll sama [${finalMyRoll}]. Dana taruhan dikembalikan. (+${ptsReward} Pts Highscore 🤝)`);
          }
        } else {
          setWinStreak(0);
          const ptsPenalty = -50;
          onUpdateHighScore?.(ptsPenalty);

          if (betCurrency === 'ldr') {
            triggerNotification(`💀 KALAH DUEL! Roll kalah [${finalMyRoll}] vs [${finalOpponentRoll}]. Terpotong ${betVal.toFixed(1)} LDR. (-50 Pts Highscore 💀)`);
          } else {
            triggerNotification(`💀 KALAH DUEL! Roll kalah [${finalMyRoll}] vs [${finalOpponentRoll}]. Terpotong Rp ${betVal.toLocaleString("id-ID")}. (-50 Pts Highscore 💀)`);
          }
          playGameOverSound();
        }

        setIsRolling(false);
        
        // Push this real-time game to bottom stream log!
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const finalWinnerName = finalRes === 'win' ? (profile.username || "Anda") : (finalRes === 'lose' ? selectedOpponent.username : "SERI (Refund)");
        const realStreamItem: LiveChallengeLog = {
          id: Math.random().toString(),
          time: timeStr,
          player1: profile.username || "Tamu_Miner",
          player2: selectedOpponent.username,
          betType: betCurrency,
          betAmount: betVal,
          roll1: finalMyRoll,
          roll2: finalOpponentRoll,
          winner: finalWinnerName
        };
        
        setLiveMatches(prevLogs => [realStreamItem, ...prevLogs.slice(0, 6)]);
      }
    }, intervalTime);
  };

  // Holographic Cybernetic LEDs Matrix Renderer to meet maximum high-spec standards!
  const renderCyberDice = (num: number, isOpponent: boolean, activeRolling: boolean) => {
    // Determine LED dot patterns for 1 - 9 enneagram system
    const getDots = (val: number) => {
      switch (val) {
        case 1: return [4]; // Middle spot
        case 2: return [0, 8]; // Main diagonal endpoints
        case 3: return [0, 4, 8]; // Diag mid point
        case 4: return [0, 2, 6, 8]; // corners
        case 5: return [0, 2, 4, 6, 8]; // corners with middle
        case 6: return [0, 2, 3, 5, 6, 8]; // vertical columns
        case 7: return [0, 2, 3, 4, 5, 6, 8]; // columns + center
        case 8: return [0, 1, 2, 3, 5, 6, 7, 8]; // all but center
        case 9: return [0, 1, 2, 3, 4, 5, 6, 7, 8]; // all fully illuminated!
        default: return [];
      }
    };

    const dots = getDots(num);
    const glowColor = isOpponent ? "shadow-[0_0_12px_rgba(245,158,11,0.6)]" : "shadow-[0_0_12px_rgba(59,130,246,0.6)]";
    const ledColor = isOpponent ? "bg-amber-400 group-hover:bg-amber-300" : "bg-blue-400 group-hover:bg-blue-300";

    return (
      <div className={`relative w-28 h-28 bg-slate-950 border-2 rounded-2xl p-3 flex flex-col justify-between overflow-hidden transition-all duration-150 ${
        isOpponent 
          ? "border-amber-500/50 shadow-lg shadow-amber-500/5" 
          : "border-blue-500/50 shadow-lg shadow-blue-500/5"
      } ${activeRolling ? "animate-bounce scale-110 rotate-12 border-red-500" : "hover:border-white/20"}`}>
        {/* Holographic matrix lines background overlay */}
        <div className="absolute inset-2 border border-white/5 border-dashed pointer-events-none rounded-lg" />
        
        {/* Grid dots block */}
        <div className="grid grid-cols-3 gap-2 w-full h-[64px] relative z-20">
          {Array.from({ length: 9 }).map((_, idx) => {
            const hasLight = dots.includes(idx);
            return (
              <div 
                key={idx} 
                className={`w-3 h-3 rounded-full mx-auto transition-all duration-100 ${
                  hasLight 
                    ? `${ledColor} ${glowColor} scale-115` 
                    : "bg-gray-900 border border-gray-800"
                }`}
              />
            );
          })}
        </div>

        {/* Binary / Digit layout block */}
        <div className="relative z-20 mt-1 flex items-center justify-between px-1 border-t border-white/5 pt-1">
          <span className="text-[7.5px] font-mono text-gray-500 tracking-wider">HOLO CORE</span>
          <span className={`text-[13px] font-mono font-black ${isOpponent ? "text-amber-400" : "text-blue-400"}`}>
            VAL: <span className="text-white text-sm font-semibold">[{num}]</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-left relative">
      
      {/* Floating Gold Rain Animation Container on Victory */}
      {coinsRain.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {coinsRain.map((coin) => (
            <div
              key={coin.id}
              className="absolute bg-gradient-to-b from-yellow-300 to-amber-500 rounded-full border border-yellow-200 flex items-center justify-center font-mono font-black text-[9px] text-amber-955 select-none animate-fall shadow shadow-yellow-500/50"
              style={{
                left: `${coin.left}%`,
                top: `-20px`,
                width: `${coin.size}px`,
                height: `${coin.size}px`,
                animationDelay: `${coin.delay}s`,
                animationDuration: `3s`
              }}
            >
              $
            </div>
          ))}
        </div>
      )}

      {/* Premium Dice Rolling Stage (lobby is hidden for a cleaner focus) */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-[#101422] border border-gray-850 p-6 rounded-2xl relative overflow-hidden shadow-lg">
            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header with sound trigger and win streak indicator inside the table directly */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-800/60 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0 shadow shadow-amber-500/5">
                  <Dices size={18} className="text-amber-500 rotate-12" />
                </div>
                <div>
                  <h2 className="text-xs font-black tracking-wider uppercase font-mono text-white flex items-center gap-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300">
                      CYBER DADUTRONIC ARENA
                    </span>
                    <span className="bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[8px] px-1.5 py-0.5 rounded uppercase font-black">
                      HD PRO
                    </span>
                  </h2>
                  <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">Arena Dadu 1 s.d. 9 Peluang Setara</p>
                </div>
              </div>

              {/* Controls & Mini Streak Box */}
              <div className="flex items-center gap-2">
                {winStreak > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/35 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse shrink-0">
                    <Flame size={12} className="text-orange-500 fill-orange-500" />
                    <span className="text-[9px] font-mono text-orange-400 font-extrabold uppercase">
                      STREAK: {winStreak}x (+{(winStreak * 5)}%)
                    </span>
                  </div>
                )}

                <button
                  onClick={() => { playClickSound(); setSoundEnabled(!soundEnabled); }}
                  className={`py-1.5 px-2.5 rounded-lg border flex items-center gap-1 transition font-mono font-bold text-[9px] uppercase select-none ${
                    soundEnabled 
                      ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25" 
                      : "bg-gray-900 text-gray-500 border-gray-800"
                  }`}
                >
                  {soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  <span>SFX</span>
                </button>
              </div>
            </div>

            {/* Duel Area Block */}
            {isConnecting ? (
              /* High Definition Holographic fullscreen/container Radar Scanner */
              <div className="w-full min-h-[290px] bg-[#0c0d1b]/95 border-2 border-orange-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center shadow-[0_0_35px_rgba(249,115,22,0.06)] mb-6 animate-scale-up">
                
                {/* Radar grid coordinates background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,transparent_30%,#0c0d1b_95%) pointer-events-none" />
                
                {/* Sonar sweep overlay */}
                <div className="absolute w-[220px] h-[220px] rounded-full border border-orange-500/10 flex items-center justify-center pointer-events-none">
                  <div className="absolute w-[160px] h-[160px] rounded-full border border-orange-500/15" />
                  <div className="absolute w-[100px] h-[100px] rounded-full border border-orange-500/20" />
                  <div className="absolute w-[50px] h-[50px] rounded-full border border-orange-500/30" />
                  
                  {/* Rotating sweep line */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-orange-500/20 rounded-full animate-[spin_3s_linear_infinite]" />
                  
                  {/* Targeted blips flashing */}
                  <span className="absolute top-[28%] left-[24%] w-1.5 h-1.5 bg-green-400 rounded-full animate-ping opacity-80" />
                  <span className="absolute top-[70%] left-[68%] w-2 h-2 bg-amber-400 rounded-full animate-ping opacity-75" />
                  <span className="absolute top-[16%] left-[76%] w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse opacity-90" />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
                  {/* Futuristic central hub core */}
                  <div className="relative mb-4 flex items-center justify-center">
                    <div className="w-12 h-12 border border-dashed border-orange-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute w-9 h-9 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                    <Swords className="absolute text-orange-500 animate-pulse" size={14} />
                  </div>

                  <span className="text-[9px] font-mono font-black text-orange-500 bg-orange-500/15 py-0.5 px-2.5 rounded-full uppercase tracking-widest border border-orange-500/25 shadow-[0_0_12px_rgba(249,115,22,0.12)] select-none">
                    MEMINDAI ARENA MULTIPLAYER P2P
                  </span>
                  
                  <h3 className="text-xs font-extrabold text-white mt-2.5 font-mono">
                    MENGHUBUNGKAN SALURAN...
                  </h3>
                  
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[270px]">
                    Mendeteksi server miner aktif dengan kecocokan balance & highscore...
                  </p>

                  {/* HD Terminal Connections Output */}
                  <div className="mt-4 bg-black/85 border border-indigo-950/45 rounded-xl p-2.5 w-full font-mono text-[9px] text-left space-y-1 text-gray-500 shadow-inner">
                    <div className="flex items-center justify-between border-b border-gray-900 pb-1.5 mb-1.5">
                      <span className="text-gray-500 uppercase text-[8px] font-black">LOG PERHUBUNGAN KONEKSI</span>
                      <span className="text-emerald-400 text-[8px] animate-pulse">● RADAR ACTIVE</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="text-emerald-500 text-[9px]">⮚</span>
                      <span className="truncate">Frekuensi radar miner-lobby online siap...</span>
                    </div>
                    {connectStep >= 1 ? (
                      <div className="flex items-center gap-1.5 text-gray-200 animate-slide-in">
                        <span className="text-emerald-500 text-[9px]">⮚</span>
                        <span className="truncate text-orange-400">Target ditemukan: <strong className="text-white bg-orange-500/15 px-1 rounded">{connectingToName}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-600 italic">
                        <span>⮚ mencari sinyal miner sekitar...</span>
                      </div>
                    )}
                    {connectStep >= 2 ? (
                      <div className="flex items-center gap-1.5 text-amber-500 animate-slide-in">
                        <span className="text-emerald-500 text-[9px]">⮚</span>
                        <span className="truncate">Sistem kunci taruhan & penjaminan staking pool...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-600 italic">
                        <span>⮚ sinkronisasi jaminan koin...</span>
                      </div>
                    )}
                    {connectStep >= 3 ? (
                      <div className="flex items-center gap-1.5 text-teal-400 font-bold tracking-tight animate-slide-in">
                        <span className="text-teal-400 text-[9px]">⮚</span>
                        <span className="truncate font-black">Lawan menyepakati duel dadu!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-600 italic">
                        <span>⮚ otorisasi persetujuan tanding...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Side-by-Side Duel Visual Table block */
              <div className="grid grid-cols-2 gap-4 items-center bg-gray-950/80 border border-gray-804/65 p-5 rounded-2xl relative mb-6">
                
                {/* VS overlay */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-black w-9 h-9 rounded-full border-4 border-[#101422] flex items-center justify-center font-mono font-black text-[11px] italic z-30 shadow-lg shadow-amber-500/30">
                  VS
                </div>

                {/* Side A: You */}
                <div className="flex flex-col items-center space-y-3.5 pt-2">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img 
                        src={profile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`} 
                        alt="Your Avatar" 
                        className="w-12 h-12 rounded-xl border-2 border-blue-500 bg-[#0d0f14]"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] font-mono leading-none py-0.5 px-1 rounded-full uppercase font-black">
                        YOU
                      </span>
                    </div>
                    <span className="text-xs font-black text-white mt-2 limit-text max-w-[120px] block truncate">
                      {profile.username}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase">{profile.role}</span>
                  </div>

                  {/* Cyber Dice A style */}
                  {renderCyberDice(isRolling ? tempMyRoll : (myRoll || 1), false, isRolling)}

                  <div className="mt-2 text-center h-6">
                    {selectedOpponent ? (
                      playerReady ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)] uppercase">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          READY 👍
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded-full uppercase">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                          BELUM READY
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-extrabold text-gray-600 bg-gray-900 border border-gray-850 px-2.5 py-1 rounded-full uppercase">
                        WAITING
                      </span>
                    )}
                  </div>
                </div>

                {/* Side B: Opponent, Matchmaking, or Idle selector */}
                <div className="flex flex-col items-center justify-center min-h-[190px]">
                  {selectedOpponent === null ? (
                    <div className="flex flex-col items-center justify-center text-center p-3 border border-dashed border-gray-800 rounded-2xl bg-gray-950/45 w-full min-h-[170px] relative overflow-hidden">
                      {/* Pulse circles inside */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-24 h-24 border border-indigo-500/5 rounded-full animate-ping" />
                        <div className="w-14 h-14 border border-indigo-500/10 rounded-full animate-[ping_2s_infinite]" />
                      </div>
                      
                      <div className="w-9 h-9 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-2 relative z-10 animate-pulse">
                        <Users size={16} className="text-indigo-400" />
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase tracking-wider block relative z-10 leading-none">
                        SIAP DUEL DADU!
                      </span>
                      <p className="text-[9px] text-gray-500 max-w-[145px] inline-block mt-1.5 font-sans leading-relaxed relative z-10">
                        Masukkan taruhan Anda dan tekan tombol di bawah untuk mencari lawan!
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3.5 pt-1 animate-scale-up w-full">
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <img 
                            src={selectedOpponent.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=fallback"} 
                            alt="Opponent Avatar" 
                            className="w-12 h-12 rounded-xl border-2 border-amber-500 bg-[#0d0f14]"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[8px] font-mono leading-none py-0.5 px-1 rounded-full uppercase font-bold">
                            FOE
                          </span>
                        </div>
                        <span className="text-xs font-black text-white mt-1 limit-text max-w-[120px] block truncate">
                          {selectedOpponent.username}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500 uppercase">{selectedOpponent.role}</span>
                      </div>

                      {/* Cyber Dice B style */}
                      {renderCyberDice(isRolling ? tempOpponentRoll : (opponentRoll || 1), true, isRolling)}

                      <div className="mt-2 text-center h-6">
                        {opponentReady ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)] uppercase">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            READY 👍
                          </span>
                        ) : isWaitingForOpponentReady ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/35 px-2.5 py-1 rounded-full uppercase animate-pulse">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                            MENUNGGU...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold bg-rose-500/10 text-rose-420 border border-rose-500/25 px-2.5 py-1 rounded-full uppercase">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                            BELUM READY
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Match outcomes banners */}
            {gameResult && !isRolling && (
              <div className="mb-6 animate-scale-up">
                {gameResult === 'win' && (
                  <div className="bg-emerald-500/10 border-2 border-emerald-500/35 p-4 rounded-2xl text-center relative overflow-hidden shadow-emerald-500/5 shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block font-mono">
                      GRAND VICTORY 🚀
                    </span>
                    <h4 className="text-xl font-black text-white mt-1 uppercase flex items-center justify-center gap-1.5">
                      <Trophy size={20} className="text-yellow-400 animate-bounce" />
                      <span>ANDA MENANG MUTLAK!</span>
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-1.5 font-mono">
                      Dadu Anda <strong className="text-blue-400">[{myRoll}]</strong> menggasak dadu lawan <strong className="text-amber-400">[{opponentRoll}]</strong>. Streak bonus sebesar <strong className="text-emerald-400">+{(winStreak * 5)}%</strong> berhasil diklaim!
                    </p>
                  </div>
                )}
                {gameResult === 'lose' && (
                  <div className="bg-rose-500/10 border-2 border-rose-500/35 p-4 rounded-2xl text-center">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest block font-mono">BATTLE DEFEAT 💀</span>
                    <h4 className="text-xl font-black text-white mt-1 uppercase">ANDA KALAH DUEL</h4>
                    <p className="text-[11px] text-gray-300 mt-1 font-mono">
                      Dadu lawan <strong className="text-amber-400">[{opponentRoll}]</strong> melampaui dadu Anda <strong className="text-blue-400">[{myRoll}]</strong>. Rantai streak beruntun Anda gugur. Latih taktik dan hantam balik!
                    </p>
                  </div>
                )}
                {gameResult === 'tie' && (
                  <div className="bg-amber-500/10 border-2 border-amber-500/35 p-4 rounded-2xl text-center">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block font-mono">TACTICAL DRAW 🤝</span>
                    <h4 className="text-xl font-black text-white mt-1 uppercase">PERTANDINGAN SERI</h4>
                    <p className="text-[11px] text-gray-300 mt-1 font-mono">
                      Kedua dadu bernilai setara <strong className="text-amber-400">[{myRoll}]</strong>. Seluruh dana taruhan Anda dikembalikan penuh tanpa potongan sedikit pun.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Balances Indicators */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-950 p-3 rounded-xl border border-gray-900">
              <div>
                <span className="text-[9px] font-mono text-gray-500 block uppercase font-bold leading-none">YOUR LDR COINS:</span>
                <span className="text-sm font-black text-amber-500 font-mono mt-1 block">
                  🪙 {profile.ldrBalance.toFixed(2)} LDR
                </span>
              </div>
              <div className="border-l border-gray-850 pl-3">
                <span className="text-[9px] font-mono text-gray-500 block uppercase font-bold leading-none">YOUR RUPIAH REWARDS:</span>
                <span className="text-sm font-black text-emerald-400 font-mono mt-1 block">
                  Rp {(profile.rupiahBalance || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Betting Input & Controls form */}
            <div className="space-y-4">
              
              {/* Currency Selector option */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-black">
                  PILIH METODE MATARUANG TARUHAN:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCurrencyToggle('ldr')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-2 border ${
                      betCurrency === 'ldr'
                        ? "bg-amber-500 text-black font-black shadow-md border-amber-400"
                        : "bg-gray-950 text-gray-400 hover:text-white border-transparent"
                    }`}
                  >
                    <Coins size={14} />
                    <span>LDR COINGAME</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyToggle('rupiah')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-2 border ${
                      betCurrency === 'rupiah'
                        ? "bg-emerald-500 text-black font-black shadow-md border-emerald-400"
                        : "bg-gray-950 text-gray-400 hover:text-white border-transparent"
                    }`}
                  >
                    <Wallet size={14} />
                    <span>RUPIAH REWARDS</span>
                  </button>
                </div>
              </div>

              {/* Amount input block with presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 font-black">
                    NOMINAL JUMLAH TARUHAN:
                  </label>
                  <span className="text-[9px] font-mono text-gray-500">
                    {betCurrency === 'ldr' ? "Min. 0.1 LDR" : "Min. Rp 500"}
                  </span>
                </div>

                <div className="relative rounded-xl shadow-sm mb-2.5">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#b1b9e5] font-mono text-xs">
                    {betCurrency === 'ldr' ? "🪙" : "Rp"}
                  </div>
                  <input
                    type="number"
                    value={betAmountStr}
                    onChange={(e) => setBetAmountStr(e.target.value)}
                    disabled={isRolling}
                    className="w-full bg-gray-950 border border-gray-850 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-650 focus:outline-none focus:border-indigo-500 font-mono text-xs font-bold"
                  />
                </div>

                {/* Preset quick buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet("MIN")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-gray-400 hover:text-white font-mono text-[9px] font-black uppercase rounded transition"
                  >
                    MIN
                  </button>
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet(betCurrency === 'ldr' ? "0.1" : "500")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-gray-400 hover:text-white font-mono text-[9px] font-black uppercase rounded transition"
                  >
                    +{betCurrency === 'ldr' ? "0.1" : "500"}
                  </button>
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet(betCurrency === 'ldr' ? "1" : "5000")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-gray-400 hover:text-white font-mono text-[9px] font-black uppercase rounded transition"
                  >
                    +{betCurrency === 'ldr' ? "1.0" : "5rb"}
                  </button>
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet(betCurrency === 'ldr' ? "5" : "15000")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-gray-400 hover:text-white font-mono text-[9px] font-black uppercase rounded transition"
                  >
                    +{betCurrency === 'ldr' ? "5.0" : "15rb"}
                  </button>
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet(betCurrency === 'ldr' ? "20" : "50000")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-gray-400 hover:text-white font-mono text-[9px] font-black uppercase rounded transition"
                  >
                    +{betCurrency === 'ldr' ? "20" : "50rb"}
                  </button>
                  <button
                    type="button"
                    disabled={isRolling}
                    onClick={() => applyPresetBet("MAX")}
                    className="py-1 px-2.5 bg-gray-900 hover:bg-[#111526] border border-gray-850 text-[#f59e0b] hover:text-amber-300 font-mono text-[9px] font-black uppercase rounded font-extrabold transition"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Dynamic Matchmaking / Readiness / Rolling Game Action Button */}
              {(() => {
                if (selectedOpponent && gameResult !== null) {
                  return (
                    <div className="mt-6 flex flex-col gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={handleRematch}
                        className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 border border-emerald-500/25 text-white font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 select-none hover:brightness-110 active:scale-98 transition shadow-lg shadow-emerald-500/15"
                      >
                        <RefreshCw size={15} />
                        <span>AJAK TANDING LAGI (REMATCH) 🔄</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMatch}
                        className="w-full py-3 px-4 bg-[#101422] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white font-mono text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-1.5 select-none hover:bg-gray-900 transition-all active:scale-98"
                      >
                        🚪 KELUAR MATCH & CARI LAWAN BARU
                      </button>
                    </div>
                  );
                }

                let buttonAction: () => void | Promise<void> = handleStartSearch;
                let buttonLabel = "CARI LAWAN DUEL ⚔️";
                let buttonColorClass = "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 border border-orange-500/10 text-black shadow-amber-500/10";
                let isButtonDisabled = isRolling || isConnecting;

                if (isConnecting) {
                  buttonLabel = "MENCARI LAWAN DUEL...";
                } else if (selectedOpponent) {
                  if (!playerReady) {
                    buttonLabel = "SAYA SIAP! / SETUJUI READY 👍";
                    buttonAction = handleConfirmReady;
                    buttonColorClass = "bg-gradient-to-r from-emerald-500 to-teal-500 border border-emerald-500/20 text-white shadow-emerald-500/10";
                  } else if (isWaitingForOpponentReady) {
                    buttonLabel = "MENUNGGU LAWAN READY... ⏳";
                    isButtonDisabled = true;
                    buttonColorClass = "bg-gray-800 text-gray-500 border border-gray-750";
                  } else if (playerReady && opponentReady) {
                    if (isRolling) {
                      buttonLabel = "SEDANG MEMUTAR DADU... 🎲";
                      isButtonDisabled = true;
                      buttonColorClass = "bg-gray-800 text-gray-500 border border-gray-750";
                    } else {
                      buttonLabel = countdown !== null ? `MULAI PUTAR DADU 🎲 (AUTO: ${countdown}s)` : "MULAI PUTAR DADU 🎲";
                      buttonAction = handleRollDice;
                      buttonColorClass = "bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 border border-orange-500/25 text-white shadow-red-500/15 animate-pulse";
                    }
                  }
                }

                return (
                  <button
                    type="button"
                    onClick={buttonAction}
                    disabled={isButtonDisabled}
                    className={`w-full mt-6 py-4 px-6 rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2.5 select-none transition-all hover:brightness-110 active:scale-98 shadow-lg ${buttonColorClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Swords size={16} />
                    <span>{buttonLabel}</span>
                  </button>
                );
              })()}

              {selectedOpponent && !isRolling && gameResult === null && (
                <button
                  type="button"
                  onClick={handleCancelMatch}
                  className="w-full mt-2 bg-slate-950 hover:bg-gray-900 border border-gray-850 text-gray-500 hover:text-white py-3 px-4 rounded-xl font-mono text-[10px] font-black uppercase text-center tracking-wider transition"
                >
                  ↩️ CARI LAWAN LAIN / BATALKAN DUEL
                </button>
              )}

            </div>
          </div>
        </div>

      {/* Footer Block: Live Activity Log Streams */}
      <div className="bg-[#101422] border border-gray-850 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5 mb-3 border-b border-gray-800/40 pb-2">
          <Flame size={16} className="text-orange-500 animate-pulse" />
          <span className="text-xs font-black uppercase font-mono tracking-wider text-white">LIVE COMBAT & CHALLENGES STREAM</span>
        </div>
        
        <div className="space-y-2 max-h-[160px] overflow-y-auto font-mono text-[10.5px]">
          {liveMatches.map((m) => {
            const isLdr = m.betType === 'ldr';
            const amtStr = isLdr ? `${m.betAmount.toFixed(1)} LDR` : `Rp ${m.betAmount.toLocaleString("id-ID")}`;
            const wonStr = m.winner.includes("SERI") ? "HASIL SERI" : `${m.winner} MENANG`;
            
            return (
              <div 
                key={m.id} 
                className="flex flex-col md:flex-row items-start md:items-center justify-between p-2 rounded-lg bg-gray-950/65 border border-gray-900 gap-1.5 animate-slide-in"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded font-bold leading-none">{m.time}</span>
                  <span className="text-white font-bold">{m.player1}</span>
                  <span className="text-gray-500">vs</span>
                  <span className="text-white font-bold">{m.player2}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">Taruhan: <strong className={isLdr ? "text-amber-400" : "text-emerald-400"}>{amtStr}</strong></span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">Rolls: <span className="text-indigo-400">[{m.roll1}]</span> vs <span className="text-amber-400">[{m.roll2}]</span></span>
                  <span className="text-gray-500">•</span>
                  <span className={`font-black uppercase px-2 py-0.5 rounded-[4px] text-[9.5px] leading-none ${
                    m.winner.includes("SERI") 
                      ? "bg-amber-500/10 text-amber-500" 
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {wonStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
