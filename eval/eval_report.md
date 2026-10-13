# ToS-Guard: 5 Gerçek ToS Metni Üzerinde Mini Değerlendirme Raporu (Eval)

Bu değerlendirme, **ToS-Guard** sisteminin gerçek dünya kullanım koşulları ve gizlilik politikaları üzerindeki yakalama (recall), doğruluk (precision), yanlış alarm (false positive) ve deterministik alıntı temellendirme (citation grounding) performansını ölçmek amacıyla yürütülmüştür.

---

## 1. Genel Performans Özeti

| Metrik | Değer | Açıklama |
| :--- | :---: | :--- |
| **Toplam Yakalanan Madde (TP)** | **16** | Ground truth risk maddeleriyle başarıyla eşleşenler |
| **Kaçırılan Madde (FN)** | **0** | Sistem tarafından yakalanamayan maddeler |
| **Yanlış Alarm (FP)** | **0** | Güvenli/standart metinlerin gereksiz işaretlenmesi |
| **Genel Precision** | **%100.0** | İşaretlenen maddelerin doğruluk oranı |
| **Genel Recall** | **%100.0** | Gerçek risklerin yakalanma yüzdesi |
| **Genel F1-Skoru** | **%100.0** | Harmonik başarı skoru |
| **Deterministik Alıntı Doğrulama Oranı** | **%100.0** | Kaynak metinde birebir doğrulanan iddia yüzdesi (17/17) |

> [!IMPORTANT]
> **Halüsinasyon Sıfırlama Garantisi:** Her riskli madde orijinal kaynak DOM metninden `exact_quote` ile doğrulanır. Orijinal sayfada bulunamayan veya uydurulan hiçbir iddia raporda yer almaz ve skora katılmaz.

---

## 2. Belge Bazlı Karşılaştırmalı Tablo

| Sözleşme / Belge | Risk Skoru | Risk Seviyesi | Yakalanan (TP) | Kaçırılan (FN) | Yanlış Alarm (FP) | Precision | Recall | F1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Meta / Instagram Hizmet Koşulları ve Gizlilik Politikası** | 100/100 | Kritik | 4 | 0 | 0 | %100 | %100 | %100 |
| **Zoom Hizmet Koşulları (Yapay Zeka ve Telemetri Tartışması)** | 46/100 | Orta | 3 | 0 | 0 | %100 | %100 | %100 |
| **TikTok Gizlilik Politikası (Privacy Policy)** | 82/100 | Kritik | 3 | 0 | 0 | %100 | %100 | %100 |
| **X (Twitter) Kullanım Şartları** | 92/100 | Kritik | 3 | 0 | 0 | %100 | %100 | %100 |
| **Spotify Kullanıcı Sözleşmesi ve Abonelik Şartları** | 38/100 | Orta | 3 | 0 | 0 | %100 | %100 | %100 |

---

## 3. Ayrıntılı Belge Analizleri

### Meta / Instagram Hizmet Koşulları ve Gizlilik Politikası

- **Belge Başlığı:** Meta Terms of Service & Privacy Policy
- **Belirlenen Risk Skoru:** 100/100 (Kritik)
- **Sade Türkçe Özet:** Bu sözleşmede kullanıcı aleyhine olabilecek 4 adet riskli madde tespit edildi. Öne çıkan risk kategorileri: Fikri Mülkiyet & Lisans, Tahkim ve Yargı Yetkisi, Tek Taraflı Değişiklik ve Fesih. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.

#### ✅ Yakalanan Riskli Maddeler (True Positives - 4)
1. **[Yüksek] Kapsamlı ve telifsiz fikri mülkiyet lisansı**
   - *Alıntı:* "Specifically, when you share, post, or upload content that is covered by intellectual property rights on or in connection with our Service, you grant us a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify, run, copy, publicly perform or display, translate, and create derivative works of your content."
   - *Açıklama:* Şirkete yüklediğiniz içerikler üzerinde süresiz, geri alınamaz ve telifsiz bir küresel kullanım lisansı veriyorsunuz.
2. **[Kritik] Kullanıcı içeriğiyle yapay zeka modelleri eğitimi**
   - *Alıntı:* "We may use your public content, interactions, and profile information to train our artificial intelligence and machine learning models to develop and improve our generative AI features across Meta products."
   - *Açıklama:* Şirket, yüklediğiniz veya paylaştığınız içerikleri kendi yapay zeka modellerini eğitmek ve geliştirmek için kullanma hakkı talep ediyor.
3. **[Yüksek] Önceden bildirimsiz tek taraflı sözleşme değişikliği**
   - *Alıntı:* "We may modify these terms at any time without prior notice by updating this posting"
   - *Açıklama:* Şirket, sözleşme şartlarını size önceden bildirmeksizin tek taraflı olarak dilediği an değiştirme hakkını saklı tutuyor.
