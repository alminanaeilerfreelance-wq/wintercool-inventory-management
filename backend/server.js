require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const applySecurityMiddleware = require('./middleware/security');

connectDB();

const app = express();
const server = http.createServer(app);

const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 10 * 60 * 1000;

server.requestTimeout = requestTimeoutMs;
server.headersTimeout = 65000;
server.timeout = requestTimeoutMs;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://wintercool-inventory-management-fro.vercel.app',
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET','POST'],
    credentials: true,
  },
});


// Make io accessible in routes via req.io
app.use((req, res, next) => { req.io = io; next(); });

// Security middleware that does not need parsed request bodies.
applySecurityMiddleware(app, { stage: 'preBody' });

app.use(cors(corsOptions));


const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '10mb';
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// Security middleware that must run after JSON/form body parsing.
applySecurityMiddleware(app, { stage: 'postBody' });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/bins', require('./routes/bins'));
app.use('/api/racks', require('./routes/racks'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/store-branches', require('./routes/storeBranches'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/types', require('./routes/types'));
app.use('/api/units', require('./routes/units'));
app.use('/api/services', require('./routes/services'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/adjustments', require('./routes/adjustments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notify', require('./routes/notifications-email'));
app.use('/api/sub-dealers', require('./routes/subDealers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/security-alerts', require('./routes/securityAlerts'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/backup', require('./routes/backup'));

app.get('/', (req, res) => res.json({ message: 'WMS API running', secure: true }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Socket.io connection handling - Messenger
const setupSocketHandlers = require('./utils/socket');
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
  
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    }
  });
});

// Export io for use in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Secure WMS API running on port ${PORT}`));

module.exports = { app, io };
