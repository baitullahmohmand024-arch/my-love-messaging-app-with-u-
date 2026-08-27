export type MessageType = 'text' | 'image' | 'voice';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  phoneNumber?: string;
  authProvider: 'google' | 'email' | 'phone';
  createdAt: number;
  updatedAt: number;
  lastSeen?: number;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  mediaDuration?: number; // for voice in seconds
  mediaSize?: number;
  createdAt: number;
  status: MessageStatus;
  readAt?: number;
}

export interface Connection {
  id: string;
  userAId: string;
  userBId: string;
  status: 'active' | 'disconnected';
  createdAt: number;
  conversationId: string;
  partner?: UserProfile;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Invitation {
  id: string;
  code: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
  usedBy?: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
}

// WebSocket message types
export type WSEventType =
  | 'auth'
  | 'auth_success'
  | 'message:send'
  | 'message:new'
  | 'message:status'
  | 'message:read_all'
  | 'typing:start'
  | 'typing:stop'
  | 'typing:update'
  | 'presence:sync'
  | 'presence:change'
  | 'connection:established'
  | 'connection:ended'
  | 'ping'
  | 'pong';

export interface WSMessagePayload {
  type: WSEventType;
  payload: any;
}
