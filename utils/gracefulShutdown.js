// utils/gracefulShutdown.js
// Cierre ordenado del servidor HTTP + salida controlada del proceso.
module.exports = function attachGracefulShutdown(server, { timeoutMs = 8000 } = {}) {
    const shutdown = (signal) => {
        console.log(`\n[${signal}] Recibido. Cerrando servidor ordenadamente...`);
        server.close((err) => {
            if (err) {
                console.error('Error cerrando el servidor:', err);
                process.exit(1);
            }
            console.log('Servidor cerrado. Bye.');
            process.exit(0);
        });
        setTimeout(() => {
            console.warn('Forzando cierre por timeout...');
            process.exit(1);
        }, timeoutMs).unref();
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};
