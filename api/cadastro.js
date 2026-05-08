// api/cadastro.js
// POST /api/cadastro — salva cadastro no Redis e envia dois e-mails:
// 1. Notificação para suporte@smallog.app
// 2. Boas-vindas automático para o cadastrado

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

    const primeiroNome = nome.split(' ')[0];

    // Salva no Redis com TTL de 90 dias
    const id = Date.now().toString();
    const dados = JSON.stringify({
      nome, email, telefone: telefone || '', cidade,
      data: new Date().toISOString()
    });
    await redis.setex(`cadastro:${id}`, 90 * 24 * 60 * 60, dados);

    // ── E-mail 1 — Notificação para o suporte ──────────────
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

    // ── E-mail 2 — Boas-vindas para o cadastrado ───────────
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SmalLog <suporte@smallog.app>',
        to: [email],
        subject: `📦 Acesso ao SmalLog Beta — Bem-vindo, ${primeiroNome}!`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#333">
            <div style="background:#0D1117;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="color:#00BCD4;font-size:24px;margin:0">📦 SmalLog</h1>
              <p style="color:#8B949E;font-size:13px;margin:8px 0 0">Logística Inteligente para a Última Milha</p>
            </div>
            <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;border:1px solid #eee">
              <h2 style="font-size:20px;margin:0 0 16px">Olá, ${primeiroNome}!</h2>
              <p style="line-height:1.6;margin:0 0 16px">
                Obrigado pelo interesse em participar dos testes do <strong>SmalLog Beta</strong>. 🚚
              </p>
              <p style="line-height:1.6;margin:0 0 24px">
                Seu cadastro foi recebido com sucesso. Para baixar e instalar o app, toque no botão abaixo:
              </p>
              <div style="text-align:center;margin:0 0 24px">
                <a href="https://www.smallog.app/download"
                   style="display:inline-block;background:#00BCD4;color:#fff;padding:14px 32px;
                          border-radius:12px;font-size:16px;font-weight:700;text-decoration:none">
                  📲 Baixar SmalLog Beta
                </a>
              </div>
              <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:0 0 24px">
                <p style="font-weight:700;margin:0 0 10px">🎯 O que observar durante o uso:</p>
                <ul style="margin:0;padding-left:20px;line-height:1.8;color:#555">
                  <li>Captura por foto da etiqueta</li>
                  <li>Leitura automática do endereço</li>
                  <li>Organização das entregas do dia</li>
                  <li>Facilidade no fluxo de uso</li>
                  <li>Possíveis erros ou dificuldades</li>
                </ul>
              </div>
              <p style="line-height:1.6;margin:0 0 16px;color:#555">
                Se encontrar qualquer problema ou tiver sugestões, responda este e-mail ou envie mensagem diretamente.
              </p>
              <p style="line-height:1.6;margin:0">
                Obrigado por fazer parte dessa construção. 🙏
              </p>
              <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee">
                <p style="margin:0;font-weight:600">Pedro Cezar Aguera</p>
                <p style="margin:4px 0 0;color:#888;font-size:13px">
                  Criador do SmalLog · <a href="https://www.smallog.app" style="color:#00BCD4">smallog.app</a>
                </p>
              </div>
            </div>
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
