(function() {
  const SERVER_URL = 'http://localhost:3001';

  function initTracker() {
    if (typeof io === 'undefined') {
      console.error('Socket.io client not found. Please include it before tracker.js');
      return;
    }

    // Try to find site ID from script tag data attribute or global variable
    const scriptTag = document.currentScript || document.querySelector('script[src*="tracker.js"]');
    const siteId = scriptTag ? scriptTag.getAttribute('data-site-id') : (window.LOOPEY_SITE_ID || 'default');

    if (!siteId) {
      console.warn('LoopeyLive: No site ID provided. Monitoring may not work correctly.');
    }

    const socket = io(SERVER_URL);
    let heartbeatInterval;

    const getPageData = () => ({
      siteId: siteId,
      url: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    });

    socket.on('connect', () => {
      console.log('Connected to monitoring server');
      
      // Send join event
      socket.emit('join', getPageData());

      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        socket.emit('heartbeat');
      }, 5000);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from monitoring server');
      clearInterval(heartbeatInterval);
    });

    // Handle SPA navigation (history API) if needed
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      socket.emit('page_view', getPageData());
    };
    
    window.addEventListener('popstate', () => {
      socket.emit('page_view', getPageData());
    });
  }

  // Load Socket.io client from CDN if not present
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    script.onload = initTracker;
    document.head.appendChild(script);
  } else {
    initTracker();
  }
})();
