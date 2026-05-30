/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MinerProfile {
  username: string;
  minerTag: string;
  avatar: string;
  role: string;
  level: number;
  experience: number;
  ldrBalance: number;
  rupiahBalance: number;
  highScore: number;
  registeredAt: string;
}

export interface OreDefinition {
  level: number;
  name: string;
  localName: string;
  color: string;
  borderColor: string;
  textColor: string;
  radius: number;
  points: number;
  coinReward: number;
  glow?: string;
  icon?: string;
}

export interface MiningRig {
  id: string;
  name: string;
  localName: string;
  description: string;
  cost: number;
  ldrPerSec: number;
  count: number;
  level: number;
  icon: string;
  category: 'passive' | 'active';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  current: number;
  completed: boolean;
  type: 'score' | 'balance' | 'merge_level' | 'rig_count';
  param?: number; // e.g. merge level 5 (Gold)
}

export interface PhysicsObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  oreLevel: number;
  angle: number;
  angularVelocity: number;
  isMerging: boolean;
  scale: number; // For merge/drop animation effects
  density: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

// Full game configuration of ores (levels 0-10) matching Suika Game mechanics
export const ORE_DEFINITIONS: OreDefinition[] = [
  {
    level: 0,
    name: "Coal",
    localName: "Coal",
    color: "#2C3E50",
    borderColor: "#34495E",
    textColor: "#ECF0F1",
    radius: 18,
    points: 1,
    coinReward: 0.02,
  },
  {
    level: 1,
    name: "Copper",
    localName: "Copper",
    color: "#D35400",
    borderColor: "#E67E22",
    textColor: "#FDFEFE",
    radius: 25,
    points: 3,
    coinReward: 0.05,
  },
  {
    level: 2,
    name: "Iron",
    localName: "Iron",
    color: "#7F8C8D",
    borderColor: "#BDC3C7",
    textColor: "#1A252F",
    radius: 32,
    points: 6,
    coinReward: 0.10,
  },
  {
    level: 3,
    name: "Quartz",
    localName: "Quartz Crystal",
    color: "#AEB6BF",
    borderColor: "#D5D8DC",
    textColor: "#2C3E50",
    radius: 40,
    points: 10,
    coinReward: 0.20,
  },
  {
    level: 4,
    name: "Silver",
    localName: "Silver",
    color: "#85929E",
    borderColor: "#EBEDEF",
    textColor: "#2C3E50",
    radius: 48,
    points: 15,
    coinReward: 0.45,
    glow: "rgba(235, 237, 239, 0.4)"
  },
  {
    level: 5,
    name: "Gold",
    localName: "Pure Gold",
    color: "#F1C40F",
    borderColor: "#F39C12",
    textColor: "#1A252F",
    radius: 56,
    points: 25,
    coinReward: 0.80,
    glow: "rgba(241, 196, 15, 0.5)"
  },
  {
    level: 6,
    name: "Emerald",
    localName: "Emerald",
    color: "#2ECC71",
    borderColor: "#27AE60",
    textColor: "#1A252F",
    radius: 65,
    points: 38,
    coinReward: 1.50,
    glow: "rgba(46, 204, 113, 0.5)"
  },
  {
    level: 7,
    name: "Sapphire",
    localName: "Sapphire Gem",
    color: "#2980B9",
    borderColor: "#3498DB",
    textColor: "#FDFEFE",
    radius: 74,
    points: 55,
    coinReward: 2.50,
    glow: "rgba(52, 152, 219, 0.6)"
  },
  {
    level: 8,
    name: "Ruby",
    localName: "Ruby Gem",
    color: "#C0392B",
    borderColor: "#E74C3C",
    textColor: "#FDFEFE",
    radius: 83,
    points: 80,
    coinReward: 4.50,
    glow: "rgba(231, 76, 60, 0.6)"
  },
  {
    level: 9,
    name: "Amethyst",
    localName: "Amethyst Crystal",
    color: "#8E44AD",
    borderColor: "#9B59B6",
    textColor: "#FDFEFE",
    radius: 93,
    points: 120,
    coinReward: 8.00,
    glow: "rgba(155, 89, 182, 0.7)"
  },
  {
    level: 10,
    name: "LDR Coin",
    localName: "LDR GOLD COIN 👑",
    color: "#D4AC0D",
    borderColor: "#F4D03F",
    textColor: "#1A252F",
    radius: 105,
    points: 250,
    coinReward: 25.00,
    glow: "rgba(244, 208, 63, 0.85)"
  }
];

