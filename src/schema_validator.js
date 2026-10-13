/**
 * ToS-Guard JSON Schema & Deterministic Validator
 * 
 * Enforces structured outputs from LLM. No free text output allowed.
 * Validates data types, ranges, enums, required fields, and legal disclaimer.
 */

class SchemaValidator {
  constructor() {
    this.ALLOWED_RISK_LEVELS = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
    this.ALLOWED_CATEGORIES = [
      'Veri ve Gizlilik',
      'Fikri Mülkiyet & Lisans',
      'Tahkim ve Yargı Yetkisi',
      'Otomatik Yenileme ve Ücretlendirme',
      'Tek Taraflı Değişiklik ve Fesih',
      'Sorumluluk Sınırlandırması',
      'Diğer'
    ];
    this.MANDATORY_DISCLAIMER_PHRASE = 'hukuki tavsiye';
  }

  /**
   * Attempts to parse raw LLM text into a JSON object.
   * Handles markdown codeblocks, prefix/suffix text, or escaped quotes.
   * @param {string} rawResponse
   * @returns {{success: boolean, data: any, error?: string}}
   */
  parseJSON(rawResponse) {
    if (typeof rawResponse === 'object' && rawResponse !== null) {
      return { success: true, data: rawResponse };
    }

    if (!rawResponse || typeof rawResponse !== 'string') {
      return { success: false, data: null, error: 'Boş veya geçersiz yanıt metni' };
    }

    let text = rawResponse.trim();

    // Remove markdown code fences if present
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // Try finding JSON object boundaries '{' ... '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(text);
      return { success: true, data: parsed };
    } catch (err) {
      return { success: false, data: null, error: `JSON ayrıştırma hatası: ${err.message}` };
    }
  }

  /**
   * Deterministically validates an object against the ToS Risk Report schema.
   * @param {any} data
   * @returns {{isValid: boolean, errors: string[], sanitized: Object}}
   */
  validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['Veri kökü bir JSON nesnesi olmalıdır.'],
        sanitized: null
      };
    }

    const sanitized = {};

    // 1. tos_title
    if (typeof data.tos_title === 'string' && data.tos_title.trim().length > 0) {
      sanitized.tos_title = data.tos_title.trim();
    } else {
      sanitized.tos_title = 'Hüküm ve Koşullar Belgesi';
      errors.push('Eksik "tos_title", varsayılan atandı.');
    }

    // 2. overall_risk_score (0-100)
    let score = parseInt(data.overall_risk_score, 10);
    if (isNaN(score)) {
      errors.push('"overall_risk_score" sayı olmalıdır.');
      score = 50;
    } else {
      score = Math.max(0, Math.min(100, score));
    }
    sanitized.overall_risk_score = score;

    // 3. risk_level
    if (this.ALLOWED_RISK_LEVELS.includes(data.risk_level)) {
      sanitized.risk_level = data.risk_level;
    } else {
      // Derive level from score
      if (score >= 75) sanitized.risk_level = 'Kritik';
      else if (score >= 50) sanitized.risk_level = 'Yüksek';
      else if (score >= 25) sanitized.risk_level = 'Orta';
      else sanitized.risk_level = 'Düşük';
    }

    // 4. summary_tr
    if (typeof data.summary_tr === 'string' && data.summary_tr.trim().length >= 15) {
      sanitized.summary_tr = data.summary_tr.trim();
    } else {
      sanitized.summary_tr = 'Bu sözleşme için sade Türkçe özet oluşturuldu.';
      errors.push('"summary_tr" çok kısa veya eksik.');
    }

    // 5. uncertainty_notes
    sanitized.uncertainty_notes = typeof data.uncertainty_notes === 'string' ? data.uncertainty_notes.trim() : '';

    // 6. prompt_injection_detected
    sanitized.prompt_injection_detected = Boolean(data.prompt_injection_detected);
    sanitized.injection_indicators = Array.isArray(data.injection_indicators) ? data.injection_indicators : [];

    // 7. legal_disclaimer
    const requiredDisclaimer = 'UYARI: Bu uygulama hukuki tavsiye vermez. Yalnızca yapay zeka tabanlı bilgilendirme raporudur.';
    if (typeof data.legal_disclaimer === 'string' && data.legal_disclaimer.toLowerCase().includes(this.MANDATORY_DISCLAIMER_PHRASE)) {
      sanitized.legal_disclaimer = data.legal_disclaimer.trim();
    } else {
      sanitized.legal_disclaimer = requiredDisclaimer;
    }

    // 8. flagged_clauses array
    sanitized.flagged_clauses = [];
    if (!Array.isArray(data.flagged_clauses)) {
      errors.push('"flagged_clauses" bir dizi (array) olmalıdır.');
    } else {
      data.flagged_clauses.forEach((item, index) => {
        const clauseErrors = [];
        if (!item || typeof item !== 'object') {
          errors.push(`Madde #${index + 1} geçerli bir nesne değil.`);
          return;
        }

        const clauseId = item.id ? String(item.id) : `clause-${index + 1}`;
        const category = this.ALLOWED_CATEGORIES.includes(item.category) ? item.category : 'Diğer';
        const severity = this.ALLOWED_RISK_LEVELS.includes(item.severity) ? item.severity : 'Orta';

        const exactQuote = typeof item.exact_quote === 'string' ? item.exact_quote.trim() : '';
        if (!exactQuote || exactQuote.length < 5) {
          clauseErrors.push(`Madde #${clauseId}: exact_quote zorunludur ve en az 5 karakter olmalıdır.`);
        }

        const explanationTr = typeof item.explanation_tr === 'string' ? item.explanation_tr.trim() : '';
        if (!explanationTr || explanationTr.length < 5) {
          clauseErrors.push(`Madde #${clauseId}: explanation_tr sade Türkçe açıklama zorunludur.`);
        }

        const riskReason = typeof item.risk_reason === 'string' ? item.risk_reason.trim() : 'Kullanıcı aleyhine koşul';
        const confidence = typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.85;

        if (clauseErrors.length === 0) {
          sanitized.flagged_clauses.push({
            id: clauseId,
            category,
            severity,
            exact_quote: exactQuote,
            explanation_tr: explanationTr,
            risk_reason: riskReason,
            confidence
          });
        } else {
          errors.push(...clauseErrors);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchemaValidator;
} else if (typeof window !== 'undefined') {
  window.SchemaValidator = SchemaValidator;
}
