/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { createDepositRequestInFirebase } from "../utils/firebase";
import { 
  Landmark, 
  Wallet, 
  Coins, 
  ArrowUpRight, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Bell, 
  Check, 
  ShieldAlert, 
  RefreshCw,
  Trash2
} from "lucide-react";

interface PayoutSystemProps {
  profile: MinerProfile;
  deductBalance: (amount: number) => void;
  deductRupiahBalance: (amount: number) => void;
  onAddBalances: (ldrDelta: number, rupiahDelta: number) => void;
  triggerNotification: (message: string) => void;
  adminQrisMethod: 'dynamic' | 'static';
  adminQrisPayload: string;
  adminDanaNo: string;
  adminBcaNo: string;
  adminMandiriNo: string;
  isAdmin?: boolean;
}

interface TransactionRecord {
  id: string;
  timestamp: string;
  method: string;
  destination: string;
  amountLdr?: number;
  amountRupiah?: number;
  amountFiatCurrency: string;
  status: 'pending' | 'completed' | 'failed';
}

interface AccountAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'security' | 'market' | 'payout';
  isRead: boolean;
}

// Simulated active rolling feed of community withdrawals to keep transaction stats feeling real
function RunningWithdrawalTicker() {
  const [ticks, setTicks] = useState([
    { id: 1, name: "Sultan_Kaltim", amt: "Rp 375,000", method: "GOPAY", ago: "2s ago" },
    { id: 2, name: "CryptoDrill", amt: "54.0 LDR", method: "USDT TRC-20", ago: "15s ago" },
    { id: 3, name: "ZekeXMiner", amt: "Rp 150,000", method: "BCA", ago: "32s ago" },
    { id: 4, name: "NusaCore_Master", amt: "20.0 LDR", method: "DANA", ago: "48s ago" },
  ]);

  useEffect(() => {
    const listMiners = ["Sultan_Kaltim", "CryptoDrill", "ZekeXMiner", "NusaCore_Master", "IdMiner_Max", "BorSakti", "GemLuster", "RiauGold_X", "JavaDrill", "BaliOren"];
    const listMethods = ["DANA", "GOPAY", "OVO", "BCA", "MANDIRI", "USDT TRC-20", "LinkAja"];
    const interval = setInterval(() => {
      const rName = listMiners[Math.floor(Math.random() * listMiners.length)];
      const rMethod = listMethods[Math.floor(Math.random() * listMethods.length)];
      const baseAmt = Math.floor(Math.random() * 45) + 15;
      const isLdr = Math.random() > 0.5;
      const displayAmt = isLdr ? `${baseAmt.toFixed(1)} LDR` : `Rp ${(baseAmt * 12500).toLocaleString("id-ID")}`;
      
      setTicks((prev) => {
        const next = [
          { id: Date.now(), name: rName, amt: displayAmt, method: rMethod, ago: "Just now" },
          ...prev.slice(0, 3)
        ];
        return next;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#0a0d17] border border-amber-500/10 rounded-2xl p-3 select-none relative overflow-hidden mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded leading-none">
          LIVE WITHDRAWAL RUNNING STREAM
        </span>
      </div>
      <div className="flex-1 overflow-hidden h-6 relative">
        <div className="flex gap-4 md:justify-end whitespace-nowrap text-[11px] font-mono text-gray-400 font-medium">
          {ticks.map((t, idx) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 bg-gray-950/70 border border-gray-850 px-3 py-1 rounded-lg">
              <span className="text-white font-bold">{t.name}</span>
              <span className="text-yellow-400 font-semibold">{t.amt}</span>
              <span className="text-gray-500 font-bold">via {t.method}</span>
              <span className="text-green-400 font-bold text-[9px] uppercase tracking-wider bg-green-500/10 border border-green-500/20 px-1.5 py-0.2 rounded leading-none">SUCCESS</span>
              <span className="text-[9px] text-[#556]">{idx === 0 ? "Just now" : `${idx * 16}s ago`}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PayoutSystem({
  profile,
  deductBalance,
  deductRupiahBalance,
  onAddBalances,
  triggerNotification,
  adminQrisMethod,
  adminQrisPayload,
  adminDanaNo,
  adminBcaNo,
  adminMandiriNo,
  isAdmin = false
}: PayoutSystemProps) {
  const getUserKey = (baseKey: string) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    return activeEmail ? `${baseKey}_${activeEmail}` : baseKey;
  };

  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'ewallet' | 'crypto'>('ewallet');
  const [selectedProvider, setSelectedProvider] = useState<string>("DANA");
  const [destinationAccount, setDestinationAccount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawSource] = useState<'ldr' | 'rupiah'>('ldr');

  // Deposit & Swap states
  const [depositAmount, setDepositAmount] = useState<string>("25000");
  const [depositMethod, setDepositMethod] = useState<string>("QRIS");
  const [swapDirection, setSwapDirection] = useState<'ldrToRp' | 'rpToLdr'>('ldrToRp');
  const [swapAmount, setSwapAmount] = useState<string>("");

  // State to handle deposit invoice overlay
  const [activeDepositAmount, setActiveDepositAmount] = useState<number | null>(null);
  const [activeDepositMethod, setActiveDepositMethod] = useState<string>("");
  const [showNoDepositModal, setShowNoDepositModal] = useState<boolean>(false);
  
  // Local transaction and notification states
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [alerts, setAlerts] = useState<AccountAlert[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Simulated rates
  const RATE_RP_PER_LDR = 12500; // Rp 12,500
  const RATE_USDT_PER_LDR = 0.85; // 0.85 USDT

  const handleDepositRupiah = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Please enter a valid aggregate top up amount!");
      return;
    }
    if (amt < 5000) {
      triggerNotification("⚠️ Minimum top up is Rp 5,000!");
      return;
    }

    // Set active deposit to trigger invoice display
    setActiveDepositAmount(amt);
    setActiveDepositMethod(depositMethod);
    triggerNotification(`📄 Top up invoice for Rp ${amt.toLocaleString("id-ID")} generated! Complete payment details below.`);
    playClickSound();
  };

  const handleConfirmDepositPaid = async () => {
    if (!activeDepositAmount) return;
    const amt = activeDepositAmount;
    const method = activeDepositMethod;
    const newTxId = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isAdmin) {
      onAddBalances(0, amt);

      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `DEPOSIT (${method})`,
        destination: "Drill Reactor (Instant Admin)",
        amountRupiah: amt,
        amountFiatCurrency: `Rp ${amt.toLocaleString("id-ID")}`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "⚡ [ADMIN] Deposit Verified Successfully!",
        description: `Rupiah fund injection via ${method} of Rp ${amt.toLocaleString("id-ID")} was verified instantly by the console system.`,
        timestamp: new Date().toISOString(),
        type: "payout",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setActiveDepositAmount(null);
      setDepositAmount("25000");
      playUpgradeSound();
      triggerNotification(`✅ [ADMIN] Successfully loaded Rp ${amt.toLocaleString("id-ID")} via ${method}!`);
    } else {
      setIsProcessing(true);
      const email = localStorage.getItem("ldr_active_email") || profile.username.toLowerCase();
      
      try {
        const success = await createDepositRequestInFirebase(
          newTxId,
          email,
          profile.username,
          amt,
          method
        );

        if (!success) {
          triggerNotification("❌ Failed to forward deposit request. Please try again.");
          setIsProcessing(false);
          return;
        }

        const newTx: TransactionRecord = {
          id: newTxId,
          timestamp: new Date().toISOString(),
          method: `DEPOSIT (${method})`,
          destination: "Mining Core Verification (Pending)",
          amountRupiah: amt,
          amountFiatCurrency: `Rp ${amt.toLocaleString("id-ID")}`,
          status: 'pending'
        };
        const updatedTx = [newTx, ...transactions];
        setTransactions(updatedTx);
        localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

        const newAlert: AccountAlert = {
          id: `ALERT-${newTxId}`,
          title: "⏳ Deposit processing in core network",
          description: `Rupiah balance top up via ${method} of Rp ${amt.toLocaleString("id-ID")} forwarded to core station and awaiting admin approval.`,
          timestamp: new Date().toISOString(),
          type: "payout",
          isRead: false
        };
        const updatedAlerts = [newAlert, ...alerts];
        setAlerts(updatedAlerts);
        localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

        setActiveDepositAmount(null);
        setDepositAmount("25000");
        playUpgradeSound();
        triggerNotification(`⏳ Sucessfully submitted top up of Rp ${amt.toLocaleString("id-ID")} via ${method}! Waiting for verification.`);
      } catch (err) {
        console.error("Deposit request error:", err);
        triggerNotification("❌ Connection error while submitting top up request.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSwapLdr = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(swapAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Please enter a valid swap amount!");
      return;
    }

    if (swapDirection === 'ldrToRp') {
      if (profile.ldrBalance < amt) {
        triggerNotification("⚠️ Insufficient LDR Coin balance for core swap!");
        return;
      }
      const yieldedRp = amt * RATE_RP_PER_LDR;
      onAddBalances(-amt, yieldedRp);

      const newTxId = `SWP-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `SWAP (LDR ➡️ Rp)`,
        destination: "Internal Vault Wallet",
        amountLdr: amt,
        amountRupiah: yieldedRp,
        amountFiatCurrency: `Rp ${yieldedRp.toLocaleString("id-ID")}`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "🔄 Asset Swap Successful!",
        description: `Successfully swapped ${amt} LDR Coins into Rp ${yieldedRp.toLocaleString("id-ID")} at a stable conversion index of 1 LDR = Rp 12,500.`,
        timestamp: new Date().toISOString(),
        type: "market",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setSwapAmount("");
      playUpgradeSound();
      triggerNotification(`✅ Swapped ${amt} LDR into Rp ${yieldedRp.toLocaleString("id-ID")}!`);
    } else {
      const neededRp = amt * RATE_RP_PER_LDR;
      const playerRp = profile.rupiahBalance || 0;
      if (playerRp < neededRp) {
        triggerNotification(`⚠️ Insufficient Rupiah balance! Requires Rp ${neededRp.toLocaleString("id-ID")} to buy ${amt} LDR.`);
        return;
      }
      onAddBalances(amt, -neededRp);

      const newTxId = `SWP-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `SWAP (Rp ➡️ LDR)`,
        destination: "Internal Vault Wallet",
        amountLdr: amt,
        amountRupiah: neededRp,
        amountFiatCurrency: `${amt} LDR`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "🔄 LDR Purchase Successful!",
        description: `Successfully spent Rp ${neededRp.toLocaleString("id-ID")} to purchase ${amt} LDR Coins.`,
        timestamp: new Date().toISOString(),
        type: "market",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setSwapAmount("");
      playUpgradeSound();
      triggerNotification(`✅ Swapped Rp ${neededRp.toLocaleString("id-ID")} into ${amt} LDR!`);
    }
  };

  useEffect(() => {
    const savedTx = localStorage.getItem(getUserKey("ldr_miner_transactions"));
    if (savedTx) {
      try {
        setTransactions(JSON.parse(savedTx));
      } catch (e) {
        console.error("Failed to load transactions list.", e);
      }
    } else {
      const initialTx: TransactionRecord[] = [
        {
          id: "TX-991823",
          timestamp: new Date(Date.now() - 365 * 60000 * 24).toISOString(),
          method: "E-Wallet (GOPAY)",
          destination: "0812****8821",
          amountLdr: 30,
          amountFiatCurrency: "Rp 375,000",
          status: "completed"
        },
        {
          id: "TX-987102",
          timestamp: new Date(Date.now() - 600 * 60000).toISOString(),
          method: "Crypto (USDT TRC-20)",
          destination: "TWhq...881aPX",
          amountLdr: 15,
          amountFiatCurrency: "12.75 USDT",
          status: "completed"
        }
      ];
      setTransactions(initialTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(initialTx));
    }

    const savedAlerts = localStorage.getItem(getUserKey("ldr_miner_alerts"));
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error("Failed to load alerts.", e);
      }
    } else {
      const initialAlerts: AccountAlert[] = [
        {
          id: "ALERT-1",
          title: "🔐 Double Encryption Protocol Online",
          description: "All server sync files in local storage are successfully protected with secure hash verification.",
          timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
          type: "security",
          isRead: false
        },
        {
          id: "ALERT-2",
          title: "📈 Market Expansion Indicator Active (+6.8%)",
          description: "Mined ore index yields improved following deep mantle emerald fusions by registered galaxy operators.",
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          type: "market",
          isRead: false
        }
      ];
      setAlerts(initialAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(initialAlerts));
    }
  }, []);

  useEffect(() => {
    if (profile && profile.rupiahBalance > 0 && transactions.length > 0) {
      const hasPendingDeposit = transactions.some(
        (tx) => tx.method.toUpperCase().includes("DEPOSIT") && tx.status === "pending"
      );
      if (hasPendingDeposit) {
        const updated = transactions.map((tx) => {
          if (tx.method.toUpperCase().includes("DEPOSIT") && tx.status === "pending") {
            return { ...tx, status: "completed" as const };
          }
          return tx;
        });
        saveTransactionsToStorage(updated);
        triggerNotification("🎉 Income Detected! Mined top up was successfully approved.");
      }
    }
  }, [profile?.rupiahBalance, transactions.length]);

  const saveTransactionsToStorage = (updatedList: TransactionRecord[]) => {
    setTransactions(updatedList);
    localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedList));
  };

  const saveAlertsToStorage = (updatedList: AccountAlert[]) => {
    setAlerts(updatedList);
    localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedList));
  };

  const handleMethodChange = (method: 'bank' | 'ewallet' | 'crypto') => {
    playClickSound();
    setPayoutMethod(method);
    setDestinationAccount("");
    if (method === 'bank') {
      setSelectedProvider("BCA");
    } else if (method === 'ewallet') {
      setSelectedProvider("DANA");
    } else {
      setSelectedProvider("USDT (TRC-20)");
    }
  };

  const handleWithdrawClaim = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    const totalDeposit = transactions
      .filter((tx) => tx.method.toUpperCase().includes("DEPOSIT") && (tx.status === "completed" || tx.status === "pending"))
      .reduce((sum, tx) => sum + (tx.amountRupiah || 0), 0);

    const hasAccess = totalDeposit > 0 || (profile.rupiahBalance && profile.rupiahBalance > 0);

    if (!hasAccess) {
      triggerNotification("⚠️ Drill account requires at least 1 verified deposit to construct withdrawals.");
      setShowNoDepositModal(true);
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Please enter a valid aggregate withdrawal quantity!");
      return;
    }

    if (withdrawSource === 'ldr') {
      const minWithdrawal = 20;
      if (amt < minWithdrawal) {
        triggerNotification(`⚠️ Minimum withdrawal target is ${minWithdrawal} LDR Coins!`);
        return;
      }

      if (profile.ldrBalance < amt) {
        triggerNotification("⚠️ Insufficient LDR balance for core payout.");
        return;
      }
    } else {
      const minWithdrawalRupiah = 10000;
      if (amt < minWithdrawalRupiah) {
        triggerNotification(`⚠️ Minimum withdrawal target is Rp ${minWithdrawalRupiah.toLocaleString("en-US")}!`);
        return;
      }

      const playerRp = profile.rupiahBalance || 0;
      if (playerRp < amt) {
        triggerNotification("⚠️ Insufficient Rupiah balance inside drill vault.");
        return;
      }
    }

    const trimmedDest = destinationAccount.trim();
    if (!trimmedDest) {
      triggerNotification("⚠️ Recipient wallet address or account details cannot remain blank!");
      return;
    }

    if (payoutMethod === "crypto" && trimmedDest.length < 15) {
      triggerNotification("⚠️ TRC-20 address appears malformed or missing key parameters.");
      return;
    }

    if ((payoutMethod === "bank" || payoutMethod === "ewallet") && (trimmedDest.length < 8 || isNaN(Number(trimmedDest.replace(/\s+/g, ""))))) {
      triggerNotification("⚠️ Account number or mobile routing details must remain numeric and exceed 8 digits!");
      return;
    }

    let convertedText = "";
    if (withdrawSource === 'ldr') {
      if (payoutMethod === "crypto") {
        convertedText = `${(amt * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
      } else {
        convertedText = `Rp ${(amt * RATE_RP_PER_LDR).toLocaleString("id-ID")}`;
      }
      deductBalance(amt);
    } else {
      if (payoutMethod === "crypto") {
        const estUsdt = (amt / RATE_RP_PER_LDR) * RATE_USDT_PER_LDR;
        convertedText = `${estUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
      } else {
        convertedText = `Rp ${amt.toLocaleString("id-ID")}`;
      }
      deductRupiahBalance(amt);
    }

    const newTxId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx: TransactionRecord = {
      id: newTxId,
      timestamp: new Date().toISOString(),
      method: `${payoutMethod.toUpperCase()} (${selectedProvider})`,
      destination: trimmedDest,
      amountLdr: withdrawSource === 'ldr' ? amt : parseFloat((amt / RATE_RP_PER_LDR).toFixed(2)),
      amountRupiah: withdrawSource === 'rupiah' ? amt : amt * RATE_RP_PER_LDR,
      amountFiatCurrency: convertedText,
      status: 'pending'
    };

    const nextTxList = [newTx, ...transactions];
    saveTransactionsToStorage(nextTxList);

    setWithdrawAmount("");
    setDestinationAccount("");
    const unitText = withdrawSource === 'ldr' ? `${amt} LDR` : `Rp ${amt.toLocaleString("id-ID")}`;
    triggerNotification(`💸 Withdrawal of ${unitText} submitted to processing core queue...`);

    // Simulated 10s background transaction processing
    setTimeout(() => {
      setTransactions((prevTx) => {
        const updated = prevTx.map((tx) => {
          if (tx.id === newTxId) {
            return { ...tx, status: 'completed' as const };
          }
          return tx;
        });
        localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updated));
        return updated;
      });

      const newAlert: AccountAlert = {
        id: `ALERT-TX-${newTxId}`,
        title: "🎉 Withdrawal Cleared Successfully!",
        description: `Funds for ${unitText} (${convertedText}) dispatched securely to your ${selectedProvider} account (${trimmedDest}).`,
        timestamp: new Date().toISOString(),
        type: "payout",
        isRead: false
      };

      setAlerts((prevAlerts) => {
        const updatedAlerts = [newAlert, ...prevAlerts];
        localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));
        return updatedAlerts;
      });

      playUpgradeSound();
      triggerNotification(`✅ PAYOUT COMPLETE: Mined assets of ${convertedText} transferred successfully.`);
    }, 10000);
  };

  const handleMarkAllRead = () => {
    playClickSound();
    const updated = alerts.map(a => ({ ...a, isRead: true }));
    saveAlertsToStorage(updated);
    triggerNotification("All alerts marked as read.");
  };

  const handleClearAlerts = () => {
    playClickSound();
    if (window.confirm("Do you absolutely intend to clear your important notifications history?")) {
      saveAlertsToStorage([]);
      triggerNotification("Cleared notifications list.");
    }
  };

  const getAlertIcon = (type: 'security' | 'market' | 'payout') => {
    switch (type) {
      case "security": return ShieldAlert;
      case "market": return Sparkles;
      case "payout": return Coins;
      default: return Bell;
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto py-2 font-sans animate-fade-in">
      
      {/* 0. Continuous Live Running Ticker Widget (Log Transaksi Withdrawal Berjalan) */}
      <div className="lg:col-span-12">
        <RunningWithdrawalTicker />
      </div>

      {/* 1. Deposit vs Swap LDR System Section */}
      <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dynamic Top Up Panel */}
        <div id="deposit-section" className="bg-[#111625] border border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="text-emerald-400 shrink-0" size={20} />
            <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider font-mono">
              ⚡ TOP UP RUPIAH BALANCE (INSTANT DEPOSIT)
            </h3>
          </div>
          
          <p className="text-xs text-gray-400 mb-4 font-normal leading-relaxed">
            Need Rupiah to cover reactor mining gas fees (Rp 80 per dropped ore)? Top up via instant QRIS scan for free to maintain uninterrupted high-yield operations!
          </p>

          {activeDepositAmount !== null ? (
            <div className="space-y-4 pt-1">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">BILLING STATUS:</span>
                  <span className="text-[10px] bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 px-2 py-0.5 rounded font-mono font-bold animate-pulse">AWAITING TRANSFER</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white font-bold">TOTAL PAYABLE:</span>
                  <span className="text-emerald-400 font-mono font-black">Rp {activeDepositAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed font-mono mt-1 bg-black/40 p-2.5 rounded-lg border border-gray-800">
                  METHOD: <strong className="text-white">{activeDepositMethod}</strong>
                </div>
              </div>

              {activeDepositMethod === "QRIS" && (
                <div className="bg-gray-950/80 border border-gray-850 p-5 rounded-2xl text-center space-y-4 flex flex-col items-center">
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black bg-amber-500/10 px-2.5 py-1 rounded-md">
                    ⚡ SCAN MERCHANT QRIS CODE:
                  </p>
                  <div className="bg-white p-4 rounded-2xl border-4 border-amber-500/80 shadow-xl transition hover:scale-102 duration-300">
                    {adminQrisMethod === 'dynamic' ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(adminQrisPayload)}`} 
                        alt="Merchant QR" 
                        className="w-52 h-52 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-zinc-100 flex flex-col items-center justify-center text-center text-zinc-850 p-3 rounded-xl border border-dashed border-gray-300">
                        <span className="text-2xl font-black">📷 STATIC QR</span>
                        <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed font-sans">
                          Scan static QR code directly inside your e-wallet
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 bg-[#090b11] p-3 rounded-lg border border-gray-850 max-w-xs">
                    <p className="text-[9.5px] text-zinc-400 font-mono leading-relaxed">
                      💡 <strong>SCANNING TIP:</strong> If scanning fails, increase your phone screen brightness or wipe the scanner camera lens before initiating scans.
                    </p>
                  </div>
                  <p className="text-[9px] text-gray-450 font-mono leading-relaxed max-w-xs">
                    Screenshot this QR code and clear payment instantly via <strong>DANA, ShopeePay, GoPay, OVO, LinkAja</strong> or your mobile banking scanner.
                  </p>
                </div>
              )}

              {activeDepositMethod === "GOPAY/DANA" && (
                <div className="bg-gray-950/80 border border-gray-850 p-5 rounded-2xl space-y-4 flex flex-col items-center text-center">
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-black bg-blue-500/10 px-2.5 py-1 rounded-md">
                    📲 DISPATCH VIA DANA INSTANT BARCODE:
                  </p>
                  
                  <div className="bg-white p-4 rounded-2xl border-4 border-blue-500 shadow-xl transition hover:scale-102 duration-300">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(`https://qr.dana.id/v1/2` + adminDanaNo.replace(/[^0-9]/g, ''))}`} 
                      alt="DANA Barcode" 
                      className="w-51 h-51 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <p className="text-[10px] text-gray-300 font-mono leading-relaxed max-w-xs bg-blue-950/20 p-2.5 rounded-lg border border-blue-900/30">
                    🤖 <strong>DANA ACCOUNT INTEROPERABILITY:</strong> Scan directly inside the DANA app scanner camera to automatically resolve our verification protocol endpoint.
                  </p>

                  <div className="space-y-2.5 text-xs font-mono w-full text-left">
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">DESTINATION MOBILE DANA:</span>
                        <span className="text-white font-bold text-sm tracking-wide">{adminDanaNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminDanaNo); triggerNotification("DANA routing number copied!"); }}
                        className="px-3 py-1.5 bg-blue-950/50 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold rounded-lg text-[10px] uppercase transition active:scale-95"
                      >
                        COPY NUMBER
                      </button>
                    </div>
                    
                    <p className="text-[9.5px] text-gray-500 mt-1 italic text-center font-sans">
                      *Send exactly <strong>Rp {activeDepositAmount.toLocaleString("id-ID")}</strong> to the verified DANA system ID listed above.
                    </p>
                  </div>
                </div>
              )}

              {activeDepositMethod === "BANK TRANSFER" && (
                <div className="bg-gray-950/80 border border-gray-850 p-4 rounded-xl space-y-3">
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">RECIPIENT BANK CHANNELS:</p>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">BCA ACCOUNT:</span>
                        <span className="text-white font-bold">{adminBcaNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminBcaNo); triggerNotification("BCA account copied!"); }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-[9px]"
                      >
                        COPY
                      </button>
                    </div>
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">MANDIRI ACCOUNT:</span>
                        <span className="text-white font-bold">{adminMandiriNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminMandiriNo); triggerNotification("Mandiri account copied!"); }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-[9px]"
                      >
                        COPY
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 italic">
                      *Verify payment information corresponds accurately before dispatching funds.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { playClickSound(); setActiveDepositAmount(null); }}
                  className="py-2 px-3 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound(); handleConfirmDepositPaid(); }}
                  className="py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold rounded-xl text-[10px] font-mono uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  CONFIRM PAID
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDepositRupiah} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  SELECT PAYMENT ROUTING:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['QRIS', 'GOPAY/DANA', 'BANK TRANSFER'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { playClickSound(); setDepositMethod(m); }}
                      className={`py-2 px-2 rounded-lg text-[10px] font-bold font-mono transition text-center ${
                        depositMethod === m
                          ? "bg-emerald-500 text-black shadow-md border border-emerald-400"
                          : "bg-gray-950 text-gray-400 hover:text-white border border-gray-850"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  TOP UP RUPIAH AMOUNT:
                </label>
                
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {["10000", "25000", "50000", "100000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { playClickSound(); setDepositAmount(preset); }}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition text-center border ${
                        depositAmount === preset
                          ? "bg-emerald-500 text-black shadow-md border-emerald-400 font-extrabold"
                          : "bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-900 border-gray-800"
                      }`}
                    >
                      Rp {parseInt(preset).toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>

                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 font-mono text-xs">
                    Rp
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Min. Rp 5,000"
                    min="5000"
                    step="1000"
                    className="w-full bg-gray-950 border border-gray-805 rounded-lg pl-9 pr-24 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-1 right-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-md text-[10px] font-mono uppercase transition"
                  >
                    TOP UP
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 font-mono mt-1">Funds loaded are processed within minutes to fuel your active drops instantly.</p>
              </div>
            </form>
          )}
        </div>

        {/* Swap Mined Asset Panel */}
        <div className="bg-[#111625] border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="text-amber-400 shrink-0" size={18} />
            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider font-mono">
              🔄 SWAP MINED ASSETS (LDR 🔁 RUPIAH)
            </h3>
          </div>
          
          <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-850 mb-4 text-xs font-bold font-mono">
            <button
              type="button"
              onClick={() => { playClickSound(); setSwapDirection('ldrToRp'); setSwapAmount(""); }}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                swapDirection === 'ldrToRp'
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400"
              }`}
            >
              LDR Coin ➡️ Rupiah
            </button>
            <button
              type="button"
              onClick={() => { playClickSound(); setSwapDirection('rpToLdr'); setSwapAmount(""); }}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                swapDirection === 'rpToLdr'
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400"
              }`}
            >
              Rupiah ➡️ LDR Coin
            </button>
          </div>

          <form onSubmit={handleSwapLdr} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  {swapDirection === 'ldrToRp' ? "SWAP COINS QUANTITY:" : "BUY COINS QUANTITY:"}
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500 font-mono text-xs">
                    🪙
                  </div>
                  <input
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder={swapDirection === 'ldrToRp' ? "LDR Mined" : "Buy LDR"}
                    min="0.1"
                    step="0.1"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-lg text-xs font-sans tracking-wide transition flex items-center justify-center gap-1"
                >
                  <span>CONVERT NOW</span>
                </button>
              </div>
            </div>

            {swapAmount && !isNaN(parseFloat(swapAmount)) && parseFloat(swapAmount) > 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl text-[11px] font-mono leading-normal">
                <div className="flex justify-between">
                  <span className="text-gray-400">Conversion Rate:</span>
                  <span className="text-white font-bold">1 LDR = Rp {RATE_RP_PER_LDR.toLocaleString("id-ID")}</span>
                </div>
                <div className="h-px bg-gray-800 my-1 px-1" />
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Estimated Yield:</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 font-black">
                    {swapDirection === 'ldrToRp'
                      ? `Rp ${(parseFloat(swapAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")}`
                      : `${parseFloat(swapAmount).toFixed(1)} LDR (Deducts Rp ${(parseFloat(swapAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")})`
                    }
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* 2. Withdrawal Widget Card */}
      <div className="lg:col-span-7 space-y-5 text-left">
        
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 mb-1">
            <Coins className="text-amber-400 shrink-0" size={24} />
            <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">
              LDR Asset Withdrawal & Payout Station
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xl mb-6">
            Convert earned LDR Coins securely back to digital fiat currencies. Choose your preferred withdrawal pipeline below and specify accurate recipient details.
          </p>

          <div className="bg-gray-950/75 border border-gray-850 p-4 rounded-xl flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">LDR mined balance</span>
              <span className="text-lg font-bold font-mono text-amber-500 mt-1 block">
                🪙 {profile.ldrBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 })} LDR
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Bonus Reward Rupiah</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">
                💸 Rp {(profile.rupiahBalance || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-[#0d0f14] p-1.5 rounded-xl border border-gray-850 mb-5">
            <button
              onClick={() => handleMethodChange('ewallet')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "ewallet"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Wallet size={16} />
              <span>E-Wallet</span>
            </button>

            <button
              onClick={() => handleMethodChange('bank')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "bank"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Landmark size={16} />
              <span>Bank Transfer</span>
            </button>

            <button
              onClick={() => handleMethodChange('crypto')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "crypto"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Coins size={16} />
              <span>USDT Token (TRC)</span>
            </button>
          </div>

          <form onSubmit={handleWithdrawClaim} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-3 bg-[#0d0f14] p-3 rounded-xl border border-gray-850">
              <div className="text-left">
                <span className="text-[9px] font-mono text-gray-500 block uppercase font-bold">SOURCE PAYOUT FUND:</span>
                <span className="text-xs font-semibold text-white mt-1 block truncate">
                  {withdrawSource === 'ldr' ? "LDR Mined Coins Pool" : "Rupiah Rewards Balance"}
                </span>
              </div>
              <div className="text-right border-l border-gray-850 pl-3">
                <span className="text-[9px] font-mono text-gray-500 block uppercase font-bold">DESTINATION PIER:</span>
                <span className="text-xs font-bold text-amber-400 mt-1 block uppercase">
                  {payoutMethod} ({selectedProvider})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                CHOOSE RECIPIENT ENDPOINT PROVIDER:
              </label>
              {payoutMethod === "ewallet" && (
                <div className="grid grid-cols-4 gap-2">
                  {["DANA", "GOPAY", "OVO", "ShopeePay"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { playClickSound(); setSelectedProvider(p); }}
                      className={`py-2 px-1.5 rounded-lg text-[10px] font-bold font-mono transition text-center ${
                        selectedProvider === p
                          ? "bg-amber-500 text-black border border-amber-400 font-extrabold"
                          : "bg-gray-950 text-gray-400 hover:text-white border border-gray-850"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {payoutMethod === "bank" && (
                <div className="grid grid-cols-4 gap-2">
                  {["BCA", "MANDIRI", "BNI", "BRI"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { playClickSound(); setSelectedProvider(p); }}
                      className={`py-2 px-1.5 rounded-lg text-[10px] font-bold font-mono transition text-center ${
                        selectedProvider === p
                          ? "bg-amber-500 text-black border border-amber-400 font-extrabold"
                          : "bg-gray-950 text-gray-400 hover:text-white border border-gray-850"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {payoutMethod === "crypto" && (
                <div className="grid grid-cols-2 gap-2 text-left">
                  {["USDT (TRC-20)", "USDC (TRC-20)"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { playClickSound(); setSelectedProvider(p); }}
                      className={`py-2 px-2.5 rounded-lg text-[10px] font-bold font-mono transition ${
                        selectedProvider === p
                          ? "bg-amber-500 text-black border border-amber-400 font-extrabold"
                          : "bg-gray-950 text-gray-400 hover:text-white border border-gray-850"
                      }`}
                    >
                      💎 {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  {withdrawSource === 'ldr' ? "WITHDRAW LDR QUANTITY:" : "WITHDRAW RUPIAH NOMINAL:"}
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500 font-mono text-xs">
                    {withdrawSource === 'ldr' ? "🪙" : "Rp"}
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={withdrawSource === 'ldr' ? "Min. 20 LDR" : "Min. Rp 10k"}
                    min={withdrawSource === 'ldr' ? "20" : "10000"}
                    className="w-full bg-[#0d0f14] border border-gray-770 rounded-lg pl-9 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs font-semibold"
                  />
                  {withdrawSource === 'ldr' && (
                    <button 
                      type="button" 
                      onClick={() => setWithdrawAmount(Math.floor(profile.ldrBalance).toString())}
                      className="absolute inset-y-1.5 right-1.5 bg-[#171c2c] hover:bg-gray-800 text-amber-400 border border-gray-750 font-mono font-bold text-[9px] uppercase px-2 rounded"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  RECIPIENT ROUTING ACCOUNT / ADDR:
                </label>
                <input
                  type="text"
                  value={destinationAccount}
                  onChange={(e) => setDestinationAccount(e.target.value)}
                  placeholder={
                    payoutMethod === "crypto" 
                      ? "Enter TRC-20 Wallet address" 
                      : payoutMethod === "ewallet" 
                        ? "Enter E-Wallet mobile number" 
                        : "Enter Bank routing account numbers"
                  }
                  className="w-full bg-[#0d0f14] border border-gray-770 rounded-lg py-2.5 px-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
            </div>

            {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-1.5 text-xs font-mono animate-fade-in text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Yield Withdrawn:</span>
                  <span className="text-white font-bold">
                    {withdrawSource === 'ldr'
                      ? `${parseFloat(withdrawAmount).toFixed(1)} LDR`
                      : `Rp ${parseFloat(withdrawAmount).toLocaleString("id-ID")}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Processing Gas Fee:</span>
                  <span className="text-green-400 font-bold">0% (CORE FREE)</span>
                </div>
                <div className="h-px bg-gray-800" />
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400 font-bold">Total Expected Net Proceeds:</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-400 font-black">
                    {payoutMethod === "crypto" 
                      ? withdrawSource === 'ldr'
                        ? `${(parseFloat(withdrawAmount) * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        : `${((parseFloat(withdrawAmount) / RATE_RP_PER_LDR) * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                      : withdrawSource === 'ldr'
                        ? `Rp ${(parseFloat(withdrawAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")}`
                        : `Rp ${parseFloat(withdrawAmount).toLocaleString("id-ID")}`
                    }
                  </span>
                </div>
              </div>
            )}

            <div className="p-3.5 bg-gray-950/70 border border-gray-850 rounded-xl flex items-start gap-2 text-[11px] leading-snug text-gray-400 text-left">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                {withdrawSource === 'ldr' ? (
                  <span>Minimum payout core target is <strong>20 LDR COINS</strong>. Blockchain processing transactions run seamlessly via our fast queue protocol.</span>
                ) : (
                  <span>Minimum payout core target is <strong>Rp 10,000</strong>. Your bonus fusion cash is dispatched safely straight into your selected mobile e-wallet or bank router.</span>
                )}
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-black py-3 px-6 rounded-xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition"
            >
              <span>SUBMIT WITHDRAWAL REQUISITION</span>
              <ArrowUpRight size={16} />
            </button>

          </form>
        </div>

        {/* Local Payout Transaction logs list */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2 font-mono">
              <Clock size={16} className="text-amber-400" />
              <span>PAST TRANSACTION HISTORICAL LOGS</span>
            </h4>
            <span className="text-[10px] font-mono text-gray-500">
              Total records: {transactions.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-gray-500 font-mono text-center py-6 block bg-gray-950/50 rounded-xl border border-gray-850">
                No past transactions recorded yet.
              </p>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="bg-gray-950/80 border border-gray-850 p-3 rounded-xl flex items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-extrabold">{tx.method}</span>
                      <span className="text-[10px] text-gray-500">ID: {tx.id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>Recipient: <strong className="text-white">{tx.destination}</strong></span>
                      <span>•</span>
                      <span>{new Date(tx.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" })}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-amber-500 block font-mono">
                      -{tx.amountLdr} LDR
                    </span>
                    <span className="text-[10px] font-extrabold text-teal-400 block">
                      ≈ {tx.amountFiatCurrency}
                    </span>

                    <div className="mt-1 flex justify-end">
                      {tx.status === "pending" ? (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 animate-pulse flex items-center gap-1 leading-none">
                          <span className="w-1 h-1 rounded-full bg-orange-400 animate-ping" />
                          <span>QUEUED</span>
                        </span>
                      ) : tx.status === "completed" ? (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 flex items-center gap-1 leading-none">
                          <Check size={9} />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 leading-none">
                          FAILED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. Right Column: Dynamic System / Account Alerts */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-5">

        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[480px]">
          
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-amber-400 animate-swing" />
                <h4 className="text-sm font-black text-white tracking-widest uppercase font-mono">
                  CRITICAL ACCOUNT ALERTS & NEWS
                </h4>
              </div>
              
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white font-mono font-black text-[10px] p-0.5 px-2 rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </div>

            <div className="flex gap-2.5 justify-end mb-4 text-[10px] font-mono">
              <button 
                onClick={handleMarkAllRead} 
                disabled={alerts.length === 0}
                className="text-gray-400 hover:text-amber-400 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={12} />
                <span>Mark Read</span>
              </button>
              <span className="text-gray-700">|</span>
              <button 
                onClick={handleClearAlerts}
                disabled={alerts.length === 0}
                className="text-gray-400 hover:text-rose-400 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                <span>Clear All</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-10 font-mono text-gray-500 flex flex-col items-center justify-center gap-2.5">
                  <Bell size={24} className="text-gray-700 pointer-events-none" />
                  <p className="text-xs">Drill core quiet. No security or network updates outstanding.</p>
                </div>
              ) : (
                alerts.map((al) => {
                  const Icon = getAlertIcon(al.type);
                  return (
                    <div 
                      key={al.id} 
                      className={`p-3.5 border rounded-xl flex gap-3 transition ${
                        al.isRead 
                          ? "bg-gray-950/40 border-gray-850/50 opacity-75" 
                          : "bg-gray-950/90 border-amber-500/25 shadow-md"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 h-8 w-8 flex items-center justify-center ${
                        al.type === "security" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : al.type === "market" 
                            ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        <Icon size={16} />
                      </div>

                      <div className="grow min-w-0 text-left">
                        <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                          <h5 className="text-xs font-bold text-white tracking-tight leading-tight uppercase">
                            {al.title}
                          </h5>
                          <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                            {new Date(al.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                          {al.description}
                        </p>
                      </div>

                      {!al.isRead && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0 animate-ping" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full bg-[#0d0f13] border border-gray-850 p-3.5 rounded-xl text-left mt-6 font-mono text-[10px] text-gray-500 space-y-1">
            <span className="text-amber-500 font-bold block mb-1">📢 DISPATCH SECURITY GUIDELINES:</span>
            <p className="leading-tight">
              1. Withdrawals are processed queue sequential based on blockchain block inclusion indices (FIFO).
            </p>
            <p className="leading-tight">
              2. Transaction ledger metadata is strictly encrypted in browser local storage database for profile privacy compliance standards.
            </p>
          </div>

        </div>

      </div>

      {showNoDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-[#111625] border border-red-500/40 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute -top-16 inset-x-0 h-32 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="w-14 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShieldAlert size={28} />
            </div>

            <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono mb-2">
              🚨 WITHDRAWALS LOCKED
            </h3>

            <p className="text-xs text-gray-300 font-mono leading-relaxed mb-6">
              Core platform security standards require at least 1 top up verification entry on record to open active outgoing payouts.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowNoDepositModal(false);
                  const depEl = document.getElementById("deposit-section");
                  if (depEl) {
                    depEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-655 hover:to-amber-655 text-white font-extrabold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
              >
                Top Up Balance Now
              </button>
              
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowNoDepositModal(false);
                }}
                className="w-full py-2 bg-gray-900 hover:bg-gray-850 text-gray-400 font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
