// utils/realtime.js
// Estado compartido para eventos en tiempo real (Socket.IO).

let ioInstance = null;
const onlineUsers = new Map(); // userId -> conexiones abiertas

const userRoom = (userId) => `user:${userId}`;

function attachIo(io) {
    ioInstance = io;
}

function emitToUser(userId, event, payload) {
    if (!ioInstance) return;
    ioInstance.to(userRoom(userId)).emit(event, payload);
}

function userConnected(userId) {
    const current = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, current + 1);
}

function userDisconnected(userId) {
    const current = onlineUsers.get(userId) || 0;
    if (current <= 1) onlineUsers.delete(userId);
    else onlineUsers.set(userId, current - 1);
}

function isUserOnline(userId) {
    return onlineUsers.has(userId);
}

function onlineCount(ids = []) {
    if (!ids.length) return onlineUsers.size;
    return ids.filter(id => onlineUsers.has(id)).length;
}

module.exports = {
    attachIo,
    emitToUser,
    userConnected,
    userDisconnected,
    isUserOnline,
    onlineCount,
    userRoom,
};
