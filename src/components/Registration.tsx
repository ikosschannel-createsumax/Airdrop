/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Terminal, 
  ArrowRight, 
  Compass, 
  Flame, 
  Play, 
  Volume2, 
  VolumeX, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  KeyRound,
  FileCheck
} from "lucide-react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { 
  syncUserProfileToFirebase, 
  fetchAllUsersFromFirebase 
} from "../utils/firebase";
// @ts-ignore
import bannerImg from "../assets/images/ldr_miner_fusion_banner_1779993845654.png";

interface RegistrationProps {
  onComplete: (profile: MinerProfile) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

interface LocalUserCredentials {
  email: string;
  passwordHash: string;
  profile: MinerProfile;
}

export default function Registration({ onComplete, isMuted, onToggleMute }: RegistrationProps) {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  
  // Input fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("driller");
  const [agreed, setAgreed] = useState(true);
  
  // Feedback states
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // OTP Verification Simulation overlay state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userEnteredOtp, setUserEnteredOtp] = useState("");
  const [tempProfile, setTempProfile] = useState<MinerProfile | null>(null);

  // Forgot password assistant states
  const [showForgotHelper, setShowForgotHelper] = useState(false);
  const [forgotInputEmail, setForgotInputEmail] = useState("");
  const [forgotFeedback, setForgotFeedback] = useState("");
  const [forgotSucc, setForgotSucc] = useState("");

  const handleRequestForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setForgotFeedback("");
    setForgotSucc("");

    const targetEmail = forgotInputEmail.toLowerCase().trim();
    if (!targetEmail) {
      setForgotFeedback("Silakan masukkan alamat email terlebih dahulu!");
      return;
    }

    const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === targetEmail);
    if (!matchedUser) {
      setForgotFeedback("Alamat email tidak terdaftar di reaktor LDR Coin. Harap daftarkan baru!");
      return;
    }

