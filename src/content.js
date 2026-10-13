/**
 * ToS-Guard Content Script
 * 
 * Works in webpage DOM:
 * - Detects Terms of Service / Privacy pages
 * - Provides DOM extraction for background service worker
 * - Injects floating interactive pill
 * - Smoothly scrolls and highlights exact verified quotes in the live webpage
 */

(function () {
  // Prevent duplicate execution
  if (window.__tosGuardInjected) return;
  window.__tosGuardInjected = true;

  const extractor = new (window.PageExtractor || PageExtractor)();
  let latestReport = null;
  let floatingPill = null;
  let modalCard = null;

  /**
   * Initializes page evaluation and injects floating UI if legal page.
   */
  function init() {
    const pageDetection = extractor.detectLegalPage(document);

    if (pageDetection.isLegalPage) {
      renderFloatingPill(pageDetection);
    }
  }

  /**
   * Renders or updates the bottom-right floating badge.
   */
  function renderFloatingPill(detection) {
    if (floatingPill) return;

    floatingPill = document.createElement('div');
    floatingPill.id = 'tos-guard-floating-pill';
    floatingPill.innerHTML = `
      <span class="tos-pill-icon">🛡️</span>
      <span id="tos-pill-text">ToS-Guard: ${detection.title.slice(0, 24)}...</span>
      <span id="tos-pill-action" style="text-decoration: underline; font-size: 11px;">[Analiz Et]</span>
    `;

    floatingPill.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModalOrAnalyze();
    });

    document.body.appendChild(floatingPill);
  }

  /**
   * Triggers analysis or toggles the in-page report modal.
   */
  function toggleModalOrAnalyze() {
    if (!latestReport) {
      const pillAction = document.getElementById('tos-pill-action');
      if (pillAction) pillAction.textContent = '[Analiz ediliyor...]';

      const extracted = extractor.extractContent(document, window);

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { action: 'ANALYZE_PAGE', extractedData: extracted },
          (response) => {
            if (response && response.success && response.report) {
              latestReport = response.report;
              updatePillWithReport(latestReport);
              showModalCard(latestReport);
            } else {
              if (pillAction) pillAction.textContent = '[Hata - Tekrar Dene]';
            }
          }
        );
      } else {
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: extracted.rawText,
            title: extracted.title,
            hiddenNodes: extracted.hiddenNodes
          })
        })
        .then(r => r.json())
        .then(response => {
          if (response && response.success && response.report) {
            latestReport = response.report;
            updatePillWithReport(latestReport);
            showModalCard(latestReport);
          } else {
            if (pillAction) pillAction.textContent = '[Hata]';
          }
        })
        .catch(() => {
          if (pillAction) pillAction.textContent = '[Hata]';
        });
      }
    } else {
      if (modalCard && modalCard.style.display !== 'none') {
        modalCard.style.display = 'none';
      } else {
        showModalCard(latestReport);
      }
    }
  }

  /**
   * Updates floating pill appearance once analysis finishes.
   */
  function updatePillWithReport(report) {
    if (!floatingPill) return;

    let scoreClass = 'tos-score-low';
    if (report.overall_risk_score >= 75) scoreClass = 'tos-score-critical';
    else if (report.overall_risk_score >= 50) scoreClass = 'tos-score-high';
    else if (report.overall_risk_score >= 25) scoreClass = 'tos-score-medium';

    floatingPill.innerHTML = `
      <span class="tos-pill-icon">🛡️</span>
      <span>Risk Skoru:</span>
      <span class="tos-pill-score ${scoreClass}">${report.overall_risk_score}/100</span>
      <span style="font-size: 11px; opacity: 0.85;">(${report.risk_level})</span>
    `;
  }

  /**
   * Displays an interactive in-page floating summary card.
   */
  function showModalCard(report) {
    if (!modalCard) {
      modalCard = document.createElement('div');
      modalCard.id = 'tos-guard-modal-card';
      document.body.appendChild(modalCard);
    }

    const verifiedListHtml = (report.verified_clauses || []).slice(0, 5).map((cl, i) => `
      <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.04); border-radius: 6px; border-left: 3px solid ${cl.severity === 'Kritik' ? '#ef4444' : '#f59e0b'};">
        <div style="font-weight: 600; font-size: 12px; display: flex; justify-content: space-between;">
          <span>${cl.category}</span>
          <span style="color: ${cl.severity === 'Kritik' ? '#ef4444' : '#f59e0b'};">${cl.severity}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin: 4px 0;">"${cl.exact_quote.slice(0, 90)}..."</div>
        <div style="font-size: 12px; color: #e2e8f0;">${cl.explanation_tr}</div>
        <button class="tos-goto-quote-btn" data-quote="${encodeURIComponent(cl.exact_quote)}" data-seg-id="${cl.segment_id || ''}" style="margin-top: 5px; font-size: 11px; background: #334155; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">
          📍 Sayfada Gör
        </button>
      </div>
    `).join('');

    modalCard.innerHTML = `
      <div class="tos-modal-header">
        <span style="font-weight: 600; font-size: 14px;">🛡️ ToS Risk Özeti</span>
        <button id="tos-modal-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      <div class="tos-modal-body">
        <div style="margin-bottom: 8px;"><strong>Risk Skoru:</strong> ${report.overall_risk_score} / 100 (${report.risk_level})</div>
        <div style="margin-bottom: 10px; color: #cbd5e1;">${report.summary_tr}</div>
        <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px;">Öne Çıkan Maddeler (${report.verified_clauses ? report.verified_clauses.length : 0} doğrulanmış):</div>
        ${verifiedListHtml}
        <div class="tos-disclaimer-badge">
          ⚠️ <strong>Yasal Uyarı:</strong> Bu uygulama hukuki tavsiye (legal advice) niteliği taşımaz. Sadece yapay zeka analizidir.
        </div>
      </div>
    `;

    modalCard.style.display = 'flex';

    modalCard.querySelector('#tos-modal-close').addEventListener('click', () => {
      modalCard.style.display = 'none';
    });

    modalCard.querySelectorAll('.tos-goto-quote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const quote = decodeURIComponent(btn.getAttribute('data-quote'));
        const segId = btn.getAttribute('data-seg-id');
        highlightQuoteInDOM(quote, segId);
      });
    });
  }

  /**
   * Finds and scrolls to text in DOM, applying glow highlight.
   */
  function highlightQuoteInDOM(quote, segmentId) {
    let targetEl = null;

    if (segmentId) {
      targetEl = document.querySelector(`[data-tos-id="${segmentId}"]`);
    }

    if (!targetEl && quote) {
      // Find element containing quote snippet
      const snippet = quote.slice(0, 35).toLowerCase();
      const allParagraphs = document.querySelectorAll('p, li, h1, h2, h3, h4, span, div');
      for (const el of allParagraphs) {
        if (el.children.length === 0 && (el.textContent || '').toLowerCase().includes(snippet)) {
          targetEl = el;
          break;
        }
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.classList.add('tos-guard-highlight', 'tos-guard-highlight-pulse');

      setTimeout(() => {
        targetEl.classList.remove('tos-guard-highlight-pulse');
      }, 3500);
    }
  }

  // Listen for extension messages (if in Chrome extension)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'EXTRACT_DOM') {
        const extracted = extractor.extractContent(document, window);
        sendResponse({ success: true, extractedData: extracted });
        return true;
      }

      if (request.action === 'HIGHLIGHT_SEGMENT') {
        highlightQuoteInDOM(request.quote, request.segmentId);
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'ANALYSIS_COMPLETE') {
        if (request.report) {
          latestReport = request.report;
          updatePillWithReport(latestReport);
        }
        sendResponse({ success: true });
        return true;
      }
    });
  }

  // Window message listener (for test harnesses and iframes)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'HIGHLIGHT_SEGMENT') {
      highlightQuoteInDOM(event.data.quote, event.data.segmentId);
    }
  });

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
