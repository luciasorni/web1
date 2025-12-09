// routes/api/stocks.js
// Endpoints públicos para datos de mercado (p.ej. cotización de Ryanair).

const express = require('express');
const router = express.Router();

const API_KEY = process.env.TWELVE_KEY;
const SYMBOL = 'RYAAY';
const API_URL = `https://api.twelvedata.com/price?symbol=${SYMBOL}&apikey=${API_KEY}`;

// Cache muy corta para no machacar la API externa y aun así dar sensación de tiempo real.
let lastPrice = null;
let lastUpdated = 0;
const CACHE_MS = 4000;

router.get('/ryanair', async (_req, res) => {
    const now = Date.now();

    // Devuelve cache reciente si la tenemos
    if (lastPrice !== null && now - lastUpdated < CACHE_MS) {
        return res.json({ ok: true, price: lastPrice, at: lastUpdated, source: 'cache' });
    }

    if (!API_KEY) {
        console.warn('GET /api/stocks/ryanair: falta la variable de entorno TWELVE_KEY');
        if (lastPrice !== null) {
            return res.json({ ok: true, price: lastPrice, at: lastUpdated, source: 'stale' });
        }
        return res.status(500).json({ ok: false, error: 'missing_api_key' });
    }

    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`status_${response.status}`);
        }

        const payload = await response.json();
        const price = parseFloat(payload?.price);
        if (!Number.isFinite(price)) {
            throw new Error('invalid_price');
        }

        lastPrice = price;
        lastUpdated = now;
        return res.json({ ok: true, price, at: now, source: 'live' });
    } catch (err) {
        console.error('GET /api/stocks/ryanair error', err);
        if (lastPrice !== null) {
            return res.json({ ok: true, price: lastPrice, at: lastUpdated, source: 'stale' });
        }
        return res.status(502).json({ ok: false, error: 'fetch_failed' });
    }
});

module.exports = router;
