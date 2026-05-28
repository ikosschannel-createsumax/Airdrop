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
  Trash2
} from "lucide-react";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { 
  updateUserPasswordInFirebase, 
  deleteUserFromFirebase,
  fetchAllUsersFromFirebase
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
              registeredAt: u.registeredAt
            }
          }));
          setRegisteredUsers(mapped);
          localStorage.setItem("ldr_registered_users", JSON.stringify(mapped));
        }
      })
      .catch((err) => {
        console.warn("Could not sync users from Firestore on admin load:", err);
      });
  }, []);

  const handleUpdatePassword = (email: string, newPass: string) => {
    if (!newPass.trim()) {
      triggerNotification("⚠️ Sandi baru tidak boleh kosong!");
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
    triggerNotification(`🔐 Sandi akun ${email} berhasil diubah di database!`);
  };

  const handleDeleteUser = (email: string) => {
    if (email.toLowerCase() === "demo@ldrcoin.com") {
      triggerNotification("⚠️ Akun demo tidak dapat dihapus!");
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna/miner ${email}?`)) {
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
    triggerNotification(`❌ Akun ${email} telah berhasil dihapus dari database!`);
  };

  const handleSaveNotification = (field: string) => {
    playUpgradeSound();
    triggerNotification(`💾 Pengaturan ${field} berhasil disimpan ke penyimpanan lokal!`);
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
                CORE PANEL ADMIN & KONTROL REAKTOR
              </h1>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 max-w-xl">
                Konfigurasi pusat gerbang pembayaran, integrasi teks EMVCO QRIS Dana Merchant, dan no. rekening penampung donasi/deposit otomatis secara real-time.
              </p>
            </div>
          </div>
          
          <div className="bg-[#090b11] border border-gray-850 p-3 rounded-2xl flex items-center gap-2.5 shrink-0 self-start md:self-auto font-mono">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">STATUS ADMIN: AKTIF</span>
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
              KONFIGURASI PEMBAYARAN & REKENING
            </h2>
          </div>

          {/* Subtitle: METODE QRIS UTAMA */}
          <div className="space-y-2">
            <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              METODE QRIS UTAMA
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
                Teks Payload (Dynamic Code)
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
                Link Gambar QRIS Statis
              </button>
            </div>
          </div>

          {/* STRING QRIS PAYLOAD */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              STRING QRIS PAYLOAD (TEKS EMVCO DANA)
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
                onClick={() => handleSaveNotification("Payload QRIS")}
                className="absolute bottom-3 right-3 p-2 bg-gray-900 hover:bg-amber-500 hover:text-black border border-gray-800 rounded-lg text-gray-400 transition"
                title="Simpan payload QRIS"
              >
                <Save size={14} />
              </button>
            </div>
            <p className="text-[9.5px] text-gray-500 leading-snug">
              Masukkan nomor kode QRIS Merchant Anda (string EMVCO standar). Pelanggan akan melihat QR Code terbuat otomatis dari string teks ini saat deposit.
            </p>
          </div>

          {/* ADMIN NUMBERS CONFIG */}
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                NO. DANA ADMIN
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
                  NO. REKENING BCA
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
                  NO. REKENING MANDIRI
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

        </div>

        {/* Right Info and Preview Panel: 5 cols */}
        <div className="md:col-span-5 space-y-6">
          
          {/* PRATINJAU LIVE QR DEPOSIT */}
          <div className="bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-850 pb-3">
              <QrCode size={18} className="text-amber-400" />
              <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                PRATINJAU QR DEPOSIT
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
                    <p className="text-[10px] text-zinc-500 mt-1">Image Link statis / manual</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                  {adminQrisMethod === 'dynamic' ? '⚡ KODE PAYLOAD EMVCO LIVE' : '🚫 GAMBAR STATIC ACTIVE'}
                </span>
                <p className="text-[9.5px] text-gray-400 font-mono leading-relaxed px-2">
                  Ini adalah simulasi QR Code yang dipajang pada tab <strong className="text-white">PAYOUT & CAIR</strong> saat pengguna/pengonfirmasi melakukan deposit.
                </p>
              </div>
            </div>
          </div>

          {/* QUICK ADMIN ACTIONS WIDGET */}
          <div className="bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-850 pb-3">
              <Grid size={17} className="text-amber-400" />
              <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                TIPS & INFORMASI ADMIN
              </h2>
            </div>

            <div className="text-[11px] text-gray-400 leading-relaxed space-y-3 font-mono">
              <p>
                💡 <strong className="text-white">Bagaimana cara kerja transfer instan?</strong> Pengguna game yang mendaftar akan menyalin nomor rekening Anda atau memindai QRIS Anda ketika kehabisan gas Rp 80/drop.
              </p>
              <p>
                ⚡ <strong className="text-white">Status Realtime:</strong> Seluruh konfigurasi di halaman admin disimpan secara lokal ke dalam objek state global demi kecepatan sinkronisasi maksimum.
              </p>
              <p className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl leading-normal text-[10px]">
                🚨 <strong>Catatan Keamanan:</strong> Jangan membagikan payload atau informasi credential sensitif di chat global jika Anda menggunakannya pada environment produksi.
              </p>
            </div>
          </div>

        </div>

        {/* KELOLA USER & RESET PASSWORD PANEL */}
        <div className="md:col-span-12 bg-[#111420] border border-gray-850 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-850 pb-3">
            <div className="flex items-center gap-2.5">
              <Users size={20} className="text-amber-400" />
              <div>
                <h2 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                  KELOLA USER & RESET PASSWORD
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  Daftar akun terdaftar di reaktor LDR Coin ({registeredUsers.length} Users)
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
                placeholder="Cari email user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090b11] border border-gray-800 rounded-lg py-1.5 pl-9 pr-3 text-white text-xs font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/15"
              />
            </div>
          </div>

          {/* Users Table / Grid list */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {registeredUsers.filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="bg-[#090b11] rounded-xl p-8 text-center text-gray-500 border border-gray-850 text-xs font-mono">
                Tidak ada user terdaftar yang cocok dengan pencarian Anda.
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
                      className="bg-[#090b11] border border-gray-850 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-500/30 transition shadow-inner"
                    >
                      {/* Left side: user email & metadata badge */}
                      <div className="min-w-0 flex-1 flex items-start gap-3">
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
                          </div>
                        </div>
                      </div>

                      {/* Right side: Credentials view & Update Password Block */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        {/* VIEW & EDIT PASSWORD CONTROLS */}
                        <div className="bg-[#111420] border border-gray-800 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs font-mono min-w-[210px]">
                          <div className="text-[11px]">
                            <span className="text-[8px] text-gray-500 uppercase block leading-none mb-1">PASSWORD SAAT INI:</span>
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
                            title={isVisible ? "Sembunyikan password" : "Tampilkan password"}
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
                              placeholder="Ketik password baru..."
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
                  );
                })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
