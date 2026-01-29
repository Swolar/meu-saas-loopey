import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, Copy, AlertCircle, Edit, Globe, Type, Hash, Save, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { getApiUrl, authFetch } from './config';

function SitesList({ onSitesUpdate }) {
  const [sites, setSites] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSiteSlugs, setNewSiteSlugs] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editSlugs, setEditSlugs] = useState([]);
  const [expandedSites, setExpandedSites] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await authFetch('/api/sites');
      const data = await response.json();
      if (Array.isArray(data)) {
        setSites(data);
      } else {
        console.error('Invalid sites data:', data);
        setSites([]);
        if (data && data.error) {
            setError(data.error);
        } else {
            setError('Dados inválidos recebidos do servidor.');
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sites:', error);
      setError('Erro ao carregar sites. Verifique se o servidor está rodando.');
      setSites([]);
      setLoading(false);
    }
  };

  const handleCreateSite = async (e) => {
    e.preventDefault();
    setError(null);
    const slugs = newSiteSlugs.map(s => s.trim()).filter(Boolean);
    try {
      const response = await authFetch('/api/sites', {
        method: 'POST',
        body: JSON.stringify({ name: newSiteName, domain: newSiteDomain, slugs }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao criar site');
      }

      const newSite = await response.json();
      setSites([...sites, newSite]);
      setNewSiteName('');
      setNewSiteDomain('');
      setNewSiteSlugs(['']);
      
      // Atualizar sidebar e redirecionar
      if (onSitesUpdate) onSitesUpdate();
      navigate(`/dashboard/${newSite.id}`);
      
    } catch (error) {
      console.error('Error creating site:', error);
      const msg = error.message || '';
      if (msg.includes('row-level security') || msg.includes('violates row-level')) {
        setError('Erro de permissão no Supabase. Execute o script SQL fornecido no Painel do Supabase.');
      } else {
        setError('Erro ao criar site. ' + msg);
      }
    }
  };

  const handleDeleteSite = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o site "${name}"? Esta ação não pode ser desfeita.`)) {
      try {
        const response = await authFetch(`/api/sites/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setSites(sites.filter(site => site.id !== id));
          if (onSitesUpdate) onSitesUpdate();
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro ao excluir o site');
        }
      } catch (error) {
        console.error('Error deleting site:', error);
        const msg = error.message || '';
        if (msg.includes('row-level security') || msg.includes('violates row-level')) {
           alert('Erro de permissão no Supabase. Execute o script SQL atualizado para permitir exclusões.');
        } else {
           alert('Erro ao excluir o site: ' + msg);
        }
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado para a área de transferência!');
  };

  const startEditingSite = (site) => {
    setEditingSiteId(site.id);
    setEditName(site.name || '');
    setEditDomain(site.domain || '');
    setEditSlugs(Array.isArray(site.slugs) && site.slugs.length ? site.slugs : ['']);
    setExpandedSites(prev => ({ ...prev, [site.id]: true }));
  };

  const cancelEditing = () => {
    setEditingSiteId(null);
    setEditName('');
    setEditDomain('');
    setEditSlugs([]);
  };

  const handleSaveEdit = async (siteId) => {
    const slugs = editSlugs.map(s => s.trim()).filter(Boolean);
    try {
      const response = await authFetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          domain: editDomain,
          slugs
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao atualizar site');
      }

      const updated = await response.json();
      setSites(prev => prev.map(s => (s.id === siteId ? updated : s)));
      if (onSitesUpdate) onSitesUpdate();
      cancelEditing();
    } catch (error) {
      console.error('Error updating site:', error);
      alert(error.message || 'Erro ao atualizar site');
    }
  };

  const toggleExpand = (siteId) => {
    setExpandedSites(prev => ({ ...prev, [siteId]: !prev[siteId] }));
  };

  return (
    <div className="sites-list-container">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'white' }}>Visão Geral e Gerenciamento</h2>

      {/* Tutorial Section */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #10b981' }}>
        <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} />
            Como Instalar o Rastreador
        </h3>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          Para começar a monitorar seus visitantes, adicione o seguinte código dentro da tag <code>&lt;head&gt;</code> do seu site:
        </p>
        
        {/* Exemplo Box */}
        <div style={{ border: '1px solid #3f3f46', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem', background: '#0d1117' }}>
            <div style={{ 
                background: '#21262d', 
                padding: '0.5rem 1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: '1px solid #30363d' 
            }}>
                <span style={{ fontSize: '0.8rem', color: '#8b949e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Type size={14} />
                    Exemplo de Código (HTML)
                </span>
                <button 
                    onClick={() => copyToClipboard(`<script src="${window.location.origin}/script.js" data-site-id="SEU_ID_DO_SITE"></script>`)}
                    style={{ 
                        background: 'transparent',
                        border: '1px solid #30363d',
                        color: '#c9d1d9',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#30363d'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <Copy size={12} />
                    Copiar
                </button>
            </div>
            <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <code style={{ color: '#e6edf3', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    &lt;script src="<span style={{ color: '#a5d6ff' }}>{window.location.origin}/script.js</span>" data-site-id="<span style={{ color: '#79c0ff' }}>SEU_ID_DO_SITE</span>"&gt;&lt;/script&gt;
                </code>
            </div>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={14} color="#f59e0b" />
          <span>Substitua <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>SEU_ID_DO_SITE</span> pelo ID específico do site que você criou abaixo.</span>
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Criar Dashboard</h3>
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444', 
            padding: '1rem', 
            borderRadius: '4px', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleCreateSite} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nome do Site</label>
            <input
              type="text"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder="Meu Blog Incrível"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Domínio</label>
            <input
              type="text"
              value={newSiteDomain}
              onChange={(e) => setNewSiteDomain(e.target.value)}
              placeholder="exemplo.com"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Etapas do Funil (Slugs)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {newSiteSlugs.map((slug, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#666', width: '56px' }}>
                    Etapa {index + 1}
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      const next = [...newSiteSlugs];
                      next[index] = e.target.value;
                      setNewSiteSlugs(next);
                    }}
                    placeholder="ex: obrigado, upsell-1"
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  {newSiteSlugs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = newSiteSlugs.filter((_, i) => i !== index);
                        setNewSiteSlugs(next.length ? next : ['']);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewSiteSlugs([...newSiteSlugs, ''])}
                style={{
                  marginTop: '0.25rem',
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  textAlign: 'left'
                }}
              >
                + Adicionar slug
              </button>
            </div>
          </div>
          <button 
            type="submit"
            style={{ 
              padding: '0.6rem 1.2rem', 
              backgroundColor: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Adicionar Site
          </button>
        </form>
      </div>

      <div className="metrics-grid">
        {loading ? (
          <p style={{ color: '#ccc' }}>Carregando sites...</p>
        ) : sites.length === 0 ? (
          <p style={{ color: '#ccc' }}>Nenhum site encontrado. Adicione um acima!</p>
        ) : (
          sites.map((site) => {
            const isEditing = editingSiteId === site.id;
            const isExpanded = expandedSites[site.id];

            return (
              <div key={site.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}>
                {/* Header do Card (Sempre Visível) */}
                <div 
                  onClick={() => toggleExpand(site.id)}
                  style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid #2a2e3b' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ color: '#6b7280' }}>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{site.name}</h3>
                      <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>{site.domain}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                    <Link
                      to={`/dashboard/${site.id}`}
                      style={{ 
                        textDecoration: 'none', 
                        color: 'white',
                        fontWeight: 'bold',
                        backgroundColor: '#006fee',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      Ver Painel &rarr;
                    </Link>
                  </div>
                </div>

                {/* Conteúdo Expansível */}
                {isExpanded && (
                  <div style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '2rem' }}>
                      <div style={{ flex: 1, minWidth: '300px' }}>
                        {isEditing ? (
                          <div style={{ 
                            background: 'rgba(59, 130, 246, 0.05)', 
                            padding: '1rem', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            marginBottom: '0.5rem'
                          }}>
                            {/* Nome do Site */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px', color: '#9ca3af' }}>
                                <Type size={16} />
                                <span style={{ fontSize: '0.9rem' }}>Nome:</span>
                              </div>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ 
                                  flex: 1, 
                                  padding: '0.5rem 0.8rem', 
                                  borderRadius: '4px', 
                                  border: '1px solid #3b82f6', 
                                  background: '#1f2937', 
                                  color: 'white',
                                  outline: 'none',
                                  boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.1)'
                                }}
                                placeholder="Nome do Site"
                              />
                            </div>

                            {/* Domínio */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px', color: '#9ca3af' }}>
                                <Globe size={16} />
                                <span style={{ fontSize: '0.9rem' }}>Domínio:</span>
                              </div>
                              <input
                                type="text"
                                value={editDomain}
                                onChange={(e) => setEditDomain(e.target.value)}
                                style={{ 
                                  flex: 1, 
                                  padding: '0.5rem 0.8rem', 
                                  borderRadius: '4px', 
                                  border: '1px solid #3b82f6', 
                                  background: '#1f2937', 
                                  color: 'white',
                                  outline: 'none',
                                  boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.1)'
                                }}
                                placeholder="Domínio"
                              />
                            </div>

                            {/* Slugs */}
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', marginBottom: '0.2rem' }}>
                                <Hash size={16} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Funil de Rastreamento (Slugs)</span>
                              </div>
                              
                              {editSlugs.map((slug, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingLeft: '1.8rem' }}>
                                  <span style={{ 
                                    fontSize: '0.8rem', 
                                    color: '#60a5fa', 
                                    width: '60px', 
                                    fontFamily: 'monospace',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: '0.1rem 0.3rem',
                                    borderRadius: '3px',
                                    textAlign: 'center'
                                  }}>
                                    Etapa {index + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => {
                                      const next = [...editSlugs];
                                      next[index] = e.target.value.replace(/^\//, '');
                                      setEditSlugs(next);
                                    }}
                                    style={{ 
                                      flex: 1, 
                                      padding: '0.4rem 0.8rem', 
                                      borderRadius: '4px', 
                                      border: '1px solid #4b5563', 
                                      background: '#374151',
                                      color: 'white'
                                    }}
                                    placeholder="ex: obrigado, upsell-1"
                                  />
                                  {editSlugs.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = editSlugs.filter((_, i) => i !== index);
                                        setEditSlugs(next.length ? next : ['']);
                                      }}
                                      style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#ef4444', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: '0.2rem',
                                        borderRadius: '4px'
                                      }}
                                      title="Remover etapa"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEditSlugs([...editSlugs, ''])}
                                style={{ 
                                  marginTop: '0.25rem', 
                                  marginLeft: '1.8rem',
                                  background: 'none', 
                                  border: '1px dashed #10b981', 
                                  color: '#10b981', 
                                  cursor: 'pointer', 
                                  fontSize: '0.8rem', 
                                  textAlign: 'center',
                                  padding: '0.3rem',
                                  borderRadius: '4px',
                                  width: 'fit-content'
                                }}
                              >
                                + Adicionar nova etapa
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Etapas do Funil</h4>
                              {Array.isArray(site.slugs) && site.slugs.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  {site.slugs.map((slug, idx) => (
                                    <span key={idx} style={{ 
                                      background: '#1f2937', 
                                      border: '1px solid #374151',
                                      padding: '0.3rem 0.6rem', 
                                      borderRadius: '4px', 
                                      fontSize: '0.85rem',
                                      color: '#e5e7eb',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.4rem'
                                    }}>
                                      <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{idx + 1}.</span>
                                      {slug}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic' }}>Nenhuma etapa configurada.</p>
                              )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 'bold' }}>Instalação</h4>
                              <div style={{ background: '#1a1d27', padding: '0.8rem', borderRadius: '4px', position: 'relative', border: '1px solid #2a2e3b' }}>
                                <code style={{ color: '#a5b4fc', fontSize: '0.85rem', wordBreak: 'break-all', display: 'block', paddingRight: '60px' }}>
                                  &lt;script src="{window.location.origin}/script.js" data-site-id="{site.id}"&gt;&lt;/script&gt;
                                </code>
                                <button 
                                  onClick={() => copyToClipboard(`<script src="${window.location.origin}/script.js" data-site-id="${site.id}"></script>`)}
                                  style={{ 
                                    position: 'absolute', 
                                    right: '8px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)',
                                    background: '#374151',
                                    border: 'none',
                                    color: 'white',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                >
                                  <Copy size={12} /> Copiar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Botões de Ação na Direita */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '140px' }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(site.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%',
                                fontWeight: 'bold'
                              }}
                            >
                              <Save size={16} /> Salvar
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem',
                                backgroundColor: '#4b5563',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              <X size={16} /> Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingSite(site)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%',
                                justifyContent: 'flex-start'
                              }}
                            >
                              <Edit size={16} /> Editar Site
                            </button>
                            <button
                              onClick={() => handleDeleteSite(site.id, site.name)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                width: '100%',
                                justifyContent: 'flex-start',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Trash2 size={16} /> Excluir
                            </button>
                            <div style={{ 
                              marginTop: '1rem', 
                              textAlign: 'center',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              background: '#1f2937',
                              padding: '0.4rem',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}>
                              ID: {site.id}
                            </div>

                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SitesList;
