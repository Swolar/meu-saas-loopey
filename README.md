# LoopeyLive - Real-Time Monitoring System

This project is a real-time visitor monitoring system consisting of a backend server, a frontend dashboard, and a tracker script.

## Project Structure

- **server/**: Node.js + Express + Socket.io backend.
- **client/**: React + Vite frontend dashboard.
- **tracker/**: Standalone JavaScript tracker for client websites.

## How to Run

### 1. Backend Server
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:3001`.

### 2. Frontend Dashboard
Navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
npm run dev
```
The dashboard will start on `http://localhost:3000`.

### 3. Testing the Tracker
To test the tracking, you can include the `tracker/tracker.js` script in any HTML file.

Example `test.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="./tracker/tracker.js"></script>
</head>
<body>
    <h1>Welcome to the Test Page</h1>
    <p>This page is being monitored.</p>
</body>
</html>
```
Open this HTML file in your browser, and you should see the "Active Users" count increase on the dashboard.
