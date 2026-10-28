#!/usr/bin/env node
/**
 * build-partials.js
 * Zero-dependency static partial builder for Termux/Node on Android.
 *
 * Usage: node scripts/build-partials.js
 *
 * Rewrites the regions delimited by:
 *   <!-- build:header --> ... <!-- /build:header -->
 *   <!-- build:footer --> ... <!-- /build:footer -->
 *
 * Injects aria-current="page" onto the matching nav link based on
 * <body data-page="...">.
 *
 * Replaces {{YEAR}} in the footer partial with the current year.
 *
 * Requires: Node.js (any LTS). No npm packages.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PARTIALS_DIR = path.join(ROOT, 'src', 'partials');
const HEADER_PATH = path.join(PARTIALS_DIR, 'header.html');
const FOOTER_PATH = path.join(PARTIALS_DIR, 'footer.html');

const HEADER_OPEN = '<!-- build:header -->';
const HEADER_CLOSE = '<!-- /build:header -->';
const FOOTER_OPEN = '<!-- build:footer -->';
const FOOTER_CLOSE = '<!-- /build:footer -->';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'src', 'scripts', 'css', 'js', 'assets'
]);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function findHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      findHtmlFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function getBodyPage(html) {
  const match = html.match(/<body[^>]*\bdata-page="([^"]+)"/);
  return match ? match[1] : null;
}

function applyAriaCurrent(headerHtml, page) {
  if (!page) return headerHtml;

  let out = headerHtml.replace(/\s+aria-current="page"/g, '');

  const linkRegex = new RegExp(
    '(<a\\s+[^>]*\\bdata-nav="' + escapeRegExp(page) + '"[^>]*)>',
    'i'
  );
  out = out.replace(linkRegex, '$1 aria-current="page">');

  return out;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceRegion(html, openMarker, closeMarker, content) {
  const openIndex = html.indexOf(openMarker);
  const closeIndex = html.indexOf(closeMarker);

  if (openIndex === -1 || closeIndex === -1 || closeIndex < openIndex) {
    return null;
  }

  const before = html.slice(0, openIndex + openMarker.length);
  const after = html.slice(closeIndex);
  return before + '\n' + content.trim() + '\n' + after;
}

function main() {
  if (!fs.existsSync(HEADER_PATH) || !fs.existsSync(FOOTER_PATH)) {
    console.error('Error: Missing partial files in src/partials/');
    process.exit(1);
  }

  const currentYear = String(new Date().getFullYear());

  const headerRaw = read(HEADER_PATH).trim();
  const footerRaw = read(FOOTER_PATH)
    .trim()
    .replace(/\{\{YEAR\}\}/g, currentYear);

  const files = findHtmlFiles(ROOT);
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    let html = read(file);
    const page = getBodyPage(html);

    const header = applyAriaCurrent(headerRaw, page);

    const afterHeader = replaceRegion(html, HEADER_OPEN, HEADER_CLOSE, header);
    if (afterHeader === null) {
      console.warn('Skipped (no header markers): ' + rel);
      skipped++;
      continue;
    }

    const afterFooter = replaceRegion(afterHeader, FOOTER_OPEN, FOOTER_CLOSE, footerRaw);
    if (afterFooter === null) {
      console.warn('Skipped (no footer markers): ' + rel);
      skipped++;
      continue;
    }

    write(file, afterFooter);
    changed++;
    console.log('Updated: ' + rel + (page ? '  [data-page="' + page + '"]' : ''));
  }

  console.log('\nDone. ' + changed + ' file(s) updated, ' + skipped + ' skipped.');
}

main();
