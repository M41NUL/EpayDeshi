const store = require('./store');
const v = require('./validation');
const { getReceiver } = require('./methods');
const { refreshInvoice } = require('./invoice');
const { now } = require('./util');
const { sendCallback } = require('./callback');
const { verifyPayment } = require('./verifier');

const fail = (http, code, message, details) => ({
  http, body: { success: false, status: 'error', message, error: { code, ...(details ? { details } : {}) } }
});

async function runVerification(found, input, { checkAmount }) {
  if (!found) return fail(404, 'NOT_FOUND', 'Invoice not found');
  const invoice = await refreshInvoice(found);

  if (invoice.status === 'completed') return fail(409, 'PAYMENT_ALREADY_COMPLETED', 'Payment already completed');
  if (invoice.status === 'expired') return fail(410, 'PAYMENT_EXPIRED', 'Invoice has expired');
  if (invoice.status === 'cancelled') return fail(409, 'INVALID_REQUEST', 'Invoice is cancelled');
  if (invoice.status === 'processing') return fail(409, 'INVALID_REQUEST', 'Verification already in progress');

  if (checkAmount) {
    const a = v.validateAmount(input.amount);
    if (!a.ok) return fail(400, 'INVALID_AMOUNT', 'Invalid amount', a.details);
    if (a.value !== invoice.amount) return fail(400, 'INVALID_AMOUNT', 'Amount does not match invoice');
  }

  const m = v.validateMethod(input.payment_method, { required: !invoice.payment_method });
  if (!m.ok) return fail(400, 'INVALID_PAYMENT_METHOD', 'Invalid payment method', m.details);
  const method = m.value || invoice.payment_method;
  if (invoice.payment_method && method !== invoice.payment_method)
    return fail(400, 'INVALID_PAYMENT_METHOD', 'Payment method does not match invoice');

  const sender = v.normalizePhone(input.sender_number);
  if (!sender) return fail(400, 'INVALID_REQUEST', 'Invalid sender number', 'Use a valid Bangladesh mobile number');

  const t = v.validateTransactionId(input.transaction_id);
  if (!t.ok) return fail(400, 'INVALID_TRANSACTION', 'Invalid transaction ID', t.details);

  const receiver = getReceiver(method);
  if (!receiver) return fail(400, 'INVALID_PAYMENT_METHOD', 'Payment method is currently unavailable');

  if (!(await store.reserveTransaction(method, t.value, invoice.invoice_id))) {
    return {
      http: 409,
      body: { success: false, status: 'failed', message: 'Transaction ID already used', error: { code: 'DUPLICATE_TRANSACTION' } }
    };
  }

  await store.updateInvoice(invoice.invoice_id, {
    status: 'processing', payment_method: method, sender_number: sender, transaction_id: t.value, updated_at: now()
  });

  let result;
  try {
    result = await verifyPayment({
      invoice, senderNumber: sender, transactionId: t.value, paymentMethod: method, receiverNumber: receiver
    });
  } catch (e) {
    await store.releaseTransaction(method, t.value, invoice.invoice_id);
    await store.updateInvoice(invoice.invoice_id, { status: 'pending', updated_at: now() });
    throw e;
  }

  if (result.matched) {
    const ts = now();
    const done = await store.updateInvoice(invoice.invoice_id, { status: 'completed', verified_at: ts, updated_at: ts, failure_reason: null });
    await sendCallback(done, 'payment.completed');
    return {
      http: 200,
      body: {
        success: true, status: 'completed', message: 'Payment verified successfully',
        data: {
          invoice_id: done.invoice_id, amount: done.amount, sender_number: sender,
          transaction_id: t.value, payment_method: method, verified_at: ts,
          ...(done.success_url ? { success_url: done.success_url } : {})
        }
      }
    };
  }

  await store.releaseTransaction(method, t.value, invoice.invoice_id);
  const failed = await store.updateInvoice(invoice.invoice_id, {
    status: 'failed', failure_reason: result.reason, transaction_id: null, updated_at: now()
  });
  await sendCallback(failed, 'payment.failed');
  return {
    http: 422,
    body: {
      success: false, status: 'failed', message: 'Payment verification failed. Please try again.',
      data: { invoice_id: failed.invoice_id, reason: result.reason }
    }
  };
}

module.exports = { runVerification };
