/**
 * ToS-Guard Multi-Provider LLM Client
 * 
 * Supports user-configured API keys for:
 * - OpenAI / Compatible APIs (Ollama, Groq, OpenRouter) with json_object response format
 * - Google Gemini API with application/json mime type
 * - Anthropic Claude API
 * - Offline / Mock fallback (RulesEngine) for instantaneous zero-cost evaluation & testing
 */

const _PromptInjectionGuard = (typeof require !== 'undefined') ? require('./prompt_injection_guard') : (typeof window !== 'undefined' ? window.PromptInjectionGuard : null);
const _SchemaValidator = (typeof require !== 'undefined') ? require('./schema_validator') : (typeof window !== 'undefined' ? window.SchemaValidator : null);
const _RulesEngine = (typeof require !== 'undefined') ? require('./rules_engine') : (typeof window !== 'undefined' ? window.RulesEngine : null);

class LLMClient {
  constructor(config = {}) {
    this.config = {
      provider: 'offline_mock', // 'openai' | 'gemini' | 'anthropic' | 'offline_mock'
      apiKey: '',
      modelName: 'gpt-4o-mini',
      baseUrl: '',
      temperature: 0.1,
      ...config
    };

    const GuardClass = _PromptInjectionGuard || (typeof window !== 'undefined' ? window.PromptInjectionGuard : null);
    const ValidatorClass = _SchemaValidator || (typeof window !== 'undefined' ? window.SchemaValidator : null);
    const RulesClass = _RulesEngine || (typeof window !== 'undefined' ? window.RulesEngine : null);

    this.injectionGuard = GuardClass ? new GuardClass() : null;
    this.schemaValidator = ValidatorClass ? new ValidatorClass() : null;
    this.rulesEngine = RulesClass ? new RulesClass() : null;
  }

  /**
   * Sets or updates configuration.
   * @param {Object} newConfig
   */
  setConfig(newConfig = {}) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Main entrypoint: Analyzes extracted legal text and returns schema-validated report.
   * @param {string} text Raw extracted document text
   * @param {string} title Document title
   * @param {Array<Object>} hiddenNodes Hidden DOM elements detected
   * @returns {Promise<Object>}
   */
  async analyzeDocument(text, title = 'Hüküm ve Koşullar Belgesi', hiddenNodes = []) {
    // Step 1: Pre-execution Prompt Injection Inspection & Sanitization
    const preInspection = this.injectionGuard.inspectAndSanitize(text, hiddenNodes);

    // Step 2: If configured as offline_mock or no API key, use RulesEngine with injection check
    if (this.config.provider === 'offline_mock' || !this.config.apiKey) {
      const mockResult = this.rulesEngine.analyze(preInspection.sanitizedText, title);
      const securedMock = this.injectionGuard.verifyOutputIntegrity(mockResult, preInspection);
      const validation = this.schemaValidator.validate(securedMock);
      return validation.sanitized;
    }

    // Step 3: Prepare hardened prompt & payload
    const systemPrompt = this.injectionGuard.getHardenedSystemPrompt();
    const userPrompt = `Aşağıdaki yasal metni analiz et ve kesinlikle JSON şemasına uygun çıktı üret:

${this.injectionGuard.wrapUntrustedInput(preInspection.sanitizedText.slice(0, 35000))}

Belge Başlığı: "${title}"

JSON Şema Özeti:
{
  "tos_title": string,
  "overall_risk_score": integer (0-100),
  "risk_level": "Düşük" | "Orta" | "Yüksek" | "Kritik",
  "summary_tr": string (sade Türkçe özet),
  "uncertainty_notes": string,
  "prompt_injection_detected": boolean,
  "injection_indicators": string[],
  "legal_disclaimer": "UYARI: Bu uygulama hukuki tavsiye vermez. Yalnızca yapay zeka analizidir.",
  "flagged_clauses": [
    {
      "id": string,
      "category": "Veri ve Gizlilik" | "Fikri Mülkiyet & Lisans" | "Tahkim ve Yargı Yetkisi" | "Otomatik Yenileme ve Ücretlendirme" | "Tek Taraflı Değişiklik ve Fesih" | "Sorumluluk Sınırlandırması" | "Diğer",
      "severity": "Düşük" | "Orta" | "Yüksek" | "Kritik",
      "exact_quote": "Metinden harfi harfine alıntı",
      "explanation_tr": "Sade Türkçe açıklama",
      "risk_reason": "Risk gerekçesi",
      "confidence": number (0-1)
    }
  ]
}`;

    let rawOutput = '';

    try {
      if (this.config.provider === 'openai') {
        rawOutput = await this.callOpenAI(systemPrompt, userPrompt);
      } else if (this.config.provider === 'gemini') {
        rawOutput = await this.callGemini(systemPrompt, userPrompt);
      } else if (this.config.provider === 'anthropic') {
        rawOutput = await this.callAnthropic(systemPrompt, userPrompt);
      } else {
        throw new Error(`Desteklenmeyen LLM sağlayıcısı: ${this.config.provider}`);
      }

      // Step 4: Parse & Validate JSON
      const parsed = this.schemaValidator.parseJSON(rawOutput);
      if (!parsed.success) {
        throw new Error(`Model geçerli bir JSON üretmedi: ${parsed.error}`);
      }

      // Step 5: Post-execution Guardrail Verification
      const securedReport = this.injectionGuard.verifyOutputIntegrity(parsed.data, preInspection);

      // Step 6: Strict Schema Validation
      const validation = this.schemaValidator.validate(securedReport);
      return validation.sanitized;

    } catch (apiError) {
      // Robust Fallback: If network, quota, or parsing fails, seamlessly fallback to deterministic rule engine
      console.warn('[ToS-Guard] LLM API çağrısı başarısız oldu, yerel kurallı motora geçiliyor:', apiError.message);
      const fallbackReport = this.rulesEngine.analyze(preInspection.sanitizedText, title);
      fallbackReport.uncertainty_notes = `[DİKKAT]: LLM API hatası (${apiError.message.slice(0, 80)}) nedeniyle yerel kural motoru devreye girdi.`;
      const securedFallback = this.injectionGuard.verifyOutputIntegrity(fallbackReport, preInspection);
      const validation = this.schemaValidator.validate(securedFallback);
      return validation.sanitized;
    }
  }

  /**
   * Calls OpenAI / OpenAI-compatible endpoint.
   */
  async callOpenAI(systemPrompt, userPrompt) {
    const url = this.config.baseUrl || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.modelName || 'gpt-4o-mini',
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
  }

  /**
   * Calls Google Gemini REST API.
   */
  async callGemini(systemPrompt, userPrompt) {
    const model = this.config.modelName || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: this.config.temperature
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts[0].text
      : '';
  }

  /**
   * Calls Anthropic Claude API.
   */
  async callAnthropic(systemPrompt, userPrompt) {
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.modelName || 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.content && data.content[0] ? data.content[0].text : '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMClient;
} else if (typeof window !== 'undefined') {
  window.LLMClient = LLMClient;
}
