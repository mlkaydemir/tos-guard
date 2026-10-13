/**
 * ToS-Guard Options Script
 * 
 * Manages user preferences:
 * - LLM Provider & API Key
 * - Custom model names & Base URLs
 * - Security strictness
 */

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider-select');
  const apiKeyInput = document.getElementById('api-key-input');
  const modelNameInput = document.getElementById('model-name-input');
  const baseUrlInput = document.getElementById('base-url-input');
  const strictInjectionCheck = document.getElementById('strict-injection-check');
  const toggleKeyBtn = document.getElementById('toggle-key-visibility');
  const form = document.getElementById('settings-form');
  const testBtn = document.getElementById('test-connection-btn');
  const toast = document.getElementById('status-toast');
  const modeBadge = document.getElementById('active-mode-badge');

  // Load existing configuration
  chrome.storage.local.get(['tosGuardConfig'], (res) => {
    const config = res.tosGuardConfig || {
      provider: 'offline_mock',
      apiKey: '',
      modelName: 'gpt-4o-mini',
      baseUrl: '',
      strictInjection: true
    };

    providerSelect.value = config.provider || 'offline_mock';
    apiKeyInput.value = config.apiKey || '';
    modelNameInput.value = config.modelName || 'gpt-4o-mini';
    baseUrlInput.value = config.baseUrl || '';
    strictInjectionCheck.checked = config.strictInjection !== false;

    updateUIForProvider(config.provider);
  });

  providerSelect.addEventListener('change', () => {
    updateUIForProvider(providerSelect.value);
  });

  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '👁️';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const config = {
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      modelName: modelNameInput.value.trim() || getDefaultModelFor(providerSelect.value),
      baseUrl: baseUrlInput.value.trim(),
      strictInjection: strictInjectionCheck.checked
    };

    chrome.storage.local.set({ tosGuardConfig: config }, () => {
      // Notify background script
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'CONFIG_UPDATED' });
      }

      showToast('Ayarlar başarıyla kaydedildi!', 'success');
      updateUIForProvider(config.provider);
    });
  });

  testBtn.addEventListener('click', async () => {
    const provider = providerSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (provider === 'offline_mock') {
      showToast('Yerel kural motoru devrede. Harici ağ veya API key gerekmez, tamamen çalışır durumda!', 'success');
      return;
    }

    if (!apiKey) {
      showToast('Lütfen önce bir API anahtarı giriniz.', 'error');
      return;
    }

    showToast('Bağlantı sınanıyor...', 'success');

    try {
      const client = new (window.LLMClient || LLMClient)({
        provider,
        apiKey,
        modelName: modelNameInput.value.trim() || getDefaultModelFor(provider),
        baseUrl: baseUrlInput.value.trim()
      });

      const testText = 'This is a sample Terms of Service. We collect user data and reserve the right to modify terms at any time without notice.';
      const result = await client.analyzeDocument(testText, 'Test Sözleşmesi');

      if (result && result.overall_risk_score !== undefined) {
        showToast(`Bağlantı Başarılı! Test yanıtı alındı (Risk Skoru: ${result.overall_risk_score})`, 'success');
      } else {
        showToast('Model yanıt verdi ancak JSON çıktısı beklenen formatta değil.', 'error');
      }
    } catch (err) {
      showToast(`Bağlantı Hatası: ${err.message}`, 'error');
    }
  });

  function updateUIForProvider(prov) {
    if (prov === 'offline_mock') {
      modeBadge.textContent = 'Çevrimdışı / Test Modu';
      modeBadge.style.background = 'rgba(99, 102, 241, 0.2)';
      modeBadge.style.color = '#a5b4fc';
    } else {
      modeBadge.textContent = `${prov.toUpperCase()} Modu Aktif`;
      modeBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      modeBadge.style.color = '#34d399';
    }

    if (!modelNameInput.value) {
      modelNameInput.value = getDefaultModelFor(prov);
    }
  }

  function getDefaultModelFor(prov) {
    if (prov === 'openai') return 'gpt-4o-mini';
    if (prov === 'gemini') return 'gemini-1.5-flash';
    if (prov === 'anthropic') return 'claude-3-5-haiku-20241022';
    return 'local-rules-v1';
  }

  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }
});
