import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, Eye, Trophy, Brain, Lock, Activity, TrendingDown, Bot, Loader } from 'lucide-react';

const DashboardNotifications = ({ themeColor, userPlan = 'free', siteId, site }) => {
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isTestSuccess, setIsTestSuccess] = useState(false);
  const [isSimulateLoading, setIsSimulateLoading] = useState(false);
  const [isSimulateSuccess, setIsSimulateSuccess] = useState(false);

  // State for Event Notifications (Views/Traffic)
  const [eventConfig, setEventConfig] = useState(() => {
    const saved = localStorage.getItem('eventConfig');
    return saved ? JSON.parse(saved) : {
      liveActivity: true,
      liveActivityInterval: '10m',
      gamification: true,
      urgency: true,
      smartAlerts: true
    };
  });

  // State for Report Notifications
  const [reportConfig, setReportConfig] = useState(() => {
    const saved = localStorage.getItem('reportConfig');
    return saved ? JSON.parse(saved) : {
      times: {
        '08:00': true,
        '12:00': true,
        '18:00': true,
        '23:00': true
      },
      pattern: 'detailed'
    };
  });



  // State for Ntfy.sh Integration
  const [ntfyConfig, setNtfyConfig] = useState(() => {
    // Prefer site config if available
    if (site && site.ntfy_config) {
        return site.ntfy_config;
    }
    const saved = localStorage.getItem('ntfyConfig');
    return saved ? JSON.parse(saved) : {
      topic: ''
    };
  });

  // Sync Ntfy from site prop if it updates
  React.useEffect(() => {
    if (site && site.ntfy_config) {
        setNtfyConfig(site.ntfy_config);
    }
  }, [site]);

  // Persist configurations
  React.useEffect(() => {
    localStorage.setItem('eventConfig', JSON.stringify(eventConfig));
  }, [eventConfig]);

  React.useEffect(() => {
    localStorage.setItem('reportConfig', JSON.stringify(reportConfig));
  }, [reportConfig]);



  React.useEffect(() => {
    localStorage.setItem('ntfyConfig', JSON.stringify(ntfyConfig));
  }, [ntfyConfig]);

  const testNtfy = async () => {
    if (!ntfyConfig.topic) {
      alert('Por favor, preencha o Tópico do Ntfy.sh.');
      return;
    }
    
    setIsTestLoading(true);
    try {
      await fetch(`https://ntfy.sh/${ntfyConfig.topic}`, {
        method: 'POST',
        body: 'Esta é uma notificação de teste do seu Dashboard.',
        headers: {
            'Title': 'Teste LoopeyLive',
            'Priority': 'high',
            'Tags': 'tada,test_tube'
        }
      });
      // alert('Notificação de teste enviada! Verifique o app Ntfy ou a web.');
      setIsTestSuccess(true);
      setTimeout(() => setIsTestSuccess(false), 2000);
    } catch (error) {
      console.error('Erro ao enviar teste Ntfy:', error);
      alert('Erro ao enviar notificação. Verifique o console.');
    } finally {
      setIsTestLoading(false);
    }
  };

  const simulateAllNotifications = async () => {
    if (!ntfyConfig.topic) {
        alert('Por favor, preencha o Tópico do Ntfy.sh primeiro.');
        return;
    }

    setIsSimulateLoading(true);
    const scenarios = [
        {
            title: 'Meta Atingida!',
            body: '🏆 Parabéns! Seu site alcançou 1.000 visualizações hoje.',
            tags: 'trophy,confetti_ball',
            priority: 'high'
        },
        {
            title: 'Atencao: Limite do Plano',
            body: '⚠️ Você atingiu 90% do limite de visualizações do plano Free.',
            tags: 'warning,chart_with_downwards_trend',
            priority: 'high'
        },
        {
            title: 'Alerta de Seguranca',
            body: '🧠 Detectamos um pico de tráfego incomum vindo de um mesmo IP.',
            tags: 'brain,police_car',
            priority: 'max'
        },
        {
            title: 'Relatorio Diario',
            body: '📊 Resumo: 1.542 views (+12%) | Pico: 14:00 | Top Origem: Google',
            tags: 'bar_chart,page_facing_up',
            priority: 'default'
        },
        {
            title: 'SITE OFFLINE!',
            body: '🚨 URGENTE: Seu site parou de responder às 10:42.',
            tags: 'rotating_light,scream',
            priority: 'max'
        }
    ];

    let count = 0;
    let lastError = null;

    for (const scenario of scenarios) {
        try {
            await fetch(`https://ntfy.sh/${ntfyConfig.topic}`, {
                method: 'POST',
                body: scenario.body,
                headers: {
                    'Title': `LoopeyLive: ${scenario.title}`,
                    'Priority': scenario.priority,
                    'Tags': scenario.tags
                }
            });
            count++;
            await new Promise(r => setTimeout(r, 1500));
        } catch (error) {
            console.error('Erro ao simular cenário:', error);
            lastError = error.message;
        }
    }

    setIsSimulateLoading(false);
    if (count === 0 && lastError) {
        alert(`Erro ao enviar notificações: ${lastError}`);
    } else {
        // alert(`${count} notificações de teste enviadas! Verifique seu celular.`);
        setIsSimulateSuccess(true);
        setTimeout(() => setIsSimulateSuccess(false), 2000);
    }
  };

  const intervalLabel = {
    '5m': 5 * 60 * 1000,
    '10m': 10 * 60 * 1000,
    '20m': 20 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000
  };
  const getNextEta = () => {
    try {
      const lastStr = localStorage.getItem('lastNotificationTime') || '0';
      const last = parseInt(lastStr, 10) || 0;
      const now = Date.now();
      const ms = (intervalLabel[eventConfig.liveActivityInterval] || intervalLabel['5m']) - (now - last);
      if (last === 0 || ms <= 0) return 'agora';
      const min = Math.ceil(ms / 60000);
      return `${min} min`;
    } catch { return 'indisponível'; }
  };
  const resetSchedule = () => {
    localStorage.removeItem('lastNotificationTime');
    localStorage.removeItem('lastNotificationTopic');
    alert('Agendamento de notificações foi resetado.');
  };
  const fireNow = async () => {
    if (!ntfyConfig.topic) {
      alert('Preencha o Tópico do Ntfy.sh.');
      return;
    }
    try {
      await fetch(`https://ntfy.sh/${ntfyConfig.topic}`, {
        method: 'POST',
        body: 'Disparo manual: status atual do site.',
        headers: {
          'Title': 'LoopeyLive: Disparo Manual',
          'Priority': 'high',
          'Tags': 'rocket'
        }
      });
      localStorage.setItem('lastNotificationTime', Date.now().toString());
      localStorage.setItem('lastNotificationTopic', ntfyConfig.topic);
      alert('Notificação enviada.');
    } catch (e) {
      alert('Erro ao enviar notificação.');
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

  const handleSaveNtfy = async () => {
    localStorage.setItem('ntfyConfig', JSON.stringify(ntfyConfig));
    
    if (siteId) {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/sites/${siteId}/uptime`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    ntfy_config: ntfyConfig
                })
            });
        } catch (err) {
            console.error('Error saving ntfy config to server:', err);
        }
    }
    alert('Configuração do Ntfy.sh salva com sucesso!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>Notificações</h2>
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
          <Bell size={14} /> Configuração
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Ntfy.sh & Traffic/Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* 1. Ntfy.sh Integration */}
          <div className="card" style={{ padding: '2rem', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: themeColor || '#3b82f6' }}>
                <Bell size={20} />
                Integração Ntfy.sh
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Receba notificações push simples e gratuitas no seu celular ou PC.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#d1d5db', marginBottom: '0.5rem' }}>
                  Tópico (Nome Secreto)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Ex: loopeylive_meu_segredo_123" 
                    value={ntfyConfig.topic}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, topic: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      background: '#1f2937',
                      border: '1px solid #374151',
                      color: 'white',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={handleSaveNtfy}
                    style={{
                      padding: '0.8rem',
                      background: '#374151',
                      color: 'white',
                      border: '1px solid #4b5563',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Salvar"
                  >
                    <Check size={18} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                Baixe o app <strong>Ntfy</strong> e inscreva-se neste tópico.
                <br/>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Importante:</span> Nas configurações do seu celular, permita que o app Ntfy mostre notificações (banner/som).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={testNtfy}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1.2rem',
                    background: themeColor || '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'filter 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.filter = 'brightness(1.1)'}
                  onMouseOut={(e) => e.target.style.filter = 'brightness(1)'}
                >
                  <Bell size={16} />
                  Testar
                </button>
                
                <button 
                  onClick={simulateAllNotifications}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1.2rem',
                    background: '#374151',
                    color: 'white',
                    border: '1px solid #4b5563',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#4b5563'}
                  onMouseOut={(e) => e.target.style.background = '#374151'}
                >
                  <Activity size={16} />
                  Simular Tudo
                </button>
                <button 
                  onClick={resetSchedule}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#1f2937',
                    color: 'white',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Resetar Agendamento
                </button>
                <button 
                  onClick={fireNow}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Disparar Agora
                </button>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#9ca3af' }}>
              Próximo envio automático: {eventConfig.liveActivity ? getNextEta() : 'desativado'}
            </div>
          </div>

          {/* 2. Traffic & Events */}
          <div className="card" style={{ padding: '2rem', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Eventos de Tráfego
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Personalize os alertas em tempo real sobre a audiência do seu site:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Atividade ao Vivo */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Eye size={16} color="#3b82f6" /> Atividade ao Vivo
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>Alertas de usuários navegando agora.</p>
                 </div>
                 <ToggleSwitch 
                    checked={eventConfig.liveActivity} 
                    onChange={(v) => setEventConfig({...eventConfig, liveActivity: v})} 
                 />
              </div>

              {eventConfig.liveActivity && (
                <div style={{ marginTop: '0.8rem', marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '0.4rem' }}>
                    Intervalo de disparo:
                  </label>
                  <select
                    value={eventConfig.liveActivityInterval}
                    onChange={(e) => setEventConfig({...eventConfig, liveActivityInterval: e.target.value})}
                    style={{
                      background: '#1f2937',
                      color: 'white',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.9rem',
                      width: '100%',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="5m">A cada 5 minutos</option>
                    <option value="10m">A cada 10 minutos</option>
                    <option value="20m">A cada 20 minutos</option>
                    <option value="30m">A cada 30 minutos</option>
                    <option value="1h">A cada 1 hora</option>
                  </select>
                </div>
              )}

              <NotificationPreview 
                icon={Eye}
                color="#2563eb"
                title="Usuário ativo"
                lines={["12 pessoas navegando neste momento."]}
              />
            </div>

            {/* 2. Gamificação */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Trophy size={16} color="#eab308" /> Gamificação
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>Conquistas e metas atingidas.</p>
                 </div>
                 <ToggleSwitch 
                    checked={eventConfig.gamification} 
                    onChange={(v) => setEventConfig({...eventConfig, gamification: v})} 
                 />
              </div>
              <NotificationPreview 
                icon={Trophy}
                color="#ca8a04"
                title="Meta atingida 🏆"
                lines={["Parabéns! 1.000 views monitoradas hoje."]}
              />
            </div>

            {/* 3. Gatilho de Urgência */}
            <div style={{ opacity: userPlan === 'free' ? 0.7 : 1, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={16} color="#ef4444" /> Gatilhos de Urgência
                        {userPlan === 'free' && (
                          <span style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444', 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            LOCKED
                          </span>
                        )}
                     </h4>
                     <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                       {userPlan === 'free' ? 'Sempre ativo no plano Grátis.' : 'Avisos sobre limites do plano.'}
                     </p>
                 </div>
                 <ToggleSwitch 
                    checked={eventConfig.urgency} 
                    onChange={(v) => setEventConfig({...eventConfig, urgency: v})} 
                    disabled={userPlan === 'free'}
                 />
              </div>
              <NotificationPreview 
                icon={AlertTriangle}
                color="#dc2626"
                title="Limite próximo ⚠️"
                lines={[
                    "90% das views usadas hoje.",
                    "Atualize para continuar monitorando."
                ]}
              />
            </div>

            {/* 4. Alerta Inteligente */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                 <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       <Brain size={16} color="#8b5cf6" /> Alertas Inteligentes
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>IA detectando anomalias e bots.</p>
                 </div>
                 <ToggleSwitch 
                    checked={eventConfig.smartAlerts} 
                    onChange={(v) => setEventConfig({...eventConfig, smartAlerts: v})} 
                 />
              </div>
              <NotificationPreview 
                icon={Brain}
                color="#7c3aed"
                title="Comportamento suspeito 🧠"
                lines={[
                    "Pico anormal detectado: +400% views.",
                    "Possível bot identificado (IP repetido)."
                ]}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Right Column: Report & Uptime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Report Notifications */}
          <div className="card" style={{ padding: '2rem', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              Notificações de Relatório
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Receba resumos periódicos do desempenho do seu site:
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'white' }}>Horários</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.keys(reportConfig.times).map(time => (
                  <div key={time} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#d1d5db', fontSize: '0.9rem' }}>Relatório das {time}</span>
                    <ToggleSwitch 
                      checked={reportConfig.times[time]} 
                      onChange={(checked) => setReportConfig(prev => ({
                        ...prev, 
                        times: { ...prev.times, [time]: checked }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'white' }}>Tipo de Resumo</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {[
                  { id: 'summary', label: 'Resumo Simples' },
                  { id: 'detailed', label: 'Detalhamento de Tráfego' },
                  { id: 'creative', label: 'Modo Criativo' }
                ].map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => setReportConfig(prev => ({ ...prev, pattern: opt.id }))}
                    style={{
                      padding: '0.8rem 1rem',
                      border: `1px solid ${reportConfig.pattern === opt.id ? '#3b82f6' : '#374151'}`,
                      borderRadius: '6px',
                      background: reportConfig.pattern === opt.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${reportConfig.pattern === opt.id ? '#3b82f6' : '#6b7280'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {reportConfig.pattern === opt.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />}
                    </div>
                    <span style={{ color: reportConfig.pattern === opt.id ? '#3b82f6' : '#d1d5db', fontSize: '0.9rem' }}>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem', color: '#9ca3af' }}>Prévia de Notificação</h4>
              <NotificationPreview 
                icon={Activity}
                color="#10b981"
                title={
                  reportConfig.pattern === 'summary' ? "Resumo Diário" :
                  reportConfig.pattern === 'detailed' ? "Relatório Detalhado 📊" :
                  "Seu site está voando! 🚀"
                }
                lines={
                  reportConfig.pattern === 'summary' ? [
                    "Seu site teve 1.542 visualizações hoje."
                  ] :
                  reportConfig.pattern === 'detailed' ? [
                    "Hoje: 1.542 views (+12%)",
                    "Pico: 14h | Top origem: Google"
                  ] :
                  [
                    "Você teve 1.542 visualizações hoje.",
                    "Continue com o ótimo trabalho!"
                  ]
                }
              />
            </div>
          </div>



        </div>
      </div>
    </div>
  );
};

export default DashboardNotifications;
