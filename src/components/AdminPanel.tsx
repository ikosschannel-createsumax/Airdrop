/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Settings, 
  Tv, 
  Lock, 
  ShieldCheck, 
  FileText, 
  Database, 
  CreditCard,
  Phone,
  QrCode,
  Save,
  Grid,
  Users,
  Search,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Check,
  X,
  Clock,
  RefreshCw,
  MessageSquare,
  Sliders
} from "lucide-react";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { 
  updateUserPasswordInFirebase, 
  deleteUserFromFirebase,
  fetchAllUsersFromFirebase,
  fetchAllDepositRequestsFromFirebase,
  processDepositRequestInFirebase,
  FirebaseDepositRequest,
  fetchChatSettingsFromFirebase,
  updateChatSettingsInFirebase,
  updateUserProfileFieldsInFirebase,
  FirebaseChatSettings
} from "../utils/firebase";

interface AdminPanelProps {
  adminQrisMethod: 'dynamic' | 'static';
  setAdminQrisMethod: (val: 'dynamic' | 'static') => void;
  adminQrisPayload: string;
  setAdminQrisPayload: (val: string) => void;
  adminDanaNo: string;
  setAdminDanaNo: (val: string) => void;
  adminBcaNo: string;
  setAdminBcaNo: (val: string) => void;
  adminMandiriNo: string;
  setAdminMandiriNo: (val: string) => void;
  triggerNotification: (message: string) => void;
}

