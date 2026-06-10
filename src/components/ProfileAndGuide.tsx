import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  User, 
  Calendar, 
  Mail, 
  Sparkles, 
  Save, 
  HelpCircle, 
  ArrowRight, 
  Play, 
  Flame, 
  Coins, 
  Gift,
  MousePointerClick
} from "lucide-react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { syncUserProfileToFirebase } from "../utils/firebase";

// Pre-defined Dicebear robot avatar seeds for quick selection
const AVATAR_SEEDS = [
  "BaraMan",
  "Kusumax",
  "DrillerPrime",
  "CyberDigger",
  "XenonGear",
  "QuantumGold",
  "AstroCore",
  "VoltSteel"
];

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MinerProfile;
  saveProfileData: (updatedProfile: MinerProfile) => void;
  triggerNotification: (message: string) => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  saveProfileData,
  triggerNotification
}: ProfileEditModalProps) {
  const [username, setUsername] = useState<string>(profile.username);
  const [linkedEmail, setLinkedEmail] = useState<string>(profile.linkedEmail || "");
  const [birthDate, setBirthDate] = useState<string>(profile.birthDate || "");
  const [avatarSeed, setAvatarSeed] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectSeed = (seed: string) => {
    playClickSound();
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setSelectedAvatar(url);
    setAvatarSeed("");
  };

  const handleCustomSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAvatarSeed(val);
    if (val.trim()) {
      setSelectedAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${val.trim()}`);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      triggerNotification("⚠️ Nama pengguna tidak boleh kosong!");
      return;
    }

    setIsSubmitting(true);
    playUpgradeSound();

    const updatedProfile: MinerProfile = {
      ...profile,
      username: username.trim(),
      avatar: selectedAvatar,
      linkedEmail: linkedEmail.trim(),
      birthDate: birthDate
    };

    // Save locally
    saveProfileData(updatedProfile);

    // Sync back to Firebase Database
    try {
      const activeEmail = localStorage.getItem("ldr_active_email") || profile.linkedEmail || "demo@ldrcoin.com";
      const cachedPass = localStorage.getItem(`ldr_miner_pass_${activeEmail.toLowerCase()}`) || "miner123";
      
      const success = await syncUserProfileToFirebase(
        activeEmail,
        cachedPass,
        updatedProfile
      );

      if (success) {
        triggerNotification("🎉 Profil penambang berhasil diperbarui & disinkronisasi!");
      } else {
        triggerNotification("💾 Profil disimpan secara lokal (Offline Mode)");
      }
    } catch (err) {
      console.warn("Could not sync profile to DB:", err);
      triggerNotification("💾 Profil disimpan ke Local Storage");
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-left">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#111420] border-2 border-amber-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
          id="profile_edit_modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <User size={20} className="text-amber-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                EDIT PROFIL DEEP CORE MINER
              </h3>
            </div>
            <button
              onClick={() => { playClickSound(); onClose(); }}
              className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveChanges} className="space-y-4 text-xs">
            {/* Avatar Preview & Custom Generator */}
            <div className="bg-[#0a0d14] p-4 rounded-xl border border-gray-850 space-y-3">
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                🤖 FOTO PROFIL / AVATAR KAMU
              </span>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={selectedAvatar}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl bg-[#11121d] border-2 border-amber-500 p-1 shadow-md pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[8px] font-black p-0.5 px-1.5 rounded uppercase">
                    PREVIEW
                  </div>
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <label className="block text-[9px] text-gray-500 uppercase">Ketik Seed Karakter Robot Barumu</label>
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={handleCustomSeedChange}
                    placeholder="Contoh: RedStrikerX, MechDriller..."
                    className="w-full bg-[#111420] border border-gray-800 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Quick Seeds */}
              <div className="space-y-1.5">
                <label className="block text-[9px] text-gray-500 uppercase">Atau Pilih Seed Karakter Cepat</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {AVATAR_SEEDS.map((seed) => {
                    const seedUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                    const isSelected = selectedAvatar === seedUrl;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => handleSelectSeed(seed)}
                        className={`py-1 px-1 rounded font-mono text-[9px] font-bold border transition ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-300 border-amber-500"
                            : "bg-gray-950 text-gray-400 border-gray-850 hover:bg-gray-900"
                        }`}
                      >
                        {seed}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Display Username</label>
                <input
                  type="text"
                  maxLength={15}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-gray-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-400 font-bold"
                  placeholder="Ketik username penambang..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1.5">
                    <Mail size={12} className="text-amber-500" /> Email Terkait
                  </label>
                  <input
                    type="email"
                    value={linkedEmail}
                    onChange={(e) => setLinkedEmail(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-gray-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-400"
                    placeholder="Contoh: idminer4@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1.5">
                    <Calendar size={12} className="text-amber-500" /> Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-gray-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-400 text-glow-amber font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { playClickSound(); onClose(); }}
                className="flex-1 bg-gray-950 hover:bg-gray-900 text-gray-400 font-black py-2.5 rounded-xl border border-gray-800 transition uppercase tracking-wider text-center"
              >
                KEMBALI
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Save size={14} /> <span>{isSubmitting ? "MENYIMPAN..." : "SAVE PROFILE"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface AppGuidebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppGuidebookModal({
  isOpen,
  onClose
}: AppGuidebookModalProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const nextStep = () => {
    playClickSound();
    setActiveStep(prev => prev < 4 ? prev + 1 : 1);
  };

  const stepsInfo = [
    {
      step: 1,
      title: "1. TAP-TAP LAYAR & ACTIVE MERGING",
      icon: <MousePointerClick className="text-amber-500 animate-bounce" size={24} />,
      desc: "Langkah pertama merintis kekayaan adalah mengoleksi elemen bijih di tab utama 'Merge Game'. Jatuhkan batuan mineral yang sama untuk seketika memfusi mereka ke tingkat yang lebih tinggi! Dapatkan koin LDR dan Exp Points setiap fusi terjadi."
    },
    {
      step: 2,
      title: "2. KLAIM HADIAH HARIAN & LUCKY WHEEL",
      icon: <Gift className="text-emerald-400" size={24} />,
      desc: "Jangan lewatkan tab 'Leaderboards & Quests' untuk mengklaim harian gratis di menu Daily Spins, jalankan misi mining, dan dapatkan booster LDR koin cuma-cuma."
    },
    {
      step: 3,
      title: "3. TINGKATKAN FUSI MINE (SUPER FAST METHOD)",
      icon: <Flame className="text-orange-500 animate-pulse" size={24} />,
      desc: "RAHASIA CEPAT: fusi sampai tingkat terdalam! Jika Anda sukses memadukan mineral/gem mencapai level 7 (Sapphire), Level 8 (Ruby), Level 9 (Amethyst), hingga puncaknya LEVEL 10 (👑 GOLD LDR COIN), Anda akan seketika dihadiahi BONUS saldo Rupiah (Rp Rp) melimpah masuk ke tab payout penarikan uang asli!"
    },
    {
      step: 4,
      title: "4. BELI RIG OTOMATIS (OFFLINE EARNINGS)",
      icon: <Coins className="text-indigo-400" size={24} />,
      desc: "Capek mengetuk layar? Investasikan koin LDR Anda pada 'Rigs Automation'. Beli bor diesel dan mesin sifter listrik agar rig milikmu memanen LDR koin secara pasif secara terus menerus bahkan saat aplikasi sedang ditutup!"
    }
  ];

  const currentStep = stepsInfo[activeStep - 1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-left">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#0f111a] border-2 border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
          id="guidebook_modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-850 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <HelpCircle size={20} className="text-emerald-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                📱 MOBILE APP GUIDEBOOK 101
              </h3>
            </div>
            <button
              onClick={() => { playClickSound(); onClose(); }}
              className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Interactive Tutorial Screen Frame */}
          <div className="bg-[#05060a] border border-gray-850 rounded-2xl p-5 min-h-[300px] flex flex-col justify-between relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl pointer-events-none" />

            {/* Step Counter Tag */}
            <div className="flex gap-1 justify-center mb-4">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => { playClickSound(); setActiveStep(s); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === activeStep ? "w-8 bg-emerald-400" : "w-2 bg-gray-800"
                  }`}
                />
              ))}
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center items-center text-center px-2">
              <div className="w-16 h-16 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-center shadow-lg">
                {currentStep.icon}
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest text-glow-emerald">
                {currentStep.title}
              </h4>
              <p className="text-[11px] text-gray-450 leading-relaxed max-w-[280px]">
                {currentStep.desc}
              </p>
            </div>

            {/* Call Action alert */}
            {activeStep === 3 && (
              <div className="mt-3 bg-red-950/20 border border-red-900/40 p-2 rounded-xl text-[9px] text-rose-300 text-center animate-pulse">
                🔥 Fusi Mine adalah jalan pintas tercepat mengumpulkan saldo rupiah!
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => { playClickSound(); onClose(); }}
              className="flex-1 bg-gray-950 hover:bg-gray-900 text-gray-500 text-xs font-bold py-2.5 rounded-xl border border-gray-850 transition uppercase"
            >
              TUTUP PANDUAN
            </button>
            <button
              onClick={nextStep}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 uppercase"
            >
              <span>{activeStep === 4 ? "MULAI LAGI" : "LANJUT"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
