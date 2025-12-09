// routes/api/stocks.js
// Endpoints públicos para datos de mercado (acciones y/o cripto en "tiempo real").

const express = require('express');
const router = express.Router();

const API_KEY = process.env.TWELVE_KEY;
const SYMBOL = 'RYAAY';
const API_URL = `https://api.twelvedata.com/price?symbol=${SYMBOL}&apikey=${API_KEY}`;

// Cache muy corta para no machacar la API externa y aun así dar sensación de tiempo real.
const CACHE_MS = 4000;
const CRYPTO_CACHE_MS = 8000;

const cache = {
    ryanair: { price: null, at: 0 },
    crypto: {} // key `${coinId}:${currency}` -> { price, at }
};

const parsePrice = (value) => {
    const price = parseFloat(value);
    if (!Number.isFinite(price)) throw new Error('invalid_price');
    return price;
};

const simulatePrice = ({ last = null, base = 30000 }) => {
    const seed = last ?? base;
    const jitter = (Math.random() - 0.5) * (seed * 0.002); // ±0.2%
    const next = Math.max(1, +(seed + jitter).toFixed(2));
    return next;
};

router.get('/ryanair', async (_req, res) => {
    const now = Date.now();
    const cached = cache.ryanair;

    // Devuelve cache reciente si la tenemos
    if (cached.price !== null && now - cached.at < CACHE_MS) {
        return res.json({
            ok: true,
            price: cached.price,
            at: cached.at,
            asset: 'stock',
            symbol: SYMBOL,
            currency: 'EUR',
            source: 'cache'
        });
    }

    if (!API_KEY) {
        console.warn('GET /api/stocks/ryanair: falta la variable de entorno TWELVE_KEY');
        if (cached.price !== null) {
            return res.json({
                ok: true,
                price: cached.price,
                at: cached.at,
                asset: 'stock',
                symbol: SYMBOL,
                currency: 'EUR',
                source: 'stale'
            });
        }
        return res.status(500).json({ ok: false, error: 'missing_api_key' });
    }

    try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`status_${response.status}`);
        }

        const payload = await response.json();
        const price = parsePrice(payload?.price);

        cache.ryanair = { price, at: now };
        return res.json({
            ok: true,
            price,
            at: now,
            asset: 'stock',
            symbol: SYMBOL,
            currency: 'EUR',
            source: 'live'
        });
    } catch (err) {
        console.error('GET /api/stocks/ryanair error', err);
        if (cached.price !== null) {
            return res.json({
                ok: true,
                price: cached.price,
                at: cached.at,
                asset: 'stock',
                symbol: SYMBOL,
                currency: 'EUR',
                source: 'stale'
            });
        }
        // Fallback: simulación para entornos sin red
        const simulated = simulatePrice({ base: 20 });
        cache.ryanair = { price: simulated, at: now };
        return res.json({
            ok: true,
            price: simulated,
            at: now,
            asset: 'stock',
            symbol: SYMBOL,
            currency: 'EUR',
            source: 'simulated'
        });
    }
});

// Nueva ruta cripto (24/7) para cumplir requisito de "dato en tiempo real" aunque la bolsa esté cerrada.
async function handleCrypto(req, res) {
    const now = Date.now();
    const coinId = (req.params.coinId || 'bitcoin').toLowerCase();
    const currency = (req.query.currency || 'eur').toLowerCase();
    const cacheKey = `${coinId}:${currency}`;
    const cached = cache.crypto[cacheKey] || null;

    if (cached && cached.price !== null && now - cached.at < CRYPTO_CACHE_MS) {
        return res.json({
            ok: true,
            price: cached.price,
            at: cached.at,
            asset: 'crypto',
            symbol: coinId,
            currency,
            source: 'cache'
        });
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${encodeURIComponent(currency)}&precision=3`;

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { accept: 'application/json' }
        });

        if (!response.ok) throw new Error(`status_${response.status}`);

        const payload = await response.json();
        const price = parsePrice(payload?.[coinId]?.[currency]);

        cache.crypto[cacheKey] = { price, at: now };

        return res.json({
            ok: true,
            price,
            at: now,
            asset: 'crypto',
            symbol: coinId,
            currency,
            source: 'live'
        });
    } catch (err) {
        console.error(`GET /api/stocks/crypto/${coinId} error`, err);

        if (cached && cached.price !== null) {
            return res.json({
                ok: true,
                price: cached.price,
                at: cached.at,
                asset: 'crypto',
                symbol: coinId,
                currency,
                source: 'stale'
            });
        }

        // Fallback: simulación para entornos sin red
        const simulated = simulatePrice({ last: cached?.price, base: 30000 });
        cache.crypto[cacheKey] = { price: simulated, at: now };
        return res.json({
            ok: true,
            price: simulated,
            at: now,
            asset: 'crypto',
            symbol: coinId,
            currency,
            source: 'simulated'
        });
    }
}

// Express 5 con path-to-regexp nuevo no admite el sufijo "?" en el path,
// así que exponemos dos rutas: con y sin coinId.
router.get('/crypto', handleCrypto);
router.get('/crypto/:coinId', handleCrypto);

module.exports = router;
