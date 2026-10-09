const rtdb = require('./rtdb');

async function createInvoice(invoice) {
  const ok = await rtdb.create('invoices/' + invoice.invoice_id, invoice);
  if (!ok) return false;
  await rtdb.set('pay_tokens/' + invoice.pay_token, invoice.invoice_id);
  return true;
}

async function getInvoice(id) {
  return rtdb.get('invoices/' + id);
}

async function getInvoiceByToken(token) {
  const id = await rtdb.get('pay_tokens/' + token);
  return id ? getInvoice(id) : null;
}

async function updateInvoice(id, patchData) {
  const current = await getInvoice(id);
  if (!current) return null;
  await rtdb.patch('invoices/' + id, patchData);
  const merged = { ...current, ...patchData };
  for (const k of Object.keys(merged)) if (merged[k] === null) delete merged[k];
  return merged;
}

async function reserveTransaction(method, txId, invoiceId) {
  return rtdb.create('claims/' + method + '/' + txId, { invoice_id: invoiceId, reserved_ms: Date.now() });
}

async function releaseTransaction(method, txId, invoiceId) {
  const rec = await rtdb.get('claims/' + method + '/' + txId);
  if (rec && rec.invoice_id === invoiceId) await rtdb.remove('claims/' + method + '/' + txId);
}

async function findSmsTransaction({ transactionId, method }) {
  const sms = require('../config/sms');
  const lookups = [];
  if (method) lookups.push({ path: sms.path + '/' + method + '/' + transactionId, scoped: true });
  lookups.push({ path: sms.path + '/' + transactionId, scoped: false });
  for (const l of lookups) {
    const val = await rtdb.get(l.path);
    if (val && typeof val === 'object') return { ...val, __key: transactionId, __scoped: l.scoped };
  }
  return null;
}

module.exports = { createInvoice, getInvoice, getInvoiceByToken, updateInvoice, reserveTransaction, releaseTransaction, findSmsTransaction };
