#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ignoredDirs = new Set(['node_modules', 'dist', 'coverage', '.git', '.yarn', 'storage']);
const ignoredFiles = new Set(['.env.example', '.env.production.example', 'package-lock.json', 'scripts/check-no-secrets.js', 'scripts/backup-to-neon.js']);
const suspiciousPatterns = [
  /-----BEGIN PRIVATE KEY-----/i,
  /SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /GOCSPX-[A-Za-z0-9_-]+/,
  /npg_[A-Za-z0-9]+/,
  /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i,
  /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/i,
];

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else results.push(full);
  }
  return results;
}

const findings = [];
for (const file of walk(ROOT)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  if (ignoredFiles.has(relative)) continue;
  if (relative.startsWith('.env')) continue;
  const stat = fs.statSync(file);
  if (stat.size > 1024 * 1024) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      const isPlaceholder = text.includes('USER:PASSWORD') || text.includes('REEMPLAZAR') || text.includes('SG.REEMPLAZAR');
      if (!isPlaceholder) {
        findings.push(relative);
        break;
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Se detectaron posibles secretos en archivos versionables:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('OK: no se detectaron patrones evidentes de secretos en archivos versionables.');
