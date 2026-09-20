# Panduan & Referensi Bridging BPJS PCare (Primary Care)

> **Status Dokumen**: Referensi Awal / Hipotesis Desain  
> **Basis Sumber**: Dokumentasi Teknis Bridging System BPJS PCare Versi 3.0 Dev (Dinkes Kab. Batang)  
> **Target Pengguna**: Developer & AI Agent yang akan mengimplementasikan **Fase 9: Integrasi BPJS** pada sistem KRIZA.  
> **Tanggal Dibuat**: September 2026

---

## 1. Peringatan Penting & Batasan Teknis

> [!WARNING]
> Dokumen ini disusun dari spesifikasi publik **PCare v3.0 (Dev Dinkes Batang)**. Ketika Klinik Rizani nantinya resmi menerima kredensial bridging langsung dari BPJS Kesehatan, spesifikasi terbaru kemungkinan besar adalah **PCare v4.0** atau standar **BPJS Trustmark API**.

### Perbedaan Utama v3.0 (Dokumentasi Ini) vs Standar BPJS Trustmark Terbaru:
1. **Header Tambahan**: Pada standar BPJS Trustmark terbaru, BPJS mewajibkan header `user_key` di samping `X-cons-id`, `X-Timestamp`, `X-Signature`, dan `X-Authorization`.
2. **Enkripsi Payload Respons**:
   - Pada v3.0 ini, respons dikembalikan dalam bentuk **plaintext JSON** biasa (`{ metaData, response }`).
   - Pada BPJS Trustmark modern, field `response` berupa string terenkripsi (**AES-256-CBC**) yang harus didekripsi dengan kunci turunan (`ConsID + SecretKey + Timestamp`) lalu didekompresi menggunakan algoritma **LZ-String (DecompressFromEncodedURIComponent)**.
3. **Rekomendasi Desain**: Gunakan **Adapter Pattern** di backend (`apps/api/src/modules/bpjs/`) agar logic bridging terisolasi dan mudah beralih dari mode Mock / v3.0 ke enkripsi Trustmark v4.0 tanpa mengubah logic encounter/rekam medis.

---

## 2. Autentikasi & Header HTTP

Setiap pemanggilan endpoint BPJS PCare mewajibkan header HTTP berikut:

| Nama Header | Tipe / Format | Contoh Nilai | Keterangan |
|---|---|---|---|
| `X-cons-id` | String | `12345` | Consumer ID dari BPJS Kesehatan |
| `X-Timestamp` | String (Numeric) | `1725883200` | Unix timestamp dalam detik (UTC timezone) |
| `X-Signature` | String (Base64) | `DogC5UiQurNcigrBdQ3...` | HMAC-SHA256 dari `consumerID + "&" + timestamp` dengan key `consumerSecret` |
| `X-Authorization` | String (Base64) | `Basic Y29iYXBwaz...` | `Basic ` + Base64(`username:password:kdAplikasi`) (contoh kdAplikasi: `095`) |
| `user_key` *(khusus Trustmark)* | String | `9a8b7c6d5e...` | Diberikan jika menggunakan portal Trustmark |
| `Content-Type` | String | `application/json` atau `text/plain` | Format data body |

### Implementasi Helper Pembuat Header (Node.js)

