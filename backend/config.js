/**
 * Central config access. Reads from process.env (populated by dotenv locally,
 * by the host's environment in production). No secrets live in source.
 */

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy backend/.env.example to backend/.env (local) or set them in the host dashboard.');
    process.exit(1);
  }
}

module.exports = {
  requireEnv,
  get mongoUri() {
    return process.env.MONGO_URI;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
};
