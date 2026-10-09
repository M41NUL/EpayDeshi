module.exports = {
  path: 'transactions',
  fields: {
    transactionId: ['transactionId', 'transaction_id', 'trxID', 'trx_id', 'txid'],
    amount: ['amount'],
    senderNumber: ['senderNumber', 'sender_number', 'sender', 'number', 'from'],
    provider: ['provider', 'method', 'payment_method']
  }
};
