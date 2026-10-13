/**
 * ToS-Guard Popup Script
 * 
 * Manages user interactions in extension popup:
 * - Tab detection and DOM extraction triggering
 * - Rendering structured risk report and deterministic grounding badges
 * - Displaying prompt injection security alerts
 * - Honest uncertainty notes display
 * - Interactive in-page citation highlighting
 */

let currentTabId = null;
let currentReport = null;
let activeCategoryFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  // Query active tab
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        currentTabId = tabs[0].id;
        const pageTitle = tabs[0].title || 'Mevcut Sekme';
        const pageUrl = tabs[0].url || '';

        document.getElementById('page-title-display').textContent = pageTitle;

        // Check if cached report exists in background
        chrome.runtime.sendMessage({ action: 'GET_CACHED_REPORT', tabId: currentTabId }, (res) => {
          if (res && res.report) {
            currentReport = res.report;
            renderReport(currentReport);
          } else {
            // Check page type
            detectTabLegalStatus(tabs[0]);
          }
        });
      }
    });
  } else {
    // Standalone / test environment fallback
    document.getElementById('page-title-display').textContent = 'Test Sayfası (Kullanım Koşulları)';
  }
});

function setupEventListeners() {
  const analyzeBtn = document.getElementById('analyze-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', startAnalysis);
  }

  const settingsBtn = document.getElementById('open-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../options/options.html', '_blank');
      }
    });
  }

  // Category filter chips
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategoryFilter = chip.getAttribute('data-filter');
      renderClausesList();
    });
  });

  // Export buttons
  const copyJsonBtn = document.getElementById('copy-json-btn');
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', copyJsonReport);
  }

  const copyMdBtn = document.getElementById('copy-md-btn');
  if (copyMdBtn) {
    copyMdBtn.addEventListener('click', copyMarkdownReport);
  }
}

/**
 * Checks if the current tab looks like a legal terms page.
 */
function detectTabLegalStatus(tab) {
  const url = (tab.url || '').toLowerCase();
  const badge = document.getElementById('page-type-badge');

  if (url.includes('privacy') || url.includes('gizlilik')) {
    badge.textContent = 'Gizlilik Politikası';
  } else if (url.includes('terms') || url.includes('tos') || url.includes('kosul')) {
    badge.textContent = 'Kullanım Koşulları';
  } else if (url.includes('subscript') || url.includes('abonelik') || url.includes('billing')) {
    badge.textContent = 'Abonelik Şartları';
  } else {
    badge.textContent = 'Web Sayfası';
  }
}

/**
 * Starts analysis pipeline with progress steps.
 */
async function startAnalysis() {
  const loadingState = document.getElementById('loading-state');
  const resultsView = document.getElementById('results-view');
  const emptyView = document.getElementById('empty-view');
  const analyzeBtn = document.getElementById('analyze-btn');
  const progressFill = document.getElementById('progress-fill');
  const stepText = document.getElementById('loading-step-text');

  loadingState.classList.remove('hidden');
  resultsView.classList.add('hidden');
  emptyView.classList.add('hidden');
  analyzeBtn.disabled = true;

  // Step 1: DOM Extractor
  stepText.textContent = '1/4: DOM taranıyor & gizli elemanlar ayıklanıyor...';
  progressFill.style.width = '25%';

  // If in Chrome extension environment
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && currentTabId) {
    try {
      chrome.runtime.sendMessage({ action: 'ANALYZE_PAGE', tabId: currentTabId }, (response) => {
        handleAnalysisResponse(response, loadingState, analyzeBtn, stepText, progressFill);
      });
    } catch (err) {
      showError(err.message);
      loadingState.classList.add('hidden');
      analyzeBtn.disabled = false;
    }
  } else {
    // Standalone / Test Harness Mode (e.g. Cypress or demo runner)
    runStandaloneAnalysis(loadingState, analyzeBtn, stepText, progressFill);
  }
}

