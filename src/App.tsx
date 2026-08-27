/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { UserProfile, Connection, Message, MessageType } from './types';
import { Storage, UserSettings } from './utils/storage';
import { StartupAnimation } from './components/StartupAnimation';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { MainScreen } from './components/MainScreen';
import { MessagingScreen } from './components/MessagingScreen';
import { ConnectModal } from './components/ConnectModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationToast } from './components/NotificationToast';
import { playReceivedChime, playConnectedChime } from './utils/audio';

export default function App() {
  // Startup animation state
  const [showStartup, setShowStartup] = useState<boolean>(() => !Storage.hasSeenStartup());
  
  // Auth & Profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => Storage.getUser());
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Connection & Chat state
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'chat'>('main');

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Real-time status
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Preferences
  const [settings, setSettings] = useState<UserSettings>(() => Storage.getSettings());

  // Toast Notification
  const [toastData, setToastData] = useState<{ message: Message; sender: UserProfile } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Fetch current user and connection from server
  const refreshConnection = useCallback(async (userId: string) => {
    try {
      const token = Storage.getToken();
      const res = await fetch(`/api/connections/me?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.connection) {
        setConnection(data.connection);
        setIsPartnerOnline(Boolean(data.connection.partner?.isOnline));
        // Fetch messages
        if (data.connection.conversationId) {
          fetchMessages(data.connection.conversationId);
        }
      } else {
        setConnection(null);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // ignore
    }
  };

  // WebSocket Connection
  const connectWebSocket = useCallback((userId: string) => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
      ws.send(JSON.stringify({ type: 'auth', payload: { userId } }));
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);

        if (type === 'message:new') {
          const newMsg = payload as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Play received chime
          playReceivedChime(settings.soundEnabled);

          // If not currently in chat view or window in background, trigger notification
          if (currentView !== 'chat' && settings.notificationsEnabled && connection?.partner) {
            setToastData({ message: newMsg, sender: connection.partner });
          }

          // If in chat, send read receipt
          if (currentView === 'chat' && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'message:read_all',
                payload: {
                  conversationId: newMsg.conversationId,
                  readerId: userId,
                },
              })
            );
          }
        } else if (type === 'message:status') {
          const updatedMsg = payload as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        } else if (type === 'message:read_all') {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === userId ? { ...m, status: 'read' } : m))
          );
        } else if (type === 'typing:update') {
          setIsPartnerTyping(Boolean(payload.isTyping));
        } else if (type === 'presence:change') {
          if (payload.isOnline !== undefined) {
            setIsPartnerOnline(Boolean(payload.isOnline));
          }
          if (payload.user) {
            setConnection((prev) => (prev ? { ...prev, partner: payload.user } : prev));
          }
        } else if (type === 'connection:established') {
          playConnectedChime(settings.soundEnabled);
          refreshConnection(userId);
          setCurrentView('chat');
        } else if (type === 'connection:ended') {
          setConnection(null);
          setMessages([]);
          setCurrentView('main');
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      wsRef.current = null;
      // Auto-reconnect
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (currentUser) connectWebSocket(currentUser.id);
      }, 3000);
    };

    ws.onerror = () => {
      setIsWsConnected(false);
    };
  }, [currentView, settings, connection, refreshConnection, currentUser]);

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      const token = Storage.getToken();
      if (!token) return;

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.user) {
          setCurrentUser(data.user);
          Storage.setUser(data.user);
          refreshConnection(data.user.id);
          connectWebSocket(data.user.id);
        } else {
          Storage.clearAuth();
          setCurrentUser(null);
        }
      } catch {
        // Fallback to local stored user
        const localUser = Storage.getUser();
        if (localUser) {
          refreshConnection(localUser.id);
          connectWebSocket(localUser.id);
        }
      }
    };

    initAuth();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket, refreshConnection]);

  // Check URL invite parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode && currentUser) {
      setShowConnectModal(true);
    }
  }, [currentUser]);

  // Mark all messages as read when opening chat
  useEffect(() => {
    if (currentView === 'chat' && connection && currentUser && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:read_all',
          payload: {
            conversationId: connection.conversationId,
            readerId: currentUser.id,
          },
        })
      );
    }
  }, [currentView, connection, currentUser]);

  // Handlers
  const handleStartupComplete = () => {
    Storage.markStartupSeen();
    setShowStartup(false);
  };

  const handleAuthSuccess = (user: UserProfile, isNewUser: boolean) => {
    setCurrentUser(user);
    Storage.setUser(user);
    if (isNewUser || !user.name || user.name.startsWith('User ')) {
      setShowProfileSetup(true);
    } else {
      refreshConnection(user.id);
      connectWebSocket(user.id);
    }
  };

  const handleProfileSetupComplete = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    Storage.setUser(updatedUser);
    setShowProfileSetup(false);
    refreshConnection(updatedUser.id);
    connectWebSocket(updatedUser.id);
  };

  const handleSendMessage = (
    type: MessageType,
    payload: { text?: string; mediaUrl?: string; mediaDuration?: number }
  ) => {
    if (!currentUser || !connection) return;

    const tempId = `msg_local_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: connection.conversationId,
      senderId: currentUser.id,
      type,
      text: payload.text,
      mediaUrl: payload.mediaUrl,
      mediaDuration: payload.mediaDuration,
      createdAt: Date.now(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:send',
          payload: {
            conversationId: connection.conversationId,
            senderId: currentUser.id,
            messageType: type,
            text: payload.text,
            mediaUrl: payload.mediaUrl,
            mediaDuration: payload.mediaDuration,
          },
        })
      );
    } else {
      // Fallback mark as failed if offline
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
        );
      }, 300);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isTyping ? 'typing:start' : 'typing:stop',
          payload: {},
        })
      );
    }
  };

  const handleConnected = (partner: UserProfile, conversationId: string) => {
    setShowConnectModal(false);
    if (currentUser) {
      refreshConnection(currentUser.id);
    }
    setCurrentView('chat');
  };

  const handleDisconnectPartner = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setConnection(null);
      setMessages([]);
      setCurrentView('main');
      setShowSettingsModal(false);
    } catch {}
  };

  const handleLogout = () => {
    Storage.clearAuth();
    if (wsRef.current) wsRef.current.close();
    setCurrentUser(null);
    setConnection(null);
    setMessages([]);
    setCurrentView('main');
    setShowSettingsModal(false);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    } catch {}
    handleLogout();
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    Storage.setSettings(newSettings);
  };

  return (
    <div className="h-screen w-screen bg-[#08090d] text-[#f0f2f5] overflow-hidden flex flex-col font-sans">
      {/* 1. Startup First Launch Animation */}
      <AnimatePresence>
        {showStartup && <StartupAnimation onComplete={handleStartupComplete} />}
      </AnimatePresence>

      {/* 2. Authentication Screen */}
      {!currentUser && !showStartup && (
        <AuthScreen onSuccess={handleAuthSuccess} />
      )}

      {/* 3. Profile Setup Modal */}
      {currentUser && showProfileSetup && (
        <ProfileSetupModal
          initialUser={currentUser}
          onComplete={handleProfileSetupComplete}
        />
      )}

      {/* 4. Active Main View or Messaging Screen */}
      {currentUser && !showProfileSetup && (
        <>
          {currentView === 'main' ? (
            <MainScreen
              currentUser={currentUser}
              connection={connection}
              lastMessage={messages[messages.length - 1]}
              isPartnerOnline={isPartnerOnline}
              onOpenAddModal={() => setShowConnectModal(true)}
              onOpenChat={() => setCurrentView('chat')}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          ) : (
            connection && (
              <MessagingScreen
                currentUser={currentUser}
                connection={connection}
                messages={messages}
                isOnline={isWsConnected}
                isPartnerOnline={isPartnerOnline}
                isPartnerTyping={isPartnerTyping}
                onBack={() => setCurrentView('main')}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onOpenSettings={() => setShowSettingsModal(true)}
                soundEnabled={settings.soundEnabled}
              />
            )
          )}
        </>
      )}

      {/* 5. Add / Connect Modal */}
      <AnimatePresence>
        {showConnectModal && currentUser && (
          <ConnectModal
            currentUser={currentUser}
            onClose={() => setShowConnectModal(false)}
            onConnected={handleConnected}
          />
        )}
      </AnimatePresence>

      {/* 6. Settings & Profile Modal */}
      <AnimatePresence>
        {showSettingsModal && currentUser && (
          <SettingsModal
            currentUser={currentUser}
            connection={connection}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onUpdateProfile={(u) => {
              setCurrentUser(u);
              Storage.setUser(u);
            }}
            onDisconnectPartner={handleDisconnectPartner}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </AnimatePresence>

      {/* 7. Subtle Notification Toast */}
      <AnimatePresence>
        {toastData && (
          <NotificationToast
            message={toastData.message}
            sender={toastData.sender}
            onClick={() => {
              setCurrentView('chat');
              setToastData(null);
            }}
            onClose={() => setToastData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
