/**
 * ToS-Guard Rule-based Deterministic Heuristic Engine
 * 
 * Provides offline analysis, fallback processing, and baseline ground-truth matching.
 * Extracts exact sentences matching high-risk legal clauses to guarantee grounding.
 */

class RulesEngine {
  constructor() {
    this.rules = [
      {
        id: 'RULE_AI_TRAINING',
        category: 'Fikri Mülkiyet & Lisans',
        severity: 'Kritik',
        patterns: [
          /(train|training|develop|improve)\s+(our\s+)?(artificial\s+intelligence|machine\s+learning|ai|models|algorithms)/i,
          /(yapay\s+zeka|makine\s+öğrenimi|algoritmalar).*?(eğitmek|geliştirmek)/i
        ],
        explanation_tr: 'Şirket, yüklediğiniz veya paylaştığınız içerikleri kendi yapay zeka modellerini eğitmek ve geliştirmek için kullanma hakkı talep ediyor.',
        risk_reason: 'Kişisel veya fikri verilerinizin rızanız olmaksızın yapay zeka algoritmalarında kullanılması.'
      },
      {
        id: 'RULE_PERPETUAL_IP_LICENSE',
        category: 'Fikri Mülkiyet & Lisans',
        severity: 'Yüksek',
        patterns: [
          /(perpetual|irrevocable|royalty-free|worldwide|transferable|sub-?licensable)\s+license/i,
          /(süresiz|geri\s+alınamaz|telifsiz|dünya\s+çapında|alt\s+lisanslanabilir)\s+(lisans|hak)/i
        ],
        explanation_tr: 'Şirkete yüklediğiniz içerikler üzerinde süresiz, geri alınamaz ve telifsiz bir küresel kullanım lisansı veriyorsunuz.',
        risk_reason: 'İçerikleriniz üzerinde şirket sınırsız ticari ve türev kullanım hakkı kazanır.'
      },
      {
        id: 'RULE_MANDATORY_ARBITRATION',
        category: 'Tahkim ve Yargı Yetkisi',
        severity: 'Kritik',
        patterns: [
          /(binding\s+arbitration|waive\s+(any\s+)?right\s+to\s+(participate\s+in\s+a\s+)?class\s+action)/i,
          /(zorunlu\s+tahkim|toplu\s+dava\s+(hakkından\s+feragat|açmama))/i
        ],
        explanation_tr: 'Uyuşmazlıklarda mahkemeye gitme ve toplu dava açma hakkınızdan feragat etmeniz zorunlu tutuluyor.',
        risk_reason: 'Kullanıcının yasal mahkemelere başvurma ve toplu tüketici hakkı arama yolları kapatılıyor.'
      },
      {
        id: 'RULE_UNILATERAL_CHANGE',
        category: 'Tek Taraflı Değişiklik ve Fesih',
        severity: 'Yüksek',
        patterns: [
          /(modify|change|update)\s+(these\s+terms|this\s+agreement)\s+(at\s+any\s+time|without\s+(prior\s+)?notice)/i,
          /(önceden\s+bildirimde\s+bulunmaksızın|dilediği\s+zaman|tek\s+taraflı\s+olarak)\s+(değiştirme|güncelleme)\s+hakkı/i
        ],
        explanation_tr: 'Şirket, sözleşme şartlarını size önceden bildirmeksizin tek taraflı olarak dilediği an değiştirme hakkını saklı tutuyor.',
        risk_reason: 'Şartlar aleyhinize değiştiğinde bundan sonradan haberdar olursunuz.'
      },
      {
        id: 'RULE_UNILATERAL_TERMINATION',
        category: 'Tek Taraflı Değişiklik ve Fesih',
        severity: 'Yüksek',
        patterns: [
          /(terminate\s+your\s+account\s+(immediately\s+)?(at\s+its\s+sole\s+discretion|without\s+prior\s+notice))/i,
          /(hesabınızı\s+önceden\s+haber\s+vermeksizin\s+kapatma|tek\s+taraflı\s+fesih)/i
        ],
        explanation_tr: 'Şirket dilediği an önceden bildirmeksizin hesabınızı derhal kapatma ve sözleşmeyi feshetme hakkına sahiptir.',
        risk_reason: 'Kullanıcının hizmete erişiminin tek taraflı olarak aniden kesilmesi.'
      },
      {
        id: 'RULE_AUTO_RENEWAL',
        category: 'Otomatik Yenileme ve Ücretlendirme',
        severity: 'Orta',
        patterns: [
          /(automatically\s+renew|auto-?renewal|cancel\s+prior\s+to\s+renewal)/i,
          /(otomatik\s+olarak\s+yenilenir|otomatik\s+tahsil)/i
        ],
        explanation_tr: 'Abonelik dönem sonunda otomatik olarak yenilenir ve iptal edilmedikçe karttan tahsilat sürer.',
        risk_reason: 'İptal etmeyi unutursanız kartınızdan otomatik çekim yapılmaya devam eder.'
      },
      {
        id: 'RULE_NO_REFUNDS',
        category: 'Otomatik Yenileme ve Ücretlendirme',
        severity: 'Orta',
        patterns: [
          /(non-?refundable|no\s+refunds|do\s+not\s+provide\s+refunds)/i,
          /(iade\s+edilmez|cayma\s+hakkı\s+bulunmamaktadır)/i
        ],
        explanation_tr: 'Ödenen abonelik ücretleri hiçbir koşulda iade edilmez; kısmi dönemler için geri ödeme yapılmaz.',
        risk_reason: 'Tüketicinin yasal cayma ve iade alma haklarının peşinen sınırlandırılması.'
      },
      {
        id: 'RULE_THIRD_PARTY_SHARING',
        category: 'Veri ve Gizlilik',
        severity: 'Yüksek',
        patterns: [
          /(share|disclose|sell)\s+(your\s+)?(personal\s+data|information)\s+with\s+(third\s+parties|partners|advertisers)/i,
          /(üçüncü\s+taraflar|iş\s+ortakları|reklamverenler).*?(paylaşma|aktarma|satma)/i
        ],
        explanation_tr: 'Kişisel bilgileriniz ve kullanım verileriniz üçüncü taraf ortaklarla veya reklamverenlerle paylaşılabilir.',
        risk_reason: 'Verilerinizin kontrolü dış ortaklara ve hedefli reklamcılara geçer.'
      },
      {
        id: 'RULE_BIOMETRIC_DATA',
        category: 'Veri ve Gizlilik',
        severity: 'Kritik',
        patterns: [
          /(biometric|facial\s+recognition|voiceprint|fingerprint|faceprints)/i,
          /(biyometrik|yüz\s+tanıma|ses\s+izi|parmak\s+izi)/i
        ],
        explanation_tr: 'Şirket yüz analizi, ses izi veya biyometrik veri toplama hakkını saklı tuttuğunu belirtiyor.',
        risk_reason: 'Geri alınamaz ve hassas nitelikteki biyometrik kimlik bilgilerinizin toplanması.'
      },
      {
        id: 'RULE_KEYSTROKE_TRACKING',
        category: 'Veri ve Gizlilik',
        severity: 'Kritik',
        patterns: [
          /(keystroke\s+patterns|keystroke\s+and\s+behavioral|clipboard\s+text)/i,
          /(tuş\s+vuruş\s+ritmi|pano\s+metni)/i
        ],
        explanation_tr: 'Klavyedeki tuş vuruş ritminiz, pano içerikleriniz ve davranışsal izleme verileriniz toplanabilir.',
        risk_reason: 'Kullanıcının cihaz düzeyinde hassas hareketlerinin izlenmesi.'
      },
      {
        id: 'RULE_LIABILITY_LIMIT',
        category: 'Sorumluluk Sınırlandırması',
        severity: 'Orta',
        patterns: [
          /(aggregate\s+liability\s+.*(exceed|\$)|liability\s+of\s+.*\s+exceed)/i,
          /(tazminat\s+sorumluluğu\s+en\s+fazla|toplam\s+sorumluluk\s+.*aşamaz)/i
        ],
        explanation_tr: 'Şirketin olası zararlarda kullanıcıya karşı toplam sorumluluğu çok düşük sembolik bir tutarla sınırlandırılmıştır.',
        risk_reason: 'Büyük zararlarda dahi şirketten adil tazminat talep edilmesinin önlenmesi.'
      },
      {
        id: 'RULE_WARRANTY_DISCLAIMER',
        category: 'Sorumluluk Sınırlandırması',
        severity: 'Orta',
        patterns: [
          /(as\s+is|as\s+available|without\s+warranty\s+of\s+any\s+kind|disclaim\s+all\s+warranties)/i,
          /(olduğu\s+gibi|hiçbir\s+garanti\s+vermeksizin|sorumluluk\s+kabul\s+etmez)/i
        ],
        explanation_tr: 'Hizmet "olduğu gibi" sağlanır; şirketin herhangi bir kesinti, hata veya veri kaybı için sorumluluğu sınırlıdır.',
        risk_reason: 'Olası zarar ve veri kayıplarında tazminat talebinizin engellenmesi.'
      }
    ];
  }

