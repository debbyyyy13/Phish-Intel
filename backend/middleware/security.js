const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5 // limit auth attempts
});

module.exports = {
    limiter,
    authLimiter,
    helmet: helmet(),
    mongoSanitize: mongoSanitize(),
    xssClean: xss()
};