async function runStandaloneAnalysis(loadingState, analyzeBtn, stepText, progressFill) {
  try {
    let targetDoc = document;
    if (window.parent && window.parent.document && window.parent.document.getElementById('page-frame')) {
      const frame = window.parent.document.getElementById('page-frame');
      if (frame.contentDocument) targetDoc = frame.contentDocument;
    }

    const targetWin = (targetDoc && targetDoc.defaultView) ? targetDoc.defaultView : window;
    let pageTitle = (targetDoc && targetDoc.title) ? targetDoc.title : 'Mevcut Sekme';

    const extractor = new (window.PageExtractor || PageExtractor)();
    const extracted = extractor.extractContent(targetDoc, targetWin);

    let textToAnalyze = extracted.rawText;
    let titleToAnalyze = pageTitle;
    let segmentsToAnalyze = extracted.segments || [];
    let hiddenNodes = extracted.hiddenNodes || [];

    // Fallback if standalone popup opened directly without a loaded terms page (analyzing itself)
    const isSelfPage = targetDoc === document || !!(targetDoc && targetDoc.querySelector && targetDoc.querySelector('.app-container'));
    if (isSelfPage || !textToAnalyze || textToAnalyze.length < 150) {
      titleToAnalyze = 'Instagram & Meta Kullanım Koşulları (Örnek Belge)';
      const titleDisplay = document.getElementById('page-title-display');
      if (titleDisplay) titleDisplay.textContent = titleToAnalyze;

      textToAnalyze = [
        '1. İçerik Lisansı: Hizmetlerimize yüklediğiniz veya paylaştığınız fotoğraflar ve içerikler üzerinde telifsiz, devredilebilir, alt lisanslanabilir, dünya çapında bir lisans verirsiniz. Bu lisans yapay zeka modellerini eğitmek ve geliştirmek amacıyla kullanılabilir.',
        '2. Fesih ve Hesap Kapatma: Şirket dilediği an önceden bildirmeksizin hesabınızı derhal kapatma ve sözleşmeyi feshetme hakkına sahiptir.',
        '3. Toplu Dava Feragati ve Tahkim: Taraflar arasında ortaya çıkabilecek tüm uyuşmazlıklarda zorunlu tahkim uygulanır ve kullanıcı toplu dava hakkından feragat eder.',
        '4. Tek Taraflı Değişiklik: Önceden bildirimde bulunmaksızın dilediği zaman tek taraflı olarak değiştirme hakkı şirketimizde saklıdır.',
        '5. Otomatik Yenileme: Abonelik süresi dolduğunda dönem sonunda otomatik olarak yenilenir ve kayıtlı ödeme aracından otomatik tahsil edilir.',
        '6. Sorumluluk Sınırı: Toplam sorumluluk kullanıcının ödediği toplam bedeli hiçbir şekilde aşamaz ve hizmet olduğu gibi sunulmaktadır.'
      ].join('\n\n');

      segmentsToAnalyze = textToAnalyze.split('\n\n').map((line, idx) => ({
        id: `sample-clause-${idx + 1}`,
        text: line.trim(),
        tagName: 'P'
      }));
    }

    stepText.textContent = '2/4: Prompt Injection denetimi yapılıyor...';
    progressFill.style.width = '55%';

    const client = new (window.LLMClient || LLMClient)({ provider: 'offline_mock' });
    const verifier = new (window.CitationVerifier || CitationVerifier)();

    const rawReport = await client.analyzeDocument(textToAnalyze, titleToAnalyze, hiddenNodes);
    const verification = verifier.verifyClauses(rawReport.flagged_clauses || [], textToAnalyze, segmentsToAnalyze);

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
      analyzed_at: new Date().toISOString()
    };

    stepText.textContent = '4/4: Alıntılar orijinal DOM ile doğrulanıyor...';
    progressFill.style.width = '100%';

    currentReport = finalReport;
    renderReport(currentReport);
    loadingState.classList.add('hidden');
    analyzeBtn.disabled = false;
  } catch (err) {
    showError(err.message);
    loadingState.classList.add('hidden');
    analyzeBtn.disabled = false;
  }
}

function handleAnalysisResponse(response, loadingState, analyzeBtn, stepText, progressFill) {
  setTimeout(() => {
    stepText.textContent = '2/4: Prompt Injection denetimi yapılıyor...';
    progressFill.style.width = '55%';
  }, 400);

  setTimeout(() => {
    stepText.textContent = '3/4: LLM risk maddelerini çıkarıyor...';
    progressFill.style.width = '80%';
  }, 800);

  setTimeout(() => {
    stepText.textContent = '4/4: Alıntılar orijinal DOM ile doğrulanıyor...';
    progressFill.style.width = '100%';

    if (response && response.success && response.report) {
      currentReport = response.report;
      renderReport(currentReport);
    } else {
      showError(response ? response.error : 'Analiz tamamlanamadı.');
    }

    loadingState.classList.add('hidden');
    analyzeBtn.disabled = false;
  }, 1300);
}

