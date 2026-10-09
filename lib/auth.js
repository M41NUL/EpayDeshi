const crypto = require('crypto');
const { error } = require('./response');

const sha = (s) => crypto.createHash('sha256').update(s).digest();

async function authenticate(req, res) {
  const key = String(require('../config/secrets').apiKey || '');
  if (!key || key.startsWith('CHANGE_ME')) {
    error(res, 500, 'NOT_CONFIGURED', 'Gateway is not configured', 'Set apiKey in config/secrets.js');
    return null;
  }
  const provided = req.headers['x-api-key'];
  if (typeof provided !== 'string' || !provided) {
    error(res, 401, 'UNAUTHORIZED', 'Invalid or missing API key', 'Send header x-api-key');
    return null;
  }
  const p = sha(provided);
  if (!crypto.timingSafeEqual(p, sha(key))) {
    error(res, 401, 'UNAUTHORIZED', 'Invalid or missing API key');
    return null;
  }
  return p.toString('hex').slice(0, 16);
}

module.exports = { authenticate, sha };
