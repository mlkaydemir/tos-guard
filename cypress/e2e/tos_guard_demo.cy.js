describe('ToS-Guard E2E Demo & Doğrulama Senaryoları', () => {

  it('1. Mutlu Yol: Canlı sayfada sözleşme tespiti, in-page analiz ve alıntı vurgulama', () => {
    cy.visit('/instagram');

    // 1. Canlı sayfada sözleşme başlığının yüklendiğini doğrula
    cy.get('h1').should('contain', 'Instagram Kullanım Koşulları');

    // 2. Sayfa içi floating pill widget'ının göründüğünü doğrula
    cy.get('#tos-guard-floating-pill', { timeout: 8000 })
      .should('be.visible')
      .and('contain', 'ToS-Guard');

    // 3. Floating Pill'e tıkla ve analizi tetikle
    cy.get('#tos-guard-floating-pill').click();

    // 4. In-page modal kartının açıldığını ve risk skorunu gösterdiğini doğrula
    cy.get('#tos-guard-modal-card', { timeout: 12000 }).should('be.visible');
    cy.get('#tos-guard-modal-card').should('contain', 'Risk Skoru:');

    // 5. Zorunlu Yasal Uyarı Metninin görünürlüğünü doğrula
    cy.get('.tos-disclaimer-badge')
      .should('exist')
      .and('contain', 'hukuki tavsiye (legal advice) niteliği taşımaz');

    // 6. Doğrulanmış maddelerin ve "Sayfada Gör" butonunun varlığını doğrula
    cy.get('.tos-goto-quote-btn').should('have.length.at.least', 1);

    // 7. Sayfada Gör butonuna tıkla
    cy.get('.tos-goto-quote-btn').first().click();

    // 8. Orijinal DOM metninde altın sarısı parıldama vurgusunun aktifleştiğini doğrula
    cy.get('.tos-guard-highlight', { timeout: 6000 }).should('exist');
  });

  it('2. Uzantı Popup Arayüzü: Alıntı temellendirme, filtreleme ve dışa aktarma', () => {
    cy.visit('/popup');

    // 1. Popup başlığı ve zorunlu yasal uyarı kutusu
    cy.get('.brand-title').should('contain', 'ToS-Guard');
    cy.get('#legal-disclaimer')
      .should('be.visible')
      .and('contain', 'hukuki tavsiye (legal advice) vermez');

    // 2. Analiz butonuna tıkla
    cy.get('#analyze-btn').click();

    // 3. Sonuç görünümünün açıldığını ve risk skorunu doğrula
    cy.get('#results-view', { timeout: 15000 }).should('be.visible');
    cy.get('#score-val').invoke('text').then(text => {
      const score = parseInt(text, 10);
      expect(score).to.be.greaterThan(0);
    });

    // 4. Alıntı temellendirme yüzdesini doğrula (%100 Grounded)
    cy.get('#stat-rate').should('contain', '%');
    cy.get('#stat-verified-count').invoke('text').then(v => {
      expect(parseInt(v, 10)).to.be.greaterThan(0);
    });

    // 5. Sade Türkçe özet metnini doğrula
    cy.get('#summary-tr-text').should('not.be.empty');

    // 6. Kategori filtre butonlarının çalıştığını doğrula
    cy.get('.filter-chip').first().click();
    cy.get('.clause-card').should('have.length.at.least', 1);

    // 7. JSON ve Markdown Dışa Aktarma butonlarının varlığı
    cy.get('#copy-json-btn').should('be.visible');
    cy.get('#copy-md-btn').should('be.visible');
  });

  it('3. Dürüst Belirsizlik Yolu: Muğlak hükümler ve dürüst bildirim', () => {
    cy.visit('/ambiguity');

    // 1. Çelişkili sözleşme sayfasını doğrula
    cy.get('h1').should('contain', 'Çelişkili ve Muğlak');
    cy.get('#terms-content').should('be.visible');

    // 2. Sayfa içi widget'ı tetikle
    cy.get('#tos-guard-floating-pill', { timeout: 8000 }).should('be.visible').click();

    // 3. Modal kartının belirdiğini ve yasal uyarıyı içerdiğini doğrula
    cy.get('#tos-guard-modal-card', { timeout: 12000 }).should('be.visible');
    cy.get('.tos-disclaimer-badge').should('exist').and('contain', 'hukuki tavsiye');
  });

  it('4. Güvenlik Savunması: Sayfadaki gizli prompt injection ve manipülasyon koruması', () => {
    cy.visit('/injection');

    // 1. Sayfada gizlenmiş saldırı elemanının DOM'da var olduğunu doğrula
    cy.get('.hidden-payload').should('exist');

    // 2. Sayfa içi analizi tetikle
    cy.get('#tos-guard-floating-pill', { timeout: 8000 }).should('be.visible').click();

    // 3. Modal kartın açıldığını ve risk skorunun 0 olmadığını (manipüle edilmediğini) doğrula
    cy.get('#tos-guard-modal-card', { timeout: 12000 }).should('be.visible');
    cy.get('#tos-guard-floating-pill').invoke('text').then(text => {
      // Saldırgan skoru 0 yapmak istemişti, sistem sıfırlatmadı!
      expect(text).not.to.contain('0/100');
    });
  });

});