export default function AdminPanel({
  adminQrisMethod,
  setAdminQrisMethod,
  adminQrisPayload,
  setAdminQrisPayload,
  adminDanaNo,
  setAdminDanaNo,
  adminBcaNo,
  setAdminBcaNo,
  adminMandiriNo,
  setAdminMandiriNo,
  triggerNotification
}: AdminPanelProps) {

  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("ldr_registered_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Chat settings state
  const [chatSettings, setChatSettings] = useState<FirebaseChatSettings>({
    requiresPoints: true,
    costPerMsg: 1,
    defaultPoints: 0
  });

  // User input states for balances and chat points editing
  const [editLdrBalances, setEditLdrBalances] = useState<Record<string, string>>({});
  const [editRupiahBalances, setEditRupiahBalances] = useState<Record<string, string>>({});
  const [editChatPoints, setEditChatPoints] = useState<Record<string, string>>({});

  const [depositRequests, setDepositRequests] = useState<FirebaseDepositRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);

  // Helper to load deposit requests
  const loadDepositRequests = () => {
    setLoadingRequests(true);
    fetchAllDepositRequestsFromFirebase()
      .then((reqs) => {
        setDepositRequests(reqs);
      })
      .catch((err) => {
        console.warn("Could not load deposit requests:", err);
      })
      .finally(() => {
        setLoadingRequests(false);
      });
  };

  // Process a member's pending deposit request
  const handleProcessDeposit = async (requestId: string, userEmail: string, status: 'completed' | 'failed') => {
    try {
      const resp = await processDepositRequestInFirebase(requestId, userEmail, status);
      if (resp) {
        playUpgradeSound();
        triggerNotification(
          status === 'completed'
            ? `✅ Deposit request ${requestId} approved! Saldo updated.`
            : `❌ Deposit request ${requestId} rejected.`
        );
        // Reload requests
        loadDepositRequests();
        // Reload registered users
        fetchAllUsersFromFirebase()
          .then((firebaseUsers) => {
            if (firebaseUsers && firebaseUsers.length > 0) {
              const mapped = firebaseUsers.map(u => ({
                email: u.email,
                passwordHash: u.passwordHash,
                profile: {
                  username: u.username,
                  minerTag: u.minerTag,
                  avatar: u.avatar,
                  role: u.role,
                  level: u.level,
                  experience: u.experience,
                  ldrBalance: u.ldrBalance,
                  rupiahBalance: u.rupiahBalance,
                  highScore: u.highScore,
                  registeredAt: u.registeredAt,
                  chatPoints: u.chatPoints ?? 0
                }
              }));
              setRegisteredUsers(mapped);
              localStorage.setItem("ldr_registered_users", JSON.stringify(mapped));
            }
          });
      } else {
        triggerNotification("⚠️ Failed to process request: it may have already been approved or rejected.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("❌ Error processing deposit request.");
    }
  };

  // Sync with Firestore dynamically on mount
  useEffect(() => {
    fetchAllUsersFromFirebase()
      .then((firebaseUsers) => {
        if (firebaseUsers && firebaseUsers.length > 0) {
          const mapped = firebaseUsers.map(u => ({
            email: u.email,
            passwordHash: u.passwordHash,
            profile: {
              username: u.username,
              minerTag: u.minerTag,
              avatar: u.avatar,
              role: u.role,
              level: u.level,
              experience: u.experience,
              ldrBalance: u.ldrBalance,
              rupiahBalance: u.rupiahBalance,
              highScore: u.highScore,
              registeredAt: u.registeredAt,
              chatPoints: u.chatPoints ?? 0
            }
          }));
          setRegisteredUsers(mapped);
          localStorage.setItem("ldr_registered_users", JSON.stringify(mapped));
        }
      })
      .catch((err) => {
        console.warn("Could not sync users from Firestore on admin load:", err);
      });

    // Load Chat Settings as well
    fetchChatSettingsFromFirebase()
      .then((settings) => {
        if (settings) {
          setChatSettings(settings);
        }
      })
      .catch((e) => console.warn(e));

    // Also load pending deposits
    loadDepositRequests();
  }, []);

  const handleUpdatePassword = (email: string, newPass: string) => {
    if (!newPass.trim()) {
      triggerNotification("⚠️ New password cannot be empty!");
      return;
    }
    
    const updated = registeredUsers.map(user => {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return {
          ...user,
          passwordHash: newPass.trim()
        };
      }
      return user;
    });

    setRegisteredUsers(updated);
    localStorage.setItem("ldr_registered_users", JSON.stringify(updated));
    
    // Clear the typed input
    setNewPasswords(prev => ({ ...prev, [email]: "" }));
    
    // Non-blocking update to Firebase Firestore
    updateUserPasswordInFirebase(email, newPass.trim()).catch(err => {
      console.error("Firebase password update failed: ", err);
    });

    playUpgradeSound();
    triggerNotification(`🔐 Account password for ${email} successfully changed in database!`);
  };

  const handleDeleteUser = (email: string) => {
    if (email.toLowerCase() === "demo@ldrcoin.com") {
      triggerNotification("⚠️ Demo account cannot be deleted!");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete miner ${email}?`)) {
      return;
    }

    const updated = registeredUsers.filter(user => user.email.toLowerCase() !== email.toLowerCase());
    setRegisteredUsers(updated);
    localStorage.setItem("ldr_registered_users", JSON.stringify(updated));

    // Non-blocking deletion in Firebase Firestore
    deleteUserFromFirebase(email).catch(err => {
      console.error("Firebase delete user failed: ", err);
    });

    playUpgradeSound();
    triggerNotification(`❌ Account ${email} deleted successfully from database!`);
  };

  const handleSaveUserBalancesAndPoints = async (email: string) => {
    const targetUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) return;

    const nextLdr = editLdrBalances[email] !== undefined 
      ? parseFloat(editLdrBalances[email]) 
      : targetUser.profile?.ldrBalance;
    const nextRupiah = editRupiahBalances[email] !== undefined 
      ? parseFloat(editRupiahBalances[email]) 
      : targetUser.profile?.rupiahBalance;
    const nextChatPoints = editChatPoints[email] !== undefined 
      ? parseInt(editChatPoints[email], 10) 
      : targetUser.profile?.chatPoints;

    if (isNaN(nextLdr) || isNaN(nextRupiah) || isNaN(nextChatPoints)) {
      triggerNotification("⚠️ Nilai saldo atau poin obrolan tidak valid!");
      return;
    }

    const updated = registeredUsers.map(user => {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return {
          ...user,
          profile: {
            ...user.profile,
            ldrBalance: nextLdr,
            rupiahBalance: nextRupiah,
            chatPoints: nextChatPoints
          }
        };
      }
      return user;
    });
    setRegisteredUsers(updated);
    localStorage.setItem("ldr_registered_users", JSON.stringify(updated));

    try {
      const resp = await updateUserProfileFieldsInFirebase(email, {
        ldrBalance: nextLdr,
        rupiahBalance: nextRupiah,
        chatPoints: nextChatPoints
      });
      if (resp) {
        playUpgradeSound();
        triggerNotification(`✅ Saldo & Poin Obrolan ${email} berhasil diupdate di database!`);
      } else {
        triggerNotification("❌ Gagal mengupdate data user di Firestore!");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("❌ Error mengupdate Firestore.");
    }
  };

  const handleSaveGlobalChatSettings = async () => {
    try {
      const success = await updateChatSettingsInFirebase(chatSettings);
      if (success) {
        playUpgradeSound();
        triggerNotification("💬 Pengaturan Chat Global Berhasil Diupdate di Firestore!");
      } else {
        triggerNotification("❌ Gagal mengupdate pengaturan chat global.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("❌ Terjadi kendala saat update bos.");
    }
  };

  const handleSaveNotification = (field: string) => {
    playUpgradeSound();
    triggerNotification(`💾 Settings for ${field} saved successfully to local storage!`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="admin_panel_wrapper">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/20 via-[#111420] to-amber-950/20 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 shrink-0">
              <Lock size={26} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black bg-amber-500/15 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded uppercase tracking-wider">
                  SYSTEM CONTROL
                </span>
                <span className="text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={10} /> SECURE GATEWAY
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-1.5 font-sans">
                CORE ADMIN PANEL & REACTOR CONTROL
              </h1>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 max-w-xl">
                Centralized gateway configuration, DANA Merchant QRIS EMVCO text payload integration, and automated real-time collection account directory.
              </p>
            </div>
          </div>
          
          <div className="bg-[#090b11] border border-gray-850 p-3 rounded-2xl flex items-center gap-2.5 shrink-0 self-start md:self-auto font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ADMIN STATUS: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Grid Settings Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
        
        {/* Left Settings inputs: 7 cols */}
        <div className="md:col-span-7 bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-gray-850 pb-3">
            <Settings size={18} className="text-amber-400 font-bold" />
            <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
              PAYMENT CONFIGURATION & RECIPIENTS
            </h2>
          </div>

          {/* Subtitle: PRIMARY QRIS METHOD */}
          <div className="space-y-2">
            <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              PRIMARY QRIS METHOD
            </span>
            <div className="grid grid-cols-2 gap-2 bg-[#090b11] p-1 rounded-xl border border-gray-850">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAdminQrisMethod('dynamic');
                }}
                className={`py-3 px-3 rounded-lg text-xs font-bold transition text-center leading-tight ${
                  adminQrisMethod === 'dynamic'
                    ? "bg-[#181f2f] text-amber-400 border border-amber-500/30 font-extrabold shadow-inner"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Payload Text (Dynamic Code)
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAdminQrisMethod('static');
                }}
                className={`py-3 px-3 rounded-lg text-xs font-bold transition text-center leading-tight ${
                  adminQrisMethod === 'static'
                    ? "bg-[#181f2f] text-amber-400 border border-amber-500/30 font-extrabold shadow-inner"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Static QRIS Image Link
              </button>
            </div>
          </div>

          {/* STRING QRIS PAYLOAD */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              STRING QRIS PAYLOAD (EMVCO DANA TEXT)
            </label>
            <div className="relative">
              <textarea
                value={adminQrisPayload}
                rows={4}
                onChange={(e) => setAdminQrisPayload(e.target.value)}
                className="w-full bg-[#090b11] border border-gray-800 rounded-xl p-3.5 text-gray-300 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 leading-relaxed pr-10"
                placeholder="0002010102124049..."
              />
              <button
                onClick={() => handleSaveNotification("QRIS Payload")}
                className="absolute bottom-3 right-3 p-2 bg-gray-900 hover:bg-amber-500 hover:text-black border border-gray-800 rounded-lg text-gray-400 transition"
                title="Save QRIS payload"
              >
                <Save size={14} />
              </button>
            </div>
            <p className="text-[9.5px] text-gray-500 leading-snug">
              Insert your Merchant QRIS code characters (standard EMVCO string). Recruits will see a QR Code automatically generated from this text upon initiating a deposit.
            </p>
          </div>

          {/* ADMIN NUMBERS CONFIG */}
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                ADMIN DANA NUMBER
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Phone size={14} className="text-amber-500" />
                </div>
                <input
                  type="text"
                  value={adminDanaNo}
                  onChange={(e) => setAdminDanaNo(e.target.value)}
                  className="w-full bg-[#090b11] border border-gray-800 rounded-lg py-2.5 pl-9 pr-12 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/15"
                  placeholder="083169046085"
                />
                <button
                  onClick={() => handleSaveNotification("No. DANA")}
                  className="absolute right-1 inset-y-1 px-2.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-amber-400 rounded transition text-[10px] font-semibold font-mono"
                >
                  SAVE
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  BCA BANK ACCOUNT
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <CreditCard size={14} className="text-amber-500" />
                  </div>
                  <input
                    type="text"
                    value={adminBcaNo}
                    onChange={(e) => setAdminBcaNo(e.target.value)}
                    className="w-full bg-[#090b11] border border-gray-800 rounded-lg py-2.5 pl-9 pr-12 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/15"
                    placeholder="1287..."
                  />
                  <button
                    onClick={() => handleSaveNotification("No. BCA")}
                    className="absolute right-1 inset-y-1 px-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-amber-400 rounded transition text-[10px] font-semibold font-mono"
                  >
                    SAVE
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  MANDIRI BANK ACCOUNT
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <CreditCard size={14} className="text-amber-500" />
                  </div>
                  <input
                    type="text"
                    value={adminMandiriNo}
                    onChange={(e) => setAdminMandiriNo(e.target.value)}
                    className="w-full bg-[#090b11] border border-gray-800 rounded-lg py-2.5 pl-9 pr-12 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/15"
                    placeholder="8897..."
                  />
                  <button
                    onClick={() => handleSaveNotification("No. Mandiri")}
                    className="absolute right-1 inset-y-1 px-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-amber-400 rounded transition text-[10px] font-semibold font-mono"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* GLOBAL CHAT SETTINGS */}
          <div className="border-t border-gray-850 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-amber-400" />
              <h3 className="text-xs font-black font-mono text-white tracking-widest uppercase">
                💬 CHATROOM LIVE SERVICE CONTROL
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between bg-[#090b11] border border-gray-850 p-3 rounded-xl">
                <div>
                  <span className="block text-[11px] font-bold text-white uppercase">Status Batasan Obrolan</span>
                  <span className="text-[10px] text-gray-500">Mewajibkan koin/poin obrolan atau gratis</span>
                </div>
                <div className="flex gap-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setChatSettings(prev => ({ ...prev, requiresPoints: true }));
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                      chatSettings.requiresPoints 
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 font-extrabold" 
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Bayar/Poin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setChatSettings(prev => ({ ...prev, requiresPoints: false }));
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                      !chatSettings.requiresPoints 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold" 
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Gratis
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-400 uppercase font-bold">Biaya per Pesan (Poin)</label>
                  <input
                    type="number"
                    min="1"
                    value={chatSettings.costPerMsg}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, costPerMsg: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full bg-[#090b11] border border-gray-850 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-400 uppercase font-bold">Default Poin Chat Baru</label>
                  <input
                    type="number"
                    min="0"
                    value={chatSettings.defaultPoints}
                    onChange={(e) => setChatSettings(prev => ({ ...prev, defaultPoints: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full bg-[#090b11] border border-gray-850 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  handleSaveGlobalChatSettings();
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 tracking-wider text-[11px]"
              >
                <Save size={14} /> SAVE GLOBAL CHAT CONFIG
              </button>
            </div>
          </div>

        </div>

        {/* Right Info and Preview Panel: 5 cols */}
        <div className="md:col-span-5 space-y-6">
          
          {/* PRATINJAU LIVE QR DEPOSIT */}
          <div className="bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-850 pb-3">
              <QrCode size={18} className="text-amber-400" />
              <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                DEPOSIT QR CODE PREVIEW
              </h2>
            </div>

            <div className="bg-[#090b11] border border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-white p-3.5 rounded-2xl border-4 border-gray-800 shadow-md">
                {adminQrisMethod === 'dynamic' ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(adminQrisPayload)}`} 
                    alt="Live Test QR" 
                    className="w-40 h-40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-40 h-40 bg-zinc-100 flex flex-col items-center justify-center text-center text-zinc-800 p-2 rounded-lg">
                    <span className="text-2xl font-black">📷 STATIC</span>
                    <p className="text-[10px] text-zinc-500 mt-1">Manual/static image link</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                  {adminQrisMethod === 'dynamic' ? '⚡ LIVE EMVCO PAYLOAD CODE' : '🚫 STATIC IMAGE ACTIVE'}
                </span>
                <p className="text-[9.5px] text-gray-450 font-mono leading-relaxed px-2">
                  This simulated QR code appears on the <strong className="text-white">PAYOUT & WITHDRAW</strong> tab when users choose QRIS during gas/RP deposit requests.
                </p>
              </div>
            </div>
          </div>

          {/* QUICK ADMIN ACTIONS WIDGET */}
          <div className="bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-850 pb-3">
              <Grid size={17} className="text-amber-400" />
              <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                TIPS & ADMINISTRATION INFO
              </h2>
            </div>

            <div className="text-[11px] text-gray-400 leading-relaxed space-y-3 font-mono">
              <p>
                💡 <strong className="text-white">How does transaction confirmation work?</strong> Recruits enlisting in the game copy designated recipient details or scan the custom QRIS when topping up.
              </p>
              <p>
                ⚡ <strong className="text-white">Real-Time Status:</strong> All gateway parameters are updated instantly in the global reactive context to guarantee immediate client rendering.
              </p>
              <p className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl leading-normal text-[10px]">
                🚨 <strong>Security Reminder:</strong> Never share production bank credentials or live QRIS payloads with unvetted players under sandbox settings.
              </p>
            </div>
          </div>

        </div>

        {/* PERMINTAAN DEPOSIT MEMBER (MENUNGGU PERSETUJUAN) */}
        <div className="md:col-span-12 bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-5" id="deposit_requests_panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Clock size={20} className="text-amber-500 animate-pulse" />
                {depositRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                    MEMBER DEPOSIT REQUESTS
                  </h2>
                  <span className="text-[10px] font-mono font-black bg-red-500/15 text-red-500 border border-red-500/25 px-1.5 py-0.5 rounded uppercase">
                    {depositRequests.filter(r => r.status === 'pending').length} PENDING
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  Manual deposit slips submitted by miners awaiting administrator review and validation.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                loadDepositRequests();
              }}
              disabled={loadingRequests}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-[#090b11] border border-gray-800 hover:border-amber-500/40 text-xs font-mono text-gray-400 hover:text-white rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingRequests ? "animate-spin text-amber-500" : ""} />
              <span>{loadingRequests ? "RELOADING..." : "REFRESH DATA"}</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {depositRequests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="bg-[#090b11] rounded-xl p-8 text-center text-gray-500 border border-gray-850 text-xs font-mono">
                ☕ All clear! No member deposit requests are currently pending.
              </div>
            ) : (
              depositRequests
                .filter(r => r.status === 'pending')
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#090b11] border border-gray-850 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/20 transition shadow-inner"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <CreditCard size={16} />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-bold text-white truncate text-glow-amber">
                            {req.username}
                          </span>
                          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded uppercase font-bold">
                            {req.method}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">
                            {req.id}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono block truncate">
                          {req.email}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-gray-500">
                          <span>Volume:</span>
                          <span className="text-emerald-400 font-bold">Rp {req.amount.toLocaleString("id-ID")}</span>
                          <span>•</span>
                          <span>Time: {new Date(req.timestamp).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => handleProcessDeposit(req.id, req.email, 'completed')}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase rounded-lg text-[10px] font-mono transition"
                      >
                        <Check size={12} />
                        <span>APPROVE</span>
                      </button>
                      <button
                        onClick={() => handleProcessDeposit(req.id, req.email, 'failed')}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white rounded-lg text-[10px] font-mono transition"
                      >
                        <X size={12} />
                        <span>REJECT</span>
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* KELOLA USER & RESET PASSWORD PANEL */}
        <div className="md:col-span-12 bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-3">
            <div className="flex items-center gap-2.5">
              <Users size={20} className="text-amber-400" />
              <div>
                <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                  MANAGE ACCOUNTS & RESET PASSWORDS
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  Registered profiles in the LDR Coin Reactor pool ({registeredUsers.length} Users)
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search email account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090b11] border border-gray-800 rounded-lg py-1.5 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/15"
              />
            </div>
          </div>

          {/* Users Table / Grid list */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {registeredUsers.filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="bg-[#090b11] rounded-xl p-8 text-center text-gray-550 border border-gray-850 text-xs font-mono">
                No registered users match your search query.
              </div>
            ) : (
              registeredUsers
                .filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((user) => {
                  const isVisible = showPasswordMap[user.email] || false;
                  const isDemo = user.email.toLowerCase() === "demo@ldrcoin.com";
                                   return (
                    <div 
                      key={user.email} 
                      className="bg-[#090b11] border border-gray-850 p-4 rounded-xl flex flex-col gap-4 hover:border-amber-500/30 transition shadow-inner"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left side: user email & metadata badge */}
                        <div className="min-w-0 flex-1 flex items-start gap-3 text-left">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                            <Users size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white truncate text-glow-amber">
                                {user.profile?.username || "Miner"}
                              </span>
                              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold uppercase">
                                {user.profile?.minerRole || "Driller"}
                              </span>
                              {isDemo && (
                                <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-bold uppercase">
                                  DEMO ACCT
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 font-mono block truncate mt-0.5">
                              {user.email}
                            </span>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-mono text-gray-500">
                              <span>Lv. {user.profile?.level || 1}</span>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">🪙 {user.profile?.ldrBalance?.toFixed(2) || "0.00"} LDR</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">Rp {user.profile?.rupiahBalance?.toLocaleString("id-ID") || 0}</span>
                              <span>•</span>
                              <span className="text-indigo-450 font-bold">💬 {user.profile?.chatPoints ?? 0} Pts Chat</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Credentials view & Update Password Block */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                          {/* VIEW & EDIT PASSWORD CONTROLS */}
                          <div className="bg-[#111420] border border-gray-800 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs font-mono min-w-[210px] text-left">
                            <div className="text-[11px]">
                              <span className="text-[8px] text-gray-500 uppercase block leading-none mb-1">CURRENT PASSWORD:</span>
                              <span className="text-amber-400 font-bold">
                                {isVisible ? user.passwordHash : "••••••••"}
                              </span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                setShowPasswordMap(prev => ({ ...prev, [user.email]: !isVisible }));
                              }}
                              className="p-1 px-2 bg-gray-900 hover:bg-gray-850 hover:text-white border border-gray-800 text-gray-400 rounded transition flex items-center gap-1 text-[9px]"
                              title={isVisible ? "Hide password" : "Show password"}
                            >
                              {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              <span>{isVisible ? "HIDE" : "SHOW"}</span>
                            </button>
                          </div>

                          {/* RESET BLOCK */}
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Type new password..."
                                value={newPasswords[user.email] || ""}
                                onChange={(e) => setNewPasswords(prev => ({ ...prev, [user.email]: e.target.value }))}
                                className="w-full sm:w-44 bg-gray-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-[11px] text-white font-mono placeholder-gray-600 focus:outline-none focus:border-amber-400"
                              />
                              <KeyRound size={11} className="absolute right-2.5 top-2.5 text-gray-600 pointer-events-none" />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                handleUpdatePassword(user.email, newPasswords[user.email] || "");
                              }}
                              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase rounded-lg text-[10px] font-mono transition"
                            >
                              RESET
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                playClickSound();
                                handleDeleteUser(user.email);
                              }}
                              className="p-1.5 bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-900 hover:text-white rounded-lg transition"
                              title="Hapus akun user"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Subrow for direct balance and chat points adjustments */}
                      <div className="pt-3 border-t border-gray-850 grid grid-cols-1 sm:grid-cols-4 gap-3 text-left w-full font-mono text-[11px]">
                        <div>
                          <label className="block text-[9px] text-gray-450 uppercase font-black tracking-wider mb-1">Set LDR Balance</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={user.profile?.ldrBalance?.toFixed(2) || "0.00"}
                            value={editLdrBalances[user.email] ?? ""}
                            onChange={(e) => setEditLdrBalances(prev => ({ ...prev, [user.email]: e.target.value }))}
                            className="w-full bg-[#111420] border border-gray-800 rounded-lg py-1 px-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-450 uppercase font-black tracking-wider mb-1">Set Rupiah Balance</label>
                          <input
                            type="number"
                            placeholder={user.profile?.rupiahBalance?.toString() || "0"}
                            value={editRupiahBalances[user.email] ?? ""}
                            onChange={(e) => setEditRupiahBalances(prev => ({ ...prev, [user.email]: e.target.value }))}
                            className="w-full bg-[#111420] border border-gray-800 rounded-lg py-1 px-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-450 uppercase font-black tracking-wider mb-1">Set Chat Points</label>
                          <input
                            type="number"
                            placeholder={user.profile?.chatPoints?.toString() || "0"}
                            value={editChatPoints[user.email] ?? ""}
                            onChange={(e) => setEditChatPoints(prev => ({ ...prev, [user.email]: e.target.value }))}
                            className="w-full bg-[#111420] border border-gray-800 rounded-lg py-1 px-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              playClickSound();
                              handleSaveUserBalancesAndPoints(user.email);
                            }}
                            className="w-full py-1.5 px-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold uppercase rounded-lg text-[9px] tracking-widest transition flex items-center justify-center gap-1"
                          >
                            <Save size={11} /> SAVE VALUES
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
