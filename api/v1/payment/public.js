const { send, error, getBody, handler } = require('../../../lib/response');
const { isPayToken } = require('../../../lib/validation');
const store = require('../../../lib/store');
const { refreshInvoice, publicView } = require('../../../lib/invoice');
const { runVerification } = require('../../../lib/verification');
const { sendCallback } = require('../../../lib/callback');
const { now } = require('../../../lib/util');

module.exports = handler(['GET', 'POST'], async (req, res) => {

  const token = req.query && req.query.invoice_id;
  if (!isPayToken(token)) return error(res, 404, 'NOT_FOUND', 'Invoice not found');

  let inv = await store.getInvoiceByToken(token);
  if (!inv) return error(res, 404, 'NOT_FOUND', 'Invoice not found');
  const id = inv.invoice_id;
  inv = await refreshInvoice(inv);

  if (req.method === 'GET') return send(res, 200, { success: true, status: inv.status, data: publicView(inv) });

  const body = getBody(req);
  if (!body) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'Body must be a JSON object');

  if (body.action === 'cancel') {
    const okBody = { success: true, status: 'cancelled', message: 'Payment cancelled successfully', data: { invoice_id: id } };
    if (inv.status === 'cancelled') return send(res, 200, okBody);
    if (inv.status === 'completed') return error(res, 409, 'PAYMENT_ALREADY_COMPLETED', 'Completed payment cannot be cancelled');
    if (inv.status === 'expired') return error(res, 410, 'PAYMENT_EXPIRED', 'Invoice has expired');
    if (inv.status === 'processing') return error(res, 409, 'INVALID_REQUEST', 'Verification in progress, try again shortly');
    const ts = now();
    const done = await store.updateInvoice(id, { status: 'cancelled', cancelled_at: ts, updated_at: ts });
    await sendCallback(done, 'payment.cancelled');
    return send(res, 200, okBody);
  }

  const max = Number(require('../../../config/app').maxVerifyAttempts) || 3;
  const used = inv.attempts || 0;
  if (used >= max && inv.status !== 'completed')
    return error(res, 429, 'SUPPORT_REQUIRED', 'Payment could not be verified automatically. Please contact support for assistance.');

  const out = await runVerification(inv, {
    payment_method: body.payment_method,
    sender_number: body.sender_number,
    transaction_id: body.transaction_id
  }, { checkAmount: false });

  if (out.body && out.body.status === 'failed') {
    await store.updateInvoice(id, { attempts: used + 1 });
    out.body.attempts_left = Math.max(0, max - used - 1);
  }
  return send(res, out.http, out.body);
});
