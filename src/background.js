/**
 * ToS-Guard Background Service Worker (Manifest V3)
 * 
 * Coordinates:
 * - Tab communication and content script interactions
 * - LLM calling and Prompt Injection Defense
 * - Deterministic Citation Grounding Verification
 * - Caching and badge state management
 */

importScripts(
  'page_extractor.js',
  'prompt_injection_guard.js',
  'schema_validator.js',
  'citation_verifier.js',
  'rules_engine.js',
  'llm_client.js'
);

const citationVerifier = new CitationVerifier();
const llmClient = new LLMClient();

// In-memory tab analysis cache
const tabAnalysisCache = new Map();

/**
 * Loads user configuration from storage.
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tosGuardConfig'], (res) => {
      if (res && res.tosGuardConfig) {
        llmClient.setConfig(res.tosGuardConfig);
        resolve(res.tosGuardConfig);
      } else {
        // Default to offline mock engine
        const defaultConfig = {
          provider: 'offline_mock',
          apiKey: '',
          modelName: 'gpt-4o-mini',
          baseUrl: ''
        };
        chrome.storage.local.set({ tosGuardConfig: defaultConfig });
        llmClient.setConfig(defaultConfig);
        resolve(defaultConfig);
      }
    });
  });
}

// Initial config load
loadConfig();

/**
 * Updates extension action badge on active tab.
 */
function updateBadge(tabId, score, riskLevel) {
  if (!chrome.action || !tabId) return;

  let color = '#10B981'; // Green
  if (score >= 75) color = '#EF4444'; // Red
  else if (score >= 50) color = '#F59E0B'; // Amber
  else if (score >= 25) color = '#3B82F6'; // Blue

  chrome.action.setBadgeText({ tabId, text: `${score}` });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

/**
 * Runs full analysis pipeline for given tab data.
 */
async function runAnalysisPipeline(tabId, extractedData) {
  await loadConfig();

  const { title, rawText, segments, hiddenNodes } = extractedData;

  // 1. LLM Generation with prompt injection protection & strict schema validation
  const rawReport = await llmClient.analyzeDocument(rawText, title, hiddenNodes);

  // 2. Deterministic Citation Verification & Grounding
  const verification = citationVerifier.verifyClauses(
    rawReport.flagged_clauses || [],
    rawText,
    segments || []
  );

  // 3. Assemble final verified report
  const finalReport = {
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
    invalid_clauses: verification.invalidClauses,
    extracted_metadata: {
      word_count: extractedData.wordCount || 0,
      char_count: extractedData.charCount || 0,
      hidden_nodes_count: (hiddenNodes || []).length
    },
    analyzed_at: new Date().toISOString()
  };

  // If unverified claims were dropped, document honestly in uncertainty_notes
  if (verification.invalidClauses.length > 0) {
    const ungroundedWarning = `[DETERMİNİSTİK DOĞRULAMA FİLTRESİ]: Model tarafından üretilen ${verification.invalidClauses.length} madde kaynak metinde bulunamadığı için elendi.`;
    finalReport.uncertainty_notes = finalReport.uncertainty_notes
      ? `${finalReport.uncertainty_notes} | ${ungroundedWarning}`
      : ungroundedWarning;
  }

  // Cache report
  tabAnalysisCache.set(tabId, finalReport);
  updateBadge(tabId, finalReport.overall_risk_score, finalReport.risk_level);

  return finalReport;
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = (sender.tab && sender.tab.id) || request.tabId;

  if (request.action === 'GET_CACHED_REPORT') {
    const cached = tabAnalysisCache.get(tabId) || null;
    sendResponse({ success: true, report: cached });
    return true;
  }

  if (request.action === 'ANALYZE_PAGE') {
    (async () => {
      try {
        let extractedData = request.extractedData;

        // If no extracted data was sent with request, query content script in tab
        if (!extractedData && tabId) {
          extractedData = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_DOM' }, (res) => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
              }
              if (res && res.extractedData) resolve(res.extractedData);
              else reject(new Error('Sayfadan metin çekilemedi.'));
            });
          });
        }

        const report = await runAnalysisPipeline(tabId, extractedData);
        sendResponse({ success: true, report });

        // Notify content script with verified report
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'ANALYSIS_COMPLETE', report }, () => {
            // suppress errors if content script closed
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      } catch (err) {
        console.error('[ToS-Guard] Analiz hatası:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (request.action === 'CONFIG_UPDATED') {
    loadConfig().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'PING') {
    sendResponse({ success: true, status: 'ready' });
    return false;
  }
});
