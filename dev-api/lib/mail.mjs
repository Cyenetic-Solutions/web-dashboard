// Plain SMTP client for local development (Mailpit). No TLS: it refuses any host that is not loopback or a compose service.
import net from 'node:net';
import { randomUUID } from 'node:crypto';

const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'mailpit']);

/** Sends one plain-text email. Throws when the SMTP server is unreachable or rejects the message. */
export async function sendMail({ host, port, from }, { to, subject, text }) {
  if (!localHosts.has(host)) throw new Error(`Refusing to send unencrypted mail to non-local SMTP host ${host}`);
  const socket = net.createConnection({ host, port });
  socket.setTimeout(10_000);
  let buffer = '';
  const waiters = [];
  const fail = (error) => { while (waiters.length) waiters.shift().reject(error); };
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    // A reply is complete when a line has a space after the 3-digit code ("250 OK"); "250-..." lines continue.
    let match;
    while ((match = /^(\d{3}) .*\r?\n/m.exec(buffer))) {
      const end = match.index + match[0].length;
      const reply = buffer.slice(0, end); buffer = buffer.slice(end);
      waiters.shift()?.resolve({ code: Number(match[1]), reply });
    }
  });
  socket.on('error', fail);
  socket.on('timeout', () => { fail(new Error('SMTP timeout')); socket.destroy(); });
  const expect = (codes) => new Promise((resolve, reject) => waiters.push({ resolve: ({ code, reply }) => (codes.includes(code) ? resolve(reply) : reject(new Error(`SMTP ${reply.trim()}`))), reject }));
  const command = (line, codes) => { const wait = expect(codes); socket.write(`${line}\r\n`); return wait; };
  try {
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
    await expect([220]);
    await command('EHLO cyenetic-dev-api', [250]);
    await command(`MAIL FROM:<${from}>`, [250]);
    await command(`RCPT TO:<${to}>`, [250, 251]);
    await command('DATA', [354]);
    const headers = [`From: Cyenetic Admin <${from}>`, `To: <${to}>`, `Subject: ${subject}`, `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${randomUUID()}@cyenetic.local>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit'];
    // Dot-stuff lines that start with "." as RFC 5321 requires.
    const body = text.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    await command(`${headers.join('\r\n')}\r\n\r\n${body}\r\n.`, [250]);
    await command('QUIT', [221]).catch(() => undefined);
  } finally {
    socket.end();
  }
}
