import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Monitor, Layout, FileCode, Check, X } from 'lucide-react';

const DashboardBuilder = ({ themeColor, viewMode }) => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTemplates, setCustomTemplates] = useState([]);

  // Fetch custom templates
  React.useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => setCustomTemplates(data))
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  // Determine current active section
  const activeSection = viewMode ? viewMode.replace('builder-', '') : 'themes';

  // Mock templates
  const defaultTemplates = [
    { id: 1, name: 'Landing Page VSL', description: 'Ideal para ofertas de alta conversão com vídeo.', icon: Monitor },
    { id: 2, name: 'Advertorial Blog', description: 'Layout estilo blog para aquecimento de leads.', icon: FileCode },
    { id: 3, name: 'Quiz Funnel', description: 'Página de captura interativa com perguntas.', icon: Layout },
    { id: 4, name: 'E-commerce Single Product', description: 'Foco total em um único produto.', icon: Monitor },
  ];

  // Merge templates (Custom ones get generic Layout icon if string is passed)
  const templates = [
    ...customTemplates.map(t => ({ ...t, icon: Layout, isCustom: true })), 
    ...defaultTemplates
  ];

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
  };

  const renderContent = () => {
      switch (activeSection) {
          case 'pages':
              return (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <FileCode size={64} color="#2a2e3b" style={{ marginBottom: '1rem' }} />
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Gerenciador de Páginas</h2>
                      <p style={{ color: '#9ca3af' }}>Crie e edite as páginas da sua loja virtual.</p>
                      <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1d27', borderRadius: '8px', display: 'inline-block' }}>
                          <span style={{ color: themeColor, fontWeight: 'bold' }}>Em Breve</span>
                      </div>
                  </div>
              );
          case 'menus':
              return (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <Layout size={64} color="#2a2e3b" style={{ marginBottom: '1rem' }} />
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Menus de Navegação</h2>
                      <p style={{ color: '#9ca3af' }}>Organize a navegação do seu site.</p>
                      <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1d27', borderRadius: '8px', display: 'inline-block' }}>
                          <span style={{ color: themeColor, fontWeight: 'bold' }}>Em Breve</span>
                      </div>
                  </div>
              );
          case 'settings':
              return (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <Monitor size={64} color="#2a2e3b" style={{ marginBottom: '1rem' }} />
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Configurações da Loja</h2>
                      <p style={{ color: '#9ca3af' }}>Defina preferências globais, checkout e integrações.</p>
                      <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1d27', borderRadius: '8px', display: 'inline-block' }}>
                          <span style={{ color: themeColor, fontWeight: 'bold' }}>Em Breve</span>
                      </div>
                  </div>
              );
          case 'themes':
          default:
              return (
                <>
                  <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Temas</h2>
                      <p style={{ color: '#9ca3af' }}>Selecione um modelo base ou envie seus próprios arquivos.</p>
                    </div>
                    <button
                      onClick={handleUploadClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: themeColor,
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: `0 4px 14px 0 ${themeColor}66`
                      }}
                    >
                      <Upload size={18} />
                      Enviar Meu Modelo
                    </button>
                  </div>
            
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: '1.5rem' 
                  }}>
                    {templates.map(template => (
                      <div 
                        key={template.id}
                        style={{
                          background: '#1a1d27',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s, border-color 0.2s',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.borderColor = themeColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div style={{ 
                          background: `${themeColor}20`, 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginBottom: '1rem',
                          color: themeColor
                        }}>
                          <template.icon size={24} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{template.name}</h3>
                        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>{template.description}</p>
                        
                        {template.isCustom ? (
                             <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                <a 
                                  href={template.path} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: `1px solid ${themeColor}`,
                                    color: themeColor,
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem'
                                  }}
                                >
                                  <Monitor size={14} />
                                  Visualizar
                                </a>
                                <button 
                                   onClick={() => navigate(`/builder/edit/${template.id}`)}
                                   style={{
                                     flex: 1,
                                     background: themeColor,
                                     border: 'none',
                                     color: 'white',
                                     padding: '0.5rem 1rem',
                                     borderRadius: '6px',
                                     cursor: 'pointer',
                                     fontWeight: 'bold',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     gap: '0.5rem',
                                     fontSize: '0.85rem'
                                   }}
                                 >
                                   <FileCode size={14} />
                                   Editar
                                 </button>
                             </div>
                        ) : (
                        <button 
                          style={{
                            background: 'transparent',
                            border: `1px solid ${themeColor}`,
                            color: themeColor,
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = themeColor;
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = themeColor;
                          }}
                        >
                          <Plus size={16} />
                          Usar Modelo
                        </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
      }
  };

  return (
    <div className="dashboard-content" style={{ padding: '2rem', color: 'white', overflowY: 'auto', height: '100%' }}>
      {renderContent()}

      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1d27',
            padding: '2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <button 
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} color={themeColor} />
              Enviar Arquivos do Site
            </h3>
            
            <div style={{
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <FileCode size={48} color="#4b5563" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.5rem' }}>Arraste seus arquivos aqui</p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Suporta .zip, .html, .css, .js</p>
              <button style={{
                marginTop: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Selecionar Arquivos
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                style={{
                  background: themeColor,
                  border: 'none',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Confirmar Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;
