// api/coletas.js
// POST /api/coletas — salva entregas no Redis, retorna ID curto
// GET /api/coletas?id=ABC123 — busca entregas por ID

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

function gerarId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { entregas } = req.body;

      if (!entregas || !Array.isArray(entregas) || entregas.length === 0) {
        return res.status(400).json({ erro: 'Lista de entregas inválida' });
      }

      let id = gerarId();
      let tentativas = 0;
      while (await redis.exists(`coleta:${id}`) && tentativas < 5) {
        id = gerarId();
        tentativas++;
      }

      const dados = JSON.stringify(entregas);
      await redis.setex(`coleta:${id}`, 48 * 60 * 60, dados);

      return res.status(200).json({ id });
    } catch (e) {
      console.error('Erro ao salvar coleta:', e);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ erro: 'ID obrigatório' });
      }

      const dados = await redis.get(`coleta:${id}`);

      if (!dados) {
        return res.status(404).json({ erro: 'Link expirado ou inválido' });
      }

      const entregas = JSON.parse(dados);
      return res.status(200).json({ entregas });
    } catch (e) {
      console.error('Erro ao buscar coleta:', e);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}
