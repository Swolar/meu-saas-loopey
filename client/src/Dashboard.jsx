import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  LayoutDashboard, Globe, Settings, 
  RefreshCw, Award, Palette, LogOut,
  Edit, Check, Eye, EyeOff, ArrowLeft, ArrowRight, 
  Users, Clock, Smartphone, Monitor,
  Maximize2, Minimize2,
  User, Shield, MessageSquare, Moon, Sun, Lock,
  FileText
} from 'lucide-react';
import SitesList from './SitesList';
import { StatCard, TrafficChart, DeviceChart, TopPagesTable } from './DashboardWidgets';
import { getApiUrl, SOCKET_URL, authFetch } from './config';

const DEFAULT_THEME = '#006fee';

const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DEFAULT_LAYOUT = [
  { id: 'active_users', colSpan: 1, visible: true },
  { id: 'avg_time', colSpan: 1, visible: true },
  { id: 'mobile', colSpan: 1, visible: true },
  { id: 'desktop', colSpan: 1, visible: true },
  { id: 'traffic_chart', colSpan: 4, visible: true },
  { id: 'device_chart', colSpan: 2, visible: true },
  { id: 'top_pages', colSpan: 2, visible: true },
];

function Dashboard({ user, onLogout }) {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOnline: 0,
    topPages: [],
    averageDuration: 0,
    devices: { mobile: 0, desktop: 0 },
    history: []
  });
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeframe, setTimeframe] = useState('minutes');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sites, setSites] = useState([]);
  const [viewMode, setViewMode] = useState('stats');
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme_mode') || 'dark');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  
  const [dailyStats, setDailyStats] = useState([]);
  const [profileData, setProfileData] = useState({
    name: user?.username || '',
    email: '',
    cpf: '',
    phone: ''
  });
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (themeMode === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    localStorage.setItem('theme_mode', themeMode);
  }, [themeMode]);

  // Layout State
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [originalLayout, setOriginalLayout] = useState(null);

  // Load layout from local storage
  useEffect(() => {
    if (siteId) {
      const savedLayout = localStorage.getItem(`dashboard_layout_${siteId}`);
      if (savedLayout) {
        try {
          const parsed = JSON.parse(savedLayout);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLayout(parsed);
          } else {
             setLayout(DEFAULT_LAYOUT);
          }
        } catch (e) {
          console.error("Error parsing layout", e);
          setLayout(DEFAULT_LAYOUT);
        }
      } else {
        setLayout(DEFAULT_LAYOUT);
      }
    }
  }, [siteId]);

  // Start Editing
  const handleStartEditing = () => {
    setOriginalLayout([...layout]);
    setIsEditingLayout(true);
  };

  // Cancel Editing
  const handleCancelEditing = () => {
    if (originalLayout) {
      setLayout(originalLayout);
    }
    setIsEditingLayout(false);
    setOriginalLayout(null);
  };

  // Reset Layout
  const handleResetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
  };

  // Save Editing
  const handleSaveEditing = () => {
    if (siteId) {
      localStorage.setItem(`dashboard_layout_${siteId}`, JSON.stringify(layout));
    }
    setIsEditingLayout(false);
    setOriginalLayout(null);
  };

  // Update layout state without saving to localStorage immediately (during edit)
  const updateLayoutState = (newLayout) => {
    setLayout(newLayout);
    // If not in editing mode (direct toggle from hidden list?), we might want to save immediately
    // But currently all actions are inside edit mode.
    // However, let's keep the immediate save behavior if NOT in edit mode for safety,
    // though the UI currently restricts these actions to edit mode.
    if (!isEditingLayout && siteId) {
        localStorage.setItem(`dashboard_layout_${siteId}`, JSON.stringify(newLayout));
    }
  };

  const toggleWidgetVisibility = (id) => {
    const newLayout = layout.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    updateLayoutState(newLayout);
  };

  const moveWidget = (index, direction) => {
    if (direction === 'left' && index > 0) {
      const newLayout = [...layout];
      [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
      updateLayoutState(newLayout);
    } else if (direction === 'right' && index < layout.length - 1) {
      const newLayout = [...layout];
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
      updateLayoutState(newLayout);
    }
  };

  const resizeWidget = (id, delta) => {
    const newLayout = layout.map(w => {
      if (w.id === id) {
        const newSpan = w.colSpan + delta;
        if (newSpan >= 1 && newSpan <= 4) {
          return { ...w, colSpan: newSpan };
        }
      }
      return w;
    });
    updateLayoutState(newLayout);
  };

  const CHART_COLORS = [themeColor, '#10b981', '#f59e0b', '#ef4444'];

  const fetchSites = () => {
    authFetch('/api/sites')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSites(data);
        } else {
          console.error('Invalid sites data:', data);
          setSites([]);
        }
      })
      .catch(err => {
        console.error('Error fetching sites:', err);
        setSites([]);
      });
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (!siteId) {
      fetchSites();
      setViewMode('stats');
    } else {
      authFetch(`/api/sites/${siteId}`)
        .then(res => res.json())
        .then(data => {
           if (data && data.theme_color) setThemeColor(data.theme_color);
           else setThemeColor(DEFAULT_THEME);
        })
        .catch(err => console.error('Error fetching site details:', err));
      
      if (viewMode !== 'reports' && viewMode !== 'settings') {
         setViewMode('stats');
      }
    }
  }, [siteId]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error/success message when typing
    if (passwordMessage.text) setPasswordMessage({ type: '', text: '' });
  };

  const handleChangePasswordSubmit = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'As novas senhas não coincidem' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 8 caracteres' });
      return;
    }

    authFetch('/api/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Erro ao alterar senha' });
      }
    })
    .catch(err => {
      setPasswordMessage({ type: 'error', text: 'Erro de conexão' });
      console.error(err);
    });
  };

  const handleSaveTheme = (color) => {
    setThemeColor(color);
    authFetch(`/api/sites/${siteId}/theme`, {
        method: 'PUT',
        body: JSON.stringify({ color })
    })
    .then(res => res.json())
    .then(updatedSite => {
        setSites(prev => prev.map(s => s.id === siteId ? { ...s, theme_color: color } : s));
    })
    .catch(err => console.error('Error saving theme:', err));
  };
  
  const fetchDailyStats = () => {
    if (!siteId) return;
    authFetch(`/api/sites/${siteId}/daily-history`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDailyStats(data);
        }
      })
      .catch(err => console.error('Error fetching daily stats:', err));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = () => {
    console.log('Saving profile:', profileData);
    alert('Perfil salvo localmente (simulação). A API de perfil ainda não está implementada.');
  };

  useEffect(() => {
    if (!siteId) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('monitor_site', { siteId, timeframe });
    });

    newSocket.on('stats_update', (data) => {
      setStats(data);
      setLastUpdated(new Date());
    });

    return () => newSocket.close();
  }, [siteId, timeframe]);
  
  useEffect(() => {
    if (siteId && viewMode === 'reports') {
        fetchDailyStats();
    }
  }, [siteId, viewMode]);

  const handleManualUpdate = () => {
    if (socket && siteId) {
      socket.emit('monitor_site', { siteId, timeframe });
      setLastUpdated(new Date());
    } else if (!siteId) {
      fetchSites();
      setLastUpdated(new Date());
    }
    if (viewMode === 'reports') {
        fetchDailyStats();
    }
  };

  // Prepare Data for Charts
  const deviceData = [
    { name: 'Desktop', value: stats?.devices?.desktop || 0 },
    { name: 'Móvel', value: stats?.devices?.mobile || 0 },
  ].filter(d => d.value > 0);
  const pieData = deviceData.length > 0 ? deviceData : [{ name: 'Sem Dados', value: 1 }];

  const displayHistory = stats?.history || [];

  const renderWidgetContent = (id) => {
    const summary = stats?.summary || {
        users: stats?.totalOnline || 0,
        usersLabel: 'Usuários Ativos',
        usersBadge: 'Ao Vivo',
        avgTime: stats?.averageDuration || 0,
        mobile: stats?.devices?.mobile || 0,
        desktop: stats?.devices?.desktop || 0
    };

    switch (id) {
      case 'active_users':
        return <StatCard 
          title={summary.usersLabel} 
          value={summary.users} 
          icon={Users} 
          footer={<span className="trend-up">● {summary.usersBadge}</span>} 
        />;
      case 'avg_time':
        return <StatCard 
          title="Tempo Médio" 
          value={`${summary.avgTime}s`} 
          icon={Clock} 
          footer={<span><span className="trend-up">↑ 12%</span> vs média anterior</span>} 
        />;
      case 'mobile':
        return <StatCard 
          title="Mobile" 
          value={summary.mobile} 
          icon={Smartphone} 
          footer="Usuários em celulares" 
        />;
      case 'desktop':
        return <StatCard 
          title="Desktop" 
          value={summary.desktop} 
          icon={Monitor} 
          footer="Usuários em PC" 
        />;
      case 'traffic_chart':
        return <TrafficChart 
          data={displayHistory} 
          timeframe={timeframe} 
          themeColor={themeColor} 
        />;
      case 'device_chart':
        return <DeviceChart 
          data={pieData} 
          total={stats?.totalOnline || 0} 
          colors={CHART_COLORS}
        />;
      case 'top_pages':
        return <TopPagesTable 
          pages={stats?.topPages || []} 
          totalOnline={stats?.totalOnline || 0} 
        />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: 'var(--bg-dark)' }}>
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 0' }}>
          <img src="/logo.svg" alt="LoopeyLive" style={{ height: '60px', objectFit: 'contain' }} />
        </div>
        
        {siteId && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#1a1d27', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
               <span style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>
                 {new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(stats?.totalViews || 0)} / 1M Acessos
               </span>
               <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                 {Math.min(((stats?.totalViews || 0) / 1000000) * 100, 100).toFixed(0)}%
               </span>
            </div>
            
            <div style={{ width: '100%', height: '6px', background: '#2a2e3b', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(((stats?.totalViews || 0) / 1000000) * 100, 100)}%`, 
                height: '100%', 
                background: themeColor,
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${!siteId ? 'active' : ''}`}
            style={{ 
              background: !siteId ? hexToRgba(DEFAULT_THEME, 0.1) : 'transparent',
              color: !siteId ? DEFAULT_THEME : '#9ca3af'
            }}
          >
            <LayoutDashboard size={20} />
            <span>Visão Geral</span>
          </Link>

          <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '1rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Sites Monitorados
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sites.map(site => (
              <Link 
                key={site.id}
                to={`/dashboard/${site.id}`}
                className={`nav-item ${site.id === siteId ? 'active' : ''}`}
                style={{ 
                  justifyContent: 'flex-start',
                  paddingLeft: '1rem',
                  background: site.id === siteId ? hexToRgba(themeColor, 0.1) : 'transparent',
                  color: site.id === siteId ? themeColor : '#9ca3af'
                }}
              >
                <Globe size={16} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{site.name}</span>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div 
                className={`nav-item ${viewMode === 'reports' ? 'active' : ''}`}
                onClick={() => siteId && setViewMode('reports')}
                style={{
                    cursor: siteId ? 'pointer' : 'not-allowed',
                    opacity: siteId ? 1 : 0.5,
                    background: viewMode === 'reports' ? hexToRgba(themeColor, 0.1) : 'transparent',
                    color: viewMode === 'reports' ? themeColor : '#9ca3af',
                    marginBottom: '0.5rem'
                }}
            >
              <FileText size={20} />
              <span>Relatórios</span>
            </div>

            <div 
                className={`nav-item ${viewMode === 'settings' ? 'active' : ''}`}
                onClick={() => siteId && setViewMode('settings')}
                style={{
                    cursor: siteId ? 'pointer' : 'not-allowed',
                    opacity: siteId ? 1 : 0.5,
                    background: viewMode === 'settings' ? hexToRgba(themeColor, 0.1) : 'transparent',
                    color: viewMode === 'settings' ? themeColor : '#9ca3af'
                }}
            >
              <Settings size={20} />
              <span>Configurações</span>
            </div>

            <div 
                className="nav-item"
                onClick={onLogout}
                style={{
                    marginTop: '0.5rem',
                    color: '#ef4444',
                    cursor: 'pointer'
                }}
            >
              <LogOut size={20} />
              <span>Sair</span>
            </div>
          </div>
        </nav>

        <div style={{ marginTop: siteId ? '0' : 'auto', padding: '1rem', background: '#1a1d27', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setShowDebug(!showDebug)}>
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Status do Sistema</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isConnected || !siteId ? '#10b981' : '#ef4444', fontSize: '0.9rem', fontWeight: '500' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
            {siteId ? (isConnected ? 'Conectado' : 'Desconectado') : 'Online'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '0.5rem' }}>
             v1.0.2 {showDebug ? '(Debug On)' : ''}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        
        {/* Top Bar */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#9ca3af' }}>Dashboards</span>
            <span style={{ color: '#2a2e3b' }}>/</span>
            <span style={{ fontWeight: '500', color: 'white' }}>{siteId ? (sites.find(s => s.id === siteId)?.name || siteId) : 'Visão Geral'}</span>
            {siteId && (
               <span style={{ 
                 fontSize: '0.75rem', 
                 background: '#2a2e3b', 
                 padding: '0.2rem 0.5rem', 
                 borderRadius: '4px', 
                 color: '#f59e0b',
                 fontFamily: 'monospace',
                 marginLeft: '0.5rem'
               }}>
                 ID: {siteId}
               </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <span style={{ color: '#6b7280', marginRight: '0.5rem' }}>Atualizado:</span>
              <span style={{ color: '#9ca3af' }}>{lastUpdated.toLocaleTimeString()}</span>
            </div>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: '#2a2e3b' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                        {profileData.name || user?.username || 'Usuário'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '500' }}>
                        Usuário
                    </span>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: siteId ? themeColor : DEFAULT_THEME, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {profileData.name ? profileData.name[0].toUpperCase() : (user?.username?.[0]?.toUpperCase() || 'A')}
                </div>
            </div>
          </div>
        </header>

        <div className="content-scroll">
          
          {!siteId ? (
            <SitesList onSitesUpdate={fetchSites} />
          ) : viewMode === 'settings' ? (
            <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Configurações</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Gerencie suas informações pessoais, mensagens e segurança</p>
                
                {/* Settings Tabs */}
                <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                    {[
                        { id: 'profile', label: 'Perfil', icon: User },
                        { id: 'messages', label: 'Mensagens', icon: MessageSquare },
                        { id: 'security', label: 'Segurança', icon: Shield },
                        { id: 'appearance', label: 'Aparência', icon: Palette },
                    ].map(tab => (
                        <div 
                            key={tab.id}
                            onClick={() => setSettingsTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                paddingBottom: '1rem',
                                cursor: 'pointer',
                                borderBottom: settingsTab === tab.id ? `2px solid ${themeColor}` : '2px solid transparent',
                                color: settingsTab === tab.id ? themeColor : 'var(--text-secondary)',
                                fontWeight: settingsTab === tab.id ? '600' : '400',
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </div>
                    ))}
                </div>

                {/* Profile Tab */}
                {settingsTab === 'profile' && (
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {profileData.name ? profileData.name[0].toUpperCase() : (user?.username?.[0]?.toUpperCase() || 'A')}
                                </div>
                                <div>
                                    <h3 className="card-title" style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Informações Pessoais</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Gerencie seus dados pessoais</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    <User size={14} style={{ display: 'inline', marginRight: '5px' }} /> Nome Completo
                                </label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={profileData.name}
                                    onChange={handleProfileChange}
                                    placeholder="Digite seu nome completo"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    <MessageSquare size={14} style={{ display: 'inline', marginRight: '5px' }} /> E-mail
                                </label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileChange}
                                    placeholder="Digite seu e-mail"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    CPF/CNPJ
                                </label>
                                <input 
                                    type="text" 
                                    name="cpf"
                                    value={profileData.cpf}
                                    onChange={handleProfileChange}
                                    placeholder="000.000.000-00"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    Telefone
                                </label>
                                <input 
                                    type="text" 
                                    name="phone"
                                    value={profileData.phone}
                                    onChange={handleProfileChange}
                                    placeholder="(00) 00000-0000"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                id="save-profile-btn"
                                onClick={handleSaveProfile}
                                style={{ 
                                    backgroundColor: themeColor,
                                    border: `1px solid ${themeColor}`,
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Check size={18} />
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}

                {/* Messages Tab */}
                {settingsTab === 'messages' && (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <MessageSquare size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Suas Mensagens</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Você não tem novas mensagens no momento.</p>
                    </div>
                )}

                {/* Security Tab */}
                {settingsTab === 'security' && (
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title" style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Segurança da Conta</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Altere sua senha para manter sua conta segura</p>
                            </div>
                            <Shield size={24} color={themeColor} />
                        </div>

                        <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: themeColor, fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                <Check size={14} /> Requisitos da senha
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                <li>Mínimo de 8 caracteres</li>
                                <li>Pelo menos uma letra maiúscula</li>
                                <li>Pelo menos uma letra minúscula</li>
                                <li>Pelo menos um número</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {passwordMessage.text && (
                                <div style={{ 
                                    padding: '0.75rem', 
                                    borderRadius: '6px', 
                                    backgroundColor: passwordMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                    color: passwordMessage.type === 'error' ? '#ef4444' : '#10b981',
                                    fontSize: '0.9rem',
                                    border: `1px solid ${passwordMessage.type === 'error' ? '#ef4444' : '#10b981'}`
                                }}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Senha Atual</label>
                                <input 
                                    type="password" 
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Digite sua senha atual" 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nova Senha</label>
                                <input 
                                    type="password" 
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Digite a nova senha" 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Confirmar Nova Senha</label>
                                <input 
                                    type="password" 
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Confirme a nova senha" 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button 
                                    onClick={handleChangePasswordSubmit}
                                    style={{ 
                                        backgroundColor: themeColor,
                                        border: 'none',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Alterar Senha
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Appearance Tab */}
                {settingsTab === 'appearance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Tema da Interface</h3>
                                {themeMode === 'dark' ? <Moon size={16} color="var(--text-muted)" /> : <Sun size={16} color="var(--text-muted)" />}
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Escolha entre o tema original (escuro) ou o tema claro.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div 
                                        onClick={() => setThemeMode('dark')}
                                        style={{ 
                                            flex: 1, 
                                            padding: '1rem', 
                                            borderRadius: '8px', 
                                            border: themeMode === 'dark' ? `2px solid ${themeColor}` : '1px solid var(--border-color)',
                                            background: '#0b0e14',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {themeMode === 'dark' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: themeColor }}></div>}
                                        </div>
                                        <span style={{ color: 'white', fontWeight: '500' }}>Original (Escuro)</span>
                                    </div>
                                    <div 
                                        onClick={() => setThemeMode('light')}
                                        style={{ 
                                            flex: 1, 
                                            padding: '1rem', 
                                            borderRadius: '8px', 
                                            border: themeMode === 'light' ? `2px solid ${themeColor}` : '1px solid var(--border-color)',
                                            background: '#f3f4f6',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {themeMode === 'light' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: themeColor }}></div>}
                                        </div>
                                        <span style={{ color: '#111827', fontWeight: '500' }}>Branco (Claro)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Cor de Destaque</h3>
                                <Palette size={16} color="var(--text-muted)" />
                            </div>
                            
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Escolha uma cor para personalizar a identidade visual do painel deste site.
                                </p>
                                
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {['#006fee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map(color => (
                                        <div 
                                            key={color}
                                            onClick={() => handleSaveTheme(color)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: color,
                                                cursor: 'pointer',
                                                border: themeColor === color ? '3px solid var(--bg-card)' : '2px solid transparent',
                                                boxShadow: themeColor === color ? `0 0 0 2px ${color}` : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                            title={color}
                                        />
                                    ))}
                                    
                                    <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-color)', cursor: 'pointer' }} title="Cor Personalizada">
                                        <input 
                                            type="color" 
                                            value={themeColor}
                                            onChange={(e) => handleSaveTheme(e.target.value)}
                                            style={{ 
                                                position: 'absolute', 
                                                top: '-50%', 
                                                left: '-50%', 
                                                width: '200%', 
                                                height: '200%', 
                                                cursor: 'pointer',
                                                padding: 0,
                                                margin: 0,
                                                border: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          ) : viewMode === 'reports' ? (
            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Relatórios</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Visualize o histórico de visualizações diárias do seu site</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="gamified-select-container" style={{ margin: 0 }}>
                        <select 
                            className="gamified-filter"
                            value={siteId}
                            onChange={(e) => navigate(`/dashboard/${e.target.value}`)}
                        >
                            {sites.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <button style={{ 
                        padding: '0.5rem 1rem', 
                        backgroundColor: themeColor, 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onClick={fetchDailyStats}
                    >
                    <RefreshCw size={16} /> Atualizar
                    </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '0' }}>
                  <h3 className="card-title" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Visualizações por Dia (Últimos 30 Dias)</h3>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>DATA</th>
                        <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>DIA</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '600' }}>VISUALIZAÇÕES</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '600' }}>MÉDIA (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const days = [];
                        for (let i = 0; i < 30; i++) {
                            const d = new Date();
                            d.setDate(d.getDate() - i);
                            days.push(d);
                        }
                        
                        return days.map((date, index) => {
                            const dateStr = date.toISOString().split('T')[0];
                            const found = dailyStats.find(s => s.date === dateStr);
                            
                            return (
                                <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                                    <td style={{ padding: '1rem' }}>{date.toLocaleDateString('pt-BR')}</td>
                                    <td style={{ padding: '1rem' }}>{date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase())}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{found ? found.views : 0}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>-</td>
                                </tr>
                            );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Resumo</h2>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={handleManualUpdate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#0ea5e9',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                        }}
                    >
                        <RefreshCw size={16} />
                        Atualizar
                    </button>

                    {!isEditingLayout ? (
                        <button 
                            onClick={handleStartEditing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid #374151',
                                background: 'transparent',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Edit size={16} />
                            Personalizar
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={handleResetLayout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid #374151',
                                    background: 'transparent',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <RefreshCw size={16} />
                                Resetar
                            </button>
                            <button 
                                onClick={handleCancelEditing}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid #ef4444',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <LogOut size={16} style={{ transform: 'rotate(180deg)' }} />
                                Descartar
                            </button>
                            <button 
                                onClick={handleSaveEditing}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: '1px solid #10b981',
                                    background: '#10b981',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <Check size={16} />
                                Salvar
                            </button>
                        </>
                    )}
                </div>
              </div>

              {/* Filters (Hidden during edit to save space) */}
              {!isEditingLayout && (
                  <div className="filters-bar">
                    <div className="gamified-select-container">
                        <label>TEMPO</label>
                        <select 
                        className="gamified-filter"
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value)}
                        >
                        <option value="minutes">TEMPO REAL</option>
                        <option value="hours">ÚLTIMAS 24H</option>
                        <option value="days">ÚLTIMOS 7 DIAS</option>
                        </select>
                    </div>
                  </div>
              )}

              {/* Hidden Widgets List */}
              {isEditingLayout && layout.some(w => !w.visible) && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1f2937', borderRadius: '8px', border: '1px dashed #4b5563' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Itens Ocultos (Clique para adicionar)</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {layout.filter(w => !w.visible).map(w => (
                            <button
                                key={w.id}
                                onClick={() => toggleWidgetVisibility(w.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem', borderRadius: '4px',
                                    background: '#374151', color: 'white', border: 'none', cursor: 'pointer'
                                }}
                            >
                                <Eye size={14} />
                                {w.id === 'active_users' ? 'Usuários' :
                                 w.id === 'avg_time' ? 'Tempo' :
                                 w.id === 'mobile' ? 'Mobile' :
                                 w.id === 'desktop' ? 'Desktop' :
                                 w.id === 'traffic_chart' ? 'Gráfico Tráfego' :
                                 w.id === 'device_chart' ? 'Gráfico Disp.' : 'Tabela Páginas'}
                            </button>
                        ))}
                    </div>
                </div>
              )}

              {/* Custom Grid Layout */}
              <div 
                className="dashboard-custom-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1.5rem',
                    paddingBottom: '2rem'
                }}
              >
                {layout.filter(w => isEditingLayout || w.visible).map((widget, index) => {
                    // Calculate responsive grid columns
                    // For mobile, we might want to override this in CSS, but for now inline styles are limited
                    // We can add a class and use media queries in index.css if needed.
                    // Or just let it be.
                    
                    if (!widget.visible && !isEditingLayout) return null;

                    return (
                        <div 
                            key={widget.id}
                            style={{ 
                                opacity: widget.visible ? 1 : 0.5,
                                position: 'relative',
                                border: isEditingLayout ? `2px dashed ${widget.visible ? '#4b5563' : '#ef4444'}` : 'none',
                                borderRadius: '12px',
                                minHeight: isEditingLayout ? '100px' : 'auto'
                            }}
                            className={widget.colSpan === 4 ? 'col-span-4' : widget.colSpan === 2 ? 'col-span-2' : ''}
                        >
                            {/* Edit Controls */}
                            {isEditingLayout && (
                                <div style={{ 
                                    position: 'absolute', top: '-10px', right: '-10px', zIndex: 10,
                                    background: '#1f2937', padding: '0.25rem', borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    display: 'flex', gap: '0.25rem', border: '1px solid #374151'
                                }}>
                                    <button onClick={() => resizeWidget(widget.id, -1)} disabled={widget.colSpan <= 1} title="Diminuir" style={{ padding: '4px', cursor: widget.colSpan <= 1 ? 'not-allowed' : 'pointer', color: widget.colSpan <= 1 ? '#4b5563' : '#9ca3af', background: 'transparent', border: 'none' }}><Minimize2 size={14} /></button>
                                    <button onClick={() => resizeWidget(widget.id, 1)} disabled={widget.colSpan >= 4} title="Aumentar" style={{ padding: '4px', cursor: widget.colSpan >= 4 ? 'not-allowed' : 'pointer', color: widget.colSpan >= 4 ? '#4b5563' : '#9ca3af', background: 'transparent', border: 'none' }}><Maximize2 size={14} /></button>
                                    <div style={{ width: '1px', background: '#374151', margin: '0 2px' }}></div>
                                    <button onClick={() => moveWidget(index, 'left')} disabled={index === 0} title="Mover para esquerda" style={{ padding: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#4b5563' : '#9ca3af', background: 'transparent', border: 'none' }}><ArrowLeft size={14} /></button>
                                    <button onClick={() => moveWidget(index, 'right')} disabled={index === layout.length - 1} title="Mover para direita" style={{ padding: '4px', cursor: index === layout.length - 1 ? 'not-allowed' : 'pointer', color: index === layout.length - 1 ? '#4b5563' : '#9ca3af', background: 'transparent', border: 'none' }}><ArrowRight size={14} /></button>
                                    <div style={{ width: '1px', background: '#374151', margin: '0 2px' }}></div>
                                    <button onClick={() => toggleWidgetVisibility(widget.id)} title={widget.visible ? "Ocultar" : "Mostrar"} style={{ padding: '4px', cursor: 'pointer', color: widget.visible ? '#ef4444' : '#10b981', background: 'transparent', border: 'none' }}>
                                        {widget.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            )}
                            
                            {/* Widget Content - Prevent interaction during edit */}
                            <div style={{ height: '100%', pointerEvents: isEditingLayout ? 'none' : 'auto' }}>
                                {renderWidgetContent(widget.id)}
                            </div>
                        </div>
                    );
                })}
              </div>
            </>
          )}

        </div>
      </main>
      {showDebug && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', width: '300px',
          background: 'rgba(0,0,0,0.9)', color: '#0f0', padding: '15px',
          borderRadius: '8px', zIndex: 9999, fontFamily: 'monospace', fontSize: '12px',
          border: '1px solid #333'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong>DEBUG INFO</strong>
            <button onClick={() => setShowDebug(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
          </div>
          <div>Socket Connected: {isConnected ? 'YES' : 'NO'}</div>
          <div>Socket ID: {socket?.id || 'N/A'}</div>
          <div>Site ID: {siteId}</div>
          <div>Timeframe: {timeframe}</div>
          <div>Last Updated: {lastUpdated.toLocaleTimeString()}</div>
          <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '5px' }}>
            <strong>Raw Stats:</strong>
            <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(stats, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
