# Checklist Técnico: LoopeyLive - Monitoramento em Tempo Real

## 1. Arquitetura Geral
- [ ] **Frontend (Dashboard)**: React + Vite para visualização dos dados em tempo real.
- [ ] **Frontend (Tracker)**: Script JavaScript leve (`tracker.js`) para ser embutido nos sites clientes.
- [ ] **Backend**: Node.js + Express + Socket.io para gerenciar conexões WebSocket e API REST.
- [ ] **Banco de Dados (Simulado/MVP)**: Armazenamento em memória (variáveis globais/Map) para usuários ativos e persistência simples em JSON (opcional).
- [ ] **Comunicação**: WebSockets (Socket.io) para eventos em tempo real (heartbeat, pageview).

## 2. Coleta de Dados (Tracker - Client Side)
- [ ] Criar `tracker.js` que inicializa conexão Socket.io.
- [ ] Capturar evento de `page_view` ao carregar a página (URL, Referrer, User Agent).
- [ ] Implementar `heartbeat` (pulso) a cada X segundos (ex: 5s) para indicar presença.
- [ ] Detectar fechamento de aba/navegador (`beforeunload`) para desconexão imediata (best effort).
- [ ] Gerar ou recuperar ID único de sessão (via localStorage ou cookie).

## 3. Backend (Processamento e Consolidação)
- [ ] Configurar servidor HTTP (Express) e WebSocket (Socket.io).
- [ ] **Gerenciamento de Sessões Ativas**:
    - [ ] Manter um Map `socketId -> { userId, url, lastHeartbeat, startTime }`.
    - [ ] Endpoint/Evento `join`: Registrar novo usuário/aba.
    - [ ] Endpoint/Evento `heartbeat`: Atualizar timestamp do último pulso.
    - [ ] Endpoint/Evento `disconnect`: Remover usuário da lista de ativos.
    - [ ] Job periódico (cron/interval) para limpar sessões "zumbis" (sem heartbeat há > 10s).
- [ ] **Agregação de Dados**:
    - [ ] Contagem total de usuários online.
    - [ ] Agrupamento por URL (páginas mais acessadas).
    - [ ] Cálculo de tempo médio de permanência (timestamp atual - startTime).

## 4. Frontend Dashboard (Visualização)
- [ ] Criar projeto React com Vite.
- [ ] Conectar ao Socket.io do backend.
- [ ] Escutar evento `stats_update` (emitido pelo backend periodicamente ou em mudanças).
- [ ] **Componentes de UI**:
    - [ ] **Card "Online Agora"**: Número grande em destaque.
    - [ ] **Tabela "Páginas Ativas"**: Lista de URLs com contagem de usuários em cada uma.
    - [ ] **Gráfico/Lista "Origem"**: Referrers (opcional).
    - [ ] **Indicador de Status**: "Conectado ao servidor".

## 5. Estrutura de Dados (Modelo)
### Evento de Entrada (`join` / `page_view`)
```json
{
  "url": "/produto/123",
  "referrer": "google.com",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "uuid-v4"
}
```

### Estado Global (Backend)
```javascript
const activeSessions = new Map(); // socketId -> UserData
// UserData: { url, referrer, joinedAt, lastSeen }
```

### Evento de Atualização para Dashboard (`stats_update`)
```json
{
  "totalOnline": 42,
  "topPages": [
    { "url": "/home", "count": 20 },
    { "url": "/checkout", "count": 5 }
  ],
  "averageDuration": 120 // segundos
}
```

## 6. Infraestrutura e Deploy (Local)
- [ ] Scripts `npm run dev` para iniciar backend e frontend simultaneamente (ou terminais separados).
- [ ] Porta 3000 para Frontend Dashboard.
- [ ] Porta 3001 para Backend API/Socket.
- [ ] Porta 8080 (exemplo) para site cliente simulado (teste do tracker).
