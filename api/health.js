const { send, handler } = require('../lib/response');
const { now } = require('../lib/util');

module.exports = handler(['GET'], async (req, res) =>
  send(res, 200, { success: true, status: 'ok', service: 'EpayDeshi API', timestamp: now() })
);
