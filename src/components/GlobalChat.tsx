import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Menu, 
  User, 
  Coins, 
  Sparkles,
  AlertCircle,
  ThumbsUp,
  Smile,
  Zap,
  Volume2
} from "lucide-react";
import { 
  sendChatMessageToFirebase, 
  subscribeToChatMessages, 
  fetchChatSettingsFromFirebase, 
  updateUserProfileFieldsInFirebase,
  FirebaseChatMessage,
  FirebaseChatSettings
} from "../utils/firebase";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";

interface GlobalChatProps {
  profile: MinerProfile | null;
  saveProfileData: (updatedProfile: MinerProfile) => void;
  triggerNotification: (message: string) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export interface ParseWdAlert {
  txId: string;
  jumlah: string;
  nama: string;
  negara: string;
  metode: string;
  tanggal: string;
  link: string;
}

export const parseWdAlert = (msg: string | undefined): ParseWdAlert | null => {
  if (!msg || !msg.startsWith("[WD_ALERT]")) return null;
  const parts = msg.split("|");
  return {
    txId: parts[1] || "TN79776076",
    jumlah: parts[2] || "Rp 1.851.730",
    nama: parts[3] || "Joan",
    negara: parts[4] || "E-Wallet DANA",
    metode: parts[5] || "Saldo DANA (Instant)",
    tanggal: parts[6] || "10 Juni 2026 13:40:33 UTC",
    link: parts[7] || "https://t.me/Minersgalaxycoinnsbot"
  };
};

// Beautiful preset mock chat logs to keep the chat filled with Indonesian game community vibes 
const SEED_MOCK_MESSAGES: FirebaseChatMessage[] = [
  {
    email: "system_g@ldrcoin.com",
    username: "KusumaGacor",
    role: "Geologist",
    message: "Halo para penambang! fusi level 10 dapet Rp 50.000 beneran cair lho barusan lewat DANA 🥳💸",
    timestamp: Date.now() - 3600000 * 2.5,
    avatar: ""
  },
  {
    email: "system_status@ldrcoin.com",
    username: "System Autopay",
    role: "System Link",
    message: "[WD_ALERT]|TN79776076|Rp 1.851.730|Joan|E-Wallet DANA|Saldo DANA (Instant)|10 Juni 2026 13:40:33 UTC|https://t.me/Minersgalaxycoinnsbot",
    timestamp: Date.now() - 3600000 * 2,
    avatar: ""
  },
  {
    email: "system_w@ldrcoin.com",
    username: "Warisman",
    role: "Owner",
    message: "Selamat datang di LDR Coin Miner! Gunakan tips fusi otomatis, gabungkan rig level tinggi biar dapat pasif income rupiah makin maksimal. Jika ada kendala, hubungi saya di WA ya! ⛏️🔥",
    timestamp: Date.now() - 3600000 * 1.5,
    avatar: ""
  },
  {
    email: "ahmady@ldrcoin.com",
    username: "Ahmady Kingomary",
    role: "Miner Gold",
    message: "Mereka menemukan cara untuk mendapatkan tautan undangan secara instan langsung di tab utama.",
    timestamp: Date.now() - 3600000 * 0.8,
    avatar: ""
  },
  {
    email: "demo@ldrcoin.com",
    username: "Anda",
    role: "Driller",
    message: "Terima kasih, Pak, sungguh??",
    timestamp: Date.now() - 400000,
    avatar: ""
  }
];

// Indonesian Gamers Slang Quick-Reply Template Chips
const CHAT_TEMPLATE_CHIPS = [
  "🎁 Kirim WD (Joan)",
  "🇮🇩 Kirim WD (Ahmad)",
  "🔥 Rate LDR Naik!",
  "💎 Gacor fusi Gem!",
  "💰 WD Lancar Jaya!",
  "🚀 Bantu tips dong!"
];

export default function GlobalChat({
  profile,
  saveProfileData,
  triggerNotification,
  isOpen: parentIsOpen,
  setIsOpen: parentSetIsOpen
}: GlobalChatProps) {
  // Graceful state handling if parent props are or aren't supplied
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isChatOpen = parentSetIsOpen ? (parentIsOpen ?? false) : internalIsOpen;
  const setChatOpen = parentSetIsOpen ? parentSetIsOpen : setInternalIsOpen;

  const [messages, setMessages] = useState<FirebaseChatMessage[]>([]);
  const [text, setText] = useState<string>("");
  const [chatSettings, setChatSettings] = useState<FirebaseChatSettings>({
    requiresPoints: true,
    costPerMsg: 1,
    defaultPoints: 0
  });
  const [errorShow, setErrorShow] = useState<boolean>(false);
  const [activeTabSub, setActiveTabSub] = useState<"chat" | "stats">("chat");

  const listEndRef = useRef<HTMLDivElement>(null);
  const userActiveEmail = (localStorage.getItem("ldr_active_email") || profile?.linkedEmail || "demo@ldrcoin.com").toLowerCase().trim();

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages((msgs) => {
      // Clean duplicate checking & mix with premium Indonesian game seed logs if there's very few messages
      if (!msgs || msgs.length === 0) {
        setMessages(SEED_MOCK_MESSAGES);
      } else {
        // Interleave seed messages at the top so it feels full and alive
        const combined = [...SEED_MOCK_MESSAGES.slice(0, 3), ...msgs].slice(-40);
        // Sort by timestamp
        combined.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(combined);
      }
    });

    // Fetch latest chat settings config
    fetchChatSettingsFromFirebase()
      .then((settings) => {
        if (settings) {
          setChatSettings(settings);
        }
      })
      .catch((e) => console.warn("Error fetching chatroom settings:", e));

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync scroll to bottom on new messages
  useEffect(() => {
    if (listEndRef.current && isChatOpen) {
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isChatOpen]);

  // Handle message dispatch
  const handleSendMessage = async (msgText: string) => {
    const trimmedText = msgText.trim();
    if (!trimmedText || !profile) return;

    const userEmail = (localStorage.getItem("ldr_active_email") || profile.linkedEmail || "demo@ldrcoin.com").toLowerCase().trim();
    const userRole = profile.role || "Driller";

    // Check chat restriction
    if (chatSettings.requiresPoints) {
      const userPoints = profile.chatPoints ?? 0;
      if (userPoints < chatSettings.costPerMsg) {
        playClickSound();
        setErrorShow(true);
        return;
      }

      // Deduct 1 point (or costPerMsg)
      const nextPoints = Math.max(0, userPoints - chatSettings.costPerMsg);
      const isDemo = userEmail === "demo@ldrcoin.com";

      if (!isDemo) {
        // Persist to Firebase
        await updateUserProfileFieldsInFirebase(userEmail, {
          chatPoints: nextPoints
        });
      }

      // Update locally
      saveProfileData({
        ...profile,
        chatPoints: nextPoints
      });
    }

    // Build message
    const msg: FirebaseChatMessage = {
      email: userEmail,
      username: profile.username || "Miner",
      role: userRole,
      avatar: profile.avatar || "",
      message: trimmedText,
      timestamp: Date.now()
    };

    setText("");
    const sent = await sendChatMessageToFirebase(msg);
    if (!sent) {
      triggerNotification("⚠️ Gagal mengirim pesan obrolan!");
    } else {
      playClickSound();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(text);
  };

  const handleTemplateSend = (template: string) => {
    playClickSound();
    let textToSend = template;
    if (template === "🎁 Kirim WD (Joan)") {
      textToSend = "[WD_ALERT]|TN79776076|Rp 1.851.730|Joan|E-Wallet DANA|E-Wallet Direct|10 Juni 2026 13:40:33 UTC|https://t.me/Minersgalaxycoinnsbot";
    } else if (template === "🇮🇩 Kirim WD (Ahmad)") {
      textToSend = "[WD_ALERT]|TN82103592|Rp 150.000 (DANA)|Ahmad Gacor|E-Wallet DANA|Direct-Transfer Instant|10 Juni 2026 13:58:20 UTC|https://t.me/Minersgalaxycoinnsbot";
    }
    handleSendMessage(textToSend);
  };

  // Get the last 3 messages for the top minimalist ticker display
  const lastThreeMessages = messages.slice(-3);

  return (
    <>
      {/* 1. Minimalist Ticker Display Widget floating below top corner screen */}
      <AnimatePresence>
        {!isChatOpen && lastThreeMessages.length > 0 && (
          <div className="fixed top-20 right-4 z-40 hidden md:flex flex-col items-end gap-2 font-mono">
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              onClick={() => { playClickSound(); setChatOpen(true); }}
              className="bg-[#111420]/95 border border-amber-500/30 p-2.5 rounded-xl max-w-xs w-68 text-left shadow-2xl backdrop-blur-md cursor-pointer hover:border-amber-400/80 hover:scale-102 transition duration-200"
              id="chat_preview_ticker"
            >
              <div className="flex items-center gap-1 border-b border-gray-850 pb-1 mb-1 justify-between">
                <span className="text-[8px] font-black tracking-widest text-[#fb923c] uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE GRUP CHAT
                </span>
                <span className="text-[7px] text-gray-500 font-bold uppercase">KLIK BURUAN</span>
              </div>
              <div className="space-y-1">
                {lastThreeMessages.map((m, idx) => (
                  <div key={m.id || idx} className="text-[9px] truncate leading-tight flex items-center justify-between">
                    <div className="truncate shrink-0">
                      <strong className="text-amber-400 font-bold mr-1">{m.username}:</strong>
                      <span className="text-gray-300">{m.message}</span>
                    </div>
                    <span className="text-[6.5px] text-gray-650 ml-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Sleek WhatsApp/Telegram-style Slide Out Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            {/* Dark Backdrop Overlay with mild glassmorphism to focus attention on the panel and prevent white flashbacks */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClickSound(); setChatOpen(false); }}
              className="fixed inset-0 bg-black/75 z-45 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 210 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[380px] h-full bg-[#0a0d14] border-l border-gray-800 z-50 flex flex-col shadow-2xl font-mono text-left"
              id="chat_sidebar_drawer"
            >
              {/* Header - Styled like a premium Android/IOS messaging header */}
              <div className="p-4 bg-[#111420] border-b border-gray-800 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400" />
                
                <div className="flex items-center gap-2.5 font-mono">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center relative">
                    <MessageSquare className="text-orange-400" size={18} />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black text-white leading-tight">
                      LDR COIN <span className="text-gray-400 text-[11px] font-normal">• Obrolan langsung</span>
                    </h3>
                    <span className="text-[10px] text-gray-400 block mt-0.5 leading-none">
                      10,113 online , 2 mengetik...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Telegram Bot Button matching the platform features */}
                  <a
                    href="https://t.me/Minersgalaxycoinnsbot"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => playClickSound()}
                    className="px-2.5 py-1.5 text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow border border-blue-400 transition duration-150 flex items-center gap-1 shrink-0 font-sans"
                    id="watch_video_header_btn"
                  >
                    Telegram Bot
                  </a>
                  
                  <button
                    onClick={() => { playClickSound(); setChatOpen(false); }}
                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
                    title="Tutup Obrolan"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-navigation inside Chat Box */}
              <div className="grid grid-cols-2 text-center text-xs border-b border-gray-850 bg-[#11131c]">
                <button 
                  onClick={() => { playClickSound(); setActiveTabSub("chat"); }}
                  className={`py-2 px-3 font-bold transition flex items-center justify-center gap-1 ${
                    activeTabSub === "chat" 
                      ? "text-orange-400 border-b-2 border-orange-500 bg-[#0d101a]" 
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Smile size={13} />
                  <span>Obrolan Grup</span>
                </button>
                <button 
                  onClick={() => { playClickSound(); setActiveTabSub("stats"); }}
                  className={`py-2 px-3 font-bold transition flex items-center justify-center gap-1 ${
                    activeTabSub === "stats" 
                      ? "text-orange-400 border-b-2 border-orange-500 bg-[#0d101a]" 
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Zap size={13} />
                  <span>Aturan & Poin</span>
                </button>
              </div>

              {/* Chat Restriction Banner showing balance */}
              {chatSettings.requiresPoints && (
                <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-[10px] text-rose-300">
                  <div className="flex items-center gap-1.5">
                    <Coins size={12} className="text-rose-400" />
                    <span>Sistem Obrolan: <strong className="text-white">-{chatSettings.costPerMsg} Poin</strong> / pesan</span>
                  </div>
                  <div className="bg-rose-500/20 px-2.5 py-0.5 rounded border border-rose-500/30 text-white font-bold font-mono">
                    Sisa: {profile?.chatPoints ?? 0} Poin
                  </div>
                </div>
              )}

              {/* Main Content Pane */}
              {activeTabSub === "chat" ? (
                <>
                  {/* Messages Feed panel with Telegram style textured feel */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#07090d] scrollbar-thin scrollbar-thumb-gray-800">
                    <div className="text-center mb-2">
                       <span className="px-2.5 py-1 rounded-full bg-gray-900/80 border border-gray-800 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                         Hari ini • Obrolan Enkripsi Aman
                       </span>
                    </div>

                    {messages.map((m, idx) => {
                      const isUserSender = profile && m.email.toLowerCase() === userActiveEmail;
                      const isAdmin = m.email.toLowerCase() === "warisman@ldrcoin.com" || m.role?.toLowerCase() === "admin" || m.username.toLowerCase() === "warisman";

                      // Check if it's a simulated or real withdrawal screenshot-style alert
                      const alertWd = parseWdAlert(m.message);

                      if (alertWd) {
                        return (
                          <div key={m.id || idx} className="space-y-3 w-full pb-2">
                            {/* Date seperator badge exactly styled like the "10 Juni" pill in screenshot */}
                            <div className="flex justify-center my-4">
                              <span className="bg-[#111420] text-gray-400 font-bold font-mono text-[9px] px-3.5 py-1 rounded-md border border-gray-800 shadow-xl uppercase tracking-widest">
                                10 Juni 2026
                              </span>
                            </div>

                            {/* Withdrawal approval card with premium precise detailing matching the user's screenshot */}
                            <div className="bg-slate-50 text-gray-900 rounded-2xl p-4 font-sans text-xs shadow-md border border-gray-200 leading-relaxed text-left w-full max-w-[95%] mx-auto">
                              <div className="font-bold flex items-start gap-1.5 text-[11.5px] text-gray-900 mb-2.5">
                                <span>✅</span>
                                <div className="leading-tight">
                                  <strong>Penarikan Disetujui</strong> ID Transaksi: <span className="font-mono bg-purple-50 px-1 py-0.5 rounded text-[10.5px] border border-purple-100">{alertWd.txId}</span>
                                </div>
                              </div>

                              <p className="text-gray-700 mb-4 whitespace-normal text-[11px] leading-relaxed font-sans">
                                Permintaan penarikan Anda telah ditinjau dan disetujui. Pembayaran telah berhasil diproses.
                              </p>

                              <div className="space-y-2 border-t border-b border-gray-100 py-3 text-[11px] text-gray-800">
                                <div className="flex items-center gap-2">
                                  <span>💰</span>
                                  <span>
                                    <strong>Jumlah:</strong> {alertWd.jumlah}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span>👤</span>
                                  <span>
                                    <strong>Nama Penerima:</strong> {alertWd.nama}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span>🏦</span>
                                  <span>
                                    <strong>E-Wallet / Bank:</strong> {alertWd.negara}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span>💳</span>
                                  <span>
                                    <strong>Metode Transaksi:</strong> {alertWd.metode}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-gray-850 my-3">
                                <span>📅</span>
                                <span>
                                  <strong>Tanggal:</strong> {alertWd.tanggal}
                                </span>
                              </div>

                              <div className="pt-3 border-t border-gray-150 space-y-1">
                                <div className="font-bold text-gray-950 flex items-center gap-1 text-[11px]">
                                  <span>🎬</span>
                                  <span>Lanjutkan menghasilkan uang:</span>
                                </div>
                                <a 
                                  href={alertWd.link} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-blue-600 hover:text-blue-800 underline break-all font-mono text-[10.5px] font-bold block mt-1 hover:brightness-110 active:scale-99 transition"
                                >
                                  {alertWd.link}
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={m.id || idx} 
                          className={`flex items-start gap-2.5 ${isUserSender ? "flex-row-reverse" : ""}`}
                        >
                          {/* Avatar block with customizable letters inside standard card container */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black leading-none shrink-0 border ${
                            isAdmin 
                              ? "bg-gradient-to-br from-red-500/30 to-amber-500/30 border-amber-500/50 text-amber-300 uppercase shadow-md shadow-amber-500/10"
                              : isUserSender
                                ? "bg-gradient-to-b from-orange-500/20 to-orange-650/45 border-orange-500/40 text-orange-200"
                                : "bg-gray-850 border-gray-750 text-gray-300"
                          }`}>
                            {m.username.substring(0, 2).toUpperCase()}
                          </div>

                          {/* Chat Message Bubble */}
                          <div className={`max-w-[75%] space-y-0.5`}>
                            {/* Sender Info */}
                            <div className={`flex items-center gap-1.5 ${isUserSender ? "justify-end" : "justify-start"}`}>
                              <span className={`text-[10px] font-black tracking-tight ${
                                isAdmin 
                                  ? "text-amber-400 hover:text-amber-300" 
                                  : isUserSender
                                    ? "text-orange-400"
                                    : "text-gray-300"
                              }`}>
                                {m.username}
                              </span>
                              <span className={`text-[8px] font-mono font-black uppercase px-1 rounded [font-size:7px] ${
                                isAdmin 
                                  ? "bg-gradient-to-r from-red-650 to-amber-650 text-white border border-red-500/30"
                                  : "bg-gray-900 border border-gray-800 text-gray-500"
                              }`}>
                                {isAdmin ? "OWNER" : m.role}
                              </span>
                            </div>

                            {/* Speech Bubble box with premium rounded Corners */}
                            <div className={`rounded-2xl p-2.5 text-[11px] leading-relaxed shadow ${
                              isAdmin
                                ? "bg-gradient-to-br from-[#1e1315]/95 to-[#15111d]/95 border border-amber-500/40 text-amber-100 rounded-tl-none font-sans"
                                : isUserSender 
                                  ? "bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-tr-none font-sans font-medium" 
                                  : "bg-[#111420]/90 text-gray-200 border border-gray-800 rounded-tl-none font-sans"
                            } break-all whitespace-pre-wrap`}>
                              {m.message}
                            </div>

                            {/* Timing stamp */}
                            <span className={`text-[7.5px] text-gray-600 font-mono block ${isUserSender ? "text-right" : "text-left"}`}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isUserSender && " • Terkirim ✓"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={listEndRef} />
                  </div>

                  {/* Template quick chips bar so users can quickly tap and express themselves instantly */}
                  <div className="bg-[#0b0d13] p-2 border-t border-gray-850 shrink-0">
                    <span className="text-[7.5px] text-gray-600 font-bold uppercase tracking-widest pl-1 mb-1 block">Quick Miner Reply / Pesat Instan</span>
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none select-none">
                      {CHAT_TEMPLATE_CHIPS.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleTemplateSend(chip)}
                          className="shrink-0 bg-gray-900/90 border border-gray-800 hover:border-orange-500 text-gray-400 hover:text-white text-[9px] py-1 px-2.5 rounded-full transition duration-150 active:scale-95"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Messaging Typing Inputs Area */}
                  <form onSubmit={handleFormSubmit} className="p-3 bg-[#111420] border-t border-gray-800 shrink-0 space-y-2.5">
                    {/* Inline Point Warning matching screenshot exactly */}
                    {(!profile || (profile.chatPoints ?? 0) < chatSettings.costPerMsg) && (
                      <div className="text-[10.5px] text-[#818cf8] font-sans font-medium text-left bg-[#818cf8]/5 border border-[#818cf8]/15 px-3 py-2.5 rounded-xl mb-1.5 leading-normal">
                        Mohon maaf! Anda tidak memiliki poin obrolan gratis untuk mengirim pesan ini. Silakan hubungi dukungan langsung.{" "}
                        <button 
                          type="button"
                          onClick={() => triggerNotification("Hubungi Warisman di WA untuk pengisian saldo Poin Obrolan!")}
                          className="font-bold underline text-[#a5b4fc] cursor-pointer hover:text-white transition inline bg-transparent p-0 m-0 border-none"
                        >
                          Hubungi kami sekarang.
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={120}
                        placeholder="Ketik obrolan miner..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 bg-[#090b11] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 font-bold font-mono"
                      />
                      <button
                        type="submit"
                        disabled={!text.trim()}
                        className="w-10 h-10 shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 text-black flex items-center justify-center rounded-xl transition duration-150 shadow shadow-orange-500/10 active:scale-95"
                      >
                        <Send size={15} className="font-bold shrink-0" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                /* Information & Rules Page */
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0d14] text-xs leading-relaxed text-gray-300">
                  <div className="p-3.5 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                    <h4 className="font-bold text-orange-400 mb-1.5 flex items-center gap-1 px-1">
                      <Sparkles size={13} />
                      Aturan Komunitas Penambang
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-400 font-sans">
                      <li>Hormati sesama penambang miner.</li>
                      <li>Dilarang sara, spam tautan penipuan, atau promosi liar.</li>
                      <li>Admin ldrcoin tidak akan meminta kata sandi Anda.</li>
                    </ol>
                  </div>

                  <div className="p-3.5 bg-[#111420] border border-gray-800 rounded-xl space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1">
                      <Coins size={13} className="text-amber-400" />
                      Top-Up Poin Obrolan
                    </h4>
                    <p className="text-gray-400 text-[11px] font-sans">
                      Untuk mengurangi spam, sistem chat menyedot <span className="text-white font-bold">{chatSettings.costPerMsg} Poin Obrolan</span> per satu baris pesan yang dikirimkan.
                    </p>
                    <p className="text-[11px] font-sans text-amber-500/90 font-bold border-t border-gray-850 pt-2">
                      🚨 Ingin tambah Poin Obrolan? Silakan hubungi Warisman di menu WD (WhatsApp/DANA) untuk pengisian instan secara murah!
                    </p>
                  </div>

                  <div className="text-center pt-4">
                    <button
                      onClick={() => { playClickSound(); setActiveTabSub("chat"); }}
                      className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs uppercase rounded-xl transition hover:scale-103"
                    >
                      KEMBALI KE OBROLAN
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Error Modal/Dialog Box when Chat Points are insufficient */}
      <AnimatePresence>
        {errorShow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111420] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={28} />
                <h4 className="text-sm font-bold uppercase tracking-wider">Poin Obrolan Habis!</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                Maaf, Anda tidak dapat melakukan obrolan gratis saat ini. Setiap pengiriman pesan membutuhkan minimal <strong className="text-white">{chatSettings.costPerMsg} Poin Obrolan</strong>.
              </p>
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[10px] text-red-300 whitespace-normal leading-normal">
                🚨 Hubungi Administrator/Pemilik akun di whatsapp/DANA untuk melakukan top-up atau pengisian saldo Poin Obrolan milik Anda!
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { playClickSound(); setErrorShow(false); }}
                  className="w-full bg-red-500 hover:bg-red-650 text-white text-xs font-black uppercase py-2.5 rounded-xl transition"
                >
                  MENGERTI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
