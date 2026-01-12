import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, Copy, AlertCircle
} from 'lucide-react';
import { getApiUrl, authFetch } from './config';

function SitesList({ onSitesUpdate }) {
  const [sites, setSites] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    try {
      const response = await authFetch('/api/sites', {
        method: 'POST',
        body: JSON.stringify({ name: newSiteName, domain: newSiteDomain }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao criar site');
      }

      const newSite = await response.json();
      setSites([...sites, newSite]);
      setNewSiteName('');
      setNewSiteDomain('');
      
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

  return (
    <div className="sites-list-container">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'white' }}>Visão Geral e Gerenciamento</h2>

      {/* Tutorial Section */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #10b981' }}>
        <h3 style={{ color: '#10b981' }}>📝 Como Instalar o Rastreador</h3>
        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
          Para começar a monitorar seus visitantes, adicione o seguinte código dentro da tag <code>&lt;head&gt;</code> do seu site:
        </p>
        <div style={{ background: '#1a1d27', padding: '1rem', borderRadius: '4px', position: 'relative' }}>
          <code style={{ color: '#a5b4fc', wordBreak: 'break-all' }}>
            &lt;script src="{window.location.origin}/script.js" data-site-id="<span style={{ color: '#f59e0b' }}>SEU_ID_DO_SITE</span>"&gt;&lt;/script&gt;
          </code>
          <button 
            onClick={() => copyToClipboard(`<script src="${window.location.origin}/script.js" data-site-id="SEU_ID_DO_SITE"></script>`)}
            style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              background: '#2a2e3b',
              border: '1px solid #3f3f46',
              color: 'white',
              padding: '0.3rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Copiar
          </button>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#9ca3af' }}>
          * Substitua <span style={{ color: '#f59e0b' }}>SEU_ID_DO_SITE</span> pelo ID específico do site que você criou abaixo.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>Adicionar Novo Site</h3>
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
        <form onSubmit={handleCreateSite} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
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
          <div style={{ flex: 1, minWidth: '200px' }}>
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
          sites.map((site) => (
            <div key={site.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3>{site.name}</h3>
                  <p style={{ color: '#666', marginBottom: '0.5rem' }}>{site.domain}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    background: '#2a2e3b', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    color: '#f59e0b',
                    fontFamily: 'monospace'
                  }}>
                    ID: {site.id}
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => copyToClipboard(`<script src="${window.location.origin}/script.js" data-site-id="${site.id}"></script>`)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#10b981', 
                      cursor: 'pointer', 
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    title="Copiar Script"
                  >
                    📋 Copiar
                  </button>
                  <button 
                    onClick={() => handleDeleteSite(site.id, site.name)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#ef4444', 
                      cursor: 'pointer', 
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    title="Excluir Site"
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>

                <Link 
                  to={`/dashboard/${site.id}`}
                  style={{ 
                    textDecoration: 'none', 
                    color: 'white', 
                    fontWeight: 'bold',
                    backgroundColor: '#006fee',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px'
                  }}
                >
                  Ver Painel &rarr;
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SitesList;
