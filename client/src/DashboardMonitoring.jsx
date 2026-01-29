import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Eye, Save, Loader } from 'lucide-react';

const DashboardMonitoring = ({ themeColor, userPlan = 'free', siteId, site }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // State for Uptime Notifications
  const [uptimeConfig, setUptimeConfig] = useState(() => {
    // Prefer site config if available
    if (site && site.uptime_config) {
        return site.uptime_config;
    }
    const saved = localStorage.getItem('uptimeConfig');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      email: true,
      push: true,
      url: '',
      interval: '5m'
    };
  });

  // Sync from site prop if it updates
  useEffect(() => {
    if (site && site.uptime_config) {
        setUptimeConfig(site.uptime_config);
    }
  }, [site]);

  // Save Uptime Config to Backend
  const handleSave = async () => {
    if (!siteId) return;
    setIsSaving(true);
    
    const token = localStorage.getItem('token');
    try {
        await fetch(`/api/sites/${siteId}/uptime`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                uptime_config: uptimeConfig
            })
        });
        localStorage.setItem('uptimeConfig', JSON.stringify(uptimeConfig));
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
        console.error('Error saving uptime config:', err);
    } finally {
        setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <div 
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '40px',
        height: '20px',
        background: checked ? '#3b82f6' : '#374151',
        borderRadius: '999px',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
        flexShrink: 0
      }}
    >
      <div style={{
        width: '16px',
        height: '16px',
        background: 'white',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s'
      }} />
    </div>
  );

  const NotificationPreview = ({ icon: Icon, color, title, lines }) => (
    <div style={{ 
      background: '#1f2937', 
      padding: '1rem', 
      borderRadius: '8px', 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '1rem',
      border: '1px solid #374151',
      marginTop: '1rem'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        background: color || 'black', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {Icon ? <Icon size={20} color="white" /> : <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>L</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.3rem', color: 'white' }}>{title}</div>
        {lines.map((line, idx) => (
          <div key={idx} style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.4' }}>{line}</div>
        ))}
        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>@Lvision</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Monitoramento <span style={{ fontSize: '1.5rem' }}>👁️</span>
        </h2>
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.15)', 
          color: '#3b82f6', 
          padding: '0.3rem 0.8rem', 
          borderRadius: '99px', 
          fontSize: '0.8rem', 
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <Eye size={14} /> Status em Tempo Real
        </div>
      </div>

      <div style={{ maxWidth: '600px' }}>
          {/* Uptime Notifications */}
          <div className="card" style={{ padding: '2rem', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                <AlertTriangle size={20} />
                Monitoramento de Uptime
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Receba alertas imediatos se seu site sair do ar.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#d1d5db', fontSize: '0.95rem' }}>Habilitar Monitoramento</span>
                  <ToggleSwitch 
                    checked={uptimeConfig.enabled} 
                    onChange={(checked) => setUptimeConfig({ ...uptimeConfig, enabled: checked })}
                  />
               </div>
               
               {uptimeConfig.enabled && (
                 <>
                   <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.4rem' }}>
                        URL para Monitorar
                      </label>
                      <input 
                        type="text" 
                        placeholder="https://meusite.com"
                        value={uptimeConfig.url || ''}
                        onChange={(e) => setUptimeConfig({ ...uptimeConfig, url: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '6px',
                            background: '#1f2937',
                            border: '1px solid #374151',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                      />
                   </div>

                   <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.4rem' }}>
                        Intervalo de Checagem
                      </label>
                      <select
                        value={uptimeConfig.interval || '5m'}
                        onChange={(e) => setUptimeConfig({ ...uptimeConfig, interval: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '6px',
                            background: '#1f2937',
                            border: '1px solid #374151',
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                      >
                        <option value="1m">1 Minuto</option>
                        <option value="5m">5 Minutos</option>
                        <option value="10m">10 Minutos</option>
                        <option value="30m">30 Minutos</option>
                        <option value="1h">1 Hora</option>
                      </select>
                   </div>
                   
                   <div style={{ height: '1px', background: '#374151', margin: '0.5rem 0' }} />
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Notificar por E-mail</span>
                      <ToggleSwitch 
                        checked={uptimeConfig.email} 
                        onChange={(checked) => setUptimeConfig({ ...uptimeConfig, email: checked })}
                      />
                   </div>
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Notificações Push</span>
                      <ToggleSwitch 
                        checked={uptimeConfig.push} 
                        onChange={(checked) => setUptimeConfig({ ...uptimeConfig, push: checked })}
                      />
                   </div>

                   <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                      <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                          width: '100%',
                          padding: '0.8rem',
                          background: isSaved ? '#10b981' : (themeColor || '#3b82f6'),
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          opacity: isSaving ? 0.7 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isSaving ? <Loader size={18} className="animate-spin" /> : isSaved ? <Check size={18} /> : <Save size={18} />}
                        {isSaving ? 'Salvando...' : isSaved ? 'Salvo!' : 'Salvar Alterações'}
                      </button>
                   </div>

                   {/* Status Indicator */}
                   {uptimeConfig.last_check && (
                       <div style={{ marginTop: '1rem', padding: '0.8rem', background: uptimeConfig.status === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: uptimeConfig.status === 'down' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: uptimeConfig.status === 'down' ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                               {uptimeConfig.status === 'down' ? <AlertTriangle size={16} /> : <Check size={16} />}
                               {uptimeConfig.status === 'down' ? 'Site Offline' : 'Site Online'}
                           </div>
                           <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                               Última verificação: {new Date(uptimeConfig.last_check).toLocaleTimeString()}
                           </div>
                       </div>
                   )}
                   
                   <NotificationPreview 
                        icon={AlertTriangle}
                        color="#ef4444"
                        title="Site Offline! 🚨"
                        lines={[
                            "Seu site parou de responder.",
                            "Verificado em: 10:42 AM"
                        ]}
                    />
                 </>
               )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default DashboardMonitoring;
