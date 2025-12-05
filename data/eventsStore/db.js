// data/eventsStore/db.js

const { randomUUID } = require('crypto');
const knex = require('../../db/knex');

function mapRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        boostPercent: row.boost_percent,
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function listEvents() {
    const rows = await knex('events')
        .orderBy('start_at', 'desc');
    return rows.map(mapRow);
}

async function getActiveEvents({ now = new Date() } = {}) {
    const rows = await knex('events')
        .where({ status: 'active' })
        .andWhere('start_at', '<=', now.toISOString())
        .andWhere('end_at', '>=', now.toISOString())
        .orderBy('start_at', 'desc');
    return rows.map(mapRow);
}

async function createEvent({ name, description, boostPercent = 0, startAt, endAt, status = 'active' }) {
    const id = randomUUID();
    const now = new Date().toISOString();

    await knex('events').insert({
        id,
        name,
        description,
        boost_percent: boostPercent,
        start_at: startAt,
        end_at: endAt,
        status,
        created_at: now,
        updated_at: now
    });

    return mapRow({
        id, name, description, boost_percent: boostPercent, start_at: startAt, end_at: endAt, status, created_at: now, updated_at: now
    });
}

async function updateEvent(id, payload) {
    if (!id) return null;
    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.boostPercent !== undefined) data.boost_percent = payload.boostPercent;
    if (payload.startAt !== undefined) data.start_at = payload.startAt;
    if (payload.endAt !== undefined) data.end_at = payload.endAt;
    if (payload.status !== undefined) data.status = payload.status;

    if (!Object.keys(data).length) return null;

    data.updated_at = new Date().toISOString();

    const updated = await knex('events')
        .where({ id })
        .update(data)
        .returning('*');

    const row = Array.isArray(updated) ? updated[0] : null;
    return mapRow(row);
}

async function deleteEvent(id) {
    if (!id) return false;
    const deleted = await knex('events').where({ id }).del();
    return deleted > 0;
}

module.exports = {
    listEvents,
    getActiveEvents,
    createEvent,
    updateEvent,
    deleteEvent
};
