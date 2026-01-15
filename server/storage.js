class Storage {
  async init() { throw new Error('Method not implemented'); }
  async getSites() { throw new Error('Method not implemented'); }
  async getSite(id) { throw new Error('Method not implemented'); }
  async createSite(site) { throw new Error('Method not implemented'); }
  async deleteSite(id) { throw new Error('Method not implemented'); }
  async getDailyStats(siteId, days = 30) {
    const stats = this.dailyStats.get(siteId) || {};
    // Return array of { date: 'YYYY-MM-DD', views: N }
    // We can filter for last N days if needed, or return all
    return Object.entries(stats).map(([date, views]) => ({ date, views }));
  }

  async getHistory(siteId) { throw new Error('Method not implemented'); }
  async saveHistory(siteId, historyData) { throw new Error('Method not implemented'); }
  async createUser(username, password) { throw new Error('Method not implemented'); }
  async validateUser(username, password) { throw new Error('Method not implemented'); }
  async updateUserPassword(username, currentPassword, newPassword) { throw new Error('Method not implemented'); }
}

class LocalStorage extends Storage {
  constructor() {
    super();
    this.sites = new Map();
    this.siteHistory = new Map(); // Store history: { minutes: [], hours: [], days: [] }
    this.dailyStats = new Map(); // Store daily stats: { 'YYYY-MM-DD': count }
    this.dataFile = 'data.json';
    
    // Load data from file if exists
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        if (data.sites) this.sites = new Map(data.sites);
        if (data.siteHistory) this.siteHistory = new Map(data.siteHistory);
        if (data.dailyStats) this.dailyStats = new Map(data.dailyStats);
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

  async incrementTotalViews(siteId) {
    const site = this.sites.get(siteId);
    if (site) {
      // Increment total views
      site.totalViews = (site.totalViews || 0) + 1;
      this.sites.set(siteId, site);

      // Increment daily views
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let stats = this.dailyStats.get(siteId) || {};
      stats[today] = (stats[today] || 0) + 1;
      this.dailyStats.set(siteId, stats);

      this.save();
    }
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
