const { isValidMethod } = require('./methods');

const MAX_AMOUNT = 500000;

function validateAmount(value) {
  if (value === undefined || value === null || value === '') return { ok: false, details: 'amount is required' };
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, details: 'amount must be a number' };
  if (value <= 0) return { ok: false, details: 'amount must be greater than 0' };
  if (value > MAX_AMOUNT) return { ok: false, details: `amount must not exceed ${MAX_AMOUNT}` };
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6)
    return { ok: false, details: 'amount can have at most 2 decimal places' };
  return { ok: true, value: Math.round(value * 100) / 100 };
}

function validateMethod(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? { ok: false, details: 'payment_method is required' } : { ok: true, value: null };
  }
  if (!isValidMethod(value)) return { ok: false, details: 'payment_method must be one of: bkash, nagad, upay, rocket' };
  return { ok: true, value };
}

function isPrivateHost(host) {
  const h = host.toLowerCase();
  return (
    h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') ||
    h === '[::1]' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || /^0\./.test(h)
  );
}

function validateUrl(value, field) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string' || value.length > 2048) return { ok: false, details: `${field} must be a valid URL` };
  let u;
  try { u = new URL(value); } catch (e) { return { ok: false, details: `${field} must be a valid URL` }; }
  const prod = true;
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && !prod)) return { ok: false, details: `${field} must use https` };
  if (u.username || u.password) return { ok: false, details: `${field} must not contain credentials` };
  if (prod && isPrivateHost(u.hostname)) return { ok: false, details: `${field} host is not allowed` };
  return { ok: true, value: u.toString() };
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  let s = value.replace(/[\s-]/g, '');
  if (s.startsWith('+880')) s = '0' + s.slice(4);
  else if (s.startsWith('880')) s = '0' + s.slice(3);
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

function validateTransactionId(value) {
  if (typeof value !== 'string') return { ok: false, details: 'transaction_id is required' };
  const s = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(s)) return { ok: false, details: 'transaction_id must be 6-20 letters/digits' };
  return { ok: true, value: s };
}

const isInvoiceId = (v) => typeof v === 'string' && /^INV-\d{8}-\d{5}$/.test(v);

const isPayToken = (v) => typeof v === 'string' && /^[a-z0-9]{8}$/.test(v);

function validateCustomerId(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string' || !/^[\w.\-@:]{1,64}$/.test(value)) return { ok: false, details: 'customer_id is invalid (max 64 chars)' };
  return { ok: true, value };
}

module.exports = { validateAmount, validateMethod, validateUrl, normalizePhone, validateTransactionId, isInvoiceId, isPayToken, validateCustomerId };