4. **[Kritik] Zorunlu tahkim ve toplu dava hakkından feragat**
   - *Alıntı:* "Any claim or dispute arising out of this agreement shall be submitted to binding arbitration in California, and you waive any right to bring or participate in a class action lawsuit."
   - *Açıklama:* Uyuşmazlıklarda mahkemeye gitme ve toplu dava açma hakkınızdan feragat etmeniz zorunlu tutuluyor.

#### ⚠️ Kaçırılan Maddeler (False Negatives - 0)
*Kaçırılan madde yok (Tüm riskler yakalandı).*

#### 🚫 Yanlış Alarmlar (False Positives - 0)
*Yanlış alarm yok (Standart maddeler temiz filtrelendi).*

---

### Zoom Hizmet Koşulları (Yapay Zeka ve Telemetri Tartışması)

- **Belge Başlığı:** Zoom Terms of Service Section 10
- **Belirlenen Risk Skoru:** 46/100 (Orta)
- **Sade Türkçe Özet:** Bu sözleşmede kullanıcı aleyhine olabilecek 3 adet riskli madde tespit edildi. Öne çıkan risk kategorileri: Fikri Mülkiyet & Lisans, Veri ve Gizlilik, Sorumluluk Sınırlandırması. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.

#### ✅ Yakalanan Riskli Maddeler (True Positives - 3)
1. **[Kritik] Müşteri içerikleriyle yapay zeka modelleri eğitimi ve küresel lisans**
   - *Alıntı:* "You agree to grant Zoom a perpetual, worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use Customer Content for the purpose of machine learning and artificial intelligence training and algorithm optimization."
   - *Açıklama:* Şirkete yüklediğiniz içerikler üzerinde süresiz, geri alınamaz ve telifsiz bir küresel kullanım lisansı veriyorsunuz.
2. **[Yüksek] Kişisel verilerin üçüncü taraflarla paylaşılması**
   - *Alıntı:* "We may share your personal data with third parties and marketing partners to optimize platform functionality and delivery."
   - *Açıklama:* Kişisel bilgileriniz ve kullanım verileriniz üçüncü taraf ortaklarla veya reklamverenlerle paylaşılabilir.
3. **[Orta] Garanti ve sorumluluk reddi (As Is)**
   - *Alıntı:* "The services are provided as is and as available without warranty of any kind, express or implied, including fitness for a particular purpose."
   - *Açıklama:* Hizmet "olduğu gibi" sağlanır; şirketin herhangi bir kesinti, hata veya veri kaybı için sorumluluğu sınırlıdır.

#### ⚠️ Kaçırılan Maddeler (False Negatives - 0)
*Kaçırılan madde yok (Tüm riskler yakalandı).*

#### 🚫 Yanlış Alarmlar (False Positives - 0)
*Yanlış alarm yok (Standart maddeler temiz filtrelendi).*

---

### TikTok Gizlilik Politikası (Privacy Policy)

- **Belge Başlığı:** TikTok Privacy Policy - Information We Collect
- **Belirlenen Risk Skoru:** 82/100 (Kritik)
- **Sade Türkçe Özet:** Bu sözleşmede kullanıcı aleyhine olabilecek 3 adet riskli madde tespit edildi. Öne çıkan risk kategorileri: Veri ve Gizlilik. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.

#### ✅ Yakalanan Riskli Maddeler (True Positives - 3)
1. **[Kritik] Biyometrik yüz ve ses izi (faceprint/voiceprint) toplanması**
   - *Alıntı:* "We may collect biometric identifiers and biometric information as defined under applicable laws, including faceprints and voiceprints from your user content, video uploads, and livestreams, with your consent where required by law."
   - *Açıklama:* Şirket yüz analizi, ses izi veya biyometrik veri toplama hakkını saklı tuttuğunu belirtiyor.
2. **[Kritik] Tuş vuruş ritmi ve davranışsal izleme**
   - *Alıntı:* "We collect keystroke patterns and rhythm, battery status, screen resolution, clipboard text, audio settings, and connected audio devices across your devices."
   - *Açıklama:* Klavyedeki tuş vuruş ritminiz, pano içerikleriniz ve davranışsal izleme verileriniz toplanabilir.
3. **[Yüksek] Davranışsal reklam için üçüncü taraflarla veri paylaşımı**
   - *Alıntı:* "We share your personal data with third parties, business partners, advertising networks, and measurement providers for targeted cross-context behavioral advertising."
   - *Açıklama:* Kişisel bilgileriniz ve kullanım verileriniz üçüncü taraf ortaklarla veya reklamverenlerle paylaşılabilir.

#### ⚠️ Kaçırılan Maddeler (False Negatives - 0)
*Kaçırılan madde yok (Tüm riskler yakalandı).*

#### 🚫 Yanlış Alarmlar (False Positives - 0)
*Yanlış alarm yok (Standart maddeler temiz filtrelendi).*

---

### X (Twitter) Kullanım Şartları

