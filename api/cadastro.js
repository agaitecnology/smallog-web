// api/cadastro.js
// POST /api/cadastro — salva interesse de beta e notifica por e-mail

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const { nome, email, telefone, cidade } = req.body;

    if (!nome || !email || !cidade) {
      return res.status(400).json({ erro: 'Nome, e-mail e cidade são obrigatórios' });
    }

    // Salva no Redis com TTL de 90 dias
    const id = Date.now().toString();
    const dados = JSON.stringify({ nome, email, telefone: telefone || '', cidade, data: new Date().toISOString() });
    await redis.setex(`cadastro:${id}`, 90 * 24 * 60 * 60, dados);

    // Envia e-mail via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SmalLog <suporte@smallog.app>',
        to: ['suporte@smallog.app'],
        subject: `🚀 Novo interesse no beta — ${nome}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#00BCD4">Novo cadastro no Beta SmalLog</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;font-weight:600">Nome</td><td style="padding:8px">${nome}</td></tr>
              <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:600">E-mail</td><td style="padding:8px">${email}</td></tr>
              <tr><td style="padding:8px;font-weight:600">Telefone</td><td style="padding:8px">${telefone || '—'}</td></tr>
              <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:600">Cidade</td><td style="padding:8px">${cidade}</td></tr>
              <tr><td style="padding:8px;font-weight:600">Data</td><td style="padding:8px">${new Date().toLocaleString('pt-BR')}</td></tr>
            </table>
            <p style="color:#888;font-size:12px;margin-top:24px">Enviado automaticamente pelo SmalLog.app</p>
          </div>
        `,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro no cadastro:', e);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
