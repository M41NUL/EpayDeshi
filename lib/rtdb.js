const cfg = require('../config/firebase');

const base = () => String(cfg.databaseURL).replace(/\/+$/, '');

function url(path) {
  const auth = cfg.authToken ? `?auth=${encodeURIComponent(cfg.authToken)}` : '';
  return `${base()}/${path}.json${auth}`;
}

async function request(method, path, body, headers) {
  return fetch(url(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function check(res) {
  if (!res.ok) throw new Error(`Realtime Database ${res.status}: ${await res.text()}`);
  return res;
}

async function get(path) {
  const res = await check(await request('GET', path));
  return res.json();
}

async function create(path, data) {
  const res = await request('PUT', path, data, { 'If-Match': 'null_etag' });
  if (res.status === 412) return false;
  await check(res);
  return true;
}

async function set(path, data) {
  await check(await request('PUT', path, data));
}

async function patch(path, data) {
  await check(await request('PATCH', path, data));
}

async function remove(path) {
  await check(await request('DELETE', path));
}

module.exports = { get, create, set, patch, remove };
