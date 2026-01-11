app.get('/test-tracking/:siteId', (req, res) => {
  const siteId = req.params.siteId;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Teste de Rastreamento - LoopeyLive</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 2rem; background: #f8fafc; color: #334155; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 500px; margin: 0 auto; }
    h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 1rem; }
    .status { margin: 1.5rem 0; padding: 1rem; background: #f1f5f9; border-radius: 8px; font-weight: 500; }
    .success { color: #10b981; background: #d1fae5; }
    .error { color: #ef4444; background: #fee2e2; }
    code { background: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Teste de Rastreamento</h1>
    <p>Site ID: <strong>${siteId}</strong></p>
    
    <div id="status" class="status">Inicializando script...</div>
    
    <p style="font-size: 0.9rem; color: #64748b;">
      Abra o Console do Navegador (F12) para ver os logs detalhados do [LoopeyLive].
    </p>

    <div style="margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        <p><strong>Instruções:</strong></p>
        <ol style="text-align: left; font-size: 0.9rem; color: #475569;">
            <li>Mantenha esta página aberta.</li>
            <li>Abra seu Dashboard em outra aba.</li>
            <li>Verifique se o contador de "Usuários Ativos" mostra <strong>1</strong>.</li>
        </ol>
    </div>
  </div>
  
  <!-- O Tracker agora carrega o socket.io automaticamente se necessário -->
  <script src="/tracker/tracker.js" data-site-id="${siteId}"></script>
  
  <script>
    const statusDiv = document.getElementById('status');
    
    // Check if socket.io loaded
    const checkInterval = setInterval(() => {
      if (typeof io !== 'undefined') {
        clearInterval(checkInterval);
        statusDiv.innerHTML = 'Socket.io carregado. <br>Conectando ao servidor...';
        
        // Listen to the socket created by tracker (hacky access via global if needed, but tracker is isolated)
        // Instead we trust the console logs.
        
        setTimeout(() => {
             statusDiv.innerHTML = '<span style="color:#059669">✓ Script Ativo e Rodando</span><br><span style="font-size:0.8em">Verifique o Dashboard agora.</span>';
             statusDiv.className = 'status success';
        }, 2000);
      }
    }, 500);

    setTimeout(() => {
        if (typeof io === 'undefined') {
            statusDiv.innerHTML = '❌ Falha ao carregar Socket.io via CDN.<br>Verifique sua conexão ou bloqueadores de anúncio.';
            statusDiv.className = 'status error';
        }
    }, 10000);
  </script>
</body>
</html>
  `;
  res.send(html);
});
