import {createHash} from 'node:crypto';
import {loadPreferences, currentPreferences, seedPreferences, changePreferences} from './preferences.mjs';

const guid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frame(opcode, payload) {
  const length = payload.length;
  const head = Buffer.alloc(length < 126 ? 2 : length < 65536 ? 4 : 10);
  head[0] = 0x80 | opcode;
  if (length < 126) head[1] = length;
  else if (length < 65536) { head[1] = 126; head.writeUInt16BE(length, 2); }
  else { head[1] = 127; head.writeBigUInt64BE(BigInt(length), 2); }
  return Buffer.concat([head, payload]);
}

class LiveSocket {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.fragments = [];
    this.alive = true;
    socket.on('data', (chunk) => this.#data(chunk));
    socket.on('close', () => { this.alive = false; this.onclose?.(); });
    socket.on('error', () => socket.destroy());
  }
  push(chunk) { if (chunk?.length) this.#data(chunk); }
  send(text) {
    if (this.alive) this.socket.write(frame(1, Buffer.from(text)));
  }
  close() {
    if (!this.alive) return;
    this.alive = false;
    try { this.socket.write(frame(8, Buffer.alloc(0))); } catch {}
    this.socket.destroy();
  }
  #data(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > 100000) { this.close(); return; }
    while (this.#frame()) {}
  }
  #frame() {
    const buf = this.buffer;
    if (buf.length < 2) return false;
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let length = buf[1] & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (buf.length < 4) return false;
      length = buf.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (buf.length < 10) return false;
      const big = buf.readBigUInt64BE(2);
      if (big > 100000n) { this.close(); return false; }
      length = Number(big);
      offset = 10;
    }
    if (buf.length < offset + (masked ? 4 : 0) + length) return false;
    const mask = masked ? buf.subarray(offset, offset + 4) : null;
    if (masked) offset += 4;
    const payload = Buffer.from(buf.subarray(offset, offset + length));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    this.buffer = buf.subarray(offset + length);
    if (opcode === 8) { this.close(); return false; }
    if (opcode === 9) { if (this.alive) this.socket.write(frame(10, payload)); return true; }
    if (opcode === 1 || opcode === 0) {
      if (opcode === 1) this.fragments = [];
      this.fragments.push(payload);
      if (fin) {
        const text = Buffer.concat(this.fragments).toString('utf8');
        this.fragments = [];
        this.onmessage?.(text);
      }
    }
    return true;
  }
}

export function attachLive(server, {token, origin, port}) {
  const sockets = new Set();
  const ready = loadPreferences();
  const sendAll = (preferences) => {
    const text = JSON.stringify({type: 'preferences', preferences});
    for (const socket of sockets) socket.send(text);
  };
  server.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, origin); } catch { socket.destroy(); return; }
    const header = String(req.headers.connection || '');
    if (req.headers.host !== `127.0.0.1:${port}` || url.pathname !== '/api/live' || url.searchParams.get('token') !== token || String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || !header.toLowerCase().includes('upgrade') || !req.headers['sec-websocket-key']) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + guid).digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    const live = new LiveSocket(socket);
    sockets.add(live);
    live.onclose = () => sockets.delete(live);
    live.onmessage = (text) => {
      let message;
      try { message = JSON.parse(text); } catch { return; }
      const run = message?.type === 'seed' ? seedPreferences(message.preferences) : message?.type === 'patch' ? changePreferences(message.patch) : null;
      if (run) run.then(sendAll).catch(() => {});
    };
    live.push(head);
    ready.then(() => currentPreferences()).then((preferences) => { if (live.alive) live.send(JSON.stringify({type: 'preferences', preferences})); }).catch(() => live.close());
  });
  return {close() { for (const socket of sockets) socket.close(); sockets.clear(); }};
}
