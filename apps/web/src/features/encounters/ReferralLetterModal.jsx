import React from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CLINIC_INFO, formatClinicContact } from '@/lib/clinic-info';

function formatDateIndo(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return '—';
  const birth = new Date(birthDateStr);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  return `${years} Tahun ${months} Bulan`;
}

export function ReferralLetterModal({ isOpen, onClose, referralData }) {
  if (!isOpen || !referralData) return null;

  const {
    referralNumber,
    referralType,
    issuedAt,
    targetFacilityName,
    targetPolyclinicName,
    referralReason,
    initialTherapy,
    transportation,
    internalConsultReason,
    pcareNoRujukan,
    patientName,
    patientMrn,
    patientGender,
    patientBirthDate,
    patientAddress,
    patientPhone,
    patientInsuranceType,
    patientBpjsNumber,
    patientAllergiesNotes,
    practitionerName,
    practitionerTitle,
    practitionerSip,
    originPolyclinicName,
    vitalSigns,
    diagnoses = [],
  } = referralData;

  const handlePrint = () => {
    window.print();
  };

  const isExternal = referralType === 'EXTERNAL';

  return (
    <Dialog open={isOpen} onOpenChange={onClose} maxWidth="max-w-3xl">
      <DialogClose onClick={onClose} />
      <DialogHeader className="print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              {isExternal ? 'Surat Rujukan Medis Eksternal' : 'Surat Konsultasi Rujukan Internal'}
            </DialogTitle>
          </div>
          <Button onClick={handlePrint} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
            <Printer className="w-4 h-4" /> Cetak Surat Rujukan
          </Button>
        </div>
      </DialogHeader>

      {/* Surat Rujukan Container (Printable) */}
      <div
        id="printable-referral-letter"
        className="printable-area bg-white text-gray-900 font-sans p-6 rounded-xl border border-gray-200 print:border-none print:p-0 text-xs leading-relaxed space-y-4 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible"
      >
        
        {/* Kop Surat Klinik */}
        <div className="border-b-2 border-gray-900 pb-3 flex items-center justify-center gap-4 relative">
          <img
            src={CLINIC_INFO.logoPath}
            alt={`Logo ${CLINIC_INFO.name}`}
            className="w-14 h-14 object-contain shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide uppercase text-gray-900">
              {CLINIC_INFO.legalName}
            </h1>
            <p className="text-[11px] text-gray-600">
              {CLINIC_INFO.address}
            </p>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {formatClinicContact()}
            </p>
          </div>
        </div>

        {/* Judul & Nomor Surat */}
        <div className="text-center space-y-0.5">
          <h2 className="text-sm font-bold uppercase underline tracking-wider">
            {isExternal ? 'SURAT RUJUKAN PASIEN' : 'SURAT KONSULTASI / RUJUKAN INTERNAL'}
          </h2>
          <p className="font-mono font-bold text-xs text-gray-700">
            No: {referralNumber}
          </p>
          {pcareNoRujukan && (
            <p className="text-[10px] text-green-700 font-mono font-semibold">
              No. Rujukan BPJS PCare: {pcareNoRujukan}
            </p>
          )}
        </div>

        {/* Tujuan Rujukan */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-gray-600">Kepada Yth. Sejawat Dokter:</p>
          <p className="font-bold text-sm text-gray-900 mt-0.5">
            {isExternal ? (
              <>
                Dokter Spesialis {targetPolyclinicName || 'Terkait'}
                <br />
                <span className="text-xs font-semibold text-gray-700">di {targetFacilityName || 'Rumah Sakit Rujukan'}</span>
              </>
            ) : (
              <>
                Dokter Penanggung Jawab {targetPolyclinicName || 'Poli Tujuan'}
                <br />
                <span className="text-xs font-semibold text-gray-700">{CLINIC_INFO.name}</span>
              </>
            )}
          </p>
        </div>

        {/* Identitas Pasien */}
        <div>
          <p className="font-bold text-gray-800 border-b pb-1 mb-2">I. IDENTITAS PASIEN</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex"><span className="w-28 text-gray-500">Nama Lengkap</span><span className="font-bold">: {patientName}</span></div>
            <div className="flex"><span className="w-28 text-gray-500">No. Rekam Medis</span><span className="font-mono font-bold">: {patientMrn}</span></div>
            <div className="flex"><span className="w-28 text-gray-500">Jenis Kelamin / Umur</span><span>: {patientGender} / {calculateAge(patientBirthDate)}</span></div>
            <div className="flex"><span className="w-28 text-gray-500">Penjamin / No. BPJS</span><span>: {patientInsuranceType} {patientBpjsNumber ? `(${patientBpjsNumber})` : ''}</span></div>
            <div className="flex col-span-2"><span className="w-28 text-gray-500 shrink-0">Alamat</span><span>: {patientAddress || '—'}</span></div>
          </div>
        </div>

        {/* Pemeriksaan Fisik & TTV */}
        {vitalSigns && (
          <div>
            <p className="font-bold text-gray-800 border-b pb-1 mb-2">II. PEMERIKSAAN FISIK & TANDA VITAL</p>
            <div className="grid grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-center text-[11px]">
              <div><p className="text-gray-500 text-[10px]">Tekanan Darah</p><p className="font-bold font-mono">{vitalSigns.systolic || '—'}/{vitalSigns.diastolic || '—'} mmHg</p></div>
              <div><p className="text-gray-500 text-[10px]">Denyut Nadi</p><p className="font-bold font-mono">{vitalSigns.heartRate || '—'} x/m</p></div>
              <div><p className="text-gray-500 text-[10px]">Suhu Tubuh</p><p className="font-bold font-mono">{vitalSigns.temperature || '—'} °C</p></div>
              <div><p className="text-gray-500 text-[10px]">Laju Nafas</p><p className="font-bold font-mono">{vitalSigns.respiratoryRate || '—'} x/m</p></div>
            </div>
            {patientAllergiesNotes && (
              <div className="mt-2 text-red-700 bg-red-50 p-2 rounded border border-red-200 text-[11px] font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Peringatan Alergi Pasien: {patientAllergiesNotes}
              </div>
            )}
          </div>
        )}

        {/* Diagnosa Klinis */}
        <div>
          <p className="font-bold text-gray-800 border-b pb-1 mb-2">III. DIAGNOSA KERJA (ICD-10)</p>
          {diagnoses.length === 0 ? (
            <p className="italic text-gray-500 text-xs">Belum ada diagnosa tercatat</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {diagnoses.map((d, i) => (
                <li key={i} className="text-xs">
                  <span className="font-mono font-bold text-gray-900">[{d.icd10Code}]</span> {d.icd10Name}
                  <span className="ml-2 text-[10px] text-gray-500 font-semibold">({d.diagnosisType})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alasan Rujukan & Terapi Awal */}
        <div>
          <p className="font-bold text-gray-800 border-b pb-1 mb-2">IV. KETERANGAN MEDIS & INDIKASI RUJUKAN</p>
          <div className="space-y-2 text-xs">
            <div>
              <p className="font-semibold text-gray-700">Alasan Rujukan / Permohonan Konsultasi:</p>
              <p className="bg-gray-50 p-2.5 rounded border border-gray-200 mt-1 whitespace-pre-wrap">
                {isExternal ? referralReason || 'Evaluasi dan penatalaksanaan lebih lanjut.' : internalConsultReason || 'Mohon evaluasi dan tindak lanjut antar poli.'}
              </p>
            </div>
            {isExternal && initialTherapy && (
              <div>
                <p className="font-semibold text-gray-700">Terapi / Tindakan Awal yang Telah Diberikan:</p>
                <p className="bg-gray-50 p-2.5 rounded border border-gray-200 mt-1 whitespace-pre-wrap">
                  {initialTherapy}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Penutup & Tanda Tangan Dokter */}
        <div className="pt-4 flex justify-between items-end border-t border-gray-200 text-xs">
          <div className="text-[11px] text-gray-500">
            <p>Transportasi: {transportation || 'Mandiri'}</p>
            <p className="mt-1">Surat rujukan ini dicetak secara sah melalui SIMRS {CLINIC_INFO.name}.</p>
          </div>

          <div className="text-center w-64">
            <p className="text-[11px]">{CLINIC_INFO.cityForSignature}, {formatDateIndo(issuedAt)}</p>
            <p className="text-[11px] font-medium text-gray-700 mt-0.5">Dokter Pemeriksa,</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-gray-300 font-serif italic text-xs">[ Tanda Tangan & Cap Digital ]</span>
            </div>
            <p className="font-bold underline text-xs text-gray-900">
              {practitionerTitle ? `${practitionerTitle} ` : ''}{practitionerName}
            </p>
            {practitionerSip && (
              <p className="text-[10px] text-gray-500 font-mono">SIP: {practitionerSip}</p>
            )}
          </div>
        </div>

      </div>
    </Dialog>
  );
}

export default ReferralLetterModal;
