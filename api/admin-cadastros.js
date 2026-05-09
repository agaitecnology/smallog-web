// api/admin-cadastros.js
// GET /api/admin-cadastros — lista todos os cadastros com chave Redis

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const keys = await redis.keys('cadastro:*');

    if (keys.length === 0) {
      return res.status(200).json({ cadastros: [] });
    }

    const pipeline = redis.pipeline();
    keys.forEach(function(key) { pipeline.get(key); });
    const results = await pipeline.exec();

    const cadastros = results
      .map(function(r, i) {
        try {
          var dados = JSON.parse(r[1]);
          dados._key = keys[i]; // inclui a chave Redis para deletar
          return dados;
        } catch(e) { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({ cadastros });
  } catch (e) {
    console.error('Erro ao listar cadastros:', e);
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
