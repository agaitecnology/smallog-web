// api/admin-deletar.js
// DELETE /api/admin-deletar?key=cadastro:123456

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ erro: 'Método não permitido' });

  try {
    const { key } = req.query;
    if (!key || !key.startsWith('cadastro:')) {
      return res.status(400).json({ erro: 'Chave inválida' });
    }
    await redis.del(key);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao deletar:', e);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
