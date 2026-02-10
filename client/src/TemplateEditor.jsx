import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Monitor, Smartphone, Tablet, 
  Image as ImageIcon, Type, Video, FileText, DollarSign,
  ChevronDown, ChevronRight, Upload
} from 'lucide-react';

const TemplateEditor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [device, setDevice] = useState('desktop'); // desktop, tablet, mobile
  
  // State for collapsible sidebar sections
  const [openSections, setOpenSections] = useState({
    general: true,
    tags: false,
    content: false,
    media: false,
    story: false,
    goal: false
  });

  // Load Template Content
  useEffect(() => {
    fetch(`http://localhost:3001/api/templates/${templateId}/content`)
      .then(res => res.text())
      .then(html => {
        // Inject Base URL for relative paths
        const baseUrl = `http://localhost:3001/templates/${templateId}/`;
        let processedHtml = html;
        
        if (!processedHtml.includes('<base')) {
          if (processedHtml.includes('<head>')) {
            processedHtml = processedHtml.replace('<head>', `<head><base href="${baseUrl}">`);
          } else {
            processedHtml = `<base href="${baseUrl}">` + processedHtml;
          }
        }
        
        setHtmlContent(processedHtml);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load template:', err);
        setLoading(false);
      });
  }, [templateId]);

  // Helper to toggle sections
  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper to update Iframe DOM
  const updateDom = (selectors, value, attribute = 'innerText', transform = null) => {
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;
    
    const doc = iframeRef.current.contentDocument;
    const targetSelectors = Array.isArray(selectors) ? selectors : [selectors];
    
    targetSelectors.forEach(selector => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => {
        const finalValue = transform ? transform(value) : value;
        
        if (attribute === 'style.width') {
          el.style.width = finalValue;
        } else if (attribute === 'src') {
          el.src = finalValue;
        } else if (attribute === 'innerHTML') {
          el.innerHTML = finalValue;
        } else {
          el.innerText = finalValue;
        }
      });
    });
  };

  // File Upload Handler
  const handleFileUpload = async (e, selectors, attribute) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      updateDom(selectors, base64, attribute);
      
      // Upload to server to persist
      uploadAsset(file).then(url => {
         // Update with real URL after upload
         if (url) {
             // Prefix with full server URL if needed, or relative if base tag handles it
             // Since base tag is http://localhost:3001/templates/id/, returning "uploads/file.png" is good.
             // But our API returns "/templates/id/uploads/file.png".
             // We should probably use the full URL to be safe or relative to base.
             // Let's use the full absolute URL from the server.
             const fullUrl = `http://localhost:3001${url}`;
             updateDom(selectors, fullUrl, attribute);
         }
      });
    };
    reader.readAsDataURL(file);
  };

  const uploadAsset = async (file) => {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = async (e) => {
        try {
          const res = await fetch(`http://localhost:3001/api/templates/${templateId}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              content: e.target.result
            })
          });
          const data = await res.json();
          if (data.success) resolve(data.url);
          else resolve(null);
        } catch (err) {
          console.error(err);
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;

    // Get the current HTML state
    let fullHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
    
    // Remove the injected <base> tag to preserve portability
    fullHtml = fullHtml.replace(/<base href="[^"]*">/, '');

    try {
      await fetch(`http://localhost:3001/api/templates/${templateId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullHtml })
      });
      alert('Site salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar site.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Carregando Editor...</div>;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
      {/* Sidebar Editor */}
      <div className="w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-slate-800 text-lg">Editor do Site</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Section: Logo */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('general')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-500" />
                Logo e Identidade
              </span>
              {openSections.general ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.general && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Logo do Site</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, ['.logo', '.logo-info', '.about-logo'], 'src')}
                      accept="image/*"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500">
                      <Upload size={24} />
                      <span className="text-sm font-medium">Clique para trocar a Logo</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Recomendado: PNG Transparente</p>
                </div>
              </div>
            )}
          </div>

          {/* Section: Top Tags */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('tags')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Type size={18} className="text-indigo-500" />
                Tags de Informação (Topo)
              </span>
              {openSections.tags ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.tags && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tag 1 (Esquerda)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Ex: Asas De Anjo"
                    onChange={(e) => updateDom('.tag-item:nth-child(1) span', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tag 2 (Meio)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Ex: Refeição"
                    onChange={(e) => updateDom('.tag-item:nth-child(2) span', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tag 3 (Direita)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Ex: Saúde"
                    onChange={(e) => updateDom('.tag-item:nth-child(3) span', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Main Content */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('content')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={18} className="text-green-500" />
                Texto Principal
              </span>
              {openSections.content ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.content && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Título Principal (H1)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Título da Página"
                    onChange={(e) => updateDom('.titulo-principal', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Subtítulo (HTML permitido)</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm min-h-[80px]"
                    placeholder="Subtítulo..."
                    onChange={(e) => updateDom('.subtitulo', e.target.value, 'innerHTML')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Media */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('media')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Video size={18} className="text-red-500" />
                Mídia Principal
              </span>
              {openSections.media ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.media && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Subir Vídeo ou Imagem</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileUpload(e, 'video.imagem-video', 'src')}
                      accept="video/*,image/*"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500">
                      <Upload size={24} />
                      <span className="text-sm font-medium">Trocar Mídia Principal</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descrição Curta 1</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    onChange={(e) => updateDom('.texto-info p:not(.texto-azul)', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descrição Curta 2 (Destaque Azul)</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    onChange={(e) => updateDom('.texto-info .texto-azul', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Story */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('story')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <FileText size={18} className="text-orange-500" />
                História
              </span>
              {openSections.story ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.story && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Conteúdo da História (HTML)</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-mono text-xs min-h-[200px]"
                    placeholder="<p>Escreva a história aqui...</p>"
                    onChange={(e) => updateDom('#story', e.target.value, 'innerHTML')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Goal */}
          <div className="border-b border-slate-100">
            <button 
              onClick={() => toggleSection('goal')}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-500" />
                Meta de Arrecadação
              </span>
              {openSections.goal ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {openSections.goal && (
              <div className="p-5 space-y-4 bg-white animate-fadeIn">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor Arrecadado (Texto)</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Ex: 45.750€ ANGARIADO"
                    onChange={(e) => updateDom('.raised-amount', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Texto da Meta</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                    placeholder="Ex: De 230.000,00€ META"
                    onChange={(e) => updateDom('.goal-text', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Progresso da Barra (%)</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    onChange={(e) => updateDom('.progress-bar-fill', e.target.value + '%', 'style.width')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-8 text-center text-slate-400 text-sm">
             Fim das configurações
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Salvar Como</label>
              <input 
                type="text" 
                placeholder="index.html" 
                disabled
                className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-500 text-sm cursor-not-allowed" 
                value="index.html (Padrão)"
              />
           </div>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-green-600/20"
           >
             {saving ? 'Salvando...' : (
               <>
                 <Save size={20} />
                 Salvar Alterações
               </>
             )}
           </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
        {/* Toolbar */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-md z-10">
          <div className="flex items-center gap-4">
             <div className="text-white font-medium opacity-80">Preview: {templateId}</div>
          </div>
          
          <div className="flex bg-slate-700 rounded-lg p-1">
             <button 
               onClick={() => setDevice('desktop')}
               className={`p-2 rounded-md transition-all ${device === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-600'}`}
               title="Desktop"
             >
               <Monitor size={20} />
             </button>
             <button 
               onClick={() => setDevice('tablet')}
               className={`p-2 rounded-md transition-all ${device === 'tablet' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-600'}`}
               title="Tablet"
             >
               <Tablet size={20} />
             </button>
             <button 
               onClick={() => setDevice('mobile')}
               className={`p-2 rounded-md transition-all ${device === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-600'}`}
               title="Mobile"
             >
               <Smartphone size={20} />
             </button>
          </div>

          <div className="w-[100px]"></div> {/* Spacer for balance */}
        </div>

        {/* Iframe Container */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950">
           <div 
             className={`transition-all duration-500 ease-in-out bg-white shadow-2xl overflow-hidden border-8 border-slate-800 relative ${
               device === 'mobile' ? 'w-[375px] h-[667px] rounded-[30px]' : 
               device === 'tablet' ? 'w-[768px] h-[1024px] rounded-[20px]' : 
               'w-full h-full rounded-none border-0'
             }`}
           >
              {/* Mobile Notch simulation */}
              {(device === 'mobile' || device === 'tablet') && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded-b-xl z-20"></div>
              )}

              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title="Site Preview"
                className="w-full h-full bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms"
                style={{ border: 'none' }}
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