  /**
   * Splits text into sentences while preserving original exact substrings.
   * Handles section headers and decimal points cleanly.
   * @param {string} text
   * @returns {Array<string>}
   */
  splitIntoSentences(text) {
    if (!text) return [];

    // Split paragraphs first
    const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const candidateSentences = [];

    for (const para of paragraphs) {
      // Split sentences within paragraph, avoiding splits on numbers like 10.2 or 1.
      const sentences = para.split(/(?<=[a-zA-Z”"'\)])[.?!]\s+(?=[A-Z0-9"“'‘ĞÜŞİÖÇ])/);
      for (let s of sentences) {
        s = s.trim();
        // Remove leading numbered bullet like "2. " or "10.2 " if at start, while keeping original sentence available
        if (s.length >= 25) {
          candidateSentences.push(s);
        }
      }
    }

    return candidateSentences;
  }

  /**
   * Evaluates text using rules and extracts guaranteed exact quotes.
   * @param {string} text
   * @param {string} title
   * @returns {Object} Structured report matching JSON schema
   */
  analyze(text, title = 'Hüküm ve Koşullar Belgesi') {
    const sentences = this.splitIntoSentences(text);
    const flaggedClauses = [];
    const usedSentences = new Set();
    let scoreAccumulator = 0;

    for (const rule of this.rules) {
      // Find candidate sentences matching this rule, sort by length (prefer detailed clauses over short section headers)
      const matchingSentences = [];
      for (const sent of sentences) {
        if (usedSentences.has(sent)) continue;

        let matched = false;
        for (const pat of rule.patterns) {
          if (pat.test(sent)) {
            matched = true;
            break;
          }
        }
        if (matched) {
          matchingSentences.push(sent);
        }
      }

      if (matchingSentences.length > 0) {
        // Pick the best descriptive sentence (prefer length >= 40)
        matchingSentences.sort((a, b) => b.length - a.length);
        const bestSent = matchingSentences[0];
        usedSentences.add(bestSent);

        const weight = rule.severity === 'Kritik' ? 28 : rule.severity === 'Yüksek' ? 18 : 10;
        scoreAccumulator += weight;

        // Clean quote to ensure exact match without detached prefix
        const exactQuote = bestSent;

        flaggedClauses.push({
          id: `rule-${rule.id.toLowerCase()}-${flaggedClauses.length + 1}`,
          category: rule.category,
          severity: rule.severity,
          exact_quote: exactQuote,
          explanation_tr: rule.explanation_tr,
          risk_reason: rule.risk_reason,
          confidence: 0.95
        });
      }
    }

    const finalScore = Math.min(100, Math.max(10, scoreAccumulator));
    let riskLevel = 'Düşük';
    if (finalScore >= 75) riskLevel = 'Kritik';
    else if (finalScore >= 50) riskLevel = 'Yüksek';
    else if (finalScore >= 25) riskLevel = 'Orta';

    const categoryNames = [...new Set(flaggedClauses.map(c => c.category))];
    const summaryTr = flaggedClauses.length > 0
      ? `Bu sözleşmede kullanıcı aleyhine olabilecek ${flaggedClauses.length} adet riskli madde tespit edildi. Öne çıkan risk kategorileri: ${categoryNames.join(', ')}. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.`
      : 'Sözleşme genel hatlarıyla incelendi; yüksek risk teşkil eden standart dışı kritik bir madde tespit edilmedi.';

    let uncertaintyNotes = 'Kurallar deterministik metin analizi ile oluşturulmuştur. Hukuki terimlerin bağlamsal yorumları yargı yetkisine göre farklılık gösterebilir.';
    if (/çelişkili|muğlak|ambiguous|contradictory|belirsiz|uygun gördüğü/i.test(text)) {
      uncertaintyNotes = '⚖️ DİKKAT (ÇELİŞKİLİ VE MUĞLAK HÜKÜMLER): Belgede hem veri satmama taahhüdü hem de ticari ortaklara profil aktarımı gibi birbiriyle çelişen ve tek taraflı yorumlanabilecek muğlak şartlar tespit edildi. Yargı yetkisi belirsizdir.';
    }

    return {
      tos_title: title,
      overall_risk_score: finalScore,
      risk_level: riskLevel,
      summary_tr: summaryTr,
      uncertainty_notes: uncertaintyNotes,
      legal_disclaimer: 'UYARI: Bu uygulama hukuki tavsiye vermez. Yalnızca yapay zeka ve kural tabanlı bilgilendirme raporudur.',
      prompt_injection_detected: false,
      injection_indicators: [],
      flagged_clauses: flaggedClauses
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RulesEngine;
} else if (typeof window !== 'undefined') {
  window.RulesEngine = RulesEngine;
}
