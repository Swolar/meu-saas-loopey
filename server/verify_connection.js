const io = require('socket.io-client');
const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const SITE_ID = 'verify-test-site';

console.log('--- Starting Verification ---');

// 1. Verify script.js is served
console.log('1. Checking /script.js availability...');
http.get(SERVER_URL + '/script.js', (res) => {
    if (res.statusCode === 200) {
        console.log('✅ /script.js is accessible (Status: 200)');
    } else {
        console.error('❌ /script.js returned status:', res.statusCode);
        process.exit(1);
    }
}).on('error', (e) => {
    console.error('❌ Error fetching /script.js:', e.message);
    process.exit(1);
});

// 2. Verify Socket Connection
console.log('2. Testing Socket.IO connection...');
const socket = io(SERVER_URL, {
    transports: ['polling', 'websocket'], // same as tracker
    path: '/socket.io'
});

socket.on('connect', () => {
    console.log('✅ Socket connected! ID:', socket.id);
    
    // Simulate join
    console.log('3. Sending join event...');
    socket.emit('join', {
        siteId: SITE_ID,
        url: 'http://localhost/test',
        referrer: '',
        userAgent: 'VerificationScript/1.0'
    });
});

// Listen for stats update (server broadcasts stats on join)
// Note: The server broadcasts to `dashboard_${siteId}_minutes` etc.
// But we are not joining the dashboard room here, we are just a tracker client.
// However, the tracker logic doesn't send anything back to the tracker client except implicit ack.
// We can check if we stay connected.

setTimeout(() => {
    if (socket.connected) {
        console.log('✅ Socket remained connected for 3 seconds.');
        console.log('--- Verification Passed ---');
        socket.disconnect();
        process.exit(0);
    } else {
        console.error('❌ Socket disconnected unexpectedly.');
        process.exit(1);
    }
}, 3000);

socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
    process.exit(1);
});
