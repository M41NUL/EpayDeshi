const { authenticate } = require('../../../lib/auth');
const { send, error, getBody, handler } = require('../../../lib/response');
const v = require('../../../lib/validation');
const { createInvoice, paymentUrl } = require('../../../lib/invoice');
const { getReceiver } = require('../../../lib/methods');

module.exports = handler(['POST'], async (req, res) => {
  const merchant = await authenticate(req, res);
  if (!merchant) return;

  const body = getBody(req);
  if (!body) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'Body must be a JSON object');

  if ('receiver_number' in body) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', 'receiver_number is not accepted');

  const amount = v.validateAmount(body.amount);
  if (!amount.ok) return error(res, 400, 'INVALID_AMOUNT', 'Invalid amount', amount.details);

  const method = v.validateMethod(body.payment_method);
  if (!method.ok) return error(res, 400, 'INVALID_PAYMENT_METHOD', 'Invalid payment method', method.details);
  if (method.value && !getReceiver(method.value))
    return error(res, 400, 'INVALID_PAYMENT_METHOD', 'Payment method is currently unavailable');

  const cust = v.validateCustomerId(body.customer_id);
  if (!cust.ok) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', cust.details);

  const urls = {};
  for (const f of ['callback_url', 'success_url', 'cancel_url', 'website_url']) {
    const r = v.validateUrl(body[f], f);
    if (!r.ok) return error(res, 400, 'INVALID_REQUEST', 'Invalid request', r.details);
    urls[f] = r.value;
  }

  const inv = await createInvoice({
    amount: amount.value, customer_id: cust.value, payment_method: method.value, merchant, ...urls
  });

  return send(res, 201, {
    success: true,
    invoice_id: inv.invoice_id,
    amount: inv.amount,
    payment_url: paymentUrl(inv)
  });
});
