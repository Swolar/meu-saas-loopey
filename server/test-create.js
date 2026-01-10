const http = require('http');

const data = JSON.stringify({
  name: 'Test Site',
  domain: 'test.com'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/sites',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
