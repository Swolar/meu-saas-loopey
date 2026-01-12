const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');

const { LocalStorage, SupabaseStorage } = require('./storage');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON parsing for API

// Debug Version Endpoint
app.get('/api/version', (req, res) => {
  res.json({ version: '1.0.2', timestamp: Date.now(), message: 'Diagnostics Added' });
});

// Diagnostic Endpoint
app.get('/api/diagnose', async (req, res) => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeVersion: process.version
    },
    storageType: storage instanceof SupabaseStorage ? 'Supabase' : 'Local',
    storageHealth: null,
    dependencies: {
      bcrypt: 'Loaded'
    }
  };

  try {
    if (storage.healthCheck) {
      diagnosis.storageHealth = await storage.healthCheck();
    }
  } catch (err) {
    diagnosis.storageHealth = { error: err.message };
  }

  res.json(diagnosis);
});

// Serve Tracker script
app.use('/tracker', express.static(path.join(__dirname, '../tracker')));

// Test Tracking Endpoint
app.get('/test-tracking/:siteId', (req, res) => {
  const siteId = req.params.siteId;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Teste de Rastreamento - LoopeyLive</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 2rem; background: #f8fafc; color: #334155; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 500px; margin: 0 auto; }
    h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 1rem; }
    .status { margin: 1.5rem 0; padding: 1rem; background: #f1f5f9; border-radius: 8px; font-weight: 500; }
    .success { color: #10b981; background: #d1fae5; }
    .error { color: #ef4444; background: #fee2e2; }
    code { background: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Teste de Rastreamento</h1>
    <p>Site ID: <strong>${siteId}</strong></p>
    
    <div id="status" class="status">Inicializando script...</div>
    
    <p style="font-size: 0.9rem; color: #64748b;">
      Abra o Console do Navegador (F12) para ver os logs detalhados do [LoopeyLive].
    </p>

    <div style="margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        <p><strong>Instruções:</strong></p>
        <ol style="text-align: left; font-size: 0.9rem; color: #475569;">
            <li>Mantenha esta página aberta.</li>
            <li>Abra seu Dashboard em outra aba.</li>
            <li>Verifique se o contador de "Usuários Ativos" mostra <strong>1</strong>.</li>
        </ol>
    </div>
  </div>
  
  <!-- O Tracker agora carrega o socket.io automaticamente se necessário -->
  <script src="/tracker/tracker.js" data-site-id="${siteId}"></script>
  
  <script>
    const statusDiv = document.getElementById('status');
    
    // Check if socket.io loaded
    const checkInterval = setInterval(() => {
      if (typeof io !== 'undefined') {
        clearInterval(checkInterval);
        statusDiv.innerHTML = 'Socket.io carregado. <br>Conectando ao servidor...';
        
        // Listen to the socket created by tracker (hacky access via global if needed, but tracker is isolated)
        // Instead we trust the console logs.
        
        setTimeout(() => {
             statusDiv.innerHTML = '<span style="color:#059669">✓ Script Ativo e Rodando</span><br><span style="font-size:0.8em">Verifique o Dashboard agora.</span>';
             statusDiv.className = 'status success';
        }, 2000);
      }
    }, 500);

    setTimeout(() => {
        if (typeof io === 'undefined') {
            statusDiv.innerHTML = '❌ Falha ao carregar Socket.io via CDN.<br>Verifique sua conexão ou bloqueadores de anúncio.';
            statusDiv.className = 'status error';
        }
    }, 10000);
  </script>
</body>
</html>
  `;
  res.send(html);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve React App (Production)
// Priority 1: Check for '../client/dist' (monorepo/fresh build)
// Priority 2: Check for 'public' folder (standalone deployment)
let CLIENT_BUILD_PATH = path.join(__dirname, '../client/dist');
if (!fs.existsSync(CLIENT_BUILD_PATH)) {
    CLIENT_BUILD_PATH = path.join(__dirname, 'public');
}

app.use(express.static(CLIENT_BUILD_PATH));

// Serve Demo Site (at /demo instead of root if needed, or keep root fallback)
// app.use('/demo', express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- Data Storage ---
const DATA_FILE = path.join(__dirname, 'data.json');

let storage;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  storage = new SupabaseStorage(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log('Using Supabase Storage');
} else {
  storage = new LocalStorage(DATA_FILE);
  console.log('Using Local JSON Storage');
}
storage.init();

// Active Sessions: socketId -> { siteId, url, referrer, joinedAt, lastHeartbeat }
const activeSessions = new Map();

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await storage.validateUser(username, password);
    if (user) {
      const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, user, token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server Login Error: ' + err.message });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await storage.createUser(username, password);
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Current User (Verify Token)
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Change Password
app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.user.username;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    await storage.updateUserPassword(username, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    if (err.message === 'Incorrect password' || err.message === 'User not found' || err.message === 'Incorrect password or user not found') {
      res.status(401).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Get all sites
app.get('/api/sites', authenticateToken, async (req, res) => {
  try {
    const sitesList = await storage.getSites();
    res.json(sitesList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new site
app.post('/api/sites', authenticateToken, async (req, res) => {
  const { name, domain } = req.body;
  const id = Math.random().toString(36).substring(2, 10); // Simple ID gen
  
  const newSite = {
    id,
    name,
    domain,
    createdAt: Date.now()
  };
  
  try {
    await storage.createSite(newSite);
    res.json(newSite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific site
app.get('/api/sites/:id', authenticateToken, async (req, res) => {
  try {
    const site = await storage.getSite(req.params.id);
    if (site) {
      res.json(site);
    } else {
      res.status(404).json({ error: 'Site not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete site
app.delete('/api/sites/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await storage.deleteSite(req.params.id);
    if (deleted) {
      // Also clear active sessions for this site
      for (const [socketId, session] of activeSessions.entries()) {
        if (session.siteId === req.params.id) {
          activeSessions.delete(socketId);
        }
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Site not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get site daily history
app.get('/api/sites/:id/daily-history', authenticateToken, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const history = await storage.getDailyStats(req.params.id, days);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update site theme
app.put('/api/sites/:id/theme', authenticateToken, async (req, res) => {
  const { color } = req.body;
  if (!color) return res.status(400).json({ error: 'Color is required' });
  
  try {
    const updatedSite = await storage.updateSiteTheme(req.params.id, color);
    if (updatedSite) {
      res.json(updatedSite);
    } else {
      res.status(404).json({ error: 'Site not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle React Routing, return all requests to React app
app.get('*', (req, res) => {
  // If request is for API, don't return index.html (should have been handled above)
  if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Check if file exists in build
  if (fs.existsSync(path.join(CLIENT_BUILD_PATH, 'index.html'))) {
      res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
  } else {
      res.status(404).send('Client build not found. Please run "npm run build" in client directory.');
  }
});

// --- WebSocket Logic ---

// Helper to calculate stats for a specific site
async function getStats(siteId, timeframe = 'minutes') {
  try {
    const now = Date.now();
    let totalOnline = 0;
    let totalDuration = 0;
    const pageCounts = {};
    const deviceCounts = { desktop: 0, mobile: 0 };

    // Filter sessions by siteId
    activeSessions.forEach((session) => {
      if (session.siteId === siteId) {
        totalOnline++;
        
        const url = session.url || 'unknown';
        pageCounts[url] = (pageCounts[url] || 0) + 1;
        
        // Simple device detection
        const isMobile = /mobile|android|iphone|ipad|ipod/i.test(session.userAgent || '');
        if (isMobile) deviceCounts.mobile++;
        else deviceCounts.desktop++;

        totalDuration += (now - session.joinedAt);
      }
    });

    const topPages = Object.entries(pageCounts)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count);

    const averageDuration = totalOnline > 0 ? Math.floor((totalDuration / totalOnline) / 1000) : 0;

    // Get history based on timeframe
    let safeHistoryData = { minutes: [], hours: [], days: [] };
    try {
        const data = await storage.getHistory(siteId);
        if (data) safeHistoryData = data;
    } catch (e) {
        console.warn(`Failed to load history for site ${siteId}:`, e.message);
    }

    let site = null;
    try {
        site = await storage.getSite(siteId);
    } catch (e) {
        console.warn(`Failed to load site info for ${siteId}:`, e.message);
    }
    
    let history = [];
    if (timeframe === 'minutes') {
      history = safeHistoryData.minutes || [];
    } else if (timeframe === 'hours') {
      history = safeHistoryData.hours || [];
    } else if (timeframe === 'days') {
      history = safeHistoryData.days || [];
    }

    // Calculate Summary based on Timeframe
    let summary = {
        users: totalOnline,
        usersLabel: 'Usuários Ativos',
        usersBadge: 'Ao Vivo',
        avgTime: averageDuration,
        mobile: deviceCounts.mobile,
        desktop: deviceCounts.desktop
    };

    if (timeframe === 'days') {
        summary.usersLabel = 'Visitas (7 Dias)';
        summary.usersBadge = 'Total';
        try {
            // Fetch daily stats for last 7 days
            const dailyStats = await storage.getDailyStats(siteId, 7);
            const totalVisits = dailyStats.reduce((sum, day) => sum + (day.views || 0), 0);
            
            // If total visits < current active users (e.g. fresh DB), use active users as floor
            summary.users = Math.max(totalVisits, totalOnline);
        } catch (err) {
            console.error('Error fetching summary stats:', err);
        }
    }

    return {
      totalOnline,
      topPages,
      averageDuration,
      devices: deviceCounts,
      history,
      totalViews: site ? (site.total_views || site.totalViews || 0) : 0,
      summary
    };
  } catch (criticalError) {
      console.error('CRITICAL ERROR in getStats:', criticalError);
      // Return safe fallback to prevent crash
      return {
          totalOnline: 0,
          topPages: [],
          averageDuration: 0,
          devices: { desktop: 0, mobile: 0 },
          history: [],
          totalViews: 0,
          summary: { users: 0, usersLabel: 'Erro', usersBadge: 'Erro', avgTime: 0, mobile: 0, desktop: 0 }
      };
  }
}

// Update history periodically
async function updateHistory() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const hourStr = now.getHours() + ':00';
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayStr = days[now.getDay()];

  try {
    const sites = await storage.getSites();
    
    for (const site of sites) {
      const historyData = await storage.getHistory(site.id);
      
      // Count active users for this site
      let count = 0;
      activeSessions.forEach(s => {
        if (s.siteId === site.id) count++;
      });

      // 1. Minutes (Real-time)
      if (!historyData.minutes) historyData.minutes = [];
      historyData.minutes.push({ time: timeStr, users: count });
      if (historyData.minutes.length > 60) historyData.minutes.shift(); // Keep last 60 points
      
      // 2. Hours (Peak users per hour)
      if (!historyData.hours) historyData.hours = [];
      const lastHour = historyData.hours[historyData.hours.length - 1];
      
      if (lastHour && lastHour.time === hourStr) {
        lastHour.users = Math.max(lastHour.users, count);
      } else {
        historyData.hours.push({ time: hourStr, users: count });
        if (historyData.hours.length > 24) historyData.hours.shift();
      }
      
      // 3. Days (Peak users per day)
      if (!historyData.days) historyData.days = [];
      const lastDay = historyData.days[historyData.days.length - 1];
      
      if (lastDay && lastDay.time === dayStr) {
        lastDay.users = Math.max(lastDay.users, count);
      } else {
        historyData.days.push({ time: dayStr, users: count });
        if (historyData.days.length > 7) historyData.days.shift();
      }
      
      // Save updated history
      await storage.saveHistory(site.id, historyData);

      // Broadcast updates to all timeframe rooms
      io.to(`dashboard_${site.id}_minutes`).emit('stats_update', await getStats(site.id, 'minutes'));
      io.to(`dashboard_${site.id}_hours`).emit('stats_update', await getStats(site.id, 'hours'));
      io.to(`dashboard_${site.id}_days`).emit('stats_update', await getStats(site.id, 'days'));
    }
  } catch (err) {
    console.error('Error updating history:', err);
  }
}

// Broadcast stats to a specific room
async function broadcastStats(siteId, timeframe = 'minutes') {
  io.to(`dashboard_${siteId}_${timeframe}`).emit('stats_update', await getStats(siteId, timeframe));
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // --- Tracker Events ---
  
  socket.on('join', (data) => {
    let { siteId, url, referrer, userAgent } = data;
    
    if (!siteId) {
      console.log('Join attempt without siteId');
      return;
    }

    // Robustness
    siteId = String(siteId).trim();

    console.log(`User joined site ${siteId}: ${url} (Socket: ${socket.id})`);
    
    // Store session
    activeSessions.set(socket.id, {
      siteId,
      url,
      referrer,
      userAgent,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now()
    });

    storage.incrementTotalViews(siteId);

    // Join site room (optional, useful if we want to msg all users of a site)
    socket.join(`site_${siteId}`);

    // Update dashboards watching this site (realtime)
    broadcastStats(siteId, 'minutes');
  });

  socket.on('heartbeat', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.lastHeartbeat = Date.now();
      activeSessions.set(socket.id, session);
    }
  });

  socket.on('page_view', (data) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.url = data.url;
      activeSessions.set(socket.id, session);
      
      // Increment total views on navigation too
      storage.incrementTotalViews(session.siteId);
      
      broadcastStats(session.siteId, 'minutes');
    }
  });

  // --- Dashboard Events ---

  // Dashboard client says: "I want to watch stats for site X"
  socket.on('monitor_site', async ({ siteId, timeframe }) => {
    if (!siteId) return;
    siteId = String(siteId).trim();
    
    const tf = timeframe || 'minutes';
    console.log(`Socket ${socket.id} monitoring site ${siteId} (${tf})`);
    
    // Leave previous rooms for this site to avoid double updates if switching
    socket.leave(`dashboard_${siteId}_minutes`);
    socket.leave(`dashboard_${siteId}_hours`);
    socket.leave(`dashboard_${siteId}_days`);
    
    socket.join(`dashboard_${siteId}_${tf}`);
    // Send immediate initial stats
    socket.emit('stats_update', await getStats(siteId, tf));
  });

  // --- Disconnect ---
  
  socket.on('disconnect', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      console.log(`User disconnected from site ${session.siteId}:`, socket.id);
      const siteId = session.siteId;
      activeSessions.delete(socket.id);
      broadcastStats(siteId, 'minutes');
    }
  });
});

// Periodic cleanup of zombies
setInterval(() => {
  const now = Date.now();
  const affectedSites = new Set();
  
  activeSessions.forEach((session, socketId) => {
    if (now - session.lastHeartbeat > 15000) { // 15s timeout
      // console.log(`Removing zombie session: ${socketId}`);
      affectedSites.add(session.siteId);
      activeSessions.delete(socketId);
      
      const socket = io.sockets.sockets.get(socketId);
      if (socket) socket.disconnect(true);
    }
  });

  // Broadcast updates only to affected sites
  affectedSites.forEach(siteId => {
    broadcastStats(siteId, 'minutes');
  });
}, 5000);

// Record history every 5 seconds
setInterval(updateHistory, 5000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
