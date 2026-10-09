const config = require('../config/payment');

const LABELS = { bkash: 'bKash', nagad: 'Nagad', upay: 'Upay', rocket: 'Rocket' };
const METHODS = Object.keys(LABELS);
const NUMBER_RE = /^01\d{9,10}$/;

const isValidMethod = (m) => typeof m === 'string' && METHODS.includes(m);

function getReceiver(method) {
  if (!isValidMethod(method)) return null;
  const n = config[method] && config[method].receiverNumber;
  return typeof n === 'string' && NUMBER_RE.test(n) ? n : null;
}

function availableMethods() {
  return METHODS.filter((m) => getReceiver(m)).map((m) => ({
    id: m,
    label: LABELS[m],
    receiver_number: getReceiver(m)
  }));
}

module.exports = { METHODS, LABELS, isValidMethod, getReceiver, availableMethods };
