/**
 * ToS-Guard Local Test & Demo Server
 * Zero dependencies, built with Node.js http and fs modules.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PageExtractor = require('./src/page_extractor');
const PromptInjectionGuard = require('./src/prompt_injection_guard');
const SchemaValidator = require('./src/schema_validator');
const CitationVerifier = require('./src/citation_verifier');
const RulesEngine = require('./src/rules_engine');
const LLMClient = require('./src/llm_client');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Routes
  if (pathname === '/' || pathname === '/demo') {
    return serveFile(path.join(__dirname, 'test-pages', 'demo_harness.html'), 'text/html', res);
  }
  if (pathname === '/instagram') {
    return serveFile(path.join(__dirname, 'test-pages', 'instagram.html'), 'text/html', res);
  }
  if (pathname === '/ambiguity') {
    return serveFile(path.join(__dirname, 'test-pages', 'ambiguity.html'), 'text/html', res);
  }
  if (pathname === '/injection') {
    return serveFile(path.join(__dirname, 'test-pages', 'injection.html'), 'text/html', res);
  }
  if (pathname === '/popup' || pathname === '/popup/') {
    return serveFile(path.join(__dirname, 'popup', 'popup.html'), 'text/html; charset=utf-8', res);
  }
  if (pathname === '/popup.js') {
    return serveFile(path.join(__dirname, 'popup', 'popup.js'), 'application/javascript; charset=utf-8', res);
  }
  if (pathname === '/popup.css') {
    return serveFile(path.join(__dirname, 'popup', 'popup.css'), 'text/css; charset=utf-8', res);
  }

  // API endpoint: /api/analyze
  if (pathname === '/api/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const text = payload.text || '';
        const title = payload.title || 'Hüküm ve Koşullar';
        const hiddenNodes = payload.hiddenNodes || [];

        const client = new LLMClient({ provider: 'offline_mock' });
        const verifier = new CitationVerifier();

        const rawReport = await client.analyzeDocument(text, title, hiddenNodes);
        const verification = verifier.verifyClauses(rawReport.flagged_clauses || [], text);

        const responseData = {
          ...rawReport,
          overall_risk_score: verification.verifiedRiskScore,
          risk_level: verification.verifiedRiskLevel,
          verification_stats: {
            total_claims: (rawReport.flagged_clauses || []).length,
            verified_count: verification.verifiedClauses.length,
            invalid_count: verification.invalidClauses.length,
            verification_rate: verification.verificationRate,
            summary: verification.verificationSummaryTr
          },
          verified_clauses: verification.verifiedClauses,
          invalid_clauses: verification.invalidClauses
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, report: responseData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static file handler (normalized for Windows)
  const safePath = '.' + pathname;
  const filePath = path.resolve(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + pathname);
    }
    serveFile(filePath, contentType, res);
  });
});

function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Server Error: ' + err.message);
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`ToS-Guard Server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
