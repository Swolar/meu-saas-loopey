import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Monitor, Smartphone, Tablet, Type, Image, Link as LinkIcon, X } from 'lucide-react';
import { authFetch } from './config';

const TemplateEditor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [selectedElement, setSelectedElement] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    // Load template content
    authFetch(`/api/templates/${templateId}/content`)
      .then(res => res.text())
      .then(html => {
        // Inject editor script and styles
        const editorScript = `
          <style>
            .editor-highlight {
              outline: 2px solid #006fee !important;
              cursor: pointer !important;
            }
            .editor-selected {
              outline: 2px solid #f59e0b !important;
            }
            body {
              padding-bottom: 50px; 
            }
          </style>
          <script>
            let selectedEl = null;

            document.addEventListener('mouseover', (e) => {
              e.target.classList.add('editor-highlight');
            });

            document.addEventListener('mouseout', (e) => {
              e.target.classList.remove('editor-highlight');
            });

            document.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (selectedEl) selectedEl.classList.remove('editor-selected');
              selectedEl = e.target;
              selectedEl.classList.add('editor-selected');

              // Identify element type and properties
              const data = {
                tagName: selectedEl.tagName,
                innerHTML: selectedEl.innerHTML,
                innerText: selectedEl.innerText,
                src: selectedEl.getAttribute('src'),
                href: selectedEl.getAttribute('href'),
                style: selectedEl.getAttribute('style') || '',
                className: selectedEl.className
              };

              window.parent.postMessage({ type: 'ELEMENT_SELECTED', data }, '*');
            });

            window.addEventListener('message', (event) => {
              if (event.data.type === 'UPDATE_ELEMENT' && selectedEl) {
                const { key, value } = event.data;
                if (key === 'innerHTML') selectedEl.innerHTML = value;
                if (key === 'innerText') selectedEl.innerText = value;
                if (key === 'src') selectedEl.setAttribute('src', value);
                if (key === 'href') selectedEl.setAttribute('href', value);
                if (key === 'style') selectedEl.setAttribute('style', value);
              }
            });
          </script>
        `;
        
        // Insert script before closing body tag, or at the end if no body tag
        if (html.includes('</body>')) {
          setContent(html.replace('</body>', `${editorScript}</body>`));
        } else {
          setContent(html + editorScript);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load template:', err);
        setLoading(false);
      });
  }, [templateId]);

  // Handle messages from iframe
  useEffect(() => {
    const handler = (event) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.data);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleUpdate = (key, value) => {
    setSelectedElement(prev => ({ ...prev, [key]: value }));
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({ 
        type: 'UPDATE_ELEMENT', 
        key, 
        value 
      }, '*');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Get current HTML from iframe
    // Note: We can't easily get the *exact* original source with just innerHTML changes 
    // because the iframe DOM has been parsed. 
    // A robust solution would parse the original string, but for this MVP, 
    // we will ask the iframe for its full HTML and strip our editor scripts.
    
    // Actually, getting documentElement.outerHTML from iframe is best.
    const fullHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
    
    // Clean up our injected scripts/styles
    // This is a bit hacky but works for MVP. 
    // We should ideally keep the original "clean" HTML in memory and apply operation transforms,
    // but direct DOM dump is acceptable for "Total Customization" of static files.
    
    // Removing the injected script block is tricky with regex. 
    // Let's just try to save as is, but users might see the script if they download it.
    // Better: Send a message to iframe to ask it to clean itself before dumping?
    // Or just regex replace the specific script block we added.
    
    // Simple regex to remove our specific style/script block
    const cleanHtml = fullHtml
      .replace(/<style>\s*\.editor-highlight[\s\S]*?<\/script>/, '')
      .replace('class="editor-selected"', '')
      .replace('class="editor-highlight"', ''); // Cleanup artifacts

    try {
      await authFetch(`/api/templates/${templateId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '<!DOCTYPE html>\n' + cleanHtml })
      });
      alert('Salvo com sucesso!');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-white">Carregando editor...</div>;

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-black">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/builder')} className="p-2 hover:bg-neutral-800 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-lg">Editor: {templateId}</h1>
        </div>

        <div className="flex bg-neutral-800 rounded-lg p-1">
          <button 
            onClick={() => setDeviceMode('desktop')}
            className={`p-2 rounded ${deviceMode === 'desktop' ? 'bg-neutral-600' : 'hover:bg-neutral-700'}`}
          >
            <Monitor size={18} />
          </button>
          <button 
            onClick={() => setDeviceMode('tablet')}
            className={`p-2 rounded ${deviceMode === 'tablet' ? 'bg-neutral-600' : 'hover:bg-neutral-700'}`}
          >
            <Tablet size={18} />
          </button>
          <button 
            onClick={() => setDeviceMode('mobile')}
            className={`p-2 rounded ${deviceMode === 'mobile' ? 'bg-neutral-600' : 'hover:bg-neutral-700'}`}
          >
            <Smartphone size={18} />
          </button>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Canvas */}
        <div className="flex-1 bg-neutral-900 flex justify-center items-start p-8 overflow-auto" onClick={() => setSelectedElement(null)}>
          <div 
            style={{
              width: deviceMode === 'mobile' ? '375px' : deviceMode === 'tablet' ? '768px' : '100%',
              height: '100%',
              transition: 'width 0.3s ease',
              backgroundColor: 'white',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)'
            }}
          >
            <iframe 
              ref={iframeRef}
              srcDoc={content}
              title="Template Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-modals allow-forms allow-popups"
            />
          </div>
        </div>

        {/* Properties Sidebar */}
        {selectedElement && (
          <div className="w-80 bg-black border-l border-neutral-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Type size={18} className="text-blue-500" />
                Propriedades
              </h2>
              <button onClick={() => setSelectedElement(null)} className="hover:text-red-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="text-xs text-neutral-500 font-mono mb-4 p-2 bg-neutral-900 rounded">
                &lt;{selectedElement.tagName.toLowerCase()} class="{selectedElement.className}"&gt;
              </div>

              {/* Text Content Editor */}
              {(selectedElement.innerText !== undefined) && (
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Texto</label>
                  <textarea 
                    value={selectedElement.innerText}
                    onChange={(e) => handleUpdate('innerText', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm h-32 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

               {/* HTML Content Editor (Advanced) */}
               <div className="space-y-2">
                  <label className="text-sm text-neutral-400">HTML (Avançado)</label>
                  <textarea 
                    value={selectedElement.innerHTML}
                    onChange={(e) => handleUpdate('innerHTML', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs h-32 font-mono focus:border-blue-500 outline-none"
                  />
                </div>

              {/* Image Src Editor */}
              {selectedElement.tagName === 'IMG' && (
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400 flex items-center gap-2">
                    <Image size={14} /> Origem da Imagem (SRC)
                  </label>
                  <input 
                    type="text" 
                    value={selectedElement.src || ''}
                    onChange={(e) => handleUpdate('src', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-neutral-600">Cole uma URL ou caminho relativo (ex: images/foto.jpg)</p>
                </div>
              )}

              {/* Link Href Editor */}
              {selectedElement.tagName === 'A' && (
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400 flex items-center gap-2">
                    <LinkIcon size={14} /> Link (HREF)
                  </label>
                  <input 
                    type="text" 
                    value={selectedElement.href || ''}
                    onChange={(e) => handleUpdate('href', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              )}

               {/* Style Editor */}
               <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Estilo CSS (Inline)</label>
                  <textarea 
                    value={selectedElement.style || ''}
                    onChange={(e) => handleUpdate('style', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs h-24 font-mono focus:border-blue-500 outline-none"
                    placeholder="color: red; font-size: 20px;"
                  />
                </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateEditor;