/**
 * Renders the full structured report.
 */
function renderReport(report) {
  const resultsView = document.getElementById('results-view');
  const emptyView = document.getElementById('empty-view');
  resultsView.classList.remove('hidden');
  emptyView.classList.add('hidden');

  // 1. Security Banner (Prompt Injection)
  const secBanner = document.getElementById('security-banner');
  const secText = document.getElementById('sec-text');
  const secIcon = document.getElementById('sec-icon');

  if (report.prompt_injection_detected) {
    secBanner.className = 'security-banner-alert';
    secIcon.textContent = '⚠️';
    const indicators = (report.injection_indicators || []).join(' | ');
    secText.innerHTML = `<strong>PROMPT INJECTION TESPİT EDİLDİ & İZOLE EDİLDİ!</strong><br><small>${indicators || 'Sayfa içinde gizli veya yanıltıcı talimatlar saptandı.'}</small>`;
  } else {
    secBanner.className = 'security-banner-safe';
    secIcon.textContent = '🛡️';
    secText.textContent = 'Güvenlik Denetimi: Sayfada adversarial prompt injection tespit edilmedi.';
  }

  // 2. Risk Score & Badge
  const scoreVal = document.getElementById('score-val');
  const scoreCircle = document.getElementById('score-circle');
  const riskBadge = document.getElementById('risk-badge');

  const score = report.overall_risk_score || 0;
  scoreVal.textContent = score;

  let scoreBorder = '#10b981';
  let badgeClass = 'badge-Düşük';

  if (score >= 75) {
    scoreBorder = '#ef4444';
    badgeClass = 'badge-Kritik';
  } else if (score >= 50) {
    scoreBorder = '#f59e0b';
    badgeClass = 'badge-Yüksek';
  } else if (score >= 25) {
    scoreBorder = '#3b82f6';
    badgeClass = 'badge-Orta';
  }

  scoreCircle.style.borderColor = scoreBorder;
  scoreVal.style.color = scoreBorder;
  riskBadge.textContent = `${report.risk_level || 'Bilinmiyor'} Risk`;
  riskBadge.className = `risk-badge ${badgeClass}`;

  // 3. Summary
  document.getElementById('summary-tr-text').textContent = report.summary_tr || '';

  // 4. Verification Stats
  const vStats = report.verification_stats || {
    verified_count: (report.verified_clauses || []).length,
    invalid_count: (report.invalid_clauses || []).length,
    verification_rate: 1.0
  };

  document.getElementById('stat-verified-count').textContent = vStats.verified_count;
  document.getElementById('stat-rate').textContent = `${Math.round((vStats.verification_rate || 1) * 100)}%`;
  document.getElementById('stat-invalid-count').textContent = vStats.invalid_count;

  // 5. Honest Uncertainty & Ambiguity Disclosure
  const uncBox = document.getElementById('uncertainty-box');
  const uncText = document.getElementById('uncertainty-text');
  if (report.uncertainty_notes && report.uncertainty_notes.trim().length > 0) {
    uncBox.classList.remove('hidden');
    uncText.textContent = report.uncertainty_notes;
  } else {
    uncBox.classList.add('hidden');
  }

  // 6. Clauses Count & Filter
  const totalClauses = (report.verified_clauses || []).length + (report.invalid_clauses || []).length;
  document.getElementById('count-all').textContent = totalClauses;

  renderClausesList();
}

/**
 * Renders the clauses cards based on selected filter.
 */
