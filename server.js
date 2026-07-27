const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

let panel = null;
let clients = {};

console.log(`🚀 Servidor WebSocket rodando na porta ${process.env.PORT || 8080}`);

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`🟢 Nova conexão: ${ip}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Mensagem:', data);

      switch (data.type) {
        case 'register':
          if (data.role === 'panel') {
            panel = ws;
            ws.send(JSON.stringify({ type: 'info', message: 'Painel registrado' }));
            console.log('✅ Painel registrado');
          } else if (data.role === 'app') {
            const deviceId = data.deviceId || 'default';
            clients[deviceId] = ws;
            ws.send(JSON.stringify({ type: 'info', message: 'App registrado' }));
            console.log(`✅ App registrado: ${deviceId}`);
          }
          break;

        case 'command':
          if (panel && panel === ws) {
            const target = data.deviceId || 'default';
            if (clients[target]) {
              clients[target].send(JSON.stringify({
                type: 'vpn_command',
                action: data.action,
                server: data.server || '38.114.120.248',
                port: data.port || '8080'
              }));
              ws.send(JSON.stringify({ type: 'success', message: `Comando enviado para ${target}` }));
            } else {
              ws.send(JSON.stringify({ type: 'error', message: 'App não encontrado' }));
            }
          }
          break;

        case 'status':
          if (clients[data.deviceId] && clients[data.deviceId] === ws) {
            if (panel) {
              panel.send(JSON.stringify({
                type: 'status_update',
                deviceId: data.deviceId,
                status: data.status
              }));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Erro:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Erro interno' }));
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Conexão fechada: ${ip}`);
    if (panel === ws) panel = null;
    for (const [id, client] of Object.entries(clients)) {
      if (client === ws) delete clients[id];
    }
  });
});
