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
  async getDailyStats(siteId, days) { throw new Error('Method not implemented'); }
  async saveHistory(siteId, historyData) { throw new Error('Method not implemented'); }
  async createUser(username, password) { throw new Error('Method not implemented'); }
  async validateUser(username, password) { throw new Error('Method not implemented'); }
  async updateUserPassword(username, currentPassword, newPassword) { throw new Error('Method not implemented'); }
}

const fs = require('fs');
const path = require('path');

class LocalStorage extends Storage {
  constructor(dataFile) {
    super();
    this.dataFile = dataFile;
    this.sites = new Map();
    this.siteHistory = new Map();
    this.dailyStats = new Map();
    this.users = new Map();
  }

  async init() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const rawData = fs.readFileSync(this.dataFile, 'utf8');
        if (rawData) {
          const data = JSON.parse(rawData);
          if (data.sites) {
            this.sites = new Map(data.sites);
          }
          if (data.history) {
            this.siteHistory = new Map(data.history);
          }
          if (data.dailyStats) {
            this.dailyStats = new Map(data.dailyStats);
          }
          if (data.users) {
            this.users = new Map(data.users);
          }
        }
      }
    } catch (err) {
      console.error('Error loading local data:', err);
    }

    // Seed demo site
    if (!this.sites.has('demo-site')) {
      this.sites.set('demo-site', { id: 'demo-site', name: 'Demo Loopey Site', domain: 'localhost', createdAt: Date.now() });
    }
    if (!this.siteHistory.has('demo-site')) {
      this.siteHistory.set('demo-site', { minutes: [], hours: [], days: [] });
    }
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
    if (this.users.has(username)) {
      throw new Error('User already exists');
    }
    // In a real app, hash the password!
    this.users.set(username, { username, password, createdAt: Date.now() });
    this.save();
    return { username };
  }

  async validateUser(username, password) {
    const user = this.users.get(username);
    if (user && user.password === password) {
      const { password: _, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }

  async updateUserPassword(username, currentPassword, newPassword) {
    const user = this.users.get(username);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.password !== currentPassword) {
      throw new Error('Incorrect password');
    }
    user.password = newPassword;
    this.users.set(username, user);
    this.save();
    return true;
  }

  // Helper for periodic save
  save() {
    try {
      const data = {
        sites: Array.from(this.sites.entries()),
        history: Array.from(this.siteHistory.entries()),
        users: Array.from(this.users.entries())
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }
}

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

class SupabaseStorage extends Storage {
  constructor(url, key) {
    super();
    this.supabase = createClient(url, key);
    // In-memory cache for high-frequency real-time updates (minutes)
    // We only persist 'hours' and 'days' or periodically persist 'minutes'
    this.localCache = new Map(); 
  }

  async init() {
    console.log('Connected to Supabase');
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
    // We assume a table 'daily_site_stats' with columns: site_id, date, views
    // This is a "best effort" increment for now without a specific RPC for atomic daily increment
    // Ideally we would use an RPC like increment_daily_views(site_id, date)
    
    /* 
      SQL for table:
      create table daily_site_stats (
        site_id text,
        date date,
        views int default 0,
        primary key (site_id, date)
      );
    */
    
    // For now, let's just try to call an RPC if it existed, or do a read-modify-write (risky for high concurrency)
    // Or we rely on the client/socket logic to be the source of truth for high-freq updates?
    // No, storage is source of truth.
    
    // Let's implement a simple upsert via client for now
    const { data: currentDay } = await this.supabase
        .from('daily_site_stats')
        .select('views')
        .eq('site_id', siteId)
        .eq('date', today)
        .single();
        
    const newViews = (currentDay?.views || 0) + 1;
    
    await this.supabase
        .from('daily_site_stats')
        .upsert({ site_id: siteId, date: today, views: newViews }, { onConflict: 'site_id, date' });

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
      console.error('Error fetching daily stats from Supabase:', error);
      return [];
    }
    return data || [];
  }

  async getHistory(siteId) {
    // For MVP, we might still want to use in-memory for real-time speed, 
    // but fetch initial state from DB.
    // Implementing full DB history sync is complex.
    // Strategy: Return local cache if exists, else fetch.
    
    if (!this.localCache.has(siteId)) {
       // Initialize empty structure
       this.localCache.set(siteId, { minutes: [], hours: [], days: [] });
       
       // TODO: Fetch 'hours' and 'days' from DB (site_history table)
       // This is a placeholder for the actual DB fetch implementation
       const { data } = await this.supabase.from('site_history').select('*').eq('site_id', siteId);
       
       if (data) {
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
        if (error) console.error('Supabase save error:', error.message);
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
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Incorrect password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update to new password
    const { error: updateError } = await this.supabase.from('users')
      .update({ password: hashedPassword })
      .eq('username', username);

    if (updateError) throw updateError;
    return true;
  }
}

module.exports = { LocalStorage, SupabaseStorage };
