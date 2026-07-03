#!/usr/bin/env node
const BASE_URL =
  process.env.SMOKE_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const flags = new Set(process.argv.slice(2));
const runAll = flags.has('--all') || flags.size === 0;

async function check(label, path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const ok = response.status >= 200 && response.status < 300;
  console.log(`${ok ? '[OK]' : '[FAIL]'} ${label} ${path} -> ${response.status}`);
  if (!ok) process.exitCode = 1;
}

if (runAll || flags.has('--publications')) {
  await check('public categories', '/publications/categories');
  await check('public news', '/publications/news');
  await check('public columns', '/publications/columns');
}
if (runAll || flags.has('--advertising')) {
  await check('public placements', '/advertising/placements');
  await check('public ad slots', '/advertising/slots?placementCode=home_hero');
}
if (runAll || flags.has('--homepage')) {
  await check('homepage', '/homepage');
}
