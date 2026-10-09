const store = require('./store');
const sms = require('../config/sms');
const { normalizePhone } = require('./validation');

function pick(rec, keys) {
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') return rec[k];
  }
  return '';
}

const normProvider = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '');

async function verifyPayment({ invoice, senderNumber, transactionId, paymentMethod }) {
  const cfg = require('../config/app');
  const windowMs = Number(cfg.verifyWindowMs) || 15000;
  const pollMs = Number(cfg.verifyPollMs) || 3000;
  const deadline = Date.now() + windowMs;
  let rec = null;
  for (;;) {
    rec = await store.findSmsTransaction({ transactionId, method: paymentMethod });
    if (rec) break;
    const left = deadline - Date.now();
    if (left <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(pollMs, left)));
  }
  if (!rec) return { matched: false, reason: 'No matching transaction found' };

  const f = sms.fields;
  const recProvider = normProvider(pick(rec, f.provider));
  if (!rec.__scoped && recProvider && paymentMethod && recProvider !== paymentMethod) {
    return { matched: false, reason: 'Transaction ID does not belong to this payment method' };
  }
  const recTx = String(pick(rec, f.transactionId) || rec.__key).trim().toUpperCase();
  const recAmount = Number(String(pick(rec, f.amount)).replace(/,/g, ''));
  const recSender = normalizePhone(String(pick(rec, f.senderNumber)));

  const same = recTx === transactionId && recAmount === invoice.amount && recSender === senderNumber;
  return same ? { matched: true } : { matched: false, reason: 'Transaction details did not match' };
}

module.exports = { verifyPayment };
