FROM node:20-alpine

# Set working directory to project root
WORKDIR /app

# --- CLIENT BUILD ---
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- TRACKER SETUP ---
WORKDIR /app/tracker
COPY tracker/ ./

# --- SERVER SETUP ---
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./

# Environment variables should be passed at runtime by Coolify
ENV PORT=3001
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
