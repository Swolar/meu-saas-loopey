(function() {
    // LoopeyLive Tracker - v1.2.0 (Clean & Robust)

    // 1. Determine Server URL
    var SERVER_URL = 'http://localhost:3001';
    var scriptTag = document.currentScript || document.querySelector('script[src*="tracker.js"]');

    if (scriptTag) {
        try {
            var src = scriptTag.src;
            if (src && src.indexOf('http') === 0) {
                var urlObj = new URL(src);
                SERVER_URL = urlObj.origin;
            }
        } catch (e) {
            console.warn('[LoopeyLive] URL detection failed, using default.');
        }
    }

    // Force production URL if running on a domain but script detected localhost (proxy/forwarding edge case)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (SERVER_URL.indexOf('localhost') !== -1) {
             SERVER_URL = 'https://loopeyviews.pro';
        }
    }

    console.log('[LoopeyLive] Initializing. Server:', SERVER_URL);

    // 2. Load Socket.IO
    function loadSocketIO(callback) {
        if (typeof io !== 'undefined') {
            callback();
            return;
        }

        console.log('[LoopeyLive] Loading Socket.IO...');
        var script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = function() {
            console.log('[LoopeyLive] Socket.IO loaded successfully');
            callback();
        };
        script.onerror = function() {
            console.error('[LoopeyLive] Failed to load Socket.IO from CDN');
        };
        document.head.appendChild(script);
    }

    // 3. Start Tracking
    function startTracking() {
        var siteId = 'default';
        if (scriptTag) {
            siteId = scriptTag.getAttribute('data-site-id') || 'default';
        } else if (window.LOOPEY_SITE_ID) {
            siteId = window.LOOPEY_SITE_ID;
        }

        if (siteId === 'default') {
            console.warn('[LoopeyLive] No site ID provided. Add data-site-id="..." to script tag.');
        }

        console.log('[LoopeyLive] Site ID:', siteId);

        var socket = io(SERVER_URL, {
            reconnection: true,
            transports: ['websocket', 'polling']
        });

        function getPageData() {
            return {
                siteId: siteId,
                url: window.location.pathname + window.location.search,
                referrer: document.referrer,
                userAgent: navigator.userAgent
            };
        }

        socket.on('connect', function() {
            console.log('[LoopeyLive] Connected via', socket.io.engine.transport.name);
            socket.emit('join', getPageData());
        });

        socket.on('disconnect', function(reason) {
            console.log('[LoopeyLive] Disconnected:', reason);
        });

        socket.on('connect_error', function(error) {
            console.error('[LoopeyLive] Connection error:', error);
        });

        // Heartbeat
        setInterval(function() {
            if (socket.connected) {
                socket.emit('heartbeat');
            }
        }, 5000);

        // History API Support (SPA)
        var lastUrl = window.location.href;
        function checkUrlChange() {
            var currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                socket.emit('page_view', getPageData());
            }
        }

        var originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            checkUrlChange();
        };
        window.addEventListener('popstate', checkUrlChange);
    }

    // Boot
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        loadSocketIO(startTracking);
    } else {
        window.addEventListener('DOMContentLoaded', function() {
            loadSocketIO(startTracking);
        });
    }

})();