function renderClausesList() {
  const container = document.getElementById('clauses-list');
  container.innerHTML = '';

  if (!currentReport) return;

  const verified = currentReport.verified_clauses || [];
  const invalid = currentReport.invalid_clauses || [];
  const allList = [...verified, ...invalid];

  const filtered = allList.filter(c => {
    if (activeCategoryFilter === 'ALL') return true;
    return c.category === activeCategoryFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #94a3b8;">
        Bu kategoride riskli madde bulunamadı.
      </div>
    `;
    return;
  }

  filtered.forEach(cl => {
    const card = document.createElement('article');
    card.className = `clause-card severity-${cl.severity || 'Orta'}`;

    const isValid = cl.is_verified !== false;
    const groundingTag = isValid
      ? `<span class="clause-grounding-tag grounding-valid">✓ Orijinal Metinde Doğrulandı</span>`
      : `<span class="clause-grounding-tag grounding-invalid">❌ Alıntı Eşleşmedi (Elendi)</span>`;

    card.innerHTML = `
      <header class="clause-header">
        <span class="clause-cat-badge">${cl.category}</span>
        <span class="clause-sev-badge badge-${cl.severity}">${cl.severity}</span>
      </header>

      <blockquote class="clause-quote-box" title="Orijinal Sözleşmeden Alıntı">
        "${escapeHtml(cl.exact_quote)}"
      </blockquote>

      <p class="clause-explanation">
        <strong>Açıklama:</strong> ${escapeHtml(cl.explanation_tr)}
      </p>

      <div style="font-size: 11px; color: #94a3b8;">
        <strong>Neden Riskli:</strong> ${escapeHtml(cl.risk_reason || '')}
      </div>

      <footer class="clause-footer">
        ${groundingTag}
        ${isValid ? `
          <button class="highlight-in-page-btn" data-quote="${encodeURIComponent(cl.exact_quote)}" data-seg="${cl.segment_id || ''}">
            📍 Sayfada Vurgula
          </button>
        ` : ''}
      </footer>
    `;

    // Add in-page highlight event
    const highlightBtn = card.querySelector('.highlight-in-page-btn');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', () => {
        const quote = decodeURIComponent(highlightBtn.getAttribute('data-quote'));
        const segmentId = highlightBtn.getAttribute('data-seg');
        if (currentTabId && typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.sendMessage(currentTabId, {
            action: 'HIGHLIGHT_SEGMENT',
            quote,
            segmentId
          });
        } else if (window.parent && window.parent.document) {
          const frame = window.parent.document.getElementById('page-frame');
          if (frame && frame.contentDocument) {
            let el = segmentId ? frame.contentDocument.querySelector(`[data-tos-id="${segmentId}"]`) : null;
            if (!el) {
              const snippet = quote.slice(0, 30).toLowerCase();
              const candidates = frame.contentDocument.querySelectorAll('p, div, li, span');
              for (const c of candidates) {
                if (c.textContent.toLowerCase().includes(snippet)) { el = c; break; }
              }
            }
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('tos-guard-highlight', 'tos-guard-highlight-pulse');
              setTimeout(() => el.classList.remove('tos-guard-highlight-pulse'), 3500);
            }
          }
        }
      });
    }

    container.appendChild(card);
  });
}

function copyJsonReport() {
  if (!currentReport) return;
  navigator.clipboard.writeText(JSON.stringify(currentReport, null, 2))
    .then(() => alert('Rapor JSON olarak panoya kopyalandı!'))
    .catch(() => alert('Kopyalama başarısız oldu.'));
}

function copyMarkdownReport() {
  if (!currentReport) return;

  const md = `# ToS-Guard Risk Analiz Raporu: ${currentReport.tos_title}
**Tarih:** ${currentReport.analyzed_at || new Date().toISOString()}
**Risk Skoru:** ${currentReport.overall_risk_score}/100 (${currentReport.risk_level})
**Prompt Injection Koruması:** ${currentReport.prompt_injection_detected ? '⚠️ Saldırı Tespit Edildi ve Engellendi' : '✓ Güvenli'}

## Sade Türkçe Özet
${currentReport.summary_tr}

${currentReport.uncertainty_notes ? `## Belirsizlik ve Çelişki Notları\n${currentReport.uncertainty_notes}\n` : ''}

## Doğrulanmış Riskli Maddeler (${(currentReport.verified_clauses || []).length})
${(currentReport.verified_clauses || []).map((c, i) => `### ${i + 1}. [${c.severity}] ${c.category}
> "${c.exact_quote}"

- **Açıklama:** ${c.explanation_tr}
- **Risk Gerekçesi:** ${c.risk_reason}
- **Doğrulama:** Orijinal DOM metninde teyit edildi.
`).join('\n')}

---
*${currentReport.legal_disclaimer}*
`;

  navigator.clipboard.writeText(md)
    .then(() => alert('Rapor Markdown formatında panoya kopyalandı!'))
    .catch(() => alert('Kopyalama başarısız oldu.'));
}

function showError(msg) {
  alert(`Hata: ${msg}`);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
