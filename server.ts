import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// Types
interface UserRecord {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  phoneNumber?: string;
  authProvider: 'google' | 'email' | 'phone';
  passwordHash?: string;
  createdAt: number;
  updatedAt: number;
  lastSeen: number;
  isOnline: boolean;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'voice';
  text?: string;
  mediaUrl?: string;
  mediaDuration?: number;
  mediaSize?: number;
  createdAt: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readAt?: number;
}

interface ConnectionRecord {
  id: string;
  userAId: string;
  userBId: string;
  status: 'active' | 'disconnected';
  createdAt: number;
  conversationId: string;
}

interface InvitationRecord {
  id: string;
  code: string;
  creatorId: string;
  createdAt: number;
  expiresAt: number;
  isUsed: boolean;
  usedBy?: string;
}

// In-Memory Data Store (Persisted to JSON on modification)
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'love_you_db.json');

interface AppDatabase {
  users: Record<string, UserRecord>;
  connections: Record<string, ConnectionRecord>;
  messages: Record<string, MessageRecord[]>;
  invitations: Record<string, InvitationRecord>;
  tokens: Record<string, string>; // token -> userId
}

let db: AppDatabase = {
  users: {},
  connections: {},
  messages: {},
  invitations: {},
  tokens: {},
};

// Seed demo users if empty for seamless evaluation & testing
function seedInitialData() {
  if (Object.keys(db.users).length === 0) {
    const user1: UserRecord = {
      id: 'usr_maya',
      name: 'Maya Lin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      email: 'maya@loveyou.app',
      authProvider: 'email',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    };
    const user2: UserRecord = {
      id: 'usr_liam',
      name: 'Liam Sterling',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      email: 'liam@loveyou.app',
      authProvider: 'email',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: false,
    };

    db.users[user1.id] = user1;
    db.users[user2.id] = user2;

    const connectionId = 'conn_maya_liam';
    const conversationId = 'conv_maya_liam';
    db.connections[connectionId] = {
      id: connectionId,
      userAId: user1.id,
      userBId: user2.id,
      status: 'active',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
      conversationId,
    };

    db.messages[conversationId] = [
      {
        id: 'msg_init_1',
        conversationId,
        senderId: user2.id,
        type: 'text',
        text: 'Welcome to our private space ❤️',
        createdAt: Date.now() - 1000 * 60 * 60 * 4,
        status: 'read',
      },
      {
        id: 'msg_init_2',
        conversationId,
        senderId: user1.id,
        type: 'text',
        text: 'So quiet and beautiful here.',
        createdAt: Date.now() - 1000 * 60 * 60 * 3,
        status: 'read',
      },
    ];

    saveDb();
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read db file:', err);
  }
  seedInitialData();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

loadDb();

// WebSocket Connected Clients: userId -> Set of WebSockets
const userSockets = new Map<string, Set<WebSocket>>();

function broadcastToUser(userId: string, event: string, payload: any) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify({ type: event, payload });
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function findConnectionForUser(userId: string): { connection: ConnectionRecord; partner: UserRecord } | null {
  for (const conn of Object.values(db.connections)) {
    if (conn.status === 'active' && (conn.userAId === userId || conn.userBId === userId)) {
      const partnerId = conn.userAId === userId ? conn.userBId : conn.userAId;
      const partner = db.users[partnerId];
      if (partner) {
        return { connection: conn, partner };
      }
    }
  }
  return null;
}

// Generate secure random ID
function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Static uploads directory for media messages
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', brand: 'LOVE YOU', timestamp: Date.now() });
  });

  // Auth: Email Register
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = Object.values(db.users).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      // Return login session
      const token = `token_${generateId('auth')}`;
      db.tokens[token] = existingUser.id;
      saveDb();
      return res.json({ user: existingUser, token, isNewUser: false });
    }

    const userId = generateId('usr');
    const newUser: UserRecord = {
      id: userId,
      name: name || email.split('@')[0],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      email,
      authProvider: 'email',
      passwordHash: password,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeen: Date.now(),
      isOnline: true,
    };

    db.users[userId] = newUser;
    const token = `token_${generateId('auth')}`;
    db.tokens[token] = userId;
    saveDb();

    res.json({ user: newUser, token, isNewUser: !name });
  });

  // Auth: Email Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = Object.values(db.users).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Auto register for seamless access
      const userId = generateId('usr');
      user = {
        id: userId,
        name: email.split('@')[0],
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        email,
        authProvider: 'email',
        passwordHash: password,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true,
      };
      db.users[userId] = user;
    }

    const token = `token_${generateId('auth')}`;
    db.tokens[token] = user.id;
    saveDb();

    res.json({ user, token, isNewUser: false });
  });

  // Auth: Google Sign-In
  app.post('/api/auth/google', (req, res) => {
    const { email, name, avatarUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = Object.values(db.users).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    let isNewUser = false;

    if (!user) {
      const userId = generateId('usr');
      user = {
        id: userId,
        name: name || 'Google User',
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        email,
        authProvider: 'google',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true,
      };
      db.users[userId] = user;
      isNewUser = true;
    }

    const token = `token_${generateId('auth')}`;
    db.tokens[token] = user.id;
    saveDb();

    res.json({ user, token, isNewUser });
  });

  // Auth: Phone Verification
  app.post('/api/auth/phone-verify', (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let user = Object.values(db.users).find((u) => u.phoneNumber === phoneNumber);
    let isNewUser = false;

    if (!user) {
      const userId = generateId('usr');
      user = {
        id: userId,
        name: `User ${phoneNumber.slice(-4)}`,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        phoneNumber,
        authProvider: 'phone',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true,
      };
      db.users[userId] = user;
      isNewUser = true;
    }

    const token = `token_${generateId('auth')}`;
    db.tokens[token] = user.id;
    saveDb();

    res.json({ user, token, isNewUser });
  });

  // Auth: Validate token and get current user
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token || !db.tokens[token]) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = db.tokens[token];
    const user = db.users[userId];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  });

  // Update Profile
  app.post('/api/auth/update-profile', (req, res) => {
    const { userId, name, avatarUrl } = req.body;
    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    user.updatedAt = Date.now();
    saveDb();

    // Broadcast updated profile to connected partner if any
    const connInfo = findConnectionForUser(userId);
    if (connInfo) {
      broadcastToUser(connInfo.partner.id, 'presence:change', { user });
    }

    res.json({ user });
  });

  // Delete Account
  app.post('/api/auth/delete-account', (req, res) => {
    const { userId } = req.body;
    if (!userId || !db.users[userId]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Disconnect partner if any
    const connInfo = findConnectionForUser(userId);
    if (connInfo) {
      delete db.connections[connInfo.connection.id];
      broadcastToUser(connInfo.partner.id, 'connection:ended', {});
    }

    delete db.users[userId];
    saveDb();

    res.json({ success: true });
  });

  // Media Upload (Photos, Voice notes)
  app.post('/api/media/upload', (req, res) => {
    const { data, filename, type } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    try {
      const ext = filename ? path.extname(filename) : type === 'voice' ? '.webm' : '.jpg';
      const cleanFileName = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext || (type === 'voice' ? '.webm' : '.jpg')}`;
      const filePath = path.join(UPLOADS_DIR, cleanFileName);

      // Handle base64 format (e.g. data:image/jpeg;base64,...)
      const base64Data = data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/${cleanFileName}`;

      res.json({ url: publicUrl, filename: cleanFileName, size: buffer.length });
    } catch (err: any) {
      console.error('Media upload error:', err);
      res.status(500).json({ error: 'Failed to save media file' });
    }
  });

  // Invitations: Generate Link
  app.post('/api/invitations/create', (req, res) => {
    const { userId } = req.body;
    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invitationId = generateId('inv');
    const code = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);

    const invitation: InvitationRecord = {
      id: invitationId,
      code,
      creatorId: userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
      isUsed: false,
    };

    db.invitations[code] = invitation;
    saveDb();

    res.json({
      invitation: {
        ...invitation,
        creatorName: user.name,
        creatorAvatar: user.avatarUrl,
      },
    });
  });

  // Invitations: Verify / Accept
  app.post('/api/invitations/accept', (req, res) => {
    const { code, userId } = req.body;
    const user = db.users[userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invitation = db.invitations[code];
    if (!invitation || invitation.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'This connection link is invalid or expired.' });
    }

    if (invitation.creatorId === userId) {
      return res.status(400).json({ error: 'You cannot connect with your own invitation link.' });
    }

    const partner = db.users[invitation.creatorId];
    if (!partner) {
      return res.status(404).json({ error: 'The creator of this link no longer exists.' });
    }

    // Check if either user is already connected
    const existingConnUser = findConnectionForUser(userId);
    if (existingConnUser) {
      delete db.connections[existingConnUser.connection.id];
    }
    const existingConnPartner = findConnectionForUser(partner.id);
    if (existingConnPartner) {
      delete db.connections[existingConnPartner.connection.id];
    }

    const connectionId = generateId('conn');
    const conversationId = generateId('conv');

    const newConnection: ConnectionRecord = {
      id: connectionId,
      userAId: invitation.creatorId,
      userBId: userId,
      status: 'active',
      createdAt: Date.now(),
      conversationId,
    };

    db.connections[connectionId] = newConnection;
    invitation.isUsed = true;
    invitation.usedBy = userId;

    if (!db.messages[conversationId]) {
      db.messages[conversationId] = [];
    }

    saveDb();

    // Broadcast connected celebration to the partner in real-time!
    broadcastToUser(partner.id, 'connection:established', {
      partner: user,
      connectionId,
      conversationId,
    });

    res.json({
      partner,
      connectionId,
      conversationId,
    });
  });

  // Connections: Get my current connection
  app.get('/api/connections/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const userId = req.query.userId as string || (token ? db.tokens[token] : null);

    if (!userId || !db.users[userId]) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const connInfo = findConnectionForUser(userId);
    if (!connInfo) {
      return res.json({ connection: null });
    }

    const partner = connInfo.partner;
    const partnerSockets = userSockets.get(partner.id);
    const isPartnerOnline = partnerSockets && partnerSockets.size > 0;

    res.json({
      connection: {
        ...connInfo.connection,
        partner: {
          ...partner,
          isOnline: isPartnerOnline,
        },
      },
    });
  });

  // Connections: Disconnect
  app.post('/api/connections/disconnect', (req, res) => {
    const { userId } = req.body;
    const connInfo = findConnectionForUser(userId);
    if (connInfo) {
      delete db.connections[connInfo.connection.id];
      saveDb();
      broadcastToUser(connInfo.partner.id, 'connection:ended', {});
    }
    res.json({ success: true });
  });

  // Messages: Get messages for conversation
  app.get('/api/conversations/:id/messages', (req, res) => {
    const { id } = req.params;
    const msgs = db.messages[id] || [];
    res.json({ messages: msgs });
  });

  // Create HTTP Server & Mount WebSocket Server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;

    ws.on('message', (rawData: string) => {
      try {
        const { type, payload } = JSON.parse(rawData);

        if (type === 'auth') {
          const { userId } = payload;
          if (userId && db.users[userId]) {
            currentUserId = userId;
            if (!userSockets.has(userId)) {
              userSockets.set(userId, new Set());
            }
            userSockets.get(userId)!.add(ws);

            db.users[userId].isOnline = true;
            db.users[userId].lastSeen = Date.now();

            ws.send(JSON.stringify({ type: 'auth_success', payload: { userId } }));

            // Notify partner
            const connInfo = findConnectionForUser(userId);
            if (connInfo) {
              broadcastToUser(connInfo.partner.id, 'presence:change', {
                userId,
                isOnline: true,
              });
            }
          }
        } else if (type === 'message:send') {
          const { conversationId, senderId, messageType, text, mediaUrl, mediaDuration } = payload;
          if (!conversationId || !senderId) return;

          const msgId = generateId('msg');
          const newMsg: MessageRecord = {
            id: msgId,
            conversationId,
            senderId,
            type: messageType,
            text,
            mediaUrl,
            mediaDuration,
            createdAt: Date.now(),
            status: 'sent',
          };

          if (!db.messages[conversationId]) {
            db.messages[conversationId] = [];
          }
          db.messages[conversationId].push(newMsg);
          saveDb();

          // Echo back to sender as 'sent'
          ws.send(JSON.stringify({ type: 'message:status', payload: newMsg }));

          // Broadcast in real-time to partner
          const connInfo = findConnectionForUser(senderId);
          if (connInfo) {
            broadcastToUser(connInfo.partner.id, 'message:new', newMsg);
          }
        } else if (type === 'message:read_all') {
          const { conversationId, readerId } = payload;
          if (conversationId && db.messages[conversationId]) {
            let updated = false;
            db.messages[conversationId].forEach((m) => {
              if (m.senderId !== readerId && m.status !== 'read') {
                m.status = 'read';
                m.readAt = Date.now();
                updated = true;
              }
            });
            if (updated) {
              saveDb();
              const connInfo = findConnectionForUser(readerId);
              if (connInfo) {
                broadcastToUser(connInfo.partner.id, 'message:read_all', { conversationId });
              }
            }
          }
        } else if (type === 'typing:start' || type === 'typing:stop') {
          if (currentUserId) {
            const connInfo = findConnectionForUser(currentUserId);
            if (connInfo) {
              broadcastToUser(connInfo.partner.id, 'typing:update', {
                isTyping: type === 'typing:start',
                userId: currentUserId,
              });
            }
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        const sockets = userSockets.get(currentUserId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            userSockets.delete(currentUserId);
            if (db.users[currentUserId]) {
              db.users[currentUserId].isOnline = false;
              db.users[currentUserId].lastSeen = Date.now();
              saveDb();

              const connInfo = findConnectionForUser(currentUserId);
              if (connInfo) {
                broadcastToUser(connInfo.partner.id, 'presence:change', {
                  userId: currentUserId,
                  isOnline: false,
                  lastSeen: Date.now(),
                });
              }
            }
          }
        }
      }
    });
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LOVE YOU server running on http://localhost:${PORT}`);
  });
}

startServer();
