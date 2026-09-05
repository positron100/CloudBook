require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectToMongo = require('./db');
const { requireEnv } = require('./config');

// Fail fast on missing configuration rather than starting a half-working server.
requireEnv(['MONGO_URI', 'JWT_SECRET']);

connectToMongo();

const app = express();
const port = process.env.PORT || 5000;

// Restrict CORS to the known frontend origin(s). CORS_ORIGIN is a comma-separated
// list; if unset (local dev), allow all so `vite` on any port works.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins, allowedHeaders: ['Content-Type', 'auth-token'] }
      : {},
  ),
);

app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));

app.get('/', (req, res) => {
  res.json({ service: 'cloudbook-backend', status: 'ok' });
});

app.listen(port, () => {
  console.log(`CloudBook backend listening on http://localhost:${port}/`);
});
