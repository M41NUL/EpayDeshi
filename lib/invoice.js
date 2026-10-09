const crypto = require('crypto');
const store = require('./store');
const { toDhaka, now, dateStamp } = require('./util');
const { getReceiver, availableMethods } = require('./methods');

const cfg = require('../config/app');

const ttlMinutes = () => Number(cfg.invoiceTtlMinutes) || 15;
const pageBase = () => String(cfg.pageBaseUrl).replace(/\/+$/, '');

const TOKEN_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const makeToken = () => Array.from({ length: 8 }, () => TOKEN_CHARS[crypto.randomInt(0, TOKEN_CHARS.length)]).join('');

async function createInvoice({ amount, customer_id, callback_url, success_url, cancel_url, website_url, callback_secret, payment_method, merchant }) {
  const stamp = dateStamp();
  const created = Date.now();
  for (let i = 0; i < 20; i++) {
    const invoice_id = `INV-${stamp}-${String(crypto.randomInt(0, 100000)).padStart(5, '0')}`;
    const pay_token = makeToken();
    if (await store.getInvoiceByToken(pay_token)) continue;
    const invoice = {
      invoice_id, pay_token, merchant, amount, customer_id, callback_url, success_url, cancel_url, website_url: website_url || null, callback_secret: callback_secret || null,
      payment_method, status: 'pending', sender_number: null, transaction_id: null,
      failure_reason: null, attempts: 0, callback_status: null,
      created_at: toDhaka(created), updated_at: toDhaka(created),
      expires_ms: created + ttlMinutes() * 60000, expires_at: toDhaka(created + ttlMinutes() * 60000),
      verified_at: null, cancelled_at: null
    };
    if (await store.createInvoice(invoice)) return invoice;
  }
  throw new Error('Could not allocate invoice id');
}

async function refreshInvoice(invoice) {
  if (['pending', 'failed'].includes(invoice.status) && Date.now() > invoice.expires_ms) {
    return store.updateInvoice(invoice.invoice_id, { status: 'expired', updated_at: now() });
  }
  return invoice;
}

const paymentUrl = (inv) => `${pageBase()}/pay/${inv.pay_token}`;

function publicView(inv) {
  return {
    invoice_id: inv.invoice_id,
    amount: inv.amount,
    currency: 'BDT',
    status: inv.status,
    payment_method: inv.payment_method,
    receiver_number: inv.payment_method ? getReceiver(inv.payment_method) : null,
    available_methods: availableMethods(),
    expires_at: inv.expires_at,
    attempts_left: Math.max(0, (Number(cfg.maxVerifyAttempts) || 3) - (inv.attempts || 0)),
    success_url: inv.success_url,
    cancel_url: inv.cancel_url,

    website_url: inv.website_url || cfg.defaultWebsiteUrl || null,
    site_name: cfg.siteName || '',
    logo_url: cfg.logoUrl || '',
    support: { name: cfg.supportName || '', whatsapp: cfg.supportWhatsapp || '', telegram: cfg.supportTelegram || '', email: cfg.supportEmail || '' }
  };
}

module.exports = { createInvoice, refreshInvoice, paymentUrl, publicView };
