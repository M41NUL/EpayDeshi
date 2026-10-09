const { now } = require('./util');

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

const error = (res, http, code, message, details) =>
  send(res, http, { success: false, status: 'error', message, error: { code, ...(details ? { details } : {}) } });

function getBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return null; } }
  return b && typeof b === 'object' && !Array.isArray(b) ? b : null;
}

function handler(allowed, fn) {
  return async (req, res) => {
    if (!allowed.includes(req.method)) {
      res.setHeader('Allow', allowed.join(', '));
      return error(res, 405, 'INVALID_REQUEST', 'Method not allowed', `Use ${allowed.join(' or ')}`);
    }
    try {
      return await fn(req, res);
    } catch (e) {
      console.error('[EpayDeshi]', now(), e && e.message);
      return error(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong');
    }
  };
}

module.exports = { send, error, getBody, handler };
