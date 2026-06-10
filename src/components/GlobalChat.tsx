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
  AlertCircle
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
}

export default function GlobalChat({
  profile,
  saveProfileData,
  triggerNotification
}: GlobalChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<FirebaseChatMessage[]>([]);
  const [text, setText] = useState<string>("");
  const [chatSettings, setChatSettings] = useState<FirebaseChatSettings>({
    requiresPoints: true,
    costPerMsg: 1,
    defaultPoints: 0
  });
  const [errorShow, setErrorShow] = useState<boolean>(false);

  const listEndRef = useRef<HTMLDivElement>(null);
  const userActiveEmail = (localStorage.getItem("ldr_active_email") || profile?.linkedEmail || "demo@ldrcoin.com").toLowerCase().trim();

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages((msgs) => {
      setMessages(msgs);
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
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle message dispatch
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !profile) return;

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
      message: text.trim(),
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

  // Get the last 3 messages for the "Garis 3 / Preview 3 Baris Obrolan"
  const lastThreeMessages = messages.slice(-3);

  return (
    <>
      {/* 1. Header/Toolbar Hamburger/Chat trigger button ("Garis 3") in Top Right Corner */}
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2 font-mono">
        {/* The Hamburger / Garis 3 toggle button (Compact & Minimalist) */}
        <button
          onClick={() => { playClickSound(); setIsOpen(!isOpen); }}
          className="w-10 h-10 bg-[#111420]/90 hover:bg-[#1c1f2e] text-amber-500 hover:text-amber-400 rounded-xl border border-amber-500/30 flex items-center justify-center shadow-lg transition duration-200 hover:scale-105 active:scale-95"
          id="chat_drawer_toggle"
          title="Tampilkan Obrolan Group (Garis 3)"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Real-time 3-Line Ticker Display below/align with the top button */}
        <AnimatePresence>
          {!isOpen && lastThreeMessages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              onClick={() => { playClickSound(); setIsOpen(true); }}
              className="bg-[#111420]/95 border border-amber-500/30 p-2.5 rounded-xl max-w-xs w-68 text-left shadow-2xl backdrop-blur-md cursor-pointer hover:border-amber-400 transition"
              id="chat_preview_ticker"
            >
              <div className="flex items-center gap-1 border-b border-gray-800 pb-1 mb-1 justify-between">
                <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> LIVE OBROLAN
                </span>
                <span className="text-[7px] text-gray-500">Klik bergabung</span>
              </div>
              <div className="space-y-0.5">
                {lastThreeMessages.map((m, idx) => (
                  <div key={m.id || idx} className="text-[9px] truncate leading-tight">
                    <strong className="text-amber-400 font-bold mr-1">{m.username}:</strong>
                    <span className="text-gray-300">{m.message}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Slide Out Chat Drawer (Floating Right Panel) with solid Backdrop to avoid blank white screens */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClickSound(); setIsOpen(false); }}
              className="fixed inset-0 bg-black/70 z-45 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[380px] h-full bg-[#0d101a] border-l border-gray-850 z-50 flex flex-col shadow-2xl font-mono text-left"
              id="chat_sidebar_drawer"
            >
            {/* Header */}
            <div className="p-4 bg-[#111420] border-b border-gray-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-amber-400" size={18} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                    LDR MINERS OBROLAN
                  </h3>
                  <span className="text-[9px] text-gray-500 mt-1 block">Real-time Global Chatroom</span>
                </div>
              </div>
              <button
                onClick={() => { playClickSound(); setIsOpen(false); }}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Restriction Banner */}
            {chatSettings.requiresPoints && (
              <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-[10px] text-rose-300">
                <div className="flex items-center gap-1.5">
                  <Coins size={12} className="text-rose-400" />
                  <span>Sistem Berbayar: <strong className="text-white">-{chatSettings.costPerMsg} Poin</strong> / pesan</span>
                </div>
                <div className="bg-rose-500/20 px-2 py-0.5 rounded text-white font-bold">
                  Sisa: {profile?.chatPoints ?? 0} Poin
                </div>
              </div>
            )}
            {!chatSettings.requiresPoints && (
              <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-[10px] text-emerald-400">
                🚀 <span className="font-bold">Sistem Obrolan Gratis Aktif:</span> Anda dapat mengirim pesan sepuasnya tanpa biaya poin!
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0d14]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-550 mr-1.5">
                  <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-3">
                    <MessageSquare size={20} className="text-gray-600" />
                  </div>
                  <p className="text-xs">Chamber obrolan masih hening.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Jadilah driller pertama yang menyapa!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isUserSender = profile && m.email.toLowerCase() === userActiveEmail;
                  const isAdmin = m.email.toLowerCase() === "warisman@ldrcoin.com" || m.role?.toLowerCase() === "admin";

                  return (
                    <div 
                      key={m.id || idx} 
                      className={`flex items-start gap-2.5 ${isUserSender ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar placeholder with letters */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold leading-none shrink-0 border ${
                        isAdmin 
                          ? "bg-gradient-to-br from-red-500/20 to-amber-500/20 border-amber-500/40 text-amber-400 uppercase"
                          : isUserSender
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                            : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}>
                        {m.username.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Message Bubble box */}
                      <div className={`max-w-[75%] space-y-0.5 text-left`}>
                        <div className={`flex items-center gap-1.5 ${isUserSender ? "justify-end" : ""}`}>
                          <span className={`text-[10px] font-bold ${isAdmin ? "text-amber-400 text-glow-amber" : "text-gray-300"}`}>
                            {m.username}
                          </span>
                          <span className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded ${
                            isAdmin 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-gray-900 text-gray-500"
                          }`}>
                            {isAdmin ? "ADMIN" : m.role}
                          </span>
                        </div>
                        <div className={`rounded-xl p-2.5 text-xs ${
                          isAdmin
                            ? "bg-gradient-to-br from-[#2a1b15] to-[#1a1420] border border-amber-500/20 text-amber-200"
                            : isUserSender 
                              ? "bg-indigo-650 text-white rounded-tr-none" 
                              : "bg-[#111420] text-gray-300 rounded-tl-none border border-gray-850"
                        } break-all whitespace-pre-wrap leading-relaxed`}>
                          {m.message}
                        </div>
                        <span className={`text-[8px] text-gray-600 block ${isUserSender ? "text-right" : ""}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>

            {/* Typing Controls Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#111420] border-t border-gray-850 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={160}
                  placeholder="Ketik pesan..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 bg-[#090b11] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="w-9 h-9 shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black flex items-center justify-center rounded-xl transition"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. Error Modal/Dialog Box when Chat Points are insufficient */}
      <AnimatePresence>
        {errorShow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-mono">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111420] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle size={28} />
                <h4 className="text-sm font-bold uppercase tracking-wider">Poin Obrolan Habis!</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Maaf, Anda tidak dapat melakukan obrolan gratis saat ini. Setiap pengiriman pesan membutuhkan minimal <strong className="text-white">{chatSettings.costPerMsg} Poin Obrolan</strong>.
              </p>
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[10px] text-red-300 whitespace-normal leading-normal">
                🚨 Hubungi Administrator/Pemilik akun di whatsapp/DANA untuk melakukan top-up atau pengisian saldo Poin Obrolan milik Anda!
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { playClickSound(); setErrorShow(false); }}
                  className="w-full bg-red-500 hover:bg-red-650 text-white text-xs font-black uppercase py-2 rounded-xl transition"
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
