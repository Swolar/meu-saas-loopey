(function() {
    // LoopeyLive Tracker - v2.0.0 (Self-Hosted Edition)
    // Completely rewritten to guarantee connection for self-hosted instances.

    var scriptTag = document.currentScript || 
                    document.querySelector('script[src*="script.js"]') || 
                    document.querySelector('script[src*="tracker.js"]');

    var SERVER_URL = '';

    // 1. Robust Server URL Detection
    // For self-hosted, the script is almost always served from the same domain as the tracker server.
    if (scriptTag && scriptTag.src) {
        try {
            var urlObj = new URL(scriptTag.src);
            SERVER_URL = urlObj.origin; // e.g., "https://analytics.mydomain.com"
            console.log('[LoopeyLive] Detected Server URL from script tag:', SERVER_URL);
        } catch (e) {
            console.error('[LoopeyLive] Error parsing script URL:', e);
        }
    }

    // Fallback: If detection fails, use the site's own origin if it matches typical dev setup,
    // otherwise warn the user.
    if (!SERVER_URL) {
        console.warn('[LoopeyLive] Could not detect server URL. Defaulting to script origin if possible.');
        // This is risky if script is inline, but we only support external script loading.
    }

    var SITE_ID = 'default';
    if (scriptTag) {
        SITE_ID = scriptTag.getAttribute('data-site-id') || 'default';
    }
    
    // Ensure SITE_ID is clean
    SITE_ID = String(SITE_ID).trim();

    if (SITE_ID === 'default') {
        console.warn('[LoopeyLive] Warning: No data-site-id provided. Tracking may not be attributed correctly.');
    }

    console.log('[LoopeyLive] Initializing for Site ID:', SITE_ID);

    // 2. Load Socket.IO Client
    // Strategy: Prefer loading from the tracking server itself to avoid CDN issues and version mismatches.
    
    function loadSocketAndConnect() {
        if (typeof io !== 'undefined') {
            connectSocket();
            return;
        }

        // Try loading from the server first
        var serverSocketScript = SERVER_URL + '/socket.io/socket.io.js';
        console.log('[LoopeyLive] Loading Socket.IO from:', serverSocketScript);

        var script = document.createElement('script');
        script.src = serverSocketScript;
        script.onload = function() {
            console.log('[LoopeyLive] Socket.IO loaded from server.');
            connectSocket();
        };
        script.onerror = function() {
            console.warn('[LoopeyLive] Failed to load Socket.IO from server. Trying CDN fallback...');
            loadFromCDN();
        };
        document.head.appendChild(script);
    }

    function loadFromCDN() {
        var cdnScript = document.createElement('script');
        cdnScript.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        cdnScript.onload = function() {
            console.log('[LoopeyLive] Socket.IO loaded from CDN.');
            connectSocket();
        };
        cdnScript.onerror = function() {
            console.error('[LoopeyLive] CRITICAL: Failed to load Socket.IO from both server and CDN. Tracking disabled.');
        };
        document.head.appendChild(cdnScript);
    }

    // 3. Connection Logic
    function connectSocket() {
        if (typeof io === 'undefined') {
            console.error('[LoopeyLive] socket.io is undefined even after load attempt.');
            return;
        }

        console.log('[LoopeyLive] Connecting to Socket.IO server at:', SERVER_URL);

        // Options optimized for reliability
        var socketOptions = {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['polling', 'websocket'], // Start with polling (most robust), upgrade to websocket
            path: '/socket.io' // Standard path
        };

        var socket = io(SERVER_URL, socketOptions);

        socket.on('connect', function() {
            console.log('[LoopeyLive] ✅ Connected! Socket ID:', socket.id);
            sendPageView(socket);
        });

        socket.on('connect_error', function(err) {
            console.error('[LoopeyLive] ❌ Connection Error:', err.message);
        });

        socket.on('disconnect', function(reason) {
            console.log('[LoopeyLive] Disconnected:', reason);
        });

        // Setup History API hooks for SPA support
        setupHistoryHooks(socket);
        
        // Heartbeat
        setInterval(function() {
            if (socket.connected) {
                socket.emit('heartbeat');
            }
        }, 5000);
    }

    function getPageData() {
        return {
            siteId: SITE_ID,
            url: window.location.href, // Send full URL including query params
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }

    function sendPageView(socket) {
        if (!socket.connected) return;
        var data = getPageData();
        console.log('[LoopeyLive] Sending page view:', data);
        socket.emit('join', data);
    }

    function setupHistoryHooks(socket) {
        var lastUrl = window.location.href;
        
        function checkUrlChange() {
            var currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                console.log('[LoopeyLive] URL changed (SPA). Sending update.');
                sendPageView(socket);
            }
        }

        var originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            checkUrlChange();
        };

        var originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            checkUrlChange();
        };

        window.addEventListener('popstate', checkUrlChange);
    }

    // Start
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        loadSocketAndConnect();
    } else {
        window.addEventListener('DOMContentLoaded', loadSocketAndConnect);
    }

})();
