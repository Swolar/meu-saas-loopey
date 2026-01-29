import React, { useState, useEffect } from 'react';
import { Shield, Globe, Smartphone, Lock, Check, AlertTriangle, EyeOff, Layout, Zap, Server, BookOpen, Copy, Link } from 'lucide-react';

const DashboardCloaker = ({ themeColor, userPlan = 'free', siteId, site }) => {
  const [cloakerConfig, setCloakerConfig] = useState(() => {
    const defaultConfig = {
      enabled: false,
      locked: false,
      safePageUrl: '',
      offerPageUrl: '',
      bindingDomain: '',
      allowedCountries: 'BR, PT, US',
      blockVpn: true,
      blockBots: true,
      deviceFilter: {
        desktop: true,
        mobile: true,
        tablet: true
      },
      repeatVisitor: {
        enabled: false,
        threshold: 3,
        target: 'safe'
      }
    };

    if (site && site.cloaker_config) {
      return { ...defaultConfig, ...site.cloaker_config };
    }

    try {
      const saved = localStorage.getItem('cloakerConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultConfig, ...parsed };
      }
    } catch (e) {
      console.error('Error parsing saved config:', e);
    }
    
    return defaultConfig;
  });

  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const trackerBase = (import.meta.env && import.meta.env.DEV) ? 'http://localhost:3001' : window.location.origin;
  const installSnippet = `<script src="${trackerBase}/script.js" data-site-id="${siteId || 'SEU_SITE_ID'}"></script>`;
  const testUrl = `${trackerBase}/test-tracking/${siteId || 'SEU_SITE_ID'}`;

  useEffect(() => {
    if (site && site.cloaker_config) {
      setCloakerConfig(site.cloaker_config);
    }
  }, [site]);

  const handleSave = async () => {
    setLoading(true);
    localStorage.setItem('cloakerConfig', JSON.stringify(cloakerConfig));

    if (siteId) {
      const token = localStorage.getItem('token');
      try {
        await fetch(`/api/sites/${siteId}/cloaker`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ cloaker_config: cloakerConfig })
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        console.error('Error saving cloaker config:', err);
        alert('Erro ao salvar configurações no servidor.');
      }
    }
    setLoading(false);
  };

  const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <div 
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        background: checked ? themeColor : '#374151',
        borderRadius: '999px',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        boxShadow: checked ? `0 0 10px ${themeColor}40` : 'none'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        background: 'white',
        borderRadius: '50%',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );

  const SectionCard = ({ title, icon: Icon, children, accentColor }) => (
    <div style={{ 
      background: 'rgba(30, 41, 59, 0.7)', 
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)', 
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      height: '100%'
    }}>
      <div style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ 
          padding: '0.5rem', 
          borderRadius: '8px', 
          background: `${accentColor}20`,
          color: accentColor
        }}>
          <Icon size={20} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Proteção de Tráfego
            <div style={{ 
              background: cloakerConfig.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)', 
              color: cloakerConfig.enabled ? '#10b981' : '#9ca3af', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '99px', 
              fontSize: '0.75rem', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
              {cloakerConfig.enabled ? 'Ativo' : 'Inativo'}
            </div>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', lineHeight: '1.5' }}>
            Configure filtros avançados para proteger suas campanhas contra tráfego indesejado, bots e auditorias.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: saveSuccess ? '#10b981' : themeColor,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'all 0.3s',
              boxShadow: `0 4px 14px ${saveSuccess ? '#10b981' : themeColor}40`,
              transform: loading ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {loading ? (
               <>
                 <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                 Salvando...
               </>
            ) : saveSuccess ? (
                <>
                    <Check size={18} strokeWidth={3} /> Salvo
                </>
            ) : (
                <>
                    <Server size={18} /> Salvar Configuração
                </>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        
        {/* Main Status & URLs - Full Width on Mobile, 7/12 on Desktop */}
        <div style={{ gridColumn: 'span 12' }}>
           <div style={{ 
              background: `linear-gradient(145deg, ${themeColor}15, rgba(30, 41, 59, 0.4))`,
              border: `1px solid ${themeColor}30`,
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem'
           }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ 
                   width: '48px', height: '48px', 
                   borderRadius: '12px', 
                   background: themeColor, 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   color: 'white',
                   boxShadow: `0 4px 12px ${themeColor}50`
                 }}>
                    <Shield size={24} />
                 </div>
                 <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Status da Proteção</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {cloakerConfig.enabled ? 'O filtro de tráfego está ativo e operando.' : 'O tráfego está passando sem filtragem.'}
                    </p>
                 </div>
              </div>
              <ToggleSwitch 
                checked={cloakerConfig.enabled} 
                onChange={(v) => setCloakerConfig({...cloakerConfig, enabled: v})} 
              />
           </div>
        </div>

        {/* Left Column - 7/12 */}
        <div style={{ gridColumn: 'span 12', '@media (min-width: 1024px)': { gridColumn: 'span 7' } }} className="col-span-12 lg:col-span-7">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <SectionCard title="Destinos de Tráfego" icon={Layout} accentColor="#f59e0b">
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Safe Page */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                         <Shield size={14} color="#f59e0b" />
                         Página Segura (Safe Page)
                         <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b15', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Obrigatório</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="https://meusite.com/artigo-seguro" 
                          value={cloakerConfig.safePageUrl}
                          onChange={(e) => setCloakerConfig({...cloakerConfig, safePageUrl: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.9rem 1rem',
                            paddingLeft: '2.5rem',
                            borderRadius: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = themeColor}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                           <Lock size={16} />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                        Visitantes identificados como risco alto ou não autorizados serão redirecionados para cá.
                      </p>
                    </div>

                    {/* Offer Page */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                         <Zap size={14} color="#10b981" />
                         Página Principal (Money Page)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="https://meusite.com/oferta-principal" 
                          value={cloakerConfig.offerPageUrl}
                          onChange={(e) => setCloakerConfig({...cloakerConfig, offerPageUrl: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.9rem 1rem',
                            paddingLeft: '2.5rem',
                            borderRadius: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = themeColor}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                           <Globe size={16} />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                        Se vazio, o visitante qualificado permanecerá na URL atual.
                      </p>
                    </div>

                    {/* Domain Binding */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                         <Globe size={14} color="#3b82f6" />
                         Domínio de Máscara (Opcional)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="https://meudominio-mascara.com" 
                          value={cloakerConfig.bindingDomain}
                          onChange={(e) => setCloakerConfig({...cloakerConfig, bindingDomain: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '0.9rem 1rem',
                            paddingLeft: '2.5rem',
                            borderRadius: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = themeColor}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                           <Link size={16} />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '0.5rem' }}>
                        Se preenchido, o tráfego será mascarado através deste domínio.
                      </p>
                    </div>

                 </div>
              </SectionCard>

              <SectionCard title="Filtro de Dispositivos" icon={Smartphone} accentColor="#3b82f6">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                     {[
                        { key: 'desktop', label: 'Desktop', icon: Server },
                        { key: 'mobile', label: 'Mobile', icon: Smartphone },
                        { key: 'tablet', label: 'Tablet', icon: Layout }
                     ].map(device => (
                        <div 
                          key={device.key}
                          onClick={() => {
                            setCloakerConfig({
                              ...cloakerConfig, 
                              deviceFilter: {
                                 ...cloakerConfig.deviceFilter, 
                                 [device.key]: !cloakerConfig.deviceFilter[device.key]
                              }
                           });
                          }}
                          style={{
                             background: cloakerConfig.deviceFilter[device.key] ? `${themeColor}20` : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${cloakerConfig.deviceFilter[device.key] ? themeColor : 'rgba(255,255,255,0.1)'}`,
                             borderRadius: '12px',
                             padding: '1rem',
                             cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s'
                           }}
                        >
                           <device.icon size={24} color={cloakerConfig.deviceFilter[device.key] ? themeColor : '#64748b'} />
                           <span style={{ fontSize: '0.9rem', fontWeight: '500', color: cloakerConfig.deviceFilter[device.key] ? 'white' : '#9ca3af' }}>{device.label}</span>
                        </div>
                     ))}
                 </div>
              </SectionCard>

              <SectionCard title="Instalação" icon={BookOpen} accentColor="#22c55e">
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                       Inclua este script no <span style={{ color: 'white' }}>head</span> do seu site para ativar o Cloaker:
                    </p>
                    <div style={{ 
                       display: 'flex', 
                       alignItems: 'stretch', 
                       gap: '0.75rem',
                       flexWrap: 'wrap'
                    }}>
                       <div style={{ 
                          flex: 1, 
                          background: 'rgba(0,0,0,0.25)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '10px',
                          padding: '0.75rem',
                          fontFamily: 'monospace',
                          color: 'white',
                          fontSize: '0.85rem',
                          lineHeight: 1.6,
                          wordBreak: 'break-all'
                       }}>
                         {installSnippet}
                       </div>
                       <button
                          onClick={() => {
                             navigator.clipboard.writeText(installSnippet).then(() => {
                               setCopied(true);
                               setTimeout(() => setCopied(false), 1500);
                             });
                          }}
                          style={{
                             padding: '0.75rem 1rem',
                             background: copied ? '#10b981' : themeColor,
                             color: 'white',
                             border: 'none',
                             borderRadius: '10px',
                             cursor: 'pointer',
                             fontSize: '0.9rem',
                             fontWeight: '600',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.5rem',
                             boxShadow: `0 4px 12px ${themeColor}40`,
                          }}
                       >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                          {copied ? 'Copiado' : 'Copiar'}
                       </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                       <a 
                         href={testUrl} 
                         target="_blank" 
                         rel="noreferrer" 
                         style={{
                           padding: '0.6rem 0.9rem',
                           borderRadius: '10px',
                           border: '1px solid rgba(255,255,255,0.1)',
                           color: 'white',
                           textDecoration: 'none',
                           background: 'rgba(34,197,94,0.12)'
                         }}
                       >
                         Abrir página de teste
                       </a>
                       <span style={{ fontSize: '0.8rem', color: '#94a3b8', alignSelf: 'center' }}>
                         Script hospedado em: {trackerBase}/script.js
                       </span>
                    </div>
                 </div>
              </SectionCard>
           </div>
        </div>

        {/* Right Column - 5/12 */}
        <div style={{ gridColumn: 'span 12', '@media (min-width: 1024px)': { gridColumn: 'span 5' } }} className="col-span-12 lg:col-span-5">
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <SectionCard title="Geolocalização" icon={Globe} accentColor="#8b5cf6">
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Permitir acesso apenas destes países (siglas ISO 2 letras):
                 </p>
                 <textarea
                    value={cloakerConfig.allowedCountries}
                    onChange={(e) => setCloakerConfig({...cloakerConfig, allowedCountries: e.target.value})}
                    placeholder="Ex: BR, PT, US"
                    style={{
                       width: '100%',
                       height: '120px',
                       padding: '1rem',
                       borderRadius: '10px',
                       background: 'rgba(0, 0, 0, 0.2)',
                       border: '1px solid rgba(255, 255, 255, 0.1)',
                       color: 'white',
                       fontSize: '0.95rem',
                       outline: 'none',
                       resize: 'none',
                       fontFamily: 'monospace',
                       lineHeight: '1.5'
                    }}
                 />
                 <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {cloakerConfig.allowedCountries.split(',').filter(c => c.trim()).slice(0, 5).map(c => (
                       <span key={c} style={{ background: '#8b5cf620', color: '#a78bfa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                          {c.trim().toUpperCase()}
                       </span>
                    ))}
                    {cloakerConfig.allowedCountries.split(',').filter(c => c.trim()).length > 5 && (
                       <span style={{ color: '#64748b', fontSize: '0.75rem', padding: '0.2rem' }}>...</span>
                    )}
                 </div>
              </SectionCard>

              <SectionCard title="Segurança Avançada" icon={Lock} accentColor="#ef4444">
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                       <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Bloquear VPN/Proxy</h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Detecta IPs de datacenters e redes anônimas.</p>
                       </div>
                       <ToggleSwitch 
                          checked={cloakerConfig.blockVpn} 
                          onChange={(v) => setCloakerConfig({...cloakerConfig, blockVpn: v})} 
                       />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Proteção Anti-Bot</h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filtra crawlers e ferramentas de análise automatizada.</p>
                       </div>
                       <ToggleSwitch 
                          checked={cloakerConfig.blockBots} 
                          onChange={(v) => setCloakerConfig({...cloakerConfig, blockBots: v})} 
                       />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div>
                           <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>Redirecionar por Reacesso (IP)</h4>
                           <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Envia para destino ao atingir N acessos pelo mesmo IP.</p>
                         </div>
                         <ToggleSwitch
                           checked={!!cloakerConfig.repeatVisitor?.enabled}
                           onChange={(v) => setCloakerConfig({
                             ...cloakerConfig,
                             repeatVisitor: { ...(cloakerConfig.repeatVisitor || {}), enabled: v }
                           })}
                         />
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                         <div>
                           <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Acessos (N)</label>
                           <input
                             type="number"
                             min="1"
                             value={cloakerConfig.repeatVisitor?.threshold ?? 3}
                             onChange={(e) => setCloakerConfig({
                               ...cloakerConfig,
                               repeatVisitor: { ...(cloakerConfig.repeatVisitor || {}), threshold: Number(e.target.value || 3) }
                             })}
                             style={{
                               width: '100%',
                               padding: '0.6rem 0.8rem',
                               borderRadius: '10px',
                               background: 'rgba(0, 0, 0, 0.2)',
                               border: '1px solid rgba(255, 255, 255, 0.1)',
                               color: 'white',
                               fontSize: '0.9rem',
                               outline: 'none'
                             }}
                           />
                         </div>
                         <div>
                           <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Destino</label>
                           <select
                             value={cloakerConfig.repeatVisitor?.target ?? 'safe'}
                             onChange={(e) => setCloakerConfig({
                               ...cloakerConfig,
                               repeatVisitor: { ...(cloakerConfig.repeatVisitor || {}), target: e.target.value }
                             })}
                             style={{
                               width: '100%',
                               padding: '0.6rem 0.8rem',
                               borderRadius: '10px',
                               background: 'rgba(0, 0, 0, 0.2)',
                               border: '1px solid rgba(255, 255, 255, 0.1)',
                               color: 'white',
                               fontSize: '0.9rem',
                               outline: 'none'
                             }}
                           >
                             <option value="safe">Safe Page</option>
                             <option value="offer">Money Page</option>
                           </select>
                         </div>
                       </div>
                    </div>

                 </div>
              </SectionCard>

           </div>
        </div>

      </div>
      
      {/* Styles for grid responsiveness (simulated since we can't use tailwind classes directly easily without setup) */}
      <style>{`
        @media (max-width: 1024px) {
           .col-span-12 { grid-column: span 12 !important; }
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardCloaker;
