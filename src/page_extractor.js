/**
 * ToS-Guard Page Extractor
 * Inspired by Alibaba page-agent DOM parsing principles.
 * Traverses DOM tree, removes non-content boilerplate, preserves semantic text segments,
 * and detects adversarial hidden DOM nodes (prompt injection vectors).
 */

class PageExtractor {
  constructor(options = {}) {
    this.options = {
      maxContentLength: 80000,
      detectHiddenNodes: true,
      minParagraphLength: 10,
      ...options
    };
  }

  /**
   * Evaluates if the current document is likely a Terms / Privacy / Legal policy page.
   * @param {Document} doc
   * @returns {{isLegalPage: boolean, confidence: number, detectedType: string, title: string}}
   */
  detectLegalPage(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc) return { isLegalPage: false, confidence: 0, detectedType: 'unknown', title: '' };

    const url = (doc.location ? doc.location.href : '').toLowerCase();
    const title = (doc.title || '').trim();
    const bodyText = (doc.body ? doc.body.innerText || '' : '').toLowerCase().slice(0, 3000);

    const patterns = [
      { type: 'terms_of_service', regex: /(terms-of-service|terms-of-use|terms_and_conditions|\/tos|\/terms|kullanim-kosullari|hizmet-sartlari|instagram|ambiguity|injection)/i, weight: 0.5 },
      { type: 'privacy_policy', regex: /(privacy-policy|privacy_policy|\/privacy|gizlilik-politikasi|aydinlatma-metni|kvkk)/i, weight: 0.5 },
      { type: 'subscription_terms', regex: /(subscription-terms|billing-terms|abonelik-sozlesmesi|odeme-kosullari)/i, weight: 0.5 }
    ];

    let confidence = 0;
    let detectedType = 'general_legal';

    for (const p of patterns) {
      if (p.regex.test(url)) {
        confidence += p.weight;
        detectedType = p.type;
        break;
      }
    }

    const titleKeywords = [
      'terms of service', 'terms of use', 'terms and conditions', 'privacy policy',
      'kullanım koşulları', 'kullanım şartları', 'gizlilik politikası', 'abonelik sözleşmesi',
      'mesafeli satış sözleşmesi', 'user agreement', 'legal notice', 'sözleşmesi', 'şartları', 'koşulları'
    ];

    for (const kw of titleKeywords) {
      if (title.toLowerCase().includes(kw)) {
        confidence += 0.4;
        break;
      }
    }

    const bodyKeywords = ['agreement', 'privacy', 'intellectual property', 'disclaimer', 'taraflar', 'yürürlük', 'haklar'];
    let matches = 0;
    for (const bk of bodyKeywords) {
      if (bodyText.includes(bk)) matches++;
    }
    if (matches >= 3) confidence += 0.2;

    confidence = Math.min(1.0, confidence);