export const INITIAL_RIGS: MiningRig[] = [
  {
    id: "pickaxe",
    name: "Hyper Pickaxe",
    localName: "Hyper Pickaxe",
    description: "Increases manual tap power and active merge coin bonuses by +15%.",
    cost: 15,
    ldrPerSec: 0,
    count: 0,
    level: 1,
    icon: "Pickaxe",
    category: "active"
  },
  {
    id: "belt",
    name: "Conveyor Sifter",
    localName: "Conveyor Sifter",
    description: "Extracts mineral materials automatically. Generates 0.2 LDR Coins/second.",
    cost: 50,
    ldrPerSec: 0.2,
    count: 0,
    level: 1,
    icon: "Layers",
    category: "passive"
  },
  {
    id: "drill",
    name: "Steam-Powered Drill",
    localName: "Steam-Powered Drill",
    description: "High-rotation steam drill to break down harder bedrock. Generates 1.5 LDR Coins/second.",
    cost: 250,
    ldrPerSec: 1.5,
    count: 0,
    level: 1,
    icon: "Cpu",
    category: "passive"
  },
  {
    id: "laser",
    name: "Plasma Meltdown Rig",
    localName: "Plasma Meltdown Rig",
    description: "Laser beam of pure thermal energy to melt hard deep-core rocks. Generates 8.0 LDR Coins/second.",
    cost: 1200,
    ldrPerSec: 8.0,
    count: 0,
    level: 1,
    icon: "Zap",
    category: "passive"
  },
  {
    id: "neural_miner",
    name: "Neural AI Miner Bot",
    localName: "Neural AI Miner Bot",
    description: "Smart bot using AI profit-optimization algorithms to navigate the deep mantle. Generates 45.0 LDR Coins/second.",
    cost: 6500,
    ldrPerSec: 45.0,
    count: 0,
    level: 1,
    icon: "Bot",
    category: "passive"
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_drop",
    title: "Novice Miner",
    description: "Begin your mining adventure by dropping your first mineral.",
    target: 10,
    reward: 0.5,
    current: 0,
    completed: false,
    type: "score"
  },
  {
    id: "merge_iron",
    title: "Bronze & Iron Age",
    description: "Successfully merge minerals up to Iron Ore (Level 2).",
    target: 2,
    reward: 1,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 2
  },
  {
    id: "merge_gold",
    title: "Midas Touch",
    description: "Obtain Pure Gold (Level 5) through mineral fusion manipulation.",
    target: 5,
    reward: 3.5,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 5
  },
  {
    id: "ldr_miner_hero",
    title: "The LDR Alchemist",
    description: "Legendary status! Successfully fuse the ultimate LDR Gold Coin (Level 10).",
    target: 10,
    reward: 20,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 10
  },
  {
    id: "earn_100",
    title: "Prosperous Collector",
    description: "Accumulate total LDR coin balances up to 100 🪙 LDR.",
    target: 100,
    reward: 2,
    current: 0,
    completed: false,
    type: "balance"
  },
  {
    id: "earn_5000",
    title: "LDR Landlord",
    description: "Amass a colossal fortune of 5,000 🪙 LDR.",
    target: 5000,
    reward: 50,
    current: 0,
    completed: false,
    type: "balance"
  },
  {
    id: "rig_operator",
    title: "Rig Tycoon",
    description: "Own an accumulated total of 5 automatic mining rig units.",
    target: 5,
    reward: 5,
    current: 0,
    completed: false,
    type: "rig_count"
  }
];
