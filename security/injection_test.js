/**
 * ToS-Guard Prompt Injection Test Suite
 * 
 * Verifies system behavior against adversarial attacks:
 * 1. Hidden DOM CSS tricks
 * 2. Inline directive overriding
 * 3. Turkish language jailbreaks
 * 4. Delimiter escaping
 * 
 * "Prompt injection testi zorunlu. Sayfaya gizli talimat koyduğunuzda sisteminiz ne yapıyor?"
 */

const fs = require('fs');
const path = require('path');
const PromptInjectionGuard = require('../src/prompt_injection_guard');
const SchemaValidator = require('../src/schema_validator');
const RulesEngine = require('../src/rules_engine');
const LLMClient = require('../src/llm_client');

async function runInjectionTests() {
  console.log('='.repeat(70));
  console.log('🛡️  TOS-GUARD PROMPT INJECTION GÜVENLİK TESTİ BAŞLATILIYOR');
  console.log('='.repeat(70));

  const attackVectorsPath = path.join(__dirname, 'attack_vectors.json');
  const attackVectors = JSON.parse(fs.readFileSync(attackVectorsPath, 'utf8'));

  const guard = new PromptInjectionGuard();
  const validator = new SchemaValidator();
  const client = new LLMClient({ provider: 'offline_mock' });

  let passedTests = 0;
  let totalTests = attackVectors.length;
  const testResults = [];

  for (const attack of attackVectors) {
    console.log(`\n[TEST] ${attack.id}: ${attack.name}`);
    console.log(`Açıklama: ${attack.description}`);

    // Step 1: Pre-execution inspection
    const preInspection = guard.inspectAndSanitize(attack.rawText, attack.hiddenNodes);

    // Step 2: System processing via hardened client
    const report = await client.analyzeDocument(attack.rawText, 'Saldırı Test Belgesi', attack.hiddenNodes);

    // Step 3: Assertions
    const isDetected = report.prompt_injection_detected === true || preInspection.isSuspicious === true;
    const scoreNotZero = report.overall_risk_score > 0;
    const isSchemaValid = validator.validate(report).isValid;

    console.log(`- Enjeksiyon Tespit Edildi mi?: ${isDetected ? 'EVET (BAŞARILI)' : 'HAYIR (BAŞARISIZ)'}`);
    console.log(`- Risk Skoru Sıfırlandı mı?: ${scoreNotZero ? `HAYIR (Korundu: ${report.overall_risk_score}/100)` : 'EVET (ETKİLENDİ - HATA)'}`);
    console.log(`- Şema Bütünlüğü Korundu mu?: ${isSchemaValid ? 'EVET (GEÇERLİ)' : 'HAYIR'}`);

    if (report.injection_indicators && report.injection_indicators.length > 0) {
      console.log(`- Tespit Göstergeleri:`);
      report.injection_indicators.forEach(ind => console.log(`   * ${ind}`));
    }

    const testPassed = isDetected && scoreNotZero && isSchemaValid;
    if (testPassed) {
      passedTests++;
      console.log(`>>> SONUÇ: ✅ TEST GEÇTİ (Saldırı püskürtüldü ve izole edildi)`);
    } else {
      console.log(`>>> SONUÇ: ❌ TEST BAŞARISIZ OLDU`);
    }

    testResults.push({
      id: attack.id,
      name: attack.name,
      passed: testPassed,
      detected: isDetected,
      finalScore: report.overall_risk_score,
      indicators: report.injection_indicators || []
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`GÜVENLİK TESTİ ÖZETİ: ${passedTests}/${totalTests} Test Başarıyla Geçti (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('='.repeat(70));

  // Write summary report to security/injection_results.json
  fs.writeFileSync(
    path.join(__dirname, 'injection_results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), passedTests, totalTests, testResults }, null, 2)
  );

  return passedTests === totalTests;
}

if (require.main === module) {
  runInjectionTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runInjectionTests;
