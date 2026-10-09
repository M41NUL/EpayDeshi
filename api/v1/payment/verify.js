const { authenticate } = require('../../../lib/auth');
const { send, error, getBody, handler } = require('../../../lib/response');
const { isInvoiceId } = require('../../../lib/validation');
const store = require('../../../lib/store');
const { runVerification } = require('../../../lib/verification');

module.exports = handler(['POST'], async (req, res) => {
  const merchant = await authenticate(req, res);
  if (!merchant) return;

  const body = getBody(req);
  if (!body) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'Body must be a JSON object');
  if ('receiver_number' in body) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'receiver_number is not accepted');
  if (!isInvoiceId(body.invoice_id)) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'invoice_id is invalid');

  const invoice = await store.getInvoice(body.invoice_id);
  if (!invoice || invoice.merchant !== merchant) return error(res, 404, 'NOT_FOUND', 'Invoice not found');

  const out = await runVerification(invoice, body, { checkAmount: true });
  return send(res, out.http, out.body);
});
