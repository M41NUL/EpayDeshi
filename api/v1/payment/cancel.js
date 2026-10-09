const { authenticate } = require('../../../lib/auth');
const { send, error, getBody, handler } = require('../../../lib/response');
const { isInvoiceId } = require('../../../lib/validation');
const store = require('../../../lib/store');
const { refreshInvoice } = require('../../../lib/invoice');
const { sendCallback } = require('../../../lib/callback');
const { now } = require('../../../lib/util');

module.exports = handler(['POST'], async (req, res) => {
  const merchant = await authenticate(req, res);
  if (!merchant) return;

  const body = getBody(req);
  if (!body || !isInvoiceId(body.invoice_id)) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'invoice_id is invalid');

  let inv = await store.getInvoice(body.invoice_id);
  if (!inv || inv.merchant !== merchant) return error(res, 404, 'NOT_FOUND', 'Invoice not found');
  inv = await refreshInvoice(inv);

  if (inv.status === 'completed') return error(res, 409, 'PAYMENT_ALREADY_COMPLETED', 'Completed payment cannot be cancelled');
  if (inv.status === 'expired') return error(res, 410, 'PAYMENT_EXPIRED', 'Invoice has expired');
  if (inv.status === 'cancelled') return error(res, 409, 'INVALID_REQUEST', 'Invoice already cancelled');
  if (inv.status === 'processing') return error(res, 409, 'INVALID_REQUEST', 'Verification in progress, try again shortly');

  const ts = now();
  const done = await store.updateInvoice(inv.invoice_id, { status: 'cancelled', cancelled_at: ts, updated_at: ts });
  await sendCallback(done, 'payment.cancelled');

  return send(res, 200, {
    success: true, status: 'cancelled', message: 'Payment cancelled successfully',
    data: { invoice_id: done.invoice_id }
  });
});
