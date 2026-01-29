class Storage {
  async init() { throw new Error('Method not implemented'); }
  async getSites() { throw new Error('Method not implemented'); }
  async getSite(id) { throw new Error('Method not implemented'); }
  async createSite(site) { throw new Error('Method not implemented'); }
  async deleteSite(id) { throw new Error('Method not implemented'); }
  async updateSite(id, data) { throw new Error('Method not implemented'); }
  async getDailyStats(siteId, days = 30, slug = null) {
    const stats = this.dailyStats.get(siteId) || {};
    const entries = Object.entries(stats);
    
    return entries.map(([date, data]) => {
      let views = 0;
      if (typeof data === 'number') {
        // Legacy format: only total available
        views = slug ? 0 : data; 
      } else {
        // New format: object with total and slugs
        if (slug) {
          views = (data.slugs && data.slugs[slug]) || 0;
        } else {
          views = data.total || 0;
        }
      }
      return { date, views };
    });
  }

  async getHistory(siteId) { throw new Error('Method not implemented'); }
  async saveHistory(siteId, historyData) { throw new Error('Method not implemented'); }
  async createUser(username, password) { throw new Error('Method not implemented'); }
  async validateUser(username, password) { throw new Error('Method not implemented'); }
  async updateUserPassword(username, currentPassword, newPassword) { throw new Error('Method not implemented'); }
  async updateSiteUptimeStatus(siteId, status, lastCheck) { throw new Error('Method not implemented'); }
}

