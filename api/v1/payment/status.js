const { authenticate } = require('../../../lib/auth');
const { send, error, handler } = require('../../../lib/response');
const { isInvoiceId } = require('../../../lib/validation');
const store = require('../../../lib/store');
const { refreshInvoice } = require('../../../lib/invoice');

module.exports = handler(['GET'], async (req, res) => {
  const merchant = await authenticate(req, res);
  if (!merchant) return;

  const id = req.query && req.query.invoice_id;
  if (!isInvoiceId(id)) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'invoice_id is invalid');

  let inv = await store.getInvoice(id);
  if (!inv || inv.merchant !== merchant) return error(res, 404, 'NOT_FOUND', 'Invoice not found');
  inv = await refreshInvoice(inv);

  return send(res, 200, {
    success: true,
    status: inv.status,
    data: {
      invoice_id: inv.invoice_id,
      amount: inv.amount,
      payment_method: inv.payment_method,
      transaction_id: inv.status === 'completed' ? inv.transaction_id : null,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      verified_at: inv.verified_at
    }
  });
});
