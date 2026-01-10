const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server!');
  
  socket.emit('join', {
    siteId: 'demo-site',
    url: '/test-page',
    referrer: 'direct',
    userAgent: 'Node Test Script'
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

setTimeout(() => {
  console.log('Test finished, exiting...');
  socket.close();
}, 3000);
