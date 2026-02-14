/**
 * Logger Service — writes structured logs to MongoDB
 * Used throughout the backend to record important events.
 */
const ServerLog = require('../models/ServerLog');

const logger = {
    /**
     * Write a log entry
     * @param {'info'|'warn'|'error'|'debug'} level
     * @param {'auth'|'api'|'system'|'database'|'email'|'ai'|'admin'} source
     * @param {string} message
     * @param {object} [options]
     * @param {object} [options.details]  Extra data
     * @param {string} [options.userId]   Associated user
     * @param {string} [options.ip]       Client IP
     */
    async log(level, source, message, options = {}) {
        try {
            await ServerLog.create({
                level,
                source,
                message,
                details: options.details || null,
                userId: options.userId || null,
                ip: options.ip || null
            });
        } catch (err) {
            // Fallback to console if DB write fails — never throw
            console.error('[Logger fallback]', level, source, message, err.message);
        }
    },

    info(source, message, opts) { return this.log('info', source, message, opts); },
    warn(source, message, opts) { return this.log('warn', source, message, opts); },
    error(source, message, opts) { return this.log('error', source, message, opts); },
    debug(source, message, opts) { return this.log('debug', source, message, opts); },
};

module.exports = logger;
