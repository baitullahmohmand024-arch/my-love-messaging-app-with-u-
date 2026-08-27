import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Send,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MoreVertical,
  Heart,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { UserProfile, Connection, Message, MessageType } from '../types';
import { VoiceRecorder, playSentChime } from '../utils/audio';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { ImageViewerModal } from './ImageViewerModal';
import { compressImage } from '../utils/avatars';

interface MessagingScreenProps {
  currentUser: UserProfile;
  connection: Connection;
  messages: Message[];
  isOnline: boolean;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  onBack: () => void;
  onSendMessage: (type: MessageType, payload: { text?: string; mediaUrl?: string; mediaDuration?: number }) => void;
  onTyping: (isTyping: boolean) => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
}

export const MessagingScreen: React.FC<MessagingScreenProps> = ({
  currentUser,
  connection,
  messages,
  isOnline,
  isPartnerOnline,
  isPartnerTyping,
  onBack,
  onSendMessage,
  onTyping,
  onOpenSettings,
  soundEnabled,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const recordTimerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  const partner = connection.partner;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isPartnerTyping]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 1800);
  };

  // Send Text Message
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    onTyping(false);
    playSentChime(soundEnabled);
    onSendMessage('text', { text });
    setInputText('');
  };

  // Send Photo Attachment
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const compressed = await compressImage(file, 1600, 1600, 0.85);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;
        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64Data,
              filename: file.name,
              type: 'image',
            }),
          });
          const data = await res.json();
          const finalUrl = res.ok && data.url ? data.url : base64Data;
          playSentChime(soundEnabled);
          onSendMessage('image', { mediaUrl: finalUrl });
        } catch {
          playSentChime(soundEnabled);
          onSendMessage('image', { mediaUrl: base64Data });
        } finally {
          setUploadingMedia(false);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setUploadingMedia(false);
    }
  };

  // Voice Recording Handlers
  const startRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      voiceRecorderRef.current = recorder;
      await recorder.start((lvl) => setAudioLevel(lvl));
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Could not access microphone', err);
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    voiceRecorderRef.current?.cancel();
    voiceRecorderRef.current = null;
    setIsRecording(false);
    setRecordDuration(0);
    setAudioLevel(0);
  };

  const finishAndSendRecording = async () => {
    if (!voiceRecorderRef.current) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    try {
      setUploadingMedia(true);
      const { blob, duration } = await voiceRecorderRef.current.stop();
      setIsRecording(false);
      setRecordDuration(0);
      setAudioLevel(0);

      // Convert to base64 and upload
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;
        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: base64Data,
              filename: `voice-${Date.now()}.webm`,
              type: 'voice',
            }),
          });
          const data = await res.json();
          const finalUrl = res.ok && data.url ? data.url : base64Data;
          playSentChime(soundEnabled);
          onSendMessage('voice', {
            mediaUrl: finalUrl,
            mediaDuration: duration,
          });
        } catch {
          playSentChime(soundEnabled);
          onSendMessage('voice', {
            mediaUrl: base64Data,
            mediaDuration: duration,
          });
        } finally {
          setUploadingMedia(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setUploadingMedia(false);
      setIsRecording(false);
    }
  };

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatMsgTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#08090d] text-[#f0f2f5] select-none overflow-hidden">
      {/* Top Header */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/5 bg-[#0e1017]/85 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-1 rounded-full text-[#8b91a5] hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {partner && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={partner.avatarUrl}
                  alt={partner.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-[#e0a96d]/30"
                />
                {isPartnerOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0e1017]" />
                )}
              </div>

              <div>
                <h2 className="font-serif text-base font-medium tracking-wide text-[#f5ede3]">
                  {partner.name}
                </h2>
                <div className="text-[11px] text-[#8b91a5]">
                  {isPartnerTyping ? (
                    <span className="text-[#e0a96d] animate-pulse">typing...</span>
                  ) : isPartnerOnline ? (
                    <span className="text-emerald-400/90">online</span>
                  ) : (
                    'connected space'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-500/20">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-full text-[#8b91a5] hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Conversation Settings"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#08090d] via-[#0b0d13] to-[#08090d]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#151722] border border-[#e0a96d]/20 flex items-center justify-center">
              <Heart className="w-7 h-7 text-[#e0a96d]/60" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#f5ede3] tracking-wide">
                No messages yet
              </h3>
              <p className="text-xs text-[#8b91a5] mt-1">
                Start your conversation.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.senderId === currentUser.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl p-3 relative shadow-md transition-all ${
                    isOutgoing
                      ? 'bg-gradient-to-br from-[#e0a96d] to-[#c28b51] text-[#0b0c10] rounded-br-xs'
                      : 'glass-panel-elevated text-[#f0f2f5] rounded-bl-xs'
                  }`}
                >
                  {/* Text Message */}
                  {msg.type === 'text' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                      {msg.text}
                    </p>
                  )}

                  {/* Photo Message */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div
                      onClick={() => setActiveImageModal(msg.mediaUrl!)}
                      className="cursor-pointer overflow-hidden rounded-xl group relative max-w-[280px]"
                    >
                      <img
                        src={msg.mediaUrl}
                        alt="Photo message"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-72 object-cover rounded-xl transition duration-200 group-hover:scale-102"
                      />
                    </div>
                  )}

                  {/* Voice Note Message */}
                  {msg.type === 'voice' && msg.mediaUrl && (
                    <VoiceMessagePlayer
                      mediaUrl={msg.mediaUrl}
                      duration={msg.mediaDuration}
                      isOutgoing={isOutgoing}
                    />
                  )}

                  {/* Timestamp & Status Icon */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isOutgoing ? 'text-[#0b0c10]/70' : 'text-[#8b91a5]'
                    }`}
                  >
                    <span>{formatMsgTime(msg.createdAt)}</span>
                    {isOutgoing && (
                      <span className="ml-0.5">
                        {msg.status === 'sending' && <Clock className="w-2.5 h-2.5 animate-spin" />}
                        {msg.status === 'sent' && <Check className="w-3 h-3" />}
                        {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                        {msg.status === 'read' && (
                          <CheckCheck className="w-3 h-3 text-[#0b0c10] font-bold" />
                        )}
                        {msg.status === 'failed' && (
                          <AlertCircle className="w-3 h-3 text-red-700" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 p-3 rounded-2xl glass-panel text-[#8b91a5] max-w-[80px] rounded-bl-xs"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#e0a96d] animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#e0a96d] animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#e0a96d] animate-bounce [animation-delay:0.4s]" />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Bar */}
      <footer className="p-3 bg-[#0e1017]/90 backdrop-blur-md border-t border-white/5 shrink-0 z-20">
        <AnimatePresence mode="wait">
          {isRecording ? (
            /* Voice Recording Interface */
            <motion.div
              key="recording-bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center justify-between gap-3 bg-[#151722] p-2 rounded-2xl border border-[#e0a96d]/30"
            >
              {/* Trash/Cancel */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2.5 rounded-full text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                title="Cancel Voice Note"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Recording duration & Live Wave */}
              <div className="flex-1 flex items-center justify-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono text-sm text-[#f5ede3]">
                  {formatRecordTime(recordDuration)}
                </span>

                <div className="flex items-center gap-1 h-5">
                  {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((factor, i) => (
                    <div
                      key={i}
                      style={{
                        height: `${Math.max(4, Math.min(20, audioLevel * 100 * factor))}px`,
                      }}
                      className="w-[3px] bg-[#e0a96d] rounded-full transition-all duration-75"
                    />
                  ))}
                </div>
              </div>

              {/* Send Voice Note */}
              <button
                id="btn-send-voice-note"
                type="button"
                onClick={finishAndSendRecording}
                className="w-10 h-10 rounded-full luxury-gradient-btn flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition"
                title="Send Voice Note"
              >
                <Send className="w-4 h-4 text-[#0b0c10]" />
              </button>
            </motion.div>
          ) : (
            /* Standard Text & Attachment Bar */
            <motion.form
              key="standard-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSendText}
              className="flex items-center gap-2"
            >
              {/* Photo Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                className="p-2.5 rounded-full glass-input text-[#8b91a5] hover:text-[#e0a96d] hover:border-[#e0a96d]/30 transition cursor-pointer shrink-0"
                title="Send Photo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {/* Text Input */}
              <input
                id="input-chat-message"
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Message privately..."
                className="flex-1 py-2.5 px-4 rounded-xl glass-input text-sm text-white placeholder-[#8b91a5]/50 focus:outline-none"
              />

              {/* Dynamic Action Button: Send if text exists, Mic if empty */}
              {inputText.trim().length > 0 ? (
                <button
                  id="btn-send-text-message"
                  type="submit"
                  className="w-10 h-10 rounded-full luxury-gradient-btn flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4 text-[#0b0c10]" />
                </button>
              ) : (
                <button
                  id="btn-start-record-voice"
                  type="button"
                  onClick={startRecording}
                  disabled={uploadingMedia}
                  className="w-10 h-10 rounded-full glass-input text-[#e0a96d] hover:bg-[#e0a96d]/10 hover:border-[#e0a96d]/40 flex items-center justify-center cursor-pointer active:scale-95 transition shrink-0"
                  title="Record Voice Note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </footer>

      {/* Fullscreen Photo Lightbox */}
      {activeImageModal && (
        <ImageViewerModal
          imageUrl={activeImageModal}
          onClose={() => setActiveImageModal(null)}
        />
      )}
    </div>
  );
};
