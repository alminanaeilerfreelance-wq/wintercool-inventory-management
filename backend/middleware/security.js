const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const REGEX_QUERY_KEYS = ['search', 'status'];
const MAX_QUERY_VALUE_LENGTH = 120;

const escapeRegexLiteral = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeRegexQueryValue = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim().slice(0, MAX_QUERY_VALUE_LENGTH);

  // Keep numeric searches numeric so report filters can still compare numbers.
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  return escapeRegexLiteral(trimmed);
};

const sanitizeRegexQueryValues = (req, res, next) => {
  for (const key of REGEX_QUERY_KEYS) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = normalizeRegexQueryValue(req.query[key]);
    }
  }
  next();
};

module.exports = function applySecurityMiddleware(app, { stage = 'all' } = {}) {
  const applyPreBody = stage === 'all' || stage === 'preBody';
  const applyPostBody = stage === 'all' || stage === 'postBody';

  if (!applyPreBody && !applyPostBody) return;

  if (applyPreBody) {
    app.set('trust proxy', 1);

  // 1. Helmet — sets 15+ HTTP security headers
    app.use(helmet({
      contentSecurityPolicy: false, // disabled so frontend can load
      crossOriginEmbedderPolicy: false,
    }));

  // 2. Global rate limiter — 300 req/15min per IP (DDoS protection)
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: { message: 'Too many requests from this IP, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    }));

  // 3. Auth rate limiter — 20 attempts/15min per IP (safety net; real 5-attempt lockout is in login route)
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);

    const heavyOperationLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { message: 'Too many heavy requests from this IP, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use('/api/backup', heavyOperationLimiter);
    app.use('/api/reports/export', heavyOperationLimiter);
  }

  if (applyPostBody) {

  // 4. NoSQL injection prevention — sanitizes req.body, req.query, req.params
    app.use(mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`[SECURITY] NoSQL injection attempt blocked on key: ${key} - IP: ${req.ip}`);
      },
    }));

  // 5. XSS prevention — sanitizes user input to remove malicious HTML
    app.use(xss());

  // 6. HTTP Parameter Pollution prevention
    app.use(hpp({
      whitelist: ['sort', 'fields'],
    }));

    // 7. Treat search/status query strings as literal text, not executable regex.
    app.use(sanitizeRegexQueryValues);
  }
};