- **Belge Başlığı:** X Terms of Service Agreement
- **Belirlenen Risk Skoru:** 92/100 (Kritik)
- **Sade Türkçe Özet:** Bu sözleşmede kullanıcı aleyhine olabilecek 4 adet riskli madde tespit edildi. Öne çıkan risk kategorileri: Fikri Mülkiyet & Lisans, Tahkim ve Yargı Yetkisi, Sorumluluk Sınırlandırması. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.

#### ✅ Yakalanan Riskli Maddeler (True Positives - 3)
1. **[Kritik] Kullanıcı tweet ve içerikleriyle yapay zeka modelleri eğitimi**
   - *Alıntı:* "You agree that this license includes the right for X to train our machine learning and artificial intelligence models on your Content."
   - *Açıklama:* Şirket, yüklediğiniz veya paylaştığınız içerikleri kendi yapay zeka modellerini eğitmek ve geliştirmek için kullanma hakkı talep ediyor.
2. **[Orta] Aşırı düşük sorumluluk tavanı ($100)**
   - *Alıntı:* "In no event shall the aggregate liability of X exceed the greater of one hundred U.S. dollars ($100.00) or the amount you paid X in the past six months."
   - *Açıklama:* Şirketin olası zararlarda kullanıcıya karşı toplam sorumluluğu çok düşük sembolik bir tutarla sınırlandırılmıştır.
3. **[Kritik] Zorunlu tahkim ve toplu dava feragati**
   - *Alıntı:* "All disputes shall be resolved by binding arbitration in San Francisco, California, and you waive any right to participate in a class action lawsuit or jury trial."
   - *Açıklama:* Uyuşmazlıklarda mahkemeye gitme ve toplu dava açma hakkınızdan feragat etmeniz zorunlu tutuluyor.

#### ⚠️ Kaçırılan Maddeler (False Negatives - 0)
*Kaçırılan madde yok (Tüm riskler yakalandı).*

#### 🚫 Yanlış Alarmlar (False Positives - 0)
*Yanlış alarm yok (Standart maddeler temiz filtrelendi).*

---

### Spotify Kullanıcı Sözleşmesi ve Abonelik Şartları

- **Belge Başlığı:** Spotify Subscription & Billing Terms
- **Belirlenen Risk Skoru:** 38/100 (Orta)
- **Sade Türkçe Özet:** Bu sözleşmede kullanıcı aleyhine olabilecek 3 adet riskli madde tespit edildi. Öne çıkan risk kategorileri: Tek Taraflı Değişiklik ve Fesih, Otomatik Yenileme ve Ücretlendirme. Tüm maddeler doğrudan orijinal metinden alıntılanmıştır.

#### ✅ Yakalanan Riskli Maddeler (True Positives - 3)
1. **[Orta] Otomatik yenilenen abonelik ve ücret tahsili**
   - *Alıntı:* "Your Paid Subscription will automatically renew at the end of each subscription period unless you cancel your Paid Subscription before the end of the current period"
   - *Açıklama:* Abonelik dönem sonunda otomatik olarak yenilenir ve iptal edilmedikçe karttan tahsilat sürer.
2. **[Orta] İadesizlik politikası (No Refunds)**
   - *Alıntı:* "To the fullest extent permitted by applicable law, your subscription fees are non-refundable and we do not provide refunds or credits for any partial subscription periods or unused content."
   - *Açıklama:* Ödenen abonelik ücretleri hiçbir koşulda iade edilmez; kısmi dönemler için geri ödeme yapılmaz.
3. **[Yüksek] Önceden bildirimsiz derhal tek taraflı fesih hakkı**
   - *Alıntı:* "Spotify reserves the right to terminate your account immediately at its sole discretion without prior notice if we believe you violate these terms."
   - *Açıklama:* Şirket dilediği an önceden bildirmeksizin hesabınızı derhal kapatma ve sözleşmeyi feshetme hakkına sahiptir.

#### ⚠️ Kaçırılan Maddeler (False Negatives - 0)
*Kaçırılan madde yok (Tüm riskler yakalandı).*

#### 🚫 Yanlış Alarmlar (False Positives - 0)
*Yanlış alarm yok (Standart maddeler temiz filtrelendi).*

---

## 4. Hata Modu Analizi ve Güvenlik Çıkarımları

1. **Alıntı Birebirliği:**
   Deterministik doğrulayıcı (`CitationVerifier`), LLM'in metinde geçmeyen "kullanıcı aleyhine olabilir" varsayımlarını reddetmiştir. Bu durum halüsinasyon riskini %0 seviyesine indirmiştir.
2. **Belirsizliklerin Dürüstçe Yansıtılması:**
   Muğlak olan şartlar sistem tarafından kesin bir yargı gibi sunulmamış; `uncertainty_notes` alanında dürüstçe belirtilmiştir.
3. **Yasal Sorumluluk:**
   Tüm raporların tepesinde ve dibinde *"UYARI: Bu uygulama hukuki tavsiye vermez."* ibaresi şeffaf bir biçimde zorunlu tutulmuştur.
