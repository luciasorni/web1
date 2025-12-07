// data/socialStore/db.js
// Operaciones de amistad / solicitudes persistidas en SQLite.

const { randomUUID } = require('crypto');
const knex = require('../../db/knex');
const { findUserById, findUsersByIds } = require('../usersStore/db');

const sortPair = (a, b) => (a < b ? [a, b] : [b, a]);

async function areFriends(userA, userB) {
    const [a, b] = sortPair(userA, userB);
    const row = await knex('friendships')
        .where({ user_id_a: a, user_id_b: b })
        .first();
    return !!row;
}

async function listFriendships(userId) {
    const rows = await knex('friendships')
        .where({ user_id_a: userId })
        .orWhere({ user_id_b: userId });

    const friendIds = rows.map(r => (r.user_id_a === userId ? r.user_id_b : r.user_id_a));
    if (!friendIds.length) return [];

    const users = await findUsersByIds(friendIds);
    const byId = new Map(users.map(u => [u.id, u]));

    return friendIds
        .map(id => byId.get(id))
        .filter(Boolean);
}

async function listIncomingRequests(userId) {
    const rows = await knex('friend_requests')
        .where({ to_user_id: userId, status: 'pending' })
        .orderBy('created_at', 'desc');

    const senderIds = rows.map(r => r.from_user_id);
    const senders = await findUsersByIds(senderIds);
    const senderById = new Map(senders.map(u => [u.id, u]));

    return rows.map(r => ({
        id: r.id,
        fromUser: senderById.get(r.from_user_id) || { id: r.from_user_id, username: 'Desconocido' },
        createdAt: r.created_at
    }));
}

async function listOutgoingRequests(userId) {
    const rows = await knex('friend_requests')
        .where({ from_user_id: userId, status: 'pending' })
        .orderBy('created_at', 'desc');

    return rows.map(r => ({
        id: r.id,
        toUserId: r.to_user_id,
        createdAt: r.created_at
    }));
}

async function sendRequest({ fromUserId, toUserId }) {
    if (!fromUserId || !toUserId) throw Object.assign(new Error('missing_user'), { code: 'MISSING_USER' });
    if (fromUserId === toUserId) throw Object.assign(new Error('self_request'), { code: 'SELF_REQUEST' });

    const target = await findUserById(toUserId);
    if (!target) throw Object.assign(new Error('not_found'), { code: 'TARGET_NOT_FOUND' });

    if (await areFriends(fromUserId, toUserId)) {
        throw Object.assign(new Error('already_friends'), { code: 'ALREADY_FRIENDS' });
    }

    const existing = await knex('friend_requests')
        .where(builder => {
            builder.where({ from_user_id: fromUserId, to_user_id: toUserId })
                   .orWhere({ from_user_id: toUserId, to_user_id: fromUserId });
        })
        .andWhere({ status: 'pending' })
        .first();

    if (existing) {
        throw Object.assign(new Error('pending_exists'), { code: 'PENDING_EXISTS' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await knex('friend_requests').insert({
        id,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending',
        created_at: now
    });

    return { id, toUser: target };
}

async function respondRequest({ requestId, userId, action }) {
    const reqRow = await knex('friend_requests').where({ id: requestId }).first();
    if (!reqRow) throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' });
    if (reqRow.to_user_id !== userId) throw Object.assign(new Error('forbidden'), { code: 'FORBIDDEN' });
    if (reqRow.status !== 'pending') throw Object.assign(new Error('already_resolved'), { code: 'ALREADY_RESOLVED' });

    const status = action === 'accept' ? 'accepted' : 'declined';
    const now = new Date().toISOString();

    await knex.transaction(async trx => {
        await trx('friend_requests')
            .where({ id: requestId })
            .update({ status, responded_at: now });

        if (action === 'accept') {
            const [a, b] = sortPair(reqRow.from_user_id, reqRow.to_user_id);
            const existingFriend = await trx('friendships')
                .where({ user_id_a: a, user_id_b: b })
                .first();
            if (!existingFriend) {
                await trx('friendships').insert({
                    id: randomUUID(),
                    user_id_a: a,
                    user_id_b: b,
                    created_at: now
                });
            }
        }
    });

    return { fromUserId: reqRow.from_user_id, status };
}

async function getSocialState(userId) {
    const [friends, requests] = await Promise.all([
        listFriendships(userId),
        listIncomingRequests(userId)
    ]);

    return {
        friends,
        requests
    };
}

module.exports = {
    areFriends,
    listFriendships,
    listIncomingRequests,
    listOutgoingRequests,
    sendRequest,
    respondRequest,
    getSocialState,
};
