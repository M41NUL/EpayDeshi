const crypto = require('crypto');
const store = require('./store');
const { now } = require('./util');

async function sendCallback(invoice, event) {
  if (!invoice.callback_url) return;
  const done = invoice.status === 'completed';
  const payload = {
    event,
    invoice_id: invoice.invoice_id,
    status: invoice.status,
    amount: invoice.amount,
    currency: 'BDT',
    customer_id: invoice.customer_id || null,
    payment_method: invoice.payment_method || null,
    ...(done ? { transaction_id: invoice.transaction_id, sender_number: invoice.sender_number, verified_at: invoice.verified_at } : {}),
    ...(invoice.status === 'failed' ? { reason: invoice.failure_reason } : {}),
    ...(invoice.status === 'cancelled' ? { cancelled_at: invoice.cancelled_at } : {}),
    created_at: invoice.created_at,
    timestamp: now()
  };
  const raw = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json', 'x-epaydeshi-event': event };
  const secret = invoice.callback_secret || require('../config/secrets').callbackSecret;
  if (secret) {
    headers['x-epaydeshi-signature'] = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  }
  let result = 'failed';
  try {
    const r = await fetch(invoice.callback_url, {
      method: 'POST', headers, body: raw, redirect: 'manual', signal: AbortSignal.timeout(8000)
    });
    result = r.ok ? 'delivered' : `http_${r.status}`;
  } catch (e) {
    result = 'failed';
  }
  await store.updateInvoice(invoice.invoice_id, { callback_status: result });
}

module.exports = { sendCallback };
