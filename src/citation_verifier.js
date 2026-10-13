/**
 * ToS-Guard Citation & Grounding Verifier
 * 
 * Enforces strict grounding against the original DOM text:
 * "Her riskli madde, orijinal metinden birebir alıntı ile gösterilmeli. Alıntısı olmayan iddia geçersiz sayılır."
 * 
 * - Deterministically verifies that exact_quote exists in the extracted DOM text.
 * - Rejects hallucinated claims or mismatched quotes.
 * - Resolves DOM segment IDs for visual in-page highlighting.
 * - Recalculates verified risk scores purely from grounded clauses.
 */

class CitationVerifier {
  constructor(options = {}) {
    this.options = {
      minQuoteLength: 10,
      fuzzyThreshold: 0.90,
      ...options
    };
  }

  /**
   * Normalizes text for robust comparison (handles punctuation, non-breaking spaces, curly quotes).
   * @param {string} text
   * @returns {string}
   */
  normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Finds the best matching segment among DOM segments.
   * @param {string} quote
   * @param {Array<{id: string, text: string}>} segments
   * @returns {{segmentId: string|null, matchConfidence: number}}
   */
  findMatchingSegment(quote, segments = []) {
    if (!quote || !segments || segments.length === 0) {
      return { segmentId: null, matchConfidence: 0 };
    }

    const normQuote = this.normalize(quote);

    for (const seg of segments) {
      const normSeg = this.normalize(seg.text);
      if (normSeg.includes(normQuote) || normQuote.includes(normSeg)) {
        return { segmentId: seg.id, matchConfidence: 1.0 };
      }
    }

    // Substring token overlap heuristic
    const quoteWords = normQuote.split(' ').filter(w => w.length > 3);
    if (quoteWords.length === 0) return { segmentId: null, matchConfidence: 0 };

    let bestSeg = null;
    let maxOverlap = 0;

    for (const seg of segments) {
      const normSeg = this.normalize(seg.text);
      let matchCount = 0;
      for (const w of quoteWords) {
        if (normSeg.includes(w)) matchCount++;
      }
      const overlap = matchCount / quoteWords.length;
      if (overlap > maxOverlap && overlap >= this.options.fuzzyThreshold) {
        maxOverlap = overlap;
        bestSeg = seg.id;
      }
    }

    return {
      segmentId: bestSeg,
      matchConfidence: parseFloat(maxOverlap.toFixed(2))
    };
  }

  /**
   * Verifies all flagged clauses against the source text.
   * @param {Array<Object>} flaggedClauses
   * @param {string} sourceText
   * @param {Array<{id: string, text: string}>} segments
   * @returns {{
   *   verifiedClauses: Array<Object>,
   *   invalidClauses: Array<Object>,
   *   verificationRate: number,
   *   verifiedRiskScore: number,
   *   verifiedRiskLevel: string,
   *   verificationSummaryTr: string
   * }}
   */
  verifyClauses(flaggedClauses = [], sourceText = '', segments = []) {
    const normSource = this.normalize(sourceText);
    const verifiedClauses = [];
    const invalidClauses = [];

    for (const clause of flaggedClauses) {
      const quote = clause.exact_quote ? clause.exact_quote.trim() : '';

      // Check 1: Empty or too short quote
      if (!quote || quote.length < this.options.minQuoteLength) {
        invalidClauses.push({
          ...clause,
          is_verified: false,
          verification_status: 'INVALID_MISSING_QUOTE',
          rejection_reason: 'Alıntı çok kısa veya sağlanmadı. Modelin dayanaksız iddiası reddedildi.'
        });
        continue;
      }

      const normQuote = this.normalize(quote);

      // Check 2: Exact containment in normalized source text
      const exactFound = normSource.includes(normQuote);
      let fuzzyMatch = false;
      let matchedSegmentId = null;
      let confidence = 0;

      if (exactFound) {
        confidence = 1.0;
        const segResult = this.findMatchingSegment(quote, segments);
        matchedSegmentId = segResult.segmentId;
      } else {
        // Try segment search with fuzzy threshold
        const segResult = this.findMatchingSegment(quote, segments);
        if (segResult.matchConfidence >= this.options.fuzzyThreshold) {
          fuzzyMatch = true;
          confidence = segResult.matchConfidence;
          matchedSegmentId = segResult.segmentId;
        }
      }

      if (exactFound || fuzzyMatch) {
        verifiedClauses.push({
          ...clause,
          is_verified: true,
          verification_status: 'VERIFIED',
          match_type: exactFound ? 'EXACT_SUBSTRING' : 'HIGH_CONFIDENCE_FUZZY',
          grounding_confidence: confidence,
          segment_id: matchedSegmentId
        });
      } else {
        invalidClauses.push({
          ...clause,
          is_verified: false,
          verification_status: 'INVALID_UNFOUND_QUOTE',
          rejection_reason: 'Alıntı kaynak web sayfasında bulunamadı. Yapay zeka halüsinasyonu elendi.'
        });
      }
    }

    const totalClaims = flaggedClauses.length;
    const verificationRate = totalClaims > 0 ? parseFloat((verifiedClauses.length / totalClaims).toFixed(2)) : 1.0;

    // Deterministic recalculated risk score from grounded clauses ONLY
    let calculatedScore = 0;
    const weights = {
      'Kritik': 32,
      'Yüksek': 18,
      'Orta': 10,
      'Düşük': 4
    };

    for (const vc of verifiedClauses) {
      calculatedScore += (weights[vc.severity] || 10);
    }
    calculatedScore = Math.min(100, Math.max(5, calculatedScore));

    let verifiedRiskLevel = 'Düşük';
    if (calculatedScore >= 75) verifiedRiskLevel = 'Kritik';
    else if (calculatedScore >= 50) verifiedRiskLevel = 'Yüksek';
    else if (calculatedScore >= 25) verifiedRiskLevel = 'Orta';

    let summaryTr = `Toplam ${totalClaims} maddeden ${verifiedClauses.length} tanesi orijinal metinde doğrulanıp onaylandı.`;
    if (invalidClauses.length > 0) {
      summaryTr += ` ${invalidClauses.length} dayanaksız/kaynaksız iddia elendi.`;
    }

    return {
      verifiedClauses,
      invalidClauses,
      verificationRate,
      verifiedRiskScore: calculatedScore,
      verifiedRiskLevel,
      verificationSummaryTr: summaryTr
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CitationVerifier;
} else if (typeof window !== 'undefined') {
  window.CitationVerifier = CitationVerifier;
}