class LocalStorage extends Storage {
  constructor(dataFile = 'data.json') {
    super();
    this.sites = new Map();
    this.siteHistory = new Map(); // Store history: { minutes: [], hours: [], days: [] }
    this.dailyStats = new Map(); // Store daily stats: { 'YYYY-MM-DD': count }
    this.kanbanBoards = new Map(); // Store kanban boards
    this.dataFile = dataFile;
    
    // Load data from file if exists
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        if (data.sites) this.sites = new Map(data.sites);
        if (data.siteHistory) this.siteHistory = new Map(data.siteHistory);
        if (data.dailyStats) this.dailyStats = new Map(data.dailyStats);
        if (data.kanbanBoards) this.kanbanBoards = new Map(data.kanbanBoards);
      } catch (err) {
        console.error('Error loading data file:', err);
      }
    } else {
        // Create default user if no data file
        // This is a temporary hack for local dev without Supabase
        // Ideally we shouldn't mix auth logic here, but for simplicity:
        // We will store users in 'sites' map or a separate map?
        // Let's add a users map.
    }
    this.users = new Map();
    // Load users
    if (fs.existsSync(this.dataFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
            if (data.users) this.users = new Map(data.users);
        } catch (err) {}
    }
  }

  async init() {
    console.log('LocalStorage initialized');
  }

  async save() {
    const data = {
      sites: Array.from(this.sites.entries()),
      siteHistory: Array.from(this.siteHistory.entries()),
      dailyStats: Array.from(this.dailyStats.entries()),
      kanbanBoards: Array.from(this.kanbanBoards.entries()),
      users: Array.from(this.users.entries())
    };
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  async getSites() {
    return Array.from(this.sites.values());
  }

  async getSite(id) {
    return this.sites.get(id);
  }

  async createSite(site) {
    this.sites.set(site.id, site);
    this.siteHistory.set(site.id, { minutes: [], hours: [], days: [] });
    this.dailyStats.set(site.id, {});
    this.save();
    return site;
  }

  async deleteSite(id) {
    const deleted = this.sites.delete(id);
    this.siteHistory.delete(id);
    this.dailyStats.delete(id);
    this.save();
    return deleted;
  }

  async updateSite(siteId, data) {
    const site = this.sites.get(siteId);
    if (!site) return null;
    if (typeof data.name === 'string') {
      site.name = data.name;
    }
    if (typeof data.domain === 'string') {
      site.domain = data.domain;
    }
    if (Array.isArray(data.slugs)) {
      site.slugs = data.slugs;
    }
    if (data.uptime_config) {
      site.uptime_config = data.uptime_config;
    }
    if (data.ntfy_config) {
      site.ntfy_config = data.ntfy_config;
    }
    this.sites.set(siteId, site);
    this.save();
    return site;
  }

  async incrementTotalViews(siteId, slug = null) {
    const site = this.sites.get(siteId);
    if (site) {
      // Increment total views
      site.totalViews = (site.totalViews || 0) + 1;
      this.sites.set(siteId, site);

      // Increment daily views
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let stats = this.dailyStats.get(siteId) || {};
      
      // Migration/Robustness: Ensure today's entry is an object structure if we want to store slug details
      // Current structure might be: stats[today] = number
      // New structure: stats[today] = { total: number, slugs: { 'slugname': count } }
      
      let entry = stats[today];
      if (typeof entry === 'number') {
        entry = { total: entry, slugs: {} };
      } else if (!entry) {
        entry = { total: 0, slugs: {} };
      }
      
      entry.total += 1;
      
      if (slug) {
        if (!entry.slugs) entry.slugs = {};
        entry.slugs[slug] = (entry.slugs[slug] || 0) + 1;
      }
      
      stats[today] = entry;
      this.dailyStats.set(siteId, stats);

      this.save();
    }
  }

  async incrementBotViews(siteId) {
    const site = this.sites.get(siteId);
    if (site) {
      const today = new Date().toISOString().split('T')[0];
      let stats = this.dailyStats.get(siteId) || {};
      let entry = stats[today];
      if (typeof entry === 'number') {
        entry = { total: entry, slugs: {}, bots: 0 };
      } else if (!entry) {
        entry = { total: 0, slugs: {}, bots: 0 };
      } else {
        if (entry.bots === undefined) entry.bots = 0;
      }
      entry.bots += 1;
      stats[today] = entry;
      this.dailyStats.set(siteId, stats);
      this.save();
    }
  }

  async getDailyStats(siteId, days = 30, slug = null) {
    const stats = this.dailyStats.get(siteId) || {};
    const entries = Object.entries(stats);
    
    return entries.map(([date, data]) => {
      let views = 0;
      if (typeof data === 'number') {
        // Legacy format: only total available
        views = slug ? 0 : data; 
      } else {
        // New format: object with total and slugs
        if (slug) {
          views = (data.slugs && data.slugs[slug]) || 0;
        } else {
          views = data.total || 0;
        }
      }
      return { date, views };
    });
  }

  async getDailyBotStats(siteId, days = 30) {
    const stats = this.dailyStats.get(siteId) || {};
    const entries = Object.entries(stats);
    return entries.map(([date, data]) => {
      if (typeof data === 'number') {
        return { date, bots: 0 };
      } else {
        return { date, bots: data.bots || 0 };
      }
    });
  }

  async updateSiteTheme(siteId, color) {
    const site = this.sites.get(siteId);
    if (site) {
      site.theme_color = color;
      this.sites.set(siteId, site);
      this.save();
      return site;
    }
    return null;
  }

  async updateSiteSlugs(siteId, slugs) {
    const site = this.sites.get(siteId);
    if (site) {
      site.slugs = Array.isArray(slugs) ? slugs : [];
      this.sites.set(siteId, site);
      this.save();
      return site;
    }
    return null;
  }

  async updateSiteUptimeStatus(siteId, status, lastCheck) {
    const site = this.sites.get(siteId);
    if (site && site.uptime_config) {
      site.uptime_config.status = status;
      site.uptime_config.last_check = lastCheck;
      this.sites.set(siteId, site);
      this.save();
    }
  }

  async getHistory(siteId) {
    let history = this.siteHistory.get(siteId);
    if (!history || Array.isArray(history)) {
        history = { minutes: [], hours: [], days: [] };
        this.siteHistory.set(siteId, history);
    }
    return history;
  }

  async saveHistory(siteId, historyData) {
    this.siteHistory.set(siteId, historyData);
    // Debounce save in production, but here we rely on the periodic save in index.js 
    // or we can explicitly save.
    // For simplicity in this refactor, we won't save to disk on every single history update tick
    // because index.js handles periodic saving.
  }
  
  async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword, createdAt: Date.now() };
    this.users.set(username, newUser);
    this.save();
    return { username };
  }
  
  async validateUser(username, password) {
    const user = this.users.get(username);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
  
  async updateUserPassword(username, currentPassword, newPassword) {
      const user = this.users.get(username);
      if (!user) return false;
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return false;
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      this.users.set(username, user);
      this.save();
      return true;
  }

  async getKanbanBoard(siteId) {
    let board = this.kanbanBoards.get(siteId);
    if (!board) {
        // Default Board Structure
        board = {
            tasks: {},
            columns: {
                'todo': { id: 'todo', title: 'A Fazer', taskIds: [] },
                'in-progress': { id: 'in-progress', title: 'Em Progresso', taskIds: [] },
                'done': { id: 'done', title: 'Concluído', taskIds: [] }
            },
            columnOrder: ['todo', 'in-progress', 'done']
        };
        this.kanbanBoards.set(siteId, board);
        this.save();
    }
    return board;
  }

  async updateKanbanBoard(siteId, boardData) {
      this.kanbanBoards.set(siteId, boardData);
      this.save();
      return boardData;
  }
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs'); // Ensure bcrypt is required here too

class SupabaseStorage extends Storage {
  constructor(url, key) {
    super();
    this.supabase = createClient(url, key);
    this.localCache = new Map(); // Cache for high-frequency history
  }

  async init() {
    console.log('Connected to Supabase');
    try {
      // Check for users table
      const { error } = await this.supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) {
        console.error('CRITICAL: Database connection failed or "users" table missing:', error);
      } else {
        console.log('Database connection verified. "users" table exists.');
      }
    } catch (err) {
      console.error('CRITICAL: Unexpected error connecting to Supabase:', err);
    }
  }

  async healthCheck() {
    const checks = {
      supabase: false,
      usersTable: false,
      sitesTable: false,
      siteHistoryTable: false,
      dailyStatsTable: false,
      error: null
    };

    try {
      const { error: usersError } = await this.supabase.from('users').select('count', { count: 'exact', head: true });
      checks.usersTable = !usersError;
      
      const { error: sitesError } = await this.supabase.from('sites').select('count', { count: 'exact', head: true });
      checks.sitesTable = !sitesError;

      const { error: historyError } = await this.supabase.from('site_history').select('count', { count: 'exact', head: true });
      checks.siteHistoryTable = !historyError;

      const { error: dailyError } = await this.supabase.from('daily_site_stats').select('count', { count: 'exact', head: true });
      checks.dailyStatsTable = !dailyError;

      checks.supabase = checks.usersTable && checks.sitesTable && checks.siteHistoryTable && checks.dailyStatsTable;
    } catch (err) {
      checks.error = err.message;
    }
    return checks;
  }

  async getSites() {
    const { data, error } = await this.supabase.from('sites').select('*');
    if (error) throw error;
    return data;
  }

  async getSite(id) {
    const { data, error } = await this.supabase.from('sites').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  }

  async createSite(site) {
    const { data, error } = await this.supabase.from('sites').insert([{
      id: site.id,
      name: site.name,
      domain: site.domain,
      slugs: Array.isArray(site.slugs) ? site.slugs : [],
      created_at: new Date(site.createdAt).toISOString()
    }]);
    
    if (error) throw error;
    return site;
  }

  async deleteSite(id) {
    const { error } = await this.supabase.from('sites').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async updateSite(siteId, data) {
    const payload = {};
    if (typeof data.name === 'string') {
      payload.name = data.name;
    }
    if (typeof data.domain === 'string') {
      payload.domain = data.domain;
    }
    if (Array.isArray(data.slugs)) {
      payload.slugs = data.slugs;
    }

    const { data: updated, error } = await this.supabase
      .from('sites')
      .update(payload)
      .eq('id', siteId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async incrementTotalViews(siteId) {
    const { error } = await this.supabase.rpc('increment_views', { site_id_param: siteId });
    
    // Also increment daily stats in a separate table 'daily_site_stats'
    const today = new Date().toISOString().split('T')[0];
    
    // Upsert daily stats
    const { data: currentDay } = await this.supabase
        .from('daily_site_stats')
        .select('views')
        .eq('site_id', siteId)
        .eq('date', today)
        .single();
        
    const newViews = (currentDay?.views || 0) + 1;
    
    const { error: upsertError } = await this.supabase
        .from('daily_site_stats')
        .upsert({ site_id: siteId, date: today, views: newViews }, { onConflict: 'site_id, date' });
    
    if (upsertError) {
        console.error('Error updating daily_site_stats (Table might be missing):', upsertError.message);
    }

    if (error) {
      console.error('Error incrementing views via RPC:', error);
      // Fallback: try direct update (less safe but works without RPC)
      const { data } = await this.supabase.from('sites').select('total_views').eq('id', siteId).single();
      if (data) {
        await this.supabase.from('sites').update({ total_views: (data.total_views || 0) + 1 }).eq('id', siteId);
      }
    }
  }

  async incrementBotViews(siteId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: currentDay } = await this.supabase
      .from('daily_site_stats')
      .select('bots')
      .eq('site_id', siteId)
      .eq('date', today)
      .single();
    const newBots = (currentDay?.bots || 0) + 1;
    const { error: upsertError } = await this.supabase
      .from('daily_site_stats')
      .upsert({ site_id: siteId, date: today, bots: newBots }, { onConflict: 'site_id, date' });
    if (upsertError) {
      console.error('Error updating daily_site_stats.bots:', upsertError.message);
    }
  }

  async updateSiteTheme(siteId, color) {
    const { data, error } = await this.supabase
      .from('sites')
      .update({ theme_color: color })
      .eq('id', siteId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateSiteSlugs(siteId, slugs) {
    const { data, error } = await this.supabase
      .from('sites')
      .update({ slugs: Array.isArray(slugs) ? slugs : [] })
      .eq('id', siteId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async getDailyStats(siteId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await this.supabase
      .from('daily_site_stats')
      .select('date, views')
      .eq('site_id', siteId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching daily stats (Table might be missing):', error.message);
      return [];
    }
    return data || [];
  }

  async getDailyBotStats(siteId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { data, error } = await this.supabase
      .from('daily_site_stats')
      .select('date, bots')
      .eq('site_id', siteId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (error) {
      console.error('Error fetching daily bot stats:', error.message);
      return [];
    }
    return (data || []).map(row => ({ date: row.date, bots: row.bots || 0 }));
  }

  async getHistory(siteId) {
    // Return local cache if exists, else fetch.
    
    if (!this.localCache.has(siteId)) {
       // Initialize empty structure
       this.localCache.set(siteId, { minutes: [], hours: [], days: [] });
       
       const { data, error } = await this.supabase.from('site_history').select('*').eq('site_id', siteId);
       
       if (error) {
           console.error('Error fetching site_history (Table might be missing):', error.message);
       } else if (data) {
         const history = { minutes: [], hours: [], days: [] };
         data.forEach(row => {
           if (history[row.timeframe]) {
             history[row.timeframe].push({ time: row.time_bucket, users: row.users_count });
           }
         });
         this.localCache.set(siteId, history);
       }
    }
    
    return this.localCache.get(siteId);
  }

  async saveHistory(siteId, historyData) {
    this.localCache.set(siteId, historyData);
    
    // Persist to DB asynchronously
    try {
      const upsertData = [];
      const now = new Date().toISOString();
      
      // Save hours
      if (historyData.hours && Array.isArray(historyData.hours)) {
        historyData.hours.forEach(h => {
          upsertData.push({
            site_id: siteId,
            timeframe: 'hours',
            time_bucket: h.time,
            users_count: h.users,
            updated_at: now
          });
        });
      }

      // Save days
      if (historyData.days && Array.isArray(historyData.days)) {
        historyData.days.forEach(d => {
          upsertData.push({
            site_id: siteId,
            timeframe: 'days',
            time_bucket: d.time,
            users_count: d.users,
            updated_at: now
          });
        });
      }

      if (upsertData.length > 0) {
        // Upsert: update if exists
        const { error } = await this.supabase.from('site_history').upsert(upsertData, { onConflict: 'site_id, timeframe, time_bucket' });
        if (error) console.error('Supabase save error (site_history):', error.message);
      }
    } catch (err) {
      console.error('Error saving history to Supabase:', err.message);
    }
  }

  async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await this.supabase.from('users').insert([{
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }]).select().single();
    
    if (error) throw error;
    return { username: data.username };
  }

  async validateUser(username, password) {
    const { data, error } = await this.supabase.from('users')
      .select('*')
      .eq('username', username)
      .single();
      
    if (error || !data) return null;
    
    const isValid = await bcrypt.compare(password, data.password);
    if (!isValid) return null;
    
    const { password: _, ...safeUser } = data;
    return safeUser;
  }

  async updateUserPassword(username, currentPassword, newPassword) {
    // First validate current password
    const { data: user, error: fetchError } = await this.supabase.from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      return false;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return false;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await this.supabase.from('users')
      .update({ password: hashedPassword })
      .eq('username', username);

    if (updateError) throw updateError;
    return true;
  }
}

const fs = require('fs');

module.exports = { LocalStorage, SupabaseStorage };
