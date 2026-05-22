#!/usr/bin/env node
/**
 * i18n parity check — reports keys present in EN but missing in TH (or vice versa).
 * Run: node apps/web/scripts/check-i18n-parity.js
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const enDir = path.join(localesDir, 'en');
const thDir = path.join(localesDir, 'th');

/**
 * Flatten a nested object into dot-separated keys.
 * e.g. { a: { b: 'v' } } → { 'a.b': 'v' }
 */
function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

let totalMissing = 0;
let hasErrors = false;

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

for (const file of enFiles) {
  const enPath = path.join(enDir, file);
  const thPath = path.join(thDir, file);

  if (!fs.existsSync(thPath)) {
    console.error(`❌  Missing TH file: locales/th/${file}`);
    hasErrors = true;
    continue;
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const thData = JSON.parse(fs.readFileSync(thPath, 'utf-8'));

  const enKeys = flattenKeys(enData);
  const thKeys = flattenKeys(thData);

  const missingInTh = Object.keys(enKeys).filter(k => !(k in thKeys));
  const missingInEn = Object.keys(thKeys).filter(k => !(k in enKeys));

  if (missingInTh.length > 0 || missingInEn.length > 0) {
    console.log(`\n📄  ${file}`);
    if (missingInTh.length > 0) {
      console.log(`  Missing in TH (${missingInTh.length}):`);
      missingInTh.forEach(k => console.log(`    - ${k}`));
    }
    if (missingInEn.length > 0) {
      console.log(`  Missing in EN (${missingInEn.length}):`);
      missingInEn.forEach(k => console.log(`    - ${k}`));
    }
    totalMissing += missingInTh.length + missingInEn.length;
    hasErrors = true;
  }
}

// Also check for TH-only files
const thFiles = fs.readdirSync(thDir).filter(f => f.endsWith('.json'));
for (const file of thFiles) {
  if (!enFiles.includes(file)) {
    console.error(`❌  Missing EN file: locales/en/${file}`);
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log('✅  All i18n keys are in parity between EN and TH.');
} else {
  console.log(`\n⚠️   Total missing keys: ${totalMissing}`);
  process.exit(1);
}
