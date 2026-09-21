/**
 * Seeder Data Farmasi & Stok Obat Awal Klinik Rizani
 * Sumber: Laporan Pemantauan Stock Obat Per-Shift & SO Agustus 2026
 */

require('../../config/env');
const { db, pool } = require('../index');
const {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  drugUnits,
  drugs,
  drugBatches,
  drugStockMovements,
} = require('../schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcryptjs');

const RAW_DRUGS_DATA = [
  { no: 1, name: 'ACETYLSISTEINE', form: 'TABLET', unit: 'TAB', qty: 304, ed: '2028-09-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 2, name: 'ACYCLOVIR 400 MG', form: 'TABLET', unit: 'TAB', qty: 92, ed: '2028-07-31', edNote: null, cat: 'Obat Keras', signa: '5x1 tablet (tiap 4 jam)' },
  { no: 3, name: 'ALLOPURINOL 100 MG', form: 'TABLET', unit: 'TAB', qty: 758, ed: '2028-04-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sesudah makan' },
  { no: 4, name: 'ALLOPURINOL 300 MG', form: 'TABLET', unit: 'TAB', qty: 54, ed: '2027-07-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sesudah makan' },
  { no: 5, name: 'AMBROXOL', form: 'TABLET', unit: 'TAB', qty: 554, ed: '2028-06-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 6, name: 'AMLODIPINE 10 MG', form: 'TABLET', unit: 'TAB', qty: 448, ed: '2028-04-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi/malam' },
  { no: 7, name: 'AMLODIPINE 5 MG', form: 'TABLET', unit: 'TAB', qty: 364, ed: '2028-11-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi/malam' },
  { no: 8, name: 'AMOXICILLIN 500 MG', form: 'KAPSUL', unit: 'KAP', qty: 479, ed: '2028-06-30', edNote: null, cat: 'Obat Keras', signa: '3x1 kapsul (habiskan)' },
  { no: 9, name: 'ANTASIDA', form: 'TABLET', unit: 'TAB', qty: 165, ed: '2029-09-30', edNote: null, cat: 'Obat Bebas', signa: '3x1 tablet kunyah sebelum makan' },
  { no: 10, name: 'ASAM FOLAT', form: 'TABLET', unit: 'TAB', qty: 180, ed: '2026-08-30', edNote: 'ED Bulan ini tgl 30', cat: 'Obat Bebas', signa: '1x1 tablet sehari' },
  { no: 11, name: 'ASAM MEFENAMAT', form: 'TABLET', unit: 'TAB', qty: 486, ed: '2029-07-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet bila nyeri' },
  { no: 12, name: 'ATORVASTATIN 20 MG', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet malam hari' },
  { no: 13, name: 'ATTAPULGITE', form: 'TABLET', unit: 'TAB', qty: 32, ed: '2026-10-31', edNote: null, cat: 'Obat Bebas', signa: '2 tablet setiap sehabis BAB' },
  { no: 14, name: 'BETAHISTIN', form: 'TABLET', unit: 'TAB', qty: 155, ed: '2026-12-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 15, name: 'BISACODYL', form: 'TABLET', unit: 'TAB', qty: 70, ed: '2026-10-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '1x1 tablet malam sebelum tidur' },
  { no: 16, name: 'BISOPROLOL 2,5 MG', form: 'TABLET', unit: 'TAB', qty: 100, ed: '2026-12-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi hari' },
  { no: 17, name: 'CALCIUM LACTATE', form: 'TABLET', unit: 'TAB', qty: 91, ed: '2027-07-31', edNote: null, cat: 'Obat Bebas', signa: '1-2x sehari 1 tablet' },
  { no: 18, name: 'CANDESARTAN 8 MG', form: 'TABLET', unit: 'TAB', qty: 227, ed: '2028-07-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sehari' },
  { no: 19, name: 'CAPTOPRIL 12,5 MG', form: 'TABLET', unit: 'TAB', qty: 196, ed: '2026-08-30', edNote: 'ED Bulan ini tgl 30', cat: 'Obat Keras', signa: '2-3x sehari 1 tablet 1 jam ac' },
  { no: 20, name: 'CAPTOPRIL 25 MG', form: 'TABLET', unit: 'TAB', qty: 196, ed: '2028-03-31', edNote: null, cat: 'Obat Keras', signa: '2-3x sehari 1 tablet 1 jam ac' },
  { no: 21, name: 'CAVIPLEX', form: 'TABLET', unit: 'TAB', qty: 116, ed: '2028-05-31', edNote: null, cat: 'Obat Bebas', signa: '1x1 tablet sehari' },
  { no: 22, name: 'CEFADROXIL', form: 'KAPSUL', unit: 'KAP', qty: 179, ed: '2027-06-30', edNote: null, cat: 'Obat Keras', signa: '2x1 kapsul (habiskan)' },
  { no: 23, name: 'CEFIXIME 100 MG', form: 'KAPSUL', unit: 'KAP', qty: 254, ed: '2027-03-31', edNote: null, cat: 'Obat Keras', signa: '2x1 kapsul (habiskan)' },
  { no: 24, name: 'CEFIXIME 200 MG', form: 'KAPSUL', unit: 'KAP', qty: 195, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '1-2x sehari 1 kapsul (habiskan)' },
  { no: 25, name: 'CETIRIZINE', form: 'TABLET', unit: 'TAB', qty: 216, ed: '2027-07-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '1x1 tablet malam hari' },
  { no: 26, name: 'CIPROFLOXACIN', form: 'TABLET', unit: 'TAB', qty: 289, ed: '2030-03-31', edNote: null, cat: 'Obat Keras', signa: '2x1 tablet (habiskan)' },
  { no: 27, name: 'CLINDAMYCIN 300 MG', form: 'KAPSUL', unit: 'KAP', qty: 350, ed: '2029-08-31', edNote: null, cat: 'Obat Keras', signa: '3x1 kapsul (habiskan)' },
  { no: 28, name: 'CLORPHENIRAMIN MALEAT', form: 'TABLET', unit: 'TAB', qty: 376, ed: '2028-07-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 29, name: 'COTRIMOXAZOLE', form: 'TABLET', unit: 'TAB', qty: 45, ed: '2027-10-31', edNote: null, cat: 'Obat Keras', signa: '2x1 tablet (habiskan)' },
  { no: 30, name: 'DANEURON', form: 'TABLET', unit: 'TAB', qty: 540, ed: '2027-04-30', edNote: null, cat: 'Obat Bebas', signa: '1x1 tablet sehari' },
  { no: 31, name: 'DEMACOLIN', form: 'TABLET', unit: 'TAB', qty: 409, ed: '2029-07-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 32, name: 'DEXAMETHASONE 0,5 MG', form: 'TABLET', unit: 'TAB', qty: 948, ed: '2030-09-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 33, name: 'DEXAMETHASONE 0,75 MG', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '2-3x sehari 1 tablet' },
  { no: 34, name: 'DOMPERIDONE', form: 'TABLET', unit: 'TAB', qty: 27, ed: '2027-01-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet 15-30 menit sebelum makan' },
  { no: 35, name: 'EPERISONE', form: 'TABLET', unit: 'TAB', qty: 373, ed: '2027-06-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 36, name: 'ETAFLUSIN', form: 'TABLET', unit: 'TAB', qty: 611, ed: '2028-04-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 37, name: 'FLUNARAZINE', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet malam hari' },
  { no: 38, name: 'FLUTROP', form: 'TABLET', unit: 'TAB', qty: 431, ed: '2027-11-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 39, name: 'FUROSEMIDE', form: 'TABLET', unit: 'TAB', qty: 55, ed: '2027-03-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi hari' },
  { no: 40, name: 'GRADILEX', form: 'TABLET', unit: 'TAB', qty: 116, ed: '2028-07-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 41, name: 'GRANTUSIF', form: 'TABLET', unit: 'TAB', qty: 394, ed: '2029-12-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 42, name: 'GUAIFENESIN', form: 'TABLET', unit: 'TAB', qty: 452, ed: '2026-10-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 43, name: 'GLIMEPIRIDE', form: 'TABLET', unit: 'TAB', qty: 389, ed: '2027-08-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sesaat sebelum makan pagi' },
  { no: 44, name: 'GLIBENKLAMID 5 MG', form: 'TABLET', unit: 'TAB', qty: 350, ed: '2027-04-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sebelum makan pagi' },
  { no: 45, name: 'HYDROCHLOROTHIAZIDE', form: 'TABLET', unit: 'TAB', qty: 100, ed: '2026-11-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi hari' },
  { no: 46, name: 'IBUPROFEN 400 MG', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x1 tablet sesudah makan' },
  { no: 47, name: 'ISDN', form: 'TABLET', unit: 'TAB', qty: 190, ed: '2027-04-30', edNote: null, cat: 'Obat Keras', signa: '1 tablet hisap bawah lidah (sublingual)' },
  { no: 48, name: 'KETOCONAZOLE', form: 'TABLET', unit: 'TAB', qty: 133, ed: '2026-10-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sesudah makan' },
  { no: 49, name: 'LISINOPRIL 5 MG', form: 'TABLET', unit: 'TAB', qty: 100, ed: '2027-06-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sehari' },
  { no: 50, name: 'LORATADINE', form: 'TABLET', unit: 'TAB', qty: 701, ed: '2028-01-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '1x1 tablet sehari' },
  { no: 51, name: 'METFORMIN 500 MG', form: 'TABLET', unit: 'TAB', qty: 430, ed: '2027-10-31', edNote: null, cat: 'Obat Keras', signa: '2-3x sehari 1 tablet bersama makan' },
  { no: 52, name: 'METHYLPREDNISOLON 4 MG', form: 'TABLET', unit: 'TAB', qty: 57, ed: '2027-11-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sesudah makan' },
  { no: 53, name: 'METOCLOPRAMIDE', form: 'TABLET', unit: 'TAB', qty: 200, ed: '2027-11-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sebelum makan' },
  { no: 54, name: 'METRONIDAZOLE', form: 'TABLET', unit: 'TAB', qty: 104, ed: '2029-03-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet (habiskan)' },
  { no: 55, name: 'MELOXICAM 7,5 MG', form: 'TABLET', unit: 'TAB', qty: 20, ed: '2027-07-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sesudah makan' },
  { no: 56, name: 'NATRIUM DICLOFENAC', form: 'TABLET', unit: 'TAB', qty: 409, ed: '2028-11-30', edNote: null, cat: 'Obat Keras', signa: '2-3x sehari 1 tablet sesudah makan' },
  { no: 57, name: 'NIFEDIPINE 10 MG', form: 'TABLET', unit: 'TAB', qty: 190, ed: '2027-05-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet sehari' },
  { no: 58, name: 'OMEPRAZOLE', form: 'KAPSUL', unit: 'KAP', qty: 295, ed: '2028-10-31', edNote: null, cat: 'Obat Keras', signa: '1-2x sehari 1 kapsul 30 menit ac' },
  { no: 59, name: 'ONDANSETRON 4 MG', form: 'TABLET', unit: 'TAB', qty: 245, ed: '2027-09-30', edNote: null, cat: 'Obat Keras', signa: '2x1 tablet bila mual' },
  { no: 60, name: 'ORALIT', form: 'SACHET', unit: 'SACHET', qty: 70, ed: '2028-05-31', edNote: null, cat: 'Obat Bebas', signa: '1 sachet dilarutkan dalam 200ml air' },
  { no: 61, name: 'PARACETAMOL 500 MG', form: 'TABLET', unit: 'TAB', qty: 414, ed: '2029-03-31', edNote: null, cat: 'Obat Bebas', signa: '3-4x sehari 1 tablet prn demam/nyeri' },
  { no: 62, name: 'PIOGLITAZONE', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet sehari' },
  { no: 63, name: 'PIROXICAM 20 MG', form: 'KAPSUL', unit: 'KAP', qty: 622, ed: '2028-01-31', edNote: null, cat: 'Obat Keras', signa: '1x1 kapsul sesudah makan' },
  { no: 64, name: 'PROPANOLOL 10 MG', form: 'TABLET', unit: 'TAB', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '2-3x sehari 1 tablet' },
  { no: 65, name: 'RANITIDIN', form: 'TABLET', unit: 'TAB', qty: 523, ed: '2028-01-31', edNote: null, cat: 'Obat Keras', signa: '2x1 tablet sebelum makan' },
  { no: 66, name: 'SALBUTAMOL 2 MG', form: 'TABLET', unit: 'TAB', qty: 345, ed: '2026-09-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet bila sesak' },
  { no: 67, name: 'SALBUTAMOL 4 MG', form: 'TABLET', unit: 'TAB', qty: 344, ed: '2027-10-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet bila sesak' },
  { no: 68, name: 'SIMVASTATIN 10 MG', form: 'TABLET', unit: 'TAB', qty: 54, ed: '2027-09-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet malam hari' },
  { no: 69, name: 'SIMVASTATIN 20 MG', form: 'TABLET', unit: 'TAB', qty: 317, ed: '2027-04-30', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet malam hari' },
  { no: 70, name: 'SPASMINAL', form: 'TABLET', unit: 'TAB', qty: 278, ed: '2027-11-30', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet bila kram/nyeri perut' },
  { no: 71, name: 'SPIRONOLACTONE', form: 'TABLET', unit: 'TAB', qty: 100, ed: '2027-03-31', edNote: null, cat: 'Obat Keras', signa: '1x1 tablet pagi hari' },
  { no: 72, name: 'TAMBAH DARAH', form: 'TABLET', unit: 'TAB', qty: 38, ed: '2026-08-31', edNote: null, cat: 'Obat Bebas', signa: '1x1 tablet sehari' },
  { no: 73, name: 'VITAMIN B COMPLEX', form: 'TABLET', unit: 'TAB', qty: 203, ed: '2028-02-29', edNote: null, cat: 'Obat Bebas', signa: '1-2x sehari 1 tablet' },
  { no: 74, name: 'VITAMIN C', form: 'TABLET', unit: 'TAB', qty: 52, ed: '2026-09-30', edNote: null, cat: 'Obat Bebas', signa: '1-2x sehari 1 tablet' },
  { no: 75, name: 'ZINC 20 MG', form: 'TABLET', unit: 'TAB', qty: 241, ed: '2028-12-31', edNote: null, cat: 'Obat Bebas', signa: '1x1 tablet sehari (10 hari)' },
  { no: 76, name: 'ALLETROL SALEP MATA', form: 'SALEP MATA', unit: 'TUBE', qty: 8, ed: '2027-06-30', edNote: null, cat: 'Obat Keras', signa: 'Oleskan 2-3x sehari pada mata' },
  { no: 77, name: 'ALLETROL TETES MATA', form: 'TETES MATA', unit: 'BTL', qty: 8, ed: '2027-05-31', edNote: null, cat: 'Obat Keras', signa: '1-2 tetes 3-4x sehari pada mata' },
  { no: 78, name: 'ERLAMYCETIN PLUS TETES MATA', form: 'TETES MATA', unit: 'BTL', qty: 7, ed: '2027-09-30', edNote: null, cat: 'Obat Keras', signa: '1-2 tetes 3x sehari pada mata' },
  { no: 79, name: 'ERLAMYCETIN TETES TELINGA', form: 'TETES TELINGA', unit: 'BTL', qty: 7, ed: '2027-09-30', edNote: null, cat: 'Obat Keras', signa: '2-3 tetes 3x sehari pada telinga' },
  { no: 80, name: 'GENOINT SALEP MATA', form: 'SALEP MATA', unit: 'TUBE', qty: 10, ed: '2027-03-31', edNote: null, cat: 'Obat Keras', signa: 'Oleskan tipis 2-3x sehari pada mata' },
  { no: 81, name: 'GENOINT TETES MATA', form: 'TETES MATA', unit: 'BTL', qty: 4, ed: '2027-05-31', edNote: null, cat: 'Obat Keras', signa: '1-2 tetes 3-4x sehari' },
  { no: 82, name: 'GENTIAN VIOLET', form: 'OBAT KUMUR', unit: 'BTL', qty: 13, ed: '2027-11-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: 'Oleskan pada luka / sariawan' },
  { no: 83, name: 'AMOXICILLIN SIRUP', form: 'SIRUP', unit: 'BTL', qty: 7, ed: '2028-05-31', edNote: null, cat: 'Obat Keras', signa: '3x sehari 1 sendok takar (habiskan)' },
  { no: 84, name: 'ANTASIDA SIRUP', form: 'SIRUP', unit: 'BTL', qty: 8, ed: '2028-11-30', edNote: null, cat: 'Obat Bebas', signa: '3x sehari 1 sendok takar sebelum makan' },
  { no: 85, name: 'CAVIPLEX SIRUP', form: 'SIRUP', unit: 'BTL', qty: 3, ed: '2027-08-31', edNote: null, cat: 'Obat Bebas', signa: '1x sehari 1 sendok takar' },
  { no: 86, name: 'CEFADROXYL SIRUP', form: 'SIRUP', unit: 'BTL', qty: 8, ed: '2027-08-31', edNote: null, cat: 'Obat Keras', signa: '2x sehari 1 sendok takar (habiskan)' },
  { no: 87, name: 'CEFIXIME SIRUP', form: 'SIRUP', unit: 'BTL', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '2x sehari sesuai dosis BB' },
  { no: 88, name: 'DOMPERIDONE SIRUP', form: 'SIRUP', unit: 'BTL', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '3x sehari sebelum makan' },
  { no: 89, name: 'IBUPROFEN SIRUP', form: 'SIRUP', unit: 'BTL', qty: 5, ed: '2028-06-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x sehari 1 sendok takar sesudah makan' },
  { no: 90, name: 'KAOTIM SIRUP', form: 'SIRUP', unit: 'BTL', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Bebas', signa: '3x sehari sesudah BAB' },
  { no: 91, name: 'OMEGDIAR SIRUP', form: 'SIRUP', unit: 'BTL', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Bebas', signa: '3x sehari sesudah BAB' },
  { no: 92, name: 'PARACETAMOL SIRUP', form: 'SIRUP', unit: 'BTL', qty: 6, ed: '2028-10-31', edNote: null, cat: 'Obat Bebas', signa: '3-4x sehari 1 sendok takar bila demam' },
  { no: 93, name: 'PASABA COUGH AND FLU', form: 'SIRUP', unit: 'BTL', qty: 15, ed: '2028-03-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x sehari 1 sendok takar' },
  { no: 94, name: 'PASABA SIRUP', form: 'SIRUP', unit: 'BTL', qty: 1, ed: '2029-02-28', edNote: null, cat: 'Obat Bebas Terbatas', signa: '3x sehari 1 sendok takar' },
  { no: 95, name: 'SUCRALFATE SIRUP', form: 'SIRUP', unit: 'BTL', qty: 10, ed: '2028-02-29', edNote: null, cat: 'Obat Keras', signa: '3-4x sehari 1 sendok takar 1 jam ac' },
  { no: 96, name: 'ZINC PRO SIRUP', form: 'SIRUP', unit: 'BTL', qty: 2, ed: '2028-09-30', edNote: null, cat: 'Obat Bebas', signa: '1x sehari 1 sendok takar (10 hari)' },
  { no: 97, name: 'ZINC SIRUP', form: 'SIRUP', unit: 'BTL', qty: 3, ed: '2029-03-31', edNote: null, cat: 'Obat Bebas', signa: '1x sehari 1 sendok takar (10 hari)' },
  { no: 98, name: 'ACYCLOVIR SALEP', form: 'SALEP', unit: 'TUBE', qty: 31, ed: '2026-10-31', edNote: null, cat: 'Obat Keras', signa: 'Oleskan 5x sehari pada lesi' },
  { no: 99, name: 'BETAMETHASONE SALEP', form: 'SALEP', unit: 'TUBE', qty: 9, ed: '2028-09-30', edNote: null, cat: 'Obat Keras', signa: 'Oleskan tipis 2x sehari' },
  { no: 100, name: 'GENTAMYCIN SALEP', form: 'SALEP', unit: 'TUBE', qty: 28, ed: '2027-06-30', edNote: null, cat: 'Obat Keras', signa: 'Oleskan 2-3x sehari pada area infeksi' },
  { no: 101, name: 'KETOCONAZOLE SALEP', form: 'SALEP', unit: 'TUBE', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: 'Oleskan 1-2x sehari pada area jamur' },
  { no: 102, name: 'MICONAZOLE SALEP', form: 'SALEP', unit: 'TUBE', qty: 31, ed: '2028-09-30', edNote: null, cat: 'Obat Bebas Terbatas', signa: 'Oleskan 2x sehari pada area jamur' },
  { no: 103, name: 'PERMETRIN SALEP', form: 'SALEP', unit: 'TUBE', qty: 3, ed: '2026-10-31', edNote: null, cat: 'Obat Keras', signa: 'Oleskan malam hari ke seluruh tubuh' },
  { no: 104, name: 'LACTO-B', form: 'SACHET', unit: 'SACHET', qty: 24, ed: '2027-09-30', edNote: null, cat: 'Obat Bebas', signa: '1 sachet 1-2x sehari bersama makanan' },
  { no: 105, name: 'SUPERHOID', form: 'SUPPOSITORIA', unit: 'SUPP', qty: 4, ed: '2028-08-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '1 supp dimasukkan ke dubur malam hari' },
  { no: 106, name: 'ANTIHEMOROID', form: 'SUPPOSITORIA', unit: 'SUPP', qty: 3, ed: '2027-10-31', edNote: null, cat: 'Obat Bebas Terbatas', signa: '1 supp dimasukkan ke dubur malam hari' },
  { no: 107, name: 'PAMOL SUPP', form: 'SUPPOSITORIA', unit: 'SUPP', qty: 1, ed: '2028-02-29', edNote: null, cat: 'Obat Bebas', signa: '1 supp per rektal jika demam tinggi >38.5C' },
  { no: 108, name: 'SYMBICORT', form: 'TURBUHALER', unit: 'THALER', qty: 1, ed: '2026-08-30', edNote: 'ED Bulan ini tgl 30', cat: 'Obat Keras', signa: '1-2 inhalasi 2x sehari' },
  { no: 109, name: 'MASKER NEBUL', form: 'PCS', unit: 'PCS', qty: 5, ed: '2029-12-31', edNote: null, cat: 'Alkes', signa: 'Sesuai kebutuhan nebulisasi' },
  { no: 110, name: 'SIRPLUS', form: 'BOTOL', unit: 'BTL', qty: 0, ed: '2027-12-31', edNote: null, cat: 'Obat Bebas', signa: 'Pemanis campuran puyer' },
  { no: 111, name: 'COMBIVENT', form: 'VIAL', unit: 'VIAL', qty: 4, ed: '2027-12-31', edNote: null, cat: 'Obat Keras', signa: '1 respule per nebulisasi' },
  { no: 112, name: 'VELUTIN', form: 'AMPUL', unit: 'AMP', qty: 1, ed: '2027-10-31', edNote: null, cat: 'Obat Keras', signa: '1 ampul per nebulisasi bila sesak' },
  { no: 113, name: 'ASAM TRANEKSAMAT 500 MG', form: 'TABLET', unit: 'TAB', qty: 93, ed: '2028-12-31', edNote: null, cat: 'Obat Keras', signa: '3x1 tablet bila perdarahan' },
];

const EXTRA_UNITS = [
  { code: 'SACHET', name: 'Sachet' },
  { code: 'SUPP', name: 'Suppositoria' },
  { code: 'THALER', name: 'Turbuhaler' },
];

async function seedPharmacy() {
  console.log('🌱 Memulai Seeding Modul Farmasi & 113 Obat Klinik Rizani...');

  // 1. Tambah Role & Permissions Farmasi
  console.log('   → Memeriksa Role & Permissions Farmasi...');
  let farmasiRole = (await db.select().from(roles).where(eq(roles.name, 'farmasi')).limit(1))[0];
  if (!farmasiRole) {
    [farmasiRole] = await db.insert(roles).values({
      name: 'farmasi',
      displayName: 'Apoteker / Asisten Apoteker',
      description: 'Akses penuh ke modul farmasi, stok obat, resep, dan dispensing',
    }).returning();
    console.log('     ✓ Role farmasi dibuat');
  }

  const farmasiPermActions = [
    'pharmacy:read', 'pharmacy:dispense', 'pharmacy:stock',
    'patients:read', 'registrations:read', 'encounters:read', 'masterdata:read',
  ];

  for (const action of farmasiPermActions) {
    const perm = (await db.select().from(permissions).where(eq(permissions.action, action)).limit(1))[0];
    if (perm && farmasiRole) {
      try {
        await db.insert(rolePermissions).values({ roleId: farmasiRole.id, permissionId: perm.id }).onConflictDoNothing();
      } catch { /* ignore */ }
    }
  }

  // Buat default user farmasi jika belum ada
  const existingFarmasiUser = (await db.select().from(users).where(eq(users.username, 'farmasi')).limit(1))[0];
  let farmasiUser = existingFarmasiUser;
  if (!existingFarmasiUser) {
    const passwordHash = await bcrypt.hash('Farmasi@KRIZA2024', 12);
    [farmasiUser] = await db.insert(users).values({
      username: 'farmasi',
      name: 'Petugas Farmasi Klinik',
      passwordHash,
      email: 'farmasi@klinikrizani.local',
    }).returning();

    if (farmasiRole) {
      await db.insert(userRoles).values({ userId: farmasiUser.id, roleId: farmasiRole.id }).onConflictDoNothing();
    }
    console.log('     ✓ User default farmasi dibuat (farmasi / Farmasi@KRIZA2024)');
  }

  // 2. Unit Sediaan Tambahan
  console.log('   → Menyiapkan Satuan Sediaan Tambahan...');
  for (const u of EXTRA_UNITS) {
    const existing = await db.select().from(drugUnits).where(eq(drugUnits.code, u.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(drugUnits).values(u);
    }
  }

  const allUnits = await db.select().from(drugUnits);
  const unitMap = {};
  allUnits.forEach((u) => { unitMap[u.code] = u.id; });

  // 3. Seed 113 Item Obat & Initial Batches
  console.log('   → Mengimpor 113 Item Obat & Batch Saldo Awal...');
  let importedDrugs = 0;
  let importedBatches = 0;

  for (const item of RAW_DRUGS_DATA) {
    const code = `OBT-${String(item.no).padStart(3, '0')}`;
    let drug = (await db.select().from(drugs).where(eq(drugs.code, code)).limit(1))[0];

    const unitId = unitMap[item.unit] || unitMap['TAB'];

    if (!drug) {
      [drug] = await db.insert(drugs).values({
        code,
        name: item.name,
        genericName: item.name,
        dosageForm: item.form,
        category: item.cat,
        unitId,
        basePrice: '1000',
        sellingPrice: '2000',
        defaultMarkupPercent: '25',
        minStock: 10,
        currentStock: item.qty,
        defaultSigna: item.signa,
        requiresPrescription: item.cat === 'Obat Keras',
        isActive: true,
      }).returning();
      importedDrugs++;
    } else {
      // Update form & metadata
      await db.update(drugs).set({
        dosageForm: item.form,
        defaultSigna: item.signa,
        currentStock: item.qty,
      }).where(eq(drugs.id, drug.id));
    }

    // Buat batch saldo awal jika belum ada batch aktif
    const existingBatches = await db.select().from(drugBatches).where(eq(drugBatches.drugId, drug.id)).limit(1);
    if (existingBatches.length === 0) {
      const [batch] = await db.insert(drugBatches).values({
        drugId: drug.id,
        batchNumber: `BATCH-AGU26-${String(item.no).padStart(3, '0')}`,
        expiryDate: item.ed,
        purchaseDate: '2026-08-01',
        storageLocation: 'GUDANG_FARMASI',
        purchasePrice: '1000',
        sellingPrice: '2000',
        initialQty: item.qty,
        currentQty: item.qty,
        notes: item.edNote || 'Saldo Awal SO Agustus 2026',
        isActive: true,
        createdBy: farmasiUser ? farmasiUser.id : null,
      }).returning();

      // Buat log mutasi saldo awal
      if (item.qty > 0) {
        await db.insert(drugStockMovements).values({
          batchId: batch.id,
          drugId: drug.id,
          movementType: 'PENERIMAAN_BATCH',
          quantity: item.qty,
          quantityBefore: 0,
          quantityAfter: item.qty,
          referenceType: 'STOCK_OPNAME',
          reason: 'Saldo Awal Stock Opname Agustus 2026',
          movedBy: farmasiUser ? farmasiUser.id : null,
        });
      }
      importedBatches++;
    }
  }

  console.log(`     ✓ Berhasil menyiapkan ${RAW_DRUGS_DATA.length} katalog obat & ${importedBatches} batch saldo awal!`);
  console.log('✅ Seeding Farmasi Selesai!');
}

seedPharmacy()
  .catch((err) => {
    console.error('❌ Seeding farmasi gagal:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
