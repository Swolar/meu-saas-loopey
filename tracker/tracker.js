(function() {
  // --- 1. Determine Server URL ---
  let SERVER_URL = 'http://localhost:3001'; // Default Fallback
  
  // Try to find the script tag that loaded this file
  const scriptTag = document.currentScript || document.querySelector('script[src*="tracker.js"]');
  
  if (scriptTag) {
    try {
      // Use the origin of the script as the server URL
      const url = new URL(scriptTag.src);
      SERVER_URL = url.origin;
    } catch (e) {
      console.warn('LoopeyLive: Could not parse script URL, using fallback:', SERVER_URL);
    }
  }

  // Use window.location.origin if we are on the same domain (e.g. testing)
  // and the script tag method failed or gave a relative path
  if (SERVER_URL === 'http://localhost:3001' && !window.location.hostname.includes('localhost')) {
      // If we are on a real domain but defaulted to localhost, try to infer from script src again more aggressively
      if (scriptTag && scriptTag.src && scriptTag.src.startsWith('http')) {
           const url = new URL(scriptTag.src);
           SERVER_URL = url.origin;
      }
  }

  console.log('[LoopeyLive] Initializing tracker...');
  console.log('[LoopeyLive] Server URL:', SERVER_URL);

  // --- 2. Load Socket.IO Client if missing ---
  function loadSocketIO(callback) {
    if (typeof io !== 'undefined') {
      callback();
      return;
    }

    console.log('[LoopeyLive] Socket.io not found, loading from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    script.onload = () => {
        console.log('[LoopeyLive] Socket.io loaded successfully');
        callback();
    };
    script.onerror = () => {
        console.error('[LoopeyLive] Failed to load Socket.io from CDN');
    };
    document.head.appendChild(script);
  }

  // --- 3. Initialize Tracker ---
  function initTracker() {
    // Try to find site ID
    const siteId = scriptTag ? scriptTag.getAttribute('data-site-id') : (window.LOOPEY_SITE_ID || 'default');

    if (!siteId || siteId === 'default') {
      console.warn('[LoopeyLive] No site ID provided. Monitoring may not work. Add data-site-id="YOUR_SITE_ID" to the script tag.');
    } else {
        console.log('[LoopeyLive] Tracking Site ID:', siteId);
    }

    // Connect options
    const options = {
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'] // Try websocket first
    };

    const socket = io(SERVER_URL, options);
    let heartbeatInterval;

    const getPageData = () => ({
      siteId: siteId,
      url: window.location.pathname + window.location.search, // Include query params
      referrer: document.referrer,
      userAgent: navigator.userAgent
    });

    socket.on('connect', () => {
      console.log('[LoopeyLive] Connected to monitoring server via ' + socket.io.engine.transport.name);
      
      // Send join event
      socket.emit('join', getPageData());

      // Start heartbeat
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat');
      }, 5000);
    });

    socket.on('connect_error', (err) => {
        console.error('[LoopeyLive] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('[LoopeyLive] Disconnected:', reason);
    });

    // Track history changes (SPA support)
    let lastUrl = window.location.href;
    const checkUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('[LoopeyLive] URL changed, sending page_view');
            socket.emit('page_view', getPageData());
        }
    };

    // Hook into history API for SPAs
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        checkUrlChange();
    };
    window.addEventListener('popstate', checkUrlChange);
  }

  // Start
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
      loadSocketIO(initTracker);
  } else {
      window.addEventListener('DOMContentLoaded', () => loadSocketIO(initTracker));
  }

})();