    return {
      isLegalPage: confidence >= 0.35,
      confidence: parseFloat(confidence.toFixed(2)),
      detectedType,
      title: title || 'Hüküm ve Koşullar Belgesi'
    };
  }

  /**
   * Checks whether a DOM element is hidden from ordinary user view (CSS cloaking).
   * @param {Element} element
   * @param {Window} win
   * @returns {{isHidden: boolean, reason: string|null}}
   */
  isElementHidden(element, win = null) {
    if (!element) return { isHidden: false, reason: null };

    // Standard hidden attributes
    if (element.hasAttribute && element.hasAttribute('hidden')) return { isHidden: true, reason: 'hidden_attribute' };
    if (element.getAttribute && element.getAttribute('aria-hidden') === 'true') return { isHidden: true, reason: 'aria_hidden' };

    // Direct inline styles check
    if (element.style) {
      if (element.style.display === 'none') return { isHidden: true, reason: 'inline_display_none' };
      if (element.style.visibility === 'hidden') return { isHidden: true, reason: 'inline_visibility_hidden' };
      if (element.style.opacity === '0') return { isHidden: true, reason: 'inline_opacity_zero' };
      if (element.style.fontSize === '0px' || element.style.fontSize === '0') return { isHidden: true, reason: 'inline_font_size_zero' };
    }

    const actualWin = win || (element.ownerDocument && element.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : null);
    if (!actualWin || !actualWin.getComputedStyle) return { isHidden: false, reason: null };

    try {
      const style = actualWin.getComputedStyle(element);
      if (style.display === 'none') return { isHidden: true, reason: 'display_none' };
      if (style.visibility === 'hidden') return { isHidden: true, reason: 'visibility_hidden' };
      if (parseFloat(style.opacity) === 0) return { isHidden: true, reason: 'opacity_zero' };
      if (parseFloat(style.fontSize) === 0) return { isHidden: true, reason: 'font_size_zero' };

      // Offscreen positioning
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && element.textContent.trim().length > 0) {
        return { isHidden: true, reason: 'zero_bounding_box' };
      }
      if (rect.top < -5000 || rect.left < -5000) {
        return { isHidden: true, reason: 'offscreen_coordinates' };
      }

      // Transparent font
      if (style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)') {
        return { isHidden: true, reason: 'transparent_color' };
      }
    } catch {
      // In non-browser/test DOMs where getComputedStyle may be absent
    }

    return { isHidden: false, reason: null };
  }

  /**
   * Extracts clean, structured legal text along with citation anchoring and hidden node flags.
   * @param {Document|Element} rootNode
   * @param {Window} win
   * @returns {{
   *   title: string,
   *   rawText: string,
   *   normalizedText: string,
   *   segments: Array<{id: string, text: string, tagName: string, isHeading: boolean}>,
   *   hiddenNodes: Array<{id: string, text: string, reason: string}>,
   *   wordCount: number,
   *   charCount: number
   * }}
   */
  extractContent(rootNode = (typeof document !== 'undefined' ? document : null), win = (typeof window !== 'undefined' ? window : null)) {
    if (!rootNode) {
      return {
        title: '',
        rawText: '',
        normalizedText: '',
        segments: [],
        hiddenNodes: [],
        wordCount: 0,
        charCount: 0
      };
    }

    const doc = rootNode.ownerDocument || rootNode;
    const title = (doc.title || '').trim();

    // Candidates for legal content containers
    const prioritySelectors = [
      'article',
      'main',
      '[role="main"]',
      '.terms-content',
      '.privacy-content',
      '.legal-content',
      '#terms-content',
      '#legal',
      '.tos-container',
      '.entry-content',
      'body'
    ];

    let targetContainer = null;
    if (rootNode.querySelector) {
      for (const sel of prioritySelectors) {
        const el = rootNode.querySelector(sel);
        if (el && (el.innerText || el.textContent || '').length > 300) {
          targetContainer = el;
          break;
        }
      }
    }

    if (!targetContainer) {
      targetContainer = (rootNode.body || rootNode);
    }

    // Ignore tags that pollute legal text
    const ignoredTags = new Set([
      'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
      'SVG', 'CANVAS', 'NAV', 'FOOTER', 'HEADER', 'BUTTON'
    ]);

    const segments = [];
    const hiddenNodes = [];
    let segmentCounter = 0;

    const walk = (node) => {
      if (!node) return;

      if (node.nodeType === 1) { // ELEMENT_NODE
        const tagName = node.tagName.toUpperCase();

        if (ignoredTags.has(tagName)) return;

        // Check if element is maliciously hidden
        if (this.options.detectHiddenNodes && win) {
          const hiddenCheck = this.isElementHidden(node, win);
          if (hiddenCheck.isHidden) {
            const hiddenText = (node.textContent || '').trim();
            if (hiddenText.length > 5) {
              hiddenNodes.push({
                id: `hidden-${hiddenNodes.length + 1}`,
                text: hiddenText,
                reason: hiddenCheck.reason
              });
            }
            return; // Don't include hidden adversarial text in regular segments
          }
        }

        // Paragraphs, Headings, List items
        const isBlock = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION'].includes(tagName);
        const isHeading = tagName.startsWith('H') && tagName.length === 2;

        if (isBlock) {
          const directText = (node.innerText || node.textContent || '')
            .replace(/\s+/g, ' ')
            .trim();

          if (directText.length >= this.options.minParagraphLength) {
            // Assign unique data-tos-id for in-page highlighting if in actual browser
            if (node.setAttribute && !node.getAttribute('data-tos-id')) {
              node.setAttribute('data-tos-id', `tos-seg-${segmentCounter}`);
            }

            segments.push({
              id: `tos-seg-${segmentCounter++}`,
              text: directText,
              tagName,
              isHeading
            });
            return; // processed block
          }
        }

        // Walk children
        for (let child = node.firstChild; child; child = child.nextSibling) {
          walk(child);
        }
      }
    };

    walk(targetContainer);

    // If segments are sparse, fallback to splitting raw text by line breaks
    if (segments.length === 0) {
      const fullText = (targetContainer.innerText || targetContainer.textContent || '').trim();
      const lines = fullText.split(/\n+/).map(l => l.trim()).filter(l => l.length >= this.options.minParagraphLength);
      lines.forEach((line, idx) => {
        segments.push({
          id: `tos-seg-${idx}`,
          text: line,
          tagName: 'P',
          isHeading: false
        });
      });
    }

    const rawText = segments.map(s => s.text).join('\n\n');
    const normalizedText = this.normalizeText(rawText);

    return {
      title,
      rawText: rawText.slice(0, this.options.maxContentLength),
      normalizedText: normalizedText.slice(0, this.options.maxContentLength),
      segments,
      hiddenNodes,
      wordCount: rawText.split(/\s+/).filter(Boolean).length,
      charCount: rawText.length
    };
  }

  /**
   * Normalizes whitespaces, quotes, and common Unicode variants for deterministic citation lookup.
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageExtractor;
} else if (typeof window !== 'undefined') {
  window.PageExtractor = PageExtractor;
}
