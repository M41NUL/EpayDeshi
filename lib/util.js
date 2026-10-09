const OFFSET_MS = 6 * 60 * 60 * 1000;

function toDhaka(input) {
  const d = input instanceof Date ? input : new Date(input);
  return new Date(d.getTime() + OFFSET_MS).toISOString().replace(/\.\d{3}Z$/, '+06:00');
}
const now = () => toDhaka(new Date());
const dateStamp = (d = new Date()) => toDhaka(d).slice(0, 10).replace(/-/g, '');

module.exports = { toDhaka, now, dateStamp };