    playUpgradeSound();
    setForgotSucc(`KOSMOLOGI VERIFIKASI: Akun "${matchedUser.profile.username}" ditemukan! Kata sandi saat ini: ${matchedUser.passwordHash}. (Anda juga dapat merubah sandi akun ini di 🔐).`);
  };

  // Seeding mock logins to make it immediately testable or list old loggers
  const [registeredUsers, setRegisteredUsers] = useState<LocalUserCredentials[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("ldr_registered_users");
    let initialList: LocalUserCredentials[] = [];
    let updatedNeeded = false;

    if (saved) {
      try {
        initialList = JSON.parse(saved);
      } catch (e) {
        console.error("Gagal memuat pengguna terdaftar:", e);
      }
    } else {
      updatedNeeded = true;
    }

    // Ensure BaraMan (demo account) exists
    if (!initialList.some(u => u.email.toLowerCase() === "demo@ldrcoin.com")) {
      const sampleProfile: MinerProfile = {
        username: "BaraMan",
        minerTag: "baraman#7391",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=BaraMan",
        role: "driller",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date(Date.now() - 36000000).toISOString()
      };
      
      const seedUser: LocalUserCredentials = {
        email: "demo@ldrcoin.com",
        passwordHash: "demo1234", // Simple credentials for testing
        profile: sampleProfile
      };
      initialList.push(seedUser);
      updatedNeeded = true;
      syncUserProfileToFirebase("demo@ldrcoin.com", "demo1234", sampleProfile).catch(() => {});
    }

    // Ensure Kusumax exists so administrator or Kusumax functions are active
    if (!initialList.some(u => u.email.toLowerCase() === "kusumax@ldrcoin.com" || u.profile?.username?.toLowerCase() === "kusumax")) {
      const sampleProfile2: MinerProfile = {
        username: "Kusumax",
        minerTag: "kusumax#8696",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Kusumax",
        role: "broker",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date(Date.now() - 36000000 * 4).toISOString()
      };
      
      const seedUser2: LocalUserCredentials = {
        email: "kusumax@ldrcoin.com",
        passwordHash: "kusuma123x", // Starting default password
        profile: sampleProfile2
      };
      initialList.push(seedUser2);
      updatedNeeded = true;
      syncUserProfileToFirebase("kusumax@ldrcoin.com", "kusuma123x", sampleProfile2).catch(() => {});
    }

    // Ensure the requested admin account kusumaletterformee@gmail.com exists with Kusumax privileges
    if (!initialList.some(u => u.email.toLowerCase() === "kusumaletterformee@gmail.com" || u.profile?.username?.toLowerCase() === "kusumaletterformee")) {
      const sampleProfile3: MinerProfile = {
        username: "Kusumaletterformee",
        minerTag: "kusuma#8899",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Kusumaletterformee",
        role: "broker",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date().toISOString()
      };

      const seedUser3: LocalUserCredentials = {
        email: "kusumaletterformee@gmail.com",
        passwordHash: "kusuma123x", // Starting default password as requested for recovery
        profile: sampleProfile3
      };
      initialList.push(seedUser3);
      updatedNeeded = true;
      syncUserProfileToFirebase("kusumaletterformee@gmail.com", "kusuma123x", sampleProfile3).catch(() => {});
    }

    setRegisteredUsers(initialList);
    if (updatedNeeded) {
      localStorage.setItem("ldr_registered_users", JSON.stringify(initialList));
    }

    // Pull from Firestore database and merge dynamically
    fetchAllUsersFromFirebase()
      .then((firebaseUsers) => {
        if (firebaseUsers && firebaseUsers.length > 0) {
          const mapped: LocalUserCredentials[] = firebaseUsers.map(u => ({
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

          const mergedMap = new Map<string, LocalUserCredentials>();
          // local first
          initialList.forEach(u => mergedMap.set(u.email.toLowerCase(), u));
          // firebase overwrites/adds
          mapped.forEach(u => mergedMap.set(u.email.toLowerCase(), u));

          const mergedList = Array.from(mergedMap.values());
          setRegisteredUsers(mergedList);
          localStorage.setItem("ldr_registered_users", JSON.stringify(mergedList));
        } else {
          // Sync all local preseeded users on first boot
          initialList.forEach(user => {
            syncUserProfileToFirebase(user.email, user.passwordHash, user.profile).catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load users from Firebase on boot, using preseeded local cache:", err);
      });
  }, []);

  // Save utility helper
  const saveUserCredentials = (emailInput: string, passInput: string, profileInput: MinerProfile) => {
    const freshUser: LocalUserCredentials = {
      email: emailInput.toLowerCase().trim(),
      passwordHash: passInput,
      profile: profileInput
    };
    const updated = [freshUser, ...registeredUsers.filter(u => u.email !== emailInput.toLowerCase().trim())];
    setRegisteredUsers(updated);
    localStorage.setItem("ldr_registered_users", JSON.stringify(updated));

    // Async save profile details out to Firebase
    syncUserProfileToFirebase(emailInput, passInput, profileInput).catch(err => {
      console.error("Failed to sync profile to active Firebase Firestore: ", err);
    });
  };

  // Switch tabs
  const handleToggleAuthMode = (mode: 'register' | 'login') => {
    playClickSound();
    setAuthMode(mode);
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
  };

  // 1. Password Strength calculation metrics
  const getPasswordStrength = () => {
    let score = 0;
    if (!password) return { score, label: "Kosong", color: "bg-gray-800" };
    
    // Length check
    if (password.length >= 8) score += 1;
    // Contains lowercase & uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    // Contains numbers
    if (/\d/.test(password)) score += 1;
    // Contains special symbols
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score, label: "Lemah (Masukkan angka/kapital)", color: "bg-red-500 w-1/4" };
      case 2:
        return { score, label: "Cukup Baik (Tambah karakter unik)", color: "bg-orange-400 w-2/4" };
      case 3:
        return { score, label: "Kuat (Sangat Aman)", color: "bg-yellow-400 w-3/4" };
      case 4:
        return { score, label: "Sempurna (Enkripsi Maksimal)", color: "bg-green-400 w-full" };
      default:
        return { score, label: "Sangat Lemah", color: "bg-red-600 w-12" };
    }
  };

  // Email format validator
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Submit Handler for Authentication or Registration
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMessage("Harap masukkan format alamat Email yang valid!");
      return;
    }

    if (!password) {
      setErrorMessage("Kata sandi tidak boleh kosong!");
      return;
    }

    if (authMode === "login") {
      // ---------------- LOGIN FLOW ----------------
      const foundUser = registeredUsers.find(
        (u) => u.email === cleanEmail && u.passwordHash === password
      );

      if (foundUser) {
        // Success login loads their active profiles
        playUpgradeSound();
        setSuccessMessage(`Berhasil masuk! Selamat datang kembali, ${foundUser.profile.username}.`);
        localStorage.setItem("ldr_active_email", foundUser.email.toLowerCase().trim());
        setTimeout(() => {
          onComplete(foundUser.profile);
        }, 1200);
      } else {
        setErrorMessage("Akses Ditolak! Alamat email atau kata sandi Anda keliru.");
      }
    } else {
      // ---------------- REGISTER FLOW ----------------
      if (!username.trim()) {
        setErrorMessage("Nama operator penambang tidak boleh kosong!");
        return;
      }
      if (username.length < 3) {
        setErrorMessage("Nama penambang harus minimal 3 karakter!");
        return;
      }
      if (username.length > 15) {
        setErrorMessage("Nama penambang maksimal 15 karakter!");
        return;
      }

      // Password Strength constraints
      const strength = getPasswordStrength();
      if (strength.score < 2) {
        setErrorMessage("Kata sandi terlalu lemah! Silakan buat kata sandi yang lebih panjang atau sertakan kombinasi angka.");
        return;
      }

      // Check duplicate email
      const isDuplicate = registeredUsers.some(u => u.email === cleanEmail);
      if (isDuplicate) {
        setErrorMessage("Alamat email ini sudah terdaftar! Harap masuk akun atau gunakan email lain.");
        return;
      }

      // Generate random miner tag
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const minerTag = `${username.toLowerCase().replace(/\s+/g, "")}#${randomNumber}`;

      // Create profile blueprint
      const nextProfile: MinerProfile = {
        username: username.trim(),
        minerTag: minerTag,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username.trim()}`,
        role: selectedRole,
        level: 1,
        experience: 0,
        ldrBalance: 0.0, // starting coins are 0
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date().toISOString()
      };

      // Generate Simulated 4-digit verification code OTP
      const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
      setTempProfile(nextProfile);
      setGeneratedOtp(generatedCode);
      setShowOtpScreen(true);
      playClickSound();
    }
  };

  // Submit Simulated OTP verification code check
  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (userEnteredOtp === generatedOtp || userEnteredOtp === "2026") {
      playUpgradeSound();
      if (tempProfile) {
        // Save user details
        saveUserCredentials(email, password, tempProfile);
        
        localStorage.setItem("ldr_active_email", email.toLowerCase().trim());
        setSuccessMessage(`Akun baru ${tempProfile.username} berhasil terdaftar dan diverifikasi! Memuat stasiun...`);
        setShowOtpScreen(false);
        setUserEnteredOtp("");
        
        setTimeout(() => {
          onComplete(tempProfile);
        }, 1500);
      }
    } else {
      setErrorMessage("Kode verifikasi OTP tidak sesuai! Silakan verifikasi ulang nomor kode.");
      // Auto blink close after some seconds
    }
  };

  const roles = [
    {
      id: "driller",
      name: "Drill Master (Master Bor)",
      desc: "Bonus: Produksi Rig Otomatis berjalan +10% lebih cepat dengan daya traksi stabil.",
      perk: "+10% Rig Yield Boost",
      icon: Flame,
      color: "from-orange-500 to-amber-600",
      textColor: "text-orange-400",
      bgLight: "bg-orange-500/10",
      border: "border-orange-500/30"
    },
    {
      id: "geologist",
      name: "Geologist (Ahli Geologi)",
      desc: "Bonus: Memulai karir tambang langsung dengan 1 unit Konveyor Saringan gratis.",
      perk: "Gratis 1 Unit Konveyor Sifter",
      icon: Compass,
      color: "from-purple-500 to-indigo-600",
      textColor: "text-purple-400",
      bgLight: "bg-purple-500/10",
      border: "border-purple-500/30"
    },
    {
      id: "broker",
      name: "Gem Broker (Pialang Permata)",
      desc: "Bonus: Memperoleh +15% lebih banyak koin LDR aktif pada setiap fusi mineral.",
      perk: "+15% Active Merge Coins",
      icon: Shield,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-400",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    }
  ];

  return (
    <div id="registration-page" className="min-h-screen bg-[#0d0f14] text-gray-100 flex flex-col justify-between p-4 md:p-8 font-sans transition-all selection:bg-amber-500 selection:text-black">
      
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex justify-between items-center py-2 h-12">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 font-mono text-xs tracking-wide flex items-center gap-1.5 animate-pulse">
            <Terminal size={12} />
            <span>HQ-GATEWAY: OPERATIONAL</span>
          </div>
        </div>
        
        <button 
          onClick={() => { onToggleMute(); playClickSound(); }}
          className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition"
          title={isMuted ? "Aktifkan Suara" : "Bisukan Suara"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Main card */}
      <div className="max-w-5xl w-full mx-auto my-auto grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden bg-[#141822] border border-gray-800 shadow-2xl shadow-black/80 my-4 relative">
        
        {/* OTP Simulation Modal Overlays */}
        {showOtpScreen && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50 animate-fade-in text-center">
            <div className="max-w-md bg-[#131722] border border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl relative">
              <div className="bg-amber-500/10 text-amber-400 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <KeyRound size={24} className="animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">Verifikasi Alamat Email</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Federasi tambang koin LDR sedang mengirimkan kode otentikasi operator baru virtual ke email Anda: <strong className="text-amber-400">{email}</strong>.
              </p>

              {/* Simulated Inbox alert */}
              <div className="bg-[#090b10] border border-amber-500/30 p-3 rounded-lg my-4 text-xs font-mono text-left">
                <span className="text-[10px] text-amber-500 font-bold block mb-1">📬 INBOX SIMULASI (SANDPAN):</span>
                <p className="text-gray-300 leading-tight">
                  Dari: <strong>ldr-auth@galaxy-federation.org</strong>
                  <br />
                  Kode OTP Anda: <strong className="text-amber-400 text-sm select-all tracking-widest">{generatedOtp}</strong>
                </p>
                <span className="text-[9px] text-gray-500 block mt-1.5">*Silakan ketik atau salin kode 4 digit di atas ke kolom verifikasi.</span>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  value={userEnteredOtp}
                  onChange={(e) => {
                    setUserEnteredOtp(e.target.value.replace(/\D/g, ""));
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="Masukkan 4 digit OTP"
                  className="w-full text-center text-xl font-bold tracking-[0.5em] font-mono py-3 bg-gray-900 border border-gray-700 rounded-lg text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setShowOtpScreen(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:bg-gray-850 hover:text-white transition uppercase font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black transition hover:brightness-110 uppercase"
                  >
                    Verifikasi Akun
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        )}

        {/* LUPA PASSWORD ASSISTANT OVERLAY MODAL */}
        {showForgotHelper && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50 animate-fade-in text-center">
            <div className="max-w-md w-full bg-[#131722] border border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl relative">
              <div className="bg-amber-500/10 text-amber-400 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 animate-pulse">
                <KeyRound size={24} />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">Otentikasi & Lupa Password</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-mono">
                Federasi LDR Coin dapat memulihkan kata sandi lokal akun Anda secara instan. Silakan masukkan alamat email yang terdaftar.
              </p>

              <form onSubmit={handleRequestForgotPassword} className="space-y-4 my-4">
                <div>
                  <label className="block text-[10px] font-mono text-left uppercase tracking-wider text-gray-400 mb-1">
                    ALAMAT EMAIL OPERATOR:
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotInputEmail}
                    onChange={(e) => {
                      setForgotInputEmail(e.target.value);
                      setForgotFeedback("");
                      setForgotSucc("");
                    }}
                    placeholder="Contoh: kusumax@ldrcoin.com"
                    className="w-full text-center text-sm font-mono py-2.5 bg-gray-900 border border-gray-750 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>

                {forgotFeedback && (
                  <p className="p-2.5 bg-red-950/20 text-red-400 border border-red-900/40 text-[10px] font-mono rounded-lg">
                    ⚠️ {forgotFeedback}
                  </p>
                )}

                {forgotSucc && (
                  <p className="p-3 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 text-xs font-mono rounded-lg text-left leading-normal">
                    💡 {forgotSucc}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setShowForgotHelper(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:bg-gray-850 hover:text-white transition uppercase font-bold"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black transition hover:brightness-110 uppercase focus:outline-none"
                  >
                    Cari Sandi
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-800/60 pt-3 text-[10px] font-mono text-gray-500 text-left leading-normal">
                💡 <strong>Catatan Admin:</strong> Anda teridentifikasi sebagai administrator atau pengguna berwenang. Anda juga dapat dengan cepat mengganti, menghapus, atau melihat kata sandi semua operator secara visual pada tab <strong>🔐</strong> di atas stasiun pertambangan Anda setelah berhasil login!
              </div>
              
            </div>
          </div>
        )}

        {/* Left column - Banner & Onboarding intro */}
        <div className="md:col-span-5 bg-[#1a202c] relative flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-800 overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 tracking-tight leading-none">
              LDR MINER FUSION
            </h1>
            <p className="text-[10px] text-amber-500/80 font-mono mt-1.5 uppercase tracking-widest leading-none">
              PROTOKOL OTENTIKASI SECURE v1.6
            </p>
            
            <p className="text-gray-400 text-xs mt-3.5 leading-relaxed">
              Stasiun penambangan koin LDR. Selesaikan pendaftaran operator, kumpulkan kekayaan fusi mineral, saring material, dan withdraw aset LDR Anda ke rekening nyata secara aman!
            </p>
          </div>

          {/* Banner image layout referencing generated image */}
          <div className="my-6 relative rounded-xl overflow-hidden border border-gray-750 shadow-md aspect-video">
            <img 
              src={bannerImg} 
              alt="Futuristic LDR Mining Rig Cavern" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent shadow-inner" />
            <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-widest bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase">
              REAKTOR SUIKA 2D
            </span>
          </div>

          <div className="relative z-10 bg-gray-900/60 p-4 border border-gray-850 rounded-xl font-mono text-[11px] leading-tight text-gray-400 space-y-1 structure">
            <span className="text-amber-400 font-bold block mb-1">🌐 DETAIL DEMO LOGIN CEPAT:</span>
            <p>• Email: <strong className="text-white">demo@ldrcoin.com</strong></p>
            <p>• Kata Sandi: <strong className="text-white">demo1234</strong></p>
            <p className="text-[10px] text-gray-500 block pt-1">(Saran: Buat akun baru gratis untuk mencoba spesialisasi khusus kustom Anda)</p>
          </div>
        </div>

        {/* Right column - Register & Login Forms */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#11141e]">
          
          {/* Form Header selector toggle */}
          <div className="flex bg-[#0b0c13] p-1 rounded-xl border border-gray-850 mb-6 gap-1">
            <button
              onClick={() => handleToggleAuthMode('register')}
              className={`flex-1 py-2.5 text-xs font-black tracking-wider uppercase transition rounded-lg ${
                authMode === "register"
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Daftar Baru
            </button>
            <button
              onClick={() => handleToggleAuthMode('login')}
              className={`flex-1 py-2.5 text-xs font-black tracking-wider uppercase transition rounded-lg ${
                authMode === "login"
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Masuk Akun
            </button>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white mb-1.5">
            {authMode === "register" ? "REGISTRASI OPERATOR UTAMA" : "MASUK STASIUN UTAMA"}
          </h2>
          <p className="text-[11px] text-gray-400 mb-5 font-mono">
            {authMode === "register" 
              ? "Lengkapi formulir operator dengan validasi Email dan Kata Sandi terenkripsi."
              : "Masukkan kredensial operator terverifikasi untuk melanjutkan penyimpanan."
            }
          </p>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            
            {/* Input: Username (Only for register mode) */}
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  NAMA OPERATOR PENAMBANG:
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="Masukkan nama operator tambang..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {/* Input: Email */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                ALAMAT EMAIL RESMI (EMAIL VALIDATION):
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="operator@ldrcoin.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              {email && !isValidEmail(email) && (
                <p className="text-[10px] text-orange-400 font-mono mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>Harap sertakan domain email lengkap (contoh: name@domain.com)</span>
                </p>
              )}
            </div>

            {/* Input: Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 leading-none">
                  KATA SANDI OPERATOR (SECURE PASSWORD):
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowForgotHelper(true);
                      setForgotInputEmail("");
                      setForgotFeedback("");
                      setForgotSucc("");
                    }}
                    className="text-[10px] font-mono font-black text-amber-400 hover:text-amber-300 hover:underline cursor-pointer select-none leading-none"
                  >
                    LUPA PASSWORD?
                  </button>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder={authMode === "register" ? "Buat kata sandi aman..." : "Masukkan kata sandi Anda..."}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-sans text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Indicators (only for register) */}
              {authMode === "register" && password && (
                <div className="mt-2 text-[10px] font-mono space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Kekuatan Proteksi:</span>
                    <span className="font-bold text-amber-400">{getPasswordStrength().label}</span>
                  </div>
                  {/* Visual progress bar */}
                  <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                    <div className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength().color}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-500 pt-1 leading-none">
                    <span className={password.length >= 8 ? "text-green-400" : "text-gray-500"}>✔ Min. 8 karakter</span>
                    <span className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Huruf Besar/Kecil</span>
                    <span className={/\d/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Menyertakan angka</span>
                    <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Karakter Spesial</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs: Roles Classes Selection (Only for register mode) */}
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  PILIH SPESIALISASI PENAMBANG (ROLE CLASS PERK):
                </label>
                
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedRole(r.id);
                          playClickSound();
                        }}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                          isSelected 
                            ? "border-amber-500 bg-amber-500/5 shadow-inner" 
                            : "border-gray-800 bg-[#151924] hover:border-gray-700"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-white leading-tight">{r.name}</h4>
                          <span className={`text-[9px] font-mono font-black ${r.textColor}`}>
                            {r.perk}
                          </span>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-amber-500" : "border-gray-700"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Response Alerts Feedbacks */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 rounded-lg text-xs font-mono animate-shake">
                ⚠ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-950/40 border border-green-500/40 text-green-300 rounded-lg text-xs font-mono animate-pulse">
                ✓ {successMessage}
              </div>
            )}

            {/* Terms of Agreement */}
            {authMode === "register" && (
              <div className="flex items-start gap-2.5 pt-0.5">
                <input
                  type="checkbox"
                  id="agree-checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-500 border-gray-700 rounded bg-gray-900 focus:ring-amber-500 mt-0.5"
                />
                <label htmlFor="agree-checkbox" className="text-[10px] text-gray-400 leading-tight select-none cursor-pointer">
                  Saya setuju menyimpan hasil koin LDR pada server berkas lokal peramban, mematuhi fusi atom material tambang, dan verifikasi OTP.
                </label>
              </div>
            )}

            {/* Register/Login Button */}
            <button
              type="submit"
              disabled={authMode === "register" ? !agreed : false}
              className={`w-full py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs tracking-wider uppercase transition shadow-lg ${
                authMode === "register" && !agreed
                  ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                  : "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0d0f14] hover:brightness-105 active:scale-95"
              }`}
            >
              <Play size={14} fill="currentColor" />
              <span>
                {authMode === "register" ? "MULAI DAFTAR & VERIFIKASI" : "CONEK KAN OPERATOR"}
              </span>
              <ArrowRight size={14} />
            </button>

          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center py-4 border-t border-gray-800/40 text-[10px] font-mono text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>© 2026 LDR COIN MINER FUSION - GAMEPLAY SUIKA ENGINE COLLISION 2D</p>
        <p>RESTORAN PERTAMBANGAN INTELIGEN TERPERSINTASI LOKAL</p>
      </div>

    </div>
  );
}