```javascript
import crypto from 'node:crypto';

export function generatePCareHeaders({ consId, secretKey, username, password, appCode = '095', userKey = null }) {
  // 1. Timestamp UTC dalam detik
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 2. Signature: HMAC-SHA256(consId + "&" + timestamp, secretKey) -> Base64
  const dataToSign = `${consId}&${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('base64');

  // 3. Authorization: Base64(username:password:appCode)
  const authPayload = `${username}:${password}:${appCode}`;
  const authorization = `Basic ${Buffer.from(authPayload).toString('base64')}`;

  const headers = {
    'X-cons-id': consId,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'X-Authorization': authorization,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (userKey) {
    headers['user_key'] = userKey;
  }

  return headers;
}
```

---

## 3. Format Respons & Penanganan Error

Struktur respons standar BPJS PCare:

```json
{
  "response": { ... } | [ ... ] | null,
  "metaData": {
    "message": "OK",
    "code": 200
  }
}
```

### Kode Status Standar:
- `200 OK`: Permintaan berhasil diproses.
- `201 CREATED`: Data baru berhasil disimpan (Pendaftaran, Kunjungan, Tindakan, Obat).
- `401 UNAUTHORIZED`: Username/Password salah atau Signature/Timestamp expired (toleransi clock skew biasanya ±5-15 menit).
- `412 PRECONDITION FAILED`: Validasi bisnis BPJS gagal (misal nomor kartu tidak aktif, diagnosa non-spesialis dirujuk tanpa TACC).
- `500 INTERNAL SERVER ERROR`: Gangguan koneksi atau database server PCare BPJS.

---

## 4. Katalog Endpoint & Payload

Semua URL menggunakan prefix: `{BASE_URL}/pcare-rest-v3.0`

### 4.1. Modul Peserta (Master Data & Validasi Pasien)

#### A. Cek Kepesertaan by Nomor Kartu BPJS
- **Method**: `GET`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/peserta/{noKartu}`
- **Contoh**: `/pcare-rest-v3.0/peserta/0000039043765`
- **Contoh Response**:
```json
{
  "response": {
    "noKartu": "0000039043765",
    "nama": "SUSIAMINI IMAM SOERADI",
    "hubunganKeluarga": "Peserta",
    "sex": "P",
    "tglLahir": "25-10-1939",
    "tglMulaiAktif": "12-11-2014",
    "tglAkhirBerlaku": "01-01-2050",
    "kdProviderPst": {
      "kdProvider": "0114U163",
      "nmProvider": "Klinik Cempaka Putih"
    },
    "kdProviderGigi": {
      "kdProvider": null,
      "nmProvider": null
    },
    "jnsKelas": { "nama": "KELAS I", "kode": "1" },
    "jnsPeserta": { "nama": "PENERIMA PENSIUN PNS", "kode": "15" },
    "golDarah": "O",
    "noHP": "08123456789",
    "noKTP": "3513...",
    "pstProl": "HT",
    "pstPrb": "HT",
    "aktif": true,
    "ketAktif": "AKTIF",
    "asuransi": { "kdAsuransi": null, "nmAsuransi": null, "noAsuransi": null, "cob": false },
    "tunggakan": 0
  },
  "metaData": { "message": "OK", "code": 200 }
}
```

#### B. Cek Kepesertaan by NIK
- **Method**: `GET`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/peserta/nik/{nik}`

---

### 4.2. Modul Pendaftaran (Loket / Registrasi)

> **Catatan Format**: Tanggal menggunakan format string `DD-MM-YYYY` (contoh: `12-08-2026`). Field `noUrut` bertipe string (misal: `"A1"`).

#### A. Tambah Pendaftaran Pasien ke PCare
- **Method**: `POST`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/pendaftaran`
- **Request Body**:
```json
{
  "kdProviderPeserta": "0114A026",
  "tglDaftar": "12-08-2026",
  "noKartu": "0001113569638",
  "kdPoli": "001",
  "keluhan": "Demam sejak 2 hari",
  "kunjSakit": true,
  "sistole": 120,
  "diastole": 80,
  "beratBadan": 60,
  "tinggiBadan": 165,
  "respRate": 20,
  "heartRate": 80,
  "rujukBalik": 0,
  "rawatInap": false
}
```
- **Response**:
```json
{
  "response": {
    "field": "noUrut",
    "message": "A1"
  },
  "metaData": { "message": "CREATED", "code": 201 }
}
```

#### B. Get Pendaftaran by No Urut & Tanggal
- **Method**: `GET`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/pendaftaran/noUrut/{noUrut}/tglDaftar/{tglDaftar}`

#### C. Get Daftar Pendaftaran Harian Provider
- **Method**: `GET`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/pendaftaran/tglDaftar/{tglDaftar}/{start}/{limit}`

#### D. Batal / Hapus Pendaftaran
- **Method**: `DELETE`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/pendaftaran/peserta/{noKartu}/tglDaftar/{tglDaftar}/noUrut/{noUrut}`

---

### 4.3. Modul Kunjungan (Encounter / Pelayanan Medis)

Endpoint ini dipanggil setelah dokter menyelesaikan pemeriksaan (status rekam medis **FINALIZED**).

#### A. Tambah Kunjungan (POST)
- **Method**: `POST`
- **URL**: `{BASE_URL}/pcare-rest-v3.0/kunjungan`

##### Contoh Payload 1: Pulang Berobat Jalan (Tanpa Rujukan)
```json
{
  "noKunjungan": null,
  "noKartu": "0000043678034",
  "tglDaftar": "13-08-2026",
  "kdPoli": "001",
  "keluhan": "Batuk dan pilek",
  "kdSadar": "01",
  "sistole": 120,
  "diastole": 80,
  "beratBadan": 65,
  "tinggiBadan": 170,
  "respRate": 20,
  "heartRate": 80,
  "terapi": "Amoxicillin 3x500mg, Paracetamol 3x500mg",
  "kdStatusPulang": "3",
  "tglPulang": "13-08-2026",
  "kdDokter": "DR-001",
  "kdDiag1": "J00",
  "kdDiag2": null,
  "kdDiag3": null,
  "kdPoliRujukInternal": null,
  "rujukLanjut": null,
  "kdTacc": 0,
  "alasanTacc": null
}
```

##### Contoh Payload 2: Rujukan Spesialis Eksternal (Dengan TACC jika Diagnosa Non-Spesialis)
```json
{
  "noKunjungan": null,
  "noKartu": "0000043678034",
  "tglDaftar": "13-08-2026",
  "kdPoli": "001",
  "keluhan": "Nyeri perut hebat berulang",
  "kdSadar": "01",
  "sistole": 130,
  "diastole": 85,
  "beratBadan": 65,
  "tinggiBadan": 170,
  "respRate": 22,
  "heartRate": 88,
  "terapi": "Terapi simtomatik awal",
  "kdStatusPulang": "4",
  "tglPulang": "13-08-2026",
  "kdDokter": "DR-001",
  "kdDiag1": "K29.6",
  "kdDiag2": null,
  "kdDiag3": null,
  "kdPoliRujukInternal": null,
  "rujukLanjut": {
    "kdppk": "0116R028",
    "subSpesialis": {
      "kdSubSpesialis1": "3",
      "kdSubSpesialis2": null,
      "kdSubSpesialis3": null,
      "kdSarana": "4"
    },
    "khusus": null
  },
  "kdTacc": "1",
  "alasanTacc": ">= 7 Hari"
}
```

##### Respons Berhasil:
```json
{
  "response": {
    "field": "noKunjungan",
    "message": "0114U1630826Y000001"
  },
  "metaData": { "message": "CREATED", "code": 201 }
}
```

#### B. Aturan & Kode TACC (Time, Age, Complication, Comorbidity)
TACC wajib diisi jika FKTP merujuk pasien dengan **diagnosa non-spesialis** (144 diagnosa kompetensi dokter umum):

| `kdTacc` | Nama TACC | Pilihan `alasanTacc` |
|---|---|---|
| `0` | Tanpa TACC | `null` |
| `1` | Time | `"< 3 Hari"`, `">= 3 - 7 Hari"`, `">= 7 Hari"` |
| `2` | Age | `"< 1 Bulan"`, `">= 1 Bulan s/d < 12 Bulan"`, `">= 1 Tahun s/d < 5 Tahun"`, `">= 5 Tahun s/d < 12 Tahun"`, `">= 12 Tahun s/d < 55 Tahun"`, `">= 55 Tahun"` |
| `3` | Complication | Format: `KodeDiag - NamaDiag` (Contoh: `"E11.9 - Type 2 diabetes mellitus"`) |
| `4` | Comorbidity | `"< 3 Hari"`, `">= 3 - 7 Hari"`, `">= 7 Hari"` |

#### C. Edit & Hapus Kunjungan
- **Edit**: `PUT {BASE_URL}/pcare-rest-v3.0/kunjungan` (body sama, sertakan `noKunjungan`)
- **Hapus**: `DELETE {BASE_URL}/pcare-rest-v3.0/kunjungan/{noKunjungan}`
- **Get Detail Rujukan**: `GET {BASE_URL}/pcare-rest-v3.0/kunjungan/rujukan/{noKunjungan}`
- **Get Riwayat Kunjungan Pasien**: `GET {BASE_URL}/pcare-rest-v3.0/kunjungan/peserta/{noKartu}`

---

### 4.4. Modul Tindakan Medis

- **Tambah Tindakan**: `POST {BASE_URL}/pcare-rest-v3.0/tindakan`
```json
{
  "kdTindakanSK": 0,
  "noKunjungan": "0114U1630826Y000001",
  "kdTindakan": "01007",
  "biaya": 15000,
  "keterangan": "Injeksi IM",
  "hasil": 0
}
```
- **Hapus Tindakan**: `DELETE {BASE_URL}/pcare-rest-v3.0/tindakan/{kdTindakanSK}/kunjungan/{noKunjungan}`
- **Get Tindakan by Kunjungan**: `GET {BASE_URL}/pcare-rest-v3.0/tindakan/kunjungan/{noKunjungan}`

---

### 4.5. Modul Resep & Obat (DPHO / Non-DPHO)

- **Cari Katalog Obat DPHO**: `GET {BASE_URL}/pcare-rest-v3.0/obat/dpho/{keyword}/{start}/{limit}`
- **Tambah Obat ke Kunjungan**: `POST {BASE_URL}/pcare-rest-v3.0/obat/kunjungan`
```json
{
  "kdObatSK": 0,
  "noKunjungan": "0114U1630826Y000001",
  "racikan": false,
  "kdRacikan": null,
  "obatDPHO": true,
  "kdObat": "130103595",
  "signa1": 3,
  "signa2": 1,
  "jmlObat": 10,
  "jmlPermintaan": 10,
  "nmObatNonDPHO": null
}
```
- **Hapus Obat**: `DELETE {BASE_URL}/pcare-rest-v3.0/obat/{kdObatSK}/kunjungan/{noKunjungan}`
- **Get Obat by Kunjungan**: `GET {BASE_URL}/pcare-rest-v3.0/obat/kunjungan/{noKunjungan}`

---

### 4.6. Modul Referensi Master Data

| Data | Method & Endpoint | Keterangan |
|---|---|---|
| **Diagnosa** | `GET /diagnosa/{keyword}/{start}/{limit}` | Pencarian ICD-10 dan cek apakah `nonSpesialis` (true/false) |
| **Dokter** | `GET /dokter/{start}/{limit}` | Daftar dokter yang terdaftar di PCare Faskes |
| **Kesadaran** | `GET /kesadaran` | `01` Compos mentis, `02` Somnolence, `03` Sopor, `04` Coma |
| **Poli FKTP** | `GET /poli/fktp/{start}/{limit}` | `001` Umum, `002` Gigi, `003` KIA, dll |
| **Status Pulang** | `GET /statuspulang/rawatInap/{true/false}` | `3` Berobat Jalan, `4` Rujuk Lanjut, `5` Rujuk Internal |
| **Spesialis** | `GET /spesialis` | Daftar spesialisasi rujukan |
| **Sub-Spesialis**| `GET /spesialis/{kdSpesialis}/subspesialis` | Subspesialis & kode poli rujukan RS |
| **Sarana** | `GET /spesialis/sarana` | `1` Rekam Medik, `2` Laboratorium, dsb |
| **Khusus** | `GET /spesialis/khusus` | `HDL` Hemodialisa, `THA` Thalasemia, `ONK` Onkologi, `IGD` Alih Rawat |
| **Faskes Rujukan** | `GET /spesialis/rujuk/subspesialis/{kdSubSpesialis}/sarana/{kdSarana}` | Menampilkan RS tujuan, jarak, jadwal, dan kapasitas |

---

## 5. Pemetaan (Mapping) ke Database KRIZA

Sistem KRIZA pada fase sebelumnya telah menyiapkan skema yang kompatibel dengan alur PCare ini:

| Field BPJS PCare | Kolom Database KRIZA | Tabel Drizzle ORM |
|---|---|---|
| `noKartu` | `bpjs_card_no` | `patients` |
| `noUrut` | `queue_number` / `pcare_no_urut` | `registrations` |
| `kdPoli` | `code` (Mapping Poli BPJS) | `polyclinics` |
| `kdSadar` | `consciousness` (mapped to code) | `encounter_vital_signs` |
| `sistole` / `diastole` | `systolic` / `diastolic` | `encounter_vital_signs` |
| `beratBadan` / `tinggiBadan` | `weight` / `height` | `encounter_vital_signs` |
| `respRate` / `heartRate` | `respiratory_rate` / `heart_rate` | `encounter_vital_signs` |
| `kdDiag1` / `kdDiag2` | `icd10_code` (PRIMARY / SECONDARY) | `encounter_diagnoses` |
| `noKunjungan` | `pcare_no_kunjungan` | `encounter_referrals` |
| `noRujukan` | `pcare_no_rujukan` | `encounter_referrals` |
| `kdTacc` | `pcare_tacc_code` | `encounter_referrals` |
| `alasanTacc` | `pcare_tacc_reason` | `encounter_referrals` |
| Raw Response | `pcare_raw_response` | `encounter_referrals` |
| Synced At | `pcare_synced_at` | `encounter_referrals` |

---

## 6. Bedah Teknis Bridging BPJS Trustmark / PCare Versi 4.0

Berikut adalah rangkuman spesifikasi teknis standar **BPJS Trustmark PCare v4.0** yang berlaku pada integrasi modern:

### 6.1. Environment URL
| Environment | Base URL |
|---|---|
| **Development / Sandbox** | `https://apijkn-dev.bpjs-kesehatan.go.id/pcare-rest-dev` |
| **Production** | `https://apijkn.bpjs-kesehatan.go.id/pcare-rest` |

> *Catatan*: Header pada server gateway BPJS Trustmark menerima nama header case-insensitive, namun konvensi resmi menggunakan huruf kecil: `x-cons-id`, `x-timestamp`, `x-signature`, `x-authorization`, dan `user_key`.

---

### 6.2. Mekanisme Enkripsi & Dekripsi Payload (AES-256-CBC + LZ-String)

Pada v4.0, payload request dikirim sebagai JSON biasa (dengan `Content-Type: application/json`), namun payload `response` yang dikembalikan BPJS berupa **ciphertext string** yang dienkripsi dan dikompresi:

```json
{
  "response": "tA9g4VzX7Q+v8L1qK3m...",
  "metaData": {
    "code": "200",
    "message": "OK"
  }
}
```

#### Langkah Dekripsi:
1. **Generate Key & IV**:
   - `keyString = consId + secretKey + timestamp`
   - Buat hash SHA-256 dari `keyString` (menghasilkan buffer 32 byte).
   - **Key AES-256**: 32 byte hash tersebut.
   - **IV (Initialization Vector)**: 16 byte pertama dari 32 byte hash tersebut.
2. **Decrypt AES-256-CBC**:
   - Gunakan cipher `aes-256-cbc` dengan PKCS7 padding terhadap string ciphertext base64.
3. **Dekompresi LZ-String**:
   - String hasil dekripsi adalah encoded string yang dikompresi BPJS menggunakan LZ-String.
   - Dekompresi menggunakan fungsi `LZString.decompressFromEncodedURIComponent(decryptedText)`.
4. **JSON Parse**:
   - Parse string hasil dekompresi ke object JSON JavaScript asli.

#### Implementasi Lengkap Helper Dekripsi (Node.js)
```javascript
import crypto from 'node:crypto';
import LZString from 'lz-string';

/**
 * Mendekripsi payload response dari BPJS Trustmark / PCare v4.0
 * @param {string} encryptedResponse - Ciphertext string dari field 'response'
 * @param {string} consId - BPJS Consumer ID
 * @param {string} secretKey - BPJS Consumer Secret
 * @param {string} timestamp - Timestamp yang dikirim saat request
 * @returns {object|array|null} Data JSON asli yang sudah didekripsi
 */
export function decryptPCareResponse(encryptedResponse, consId, secretKey, timestamp) {
  if (!encryptedResponse) return null;

  try {
    // 1. Generate Key (32 bytes) dan IV (16 bytes) dari SHA-256
    const keyRaw = `${consId}${secretKey}${timestamp}`;
    const hash = crypto.createHash('sha256').update(keyRaw).digest();
    const key = hash; // 32 bytes
    const iv = hash.subarray(0, 16); // 16 bytes pertama

    // 2. Decrypt AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedResponse, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // 3. Decompress LZ-String
    const decompressed = LZString.decompressFromEncodedURIComponent(decrypted);
    if (!decompressed) {
      // Fallback jika respons ternyata didekripsi langsung tanpa URL encoding
      return JSON.parse(decrypted);
    }

    // 4. Parse JSON
    return JSON.parse(decompressed);
  } catch (err) {
    console.error('[BPJS PCare] Gagal mendekripsi response:', err.message);
    throw new Error(`Gagal mendekripsi respons BPJS: ${err.message}`);
  }
}
```

---

### 6.3. Fitur & Endpoint Tambahan pada PCare v4.0

Selain modul standar yang ada di v3.0 (Diagnosa, Peserta, Kunjungan, Obat, Tindakan, MCU, Prolanis), v4.0 menyertakan integrasi yang lebih erat dengan ekosistem digital BPJS:

#### 1. Integrasi Antrean Online Faskes & Mobile JKN (MJKN)
- Pasien dapat mengambil nomor antrean klinik langsung dari aplikasi smartphone **Mobile JKN**.
- Klinik wajib menyediakan endpoint webhook / bridging untuk:
  - Validasi rujukan / pendaftaran antrean baru dari MJKN.
  - Pengiriman estimasi waktu pelayanan (waktu tunggu, nomor panggilan).
  - Check-in pasien berbasis geolocation / scan QR di klinik.
  - Batal antrean oleh pasien.

#### 2. Rujukan Berbasis Kapasitas Real-time (HFIS Integration)
- Pada v4.0, rujukan ke Rumah Sakit (FKRTL) terintegrasi langsung dengan data **HFIS (Health Facilities Information System)** BPJS:
  - Menampilkan jadwal poliklinik spesialis yang sedang buka di RS tujuan.
  - Memvalidasi kapasitas / sisa kuota antrean poli rujukan di RS pada tanggal yang dipilih.
  - Menghindari rujukan pasien ditolak di RS karena kuota dokter spesialis penuh.

#### 3. Skrining Riwayat Kesehatan (SRK)
- Endpoint: `GET {BASE_URL}/skrining/{noKartu}`
- Digunakan untuk memeriksa apakah peserta sudah mengisi skrining mandiri untuk penyakit kronis (Diabetes Melitus, Hipertensi, Ginjal Kronis, Jantung Koroner) sebelum dokter melakukan anamnesa.

#### 4. Penilaian Kapitasi Berbasis Kinerja (KBK) & Kontak Sehat
- Pada v4.0 diperkenalkan pencatatan **Kontak Sehat**:
  - Pasien yang datang bukan untuk berobat sakit, melainkan konsultasi promotif/preventif, edukasi gizi, imunisasi rutin, atau senam Prolanis.
  - Pencatatan kontak sehat ini menaikkan indikator Angka Kontak (AK) klinik untuk pencairan kapitasi maksimal dari BPJS Kesehatan.

---

## 7. Action Items untuk Fase 9 (Integrasi BPJS)

Saat kredensial resmi (ConsID, SecretKey, UserKey, Username, Password) sudah diperoleh oleh Klinik Rizani:

1. **Konfigurasi Environment (`.env`)**:
   ```env
   BPJS_PCARE_BASE_URL=https://apijkn-dev.bpjs-kesehatan.go.id/pcare-rest-dev
   BPJS_PCARE_CONS_ID=xxxxx
   BPJS_PCARE_SECRET_KEY=xxxxx
   BPJS_PCARE_USER_KEY=xxxxx
   BPJS_PCARE_USERNAME=xxxxx
   BPJS_PCARE_PASSWORD=xxxxx
   BPJS_PCARE_APP_CODE=095
   BPJS_MODE=mock # 'mock' | 'v3' | 'v4_trustmark'
   ```
2. **Kembangkan Module `apps/api/src/modules/bpjs/`**:
   - `bpjs.client.js`: HTTP client dengan Axios/Fetch + auto header generation.
   - `bpjs.crypto.js`: AES-256-CBC decryptor + LZString (jika Trustmark v4 aktif).
   - `bpjs.service.js`: Bridge logic antara registrasi/encounter Kriza dengan PCare.
3. **Background Job / Queue Sync**:
   - Gunakan mekanisme sync asinkron (misal saat encounter di-finalize, sistem mencoba push ke PCare; jika gagal/timeout, disimpan di antrian retry).

