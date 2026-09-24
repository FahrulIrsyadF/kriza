const { db } = require('../../db');
const {
  registrations,
  queues,
  patients,
  polyclinics,
  practitioners,
  invoices,
  invoiceItems,
  payments,
  encounters,
  encounterDiagnoses,
  encounterReferrals,
  drugs,
  drugUnits,
  drugBatches,
  prescriptions,
  prescriptionItems,
  users,
} = require('../../db/schema');
const { sql, eq, ne, and, or, gte, lte, desc, asc, count } = require('drizzle-orm');

// ─── 1. Overview KPI Ringkasan Eksekutif ─────────────────────────────────────
async function getOverviewStats({ startDate, endDate }) {
  const regConditions = [];
  const payConditions = [];
  const encConditions = [eq(encounters.status, 'FINALIZED')];
  const rxConditions = [eq(prescriptions.status, 'DISPENSED')];

  if (startDate) {
    regConditions.push(gte(registrations.registrationDate, startDate));
    payConditions.push(gte(sql`DATE(${payments.paidAt})`, startDate));
    encConditions.push(gte(encounters.encounterDate, startDate));
    rxConditions.push(gte(sql`DATE(${prescriptions.dispensedAt})`, startDate));
  }
  if (endDate) {
    regConditions.push(lte(registrations.registrationDate, endDate));
    payConditions.push(lte(sql`DATE(${payments.paidAt})`, endDate));
    encConditions.push(lte(encounters.encounterDate, endDate));
    rxConditions.push(lte(sql`DATE(${prescriptions.dispensedAt})`, endDate));
  }

  // Total Kunjungan & Pasien BPJS
  const [visRow] = await db
    .select({
      totalVisits: count(),
      bpjsVisits: sql`COUNT(CASE WHEN ${registrations.paymentMethod} = 'BPJS' THEN 1 END)`,
      newPatients: sql`COUNT(CASE WHEN ${registrations.visitType} = 'BARU' THEN 1 END)`,
    })
    .from(registrations)
    .where(regConditions.length > 0 ? and(...regConditions) : undefined);

  // Total Pendapatan Kasir
  const [payRow] = await db
    .select({
      totalRevenue: sql`COALESCE(SUM(${payments.amount}), 0)`,
      totalTransactions: count(),
    })
    .from(payments)
    .where(payConditions.length > 0 ? and(...payConditions) : undefined);

  // Total Resep Obat Dilayani
  const [rxRow] = await db
    .select({
      totalDispensedPrescriptions: count(),
    })
    .from(prescriptions)
    .where(rxConditions.length > 0 ? and(...rxConditions) : undefined);

  // Total Diagnosa Tercatat
  const [diagRow] = await db
    .select({
      totalDiagnoses: count(),
    })
    .from(encounterDiagnoses)
    .innerJoin(encounters, eq(encounterDiagnoses.encounterId, encounters.id))
    .where(encConditions.length > 0 ? and(...encConditions) : undefined);

  return {
    totalVisits: Number(visRow?.totalVisits || 0),
    bpjsVisits: Number(visRow?.bpjsVisits || 0),
    newPatients: Number(visRow?.newPatients || 0),
    totalRevenue: Number(payRow?.totalRevenue || 0),
    totalTransactions: Number(payRow?.totalTransactions || 0),
    totalDispensedPrescriptions: Number(rxRow?.totalDispensedPrescriptions || 0),
    totalDiagnoses: Number(diagRow?.totalDiagnoses || 0),
  };
}

// ─── 2. Laporan Kunjungan Pasien (Visits) ────────────────────────────────────
async function getVisitsReport({
  startDate,
  endDate,
  polyclinicId,
  practitionerId,
  visitType,
  paymentMethod,
  limit = 50,
  offset = 0,
}) {
  const conditions = [];

  if (startDate) conditions.push(gte(registrations.registrationDate, startDate));
  if (endDate) conditions.push(lte(registrations.registrationDate, endDate));
  if (polyclinicId) conditions.push(eq(registrations.polyclinicId, polyclinicId));
  if (practitionerId) conditions.push(eq(registrations.practitionerId, practitionerId));
  if (visitType && visitType !== 'ALL') conditions.push(eq(registrations.visitType, visitType));
  if (paymentMethod && paymentMethod !== 'ALL') conditions.push(eq(registrations.paymentMethod, paymentMethod));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Aggregate stats
  const [summary] = await db
    .select({
      total: count(),
      baruCount: sql`COUNT(CASE WHEN ${registrations.visitType} = 'BARU' THEN 1 END)`,
      lamaCount: sql`COUNT(CASE WHEN ${registrations.visitType} = 'LAMA' THEN 1 END)`,
      bpjsCount: sql`COUNT(CASE WHEN ${registrations.paymentMethod} = 'BPJS' THEN 1 END)`,
      umumCount: sql`COUNT(CASE WHEN ${registrations.paymentMethod} = 'UMUM' THEN 1 END)`,
      asuransiCount: sql`COUNT(CASE WHEN ${registrations.paymentMethod} = 'ASURANSI_SWASTA' THEN 1 END)`,
      selesaiCount: sql`COUNT(CASE WHEN ${registrations.status} = 'SELESAI' THEN 1 END)`,
      batalCount: sql`COUNT(CASE WHEN ${registrations.status} = 'BATAL' THEN 1 END)`,
    })
    .from(registrations)
    .where(whereClause);

  // Polyclinic breakdown
  const polyBreakdown = await db
    .select({
      polyclinicId: polyclinics.id,
      polyclinicName: polyclinics.name,
      count: count(registrations.id),
    })
    .from(registrations)
    .innerJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .where(whereClause)
    .groupBy(polyclinics.id, polyclinics.name)
    .orderBy(desc(count(registrations.id)));

  // Daily Trend
  const dailyTrend = await db
    .select({
      date: sql`TO_CHAR(${registrations.registrationDate}, 'YYYY-MM-DD')`,
      total: count(),
      baru: sql`COUNT(CASE WHEN ${registrations.visitType} = 'BARU' THEN 1 END)`,
      lama: sql`COUNT(CASE WHEN ${registrations.visitType} = 'LAMA' THEN 1 END)`,
    })
    .from(registrations)
    .where(whereClause)
    .groupBy(sql`TO_CHAR(${registrations.registrationDate}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${registrations.registrationDate}, 'YYYY-MM-DD') ASC`);

  // Detailed Visit Items
  const items = await db
    .select({
      id: registrations.id,
      registrationNumber: registrations.registrationNumber,
      registrationDate: sql`TO_CHAR(${registrations.registrationDate}, 'YYYY-MM-DD')`,
      visitType: registrations.visitType,
      registrationSource: registrations.registrationSource,
      paymentMethod: registrations.paymentMethod,
      bpjsCardNumber: registrations.bpjsCardNumber,
      status: registrations.status,
      complaint: registrations.complaint,
      queueNumber: queues.queueNumber,
      patientId: patients.id,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientGender: patients.gender,
      patientPhone: patients.phone,
      polyclinicId: polyclinics.id,
      polyclinicName: polyclinics.name,
      practitionerId: practitioners.id,
      practitionerName: practitioners.name,
      createdAt: registrations.createdAt,
    })
    .from(registrations)
    .innerJoin(patients, eq(registrations.patientId, patients.id))
    .innerJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .leftJoin(queues, eq(registrations.id, queues.registrationId))
    .where(whereClause)
    .orderBy(desc(registrations.registrationDate), desc(registrations.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    summary: {
      total: Number(summary?.total || 0),
      baruCount: Number(summary?.baruCount || 0),
      lamaCount: Number(summary?.lamaCount || 0),
      bpjsCount: Number(summary?.bpjsCount || 0),
      umumCount: Number(summary?.umumCount || 0),
      asuransiCount: Number(summary?.asuransiCount || 0),
      selesaiCount: Number(summary?.selesaiCount || 0),
      batalCount: Number(summary?.batalCount || 0),
    },
    polyBreakdown: polyBreakdown.map((p) => ({
      ...p,
      count: Number(p.count),
    })),
    dailyTrend: dailyTrend.map((d) => ({
      date: d.date,
      total: Number(d.total),
      baru: Number(d.baru),
      lama: Number(d.lama),
    })),
    items,
  };
}

// ─── 3. Laporan Pendapatan & Kasir (Revenue) ─────────────────────────────────
async function getRevenueReport({
  startDate,
  endDate,
  paymentMethod,
  status,
  limit = 50,
  offset = 0,
}) {
  const payConditions = [];
  const invConditions = [];

  if (startDate) {
    payConditions.push(gte(sql`DATE(${payments.paidAt})`, startDate));
    invConditions.push(gte(sql`DATE(${invoices.createdAt})`, startDate));
  }
  if (endDate) {
    payConditions.push(lte(sql`DATE(${payments.paidAt})`, endDate));
    invConditions.push(lte(sql`DATE(${invoices.createdAt})`, endDate));
  }
  if (paymentMethod && paymentMethod !== 'ALL') {
    payConditions.push(eq(payments.paymentMethod, paymentMethod));
  }

  const payWhereClause = payConditions.length > 0 ? and(...payConditions) : undefined;
  const invWhereClause = invConditions.length > 0 ? and(...invConditions) : undefined;

  // Total Penerimaan Kas
  const [paySummary] = await db
    .select({
      totalRevenue: sql`COALESCE(SUM(${payments.amount}), 0)`,
      transactionCount: count(),
    })
    .from(payments)
    .where(payWhereClause);

  // Total Tagihan & Piutang
  const [invSummary] = await db
    .select({
      totalInvoiced: sql`COALESCE(SUM(${invoices.finalAmount}), 0)`,
      totalDiscount: sql`COALESCE(SUM(${invoices.discountAmount}), 0)`,
      totalReceivables: sql`COALESCE(SUM(CASE WHEN ${invoices.status} != 'PAID' THEN ${invoices.balanceAmount} ELSE 0 END), 0)`,
      totalPaidInvoices: sql`COUNT(CASE WHEN ${invoices.status} = 'PAID' THEN 1 END)`,
      totalUnpaidInvoices: sql`COUNT(CASE WHEN ${invoices.status} != 'PAID' THEN 1 END)`,
    })
    .from(invoices)
    .where(invWhereClause);

  // Method Breakdown
  const methodBreakdown = await db
    .select({
      paymentMethod: payments.paymentMethod,
      totalAmount: sql`COALESCE(SUM(${payments.amount}), 0)`,
      count: count(),
    })
    .from(payments)
    .where(payWhereClause)
    .groupBy(payments.paymentMethod)
    .orderBy(desc(sql`SUM(${payments.amount})`));

  // Category Breakdown (Procedures vs Drugs vs Admin)
  const categoryBreakdown = await db
    .select({
      itemType: invoiceItems.itemType,
      totalAmount: sql`COALESCE(SUM(${invoiceItems.subtotal}), 0)`,
      count: count(),
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(invWhereClause)
    .groupBy(invoiceItems.itemType)
    .orderBy(desc(sql`SUM(${invoiceItems.subtotal})`));

  // Daily Trend
  const dailyTrend = await db
    .select({
      date: sql`TO_CHAR(${payments.paidAt}, 'YYYY-MM-DD')`,
      totalAmount: sql`COALESCE(SUM(${payments.amount}), 0)`,
      count: count(),
    })
    .from(payments)
    .where(payWhereClause)
    .groupBy(sql`TO_CHAR(${payments.paidAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${payments.paidAt}, 'YYYY-MM-DD') ASC`);

  // Detailed Payments List
  const items = await db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      paidAt: payments.paidAt,
      paymentMethod: payments.paymentMethod,
      amount: payments.amount,
      cashTendered: payments.cashTendered,
      changeAmount: payments.changeAmount,
      bankName: payments.bankName,
      referenceNumber: payments.referenceNumber,
      invoiceNumber: invoices.invoiceNumber,
      invoiceStatus: invoices.status,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      cashierName: users.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .leftJoin(users, eq(payments.cashierId, users.id))
    .where(payWhereClause)
    .orderBy(desc(payments.paidAt))
    .limit(limit)
    .offset(offset);

  return {
    summary: {
      totalRevenue: Number(paySummary?.totalRevenue || 0),
      transactionCount: Number(paySummary?.transactionCount || 0),
      totalInvoiced: Number(invSummary?.totalInvoiced || 0),
      totalDiscount: Number(invSummary?.totalDiscount || 0),
      totalReceivables: Number(invSummary?.totalReceivables || 0),
      totalPaidInvoices: Number(invSummary?.totalPaidInvoices || 0),
      totalUnpaidInvoices: Number(invSummary?.totalUnpaidInvoices || 0),
    },
    methodBreakdown: methodBreakdown.map((m) => ({
      paymentMethod: m.paymentMethod,
      totalAmount: Number(m.totalAmount),
      count: Number(m.count),
    })),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      itemType: c.itemType,
      totalAmount: Number(c.totalAmount),
      count: Number(c.count),
    })),
    dailyTrend: dailyTrend.map((d) => ({
      date: d.date,
      totalAmount: Number(d.totalAmount),
      count: Number(d.count),
    })),
    items,
  };
}

// ─── 4. Laporan Morbiditas (10 & 20 Besar Penyakit ICD-10) ───────────────────
async function getMorbidityReport({ startDate, endDate, polyclinicId, limit = 10 }) {
  const conditions = [eq(encounters.status, 'FINALIZED')];

  if (startDate) conditions.push(gte(encounters.encounterDate, startDate));
  if (endDate) conditions.push(lte(encounters.encounterDate, endDate));
  if (polyclinicId) conditions.push(eq(encounters.polyclinicId, polyclinicId));

  const whereClause = and(...conditions);

  // Total Diagnosa Periode Ini
  const [totalRow] = await db
    .select({
      total: count(),
    })
    .from(encounterDiagnoses)
    .innerJoin(encounters, eq(encounterDiagnoses.encounterId, encounters.id))
    .where(whereClause);

  const grandTotal = Number(totalRow?.total || 0);

  // Top Morbidity
  const topList = await db
    .select({
      icd10Code: encounterDiagnoses.icd10Code,
      icd10Name: encounterDiagnoses.icd10Name,
      totalCases: count(),
      kasusBaru: sql`COUNT(CASE WHEN ${encounterDiagnoses.diagnosisCase} = 'BARU' THEN 1 END)`,
      kasusLama: sql`COUNT(CASE WHEN ${encounterDiagnoses.diagnosisCase} = 'LAMA' THEN 1 END)`,
      primaryCases: sql`COUNT(CASE WHEN ${encounterDiagnoses.diagnosisType} = 'PRIMARY' THEN 1 END)`,
    })
    .from(encounterDiagnoses)
    .innerJoin(encounters, eq(encounterDiagnoses.encounterId, encounters.id))
    .where(whereClause)
    .groupBy(encounterDiagnoses.icd10Code, encounterDiagnoses.icd10Name)
    .orderBy(desc(count()))
    .limit(limit);

  return {
    grandTotal,
    items: topList.map((item, idx) => {
      const total = Number(item.totalCases);
      const percentage = grandTotal > 0 ? Number(((total / grandTotal) * 100).toFixed(1)) : 0;
      return {
        rank: idx + 1,
        icd10Code: item.icd10Code,
        icd10Name: item.icd10Name,
        totalCases: total,
        kasusBaru: Number(item.kasusBaru),
        kasusLama: Number(item.kasusLama),
        primaryCases: Number(item.primaryCases),
        percentage,
      };
    }),
  };
}

// ─── 5. Laporan Farmasi & Obat ───────────────────────────────────────────────
async function getPharmacyReport({ startDate, endDate, threshold = 10, limit = 10 }) {
  const rxConditions = [eq(prescriptions.status, 'DISPENSED')];

  if (startDate) rxConditions.push(gte(sql`DATE(${prescriptions.dispensedAt})`, startDate));
  if (endDate) rxConditions.push(lte(sql`DATE(${prescriptions.dispensedAt})`, endDate));

  // 1. Top Dispensed Drugs
  const topDrugs = await db
    .select({
      drugId: prescriptionItems.drugId,
      drugName: prescriptionItems.drugName,
      unit: prescriptionItems.unit,
      totalQty: sql`COALESCE(SUM(${prescriptionItems.dispensedQty}), 0)`,
      prescriptionCount: count(prescriptionItems.id),
      totalValue: sql`COALESCE(SUM(${prescriptionItems.subtotal}), 0)`,
    })
    .from(prescriptionItems)
    .innerJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
    .where(and(...rxConditions))
    .groupBy(prescriptionItems.drugId, prescriptionItems.drugName, prescriptionItems.unit)
    .orderBy(desc(sql`SUM(${prescriptionItems.dispensedQty})`))
    .limit(limit);

  // 2. Low / Critical Stock Items
  const stockRows = await db
    .select({
      drugId: drugs.id,
      drugCode: drugs.code,
      drugName: drugs.name,
      dosageForm: drugs.dosageForm,
      minStock: drugs.minStock,
      unitName: drugUnits.name,
      currentStock: sql`COALESCE(SUM(${drugBatches.currentQty}), 0)`,
    })
    .from(drugs)
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .leftJoin(drugBatches, and(eq(drugs.id, drugBatches.drugId), eq(drugBatches.isActive, true)))
    .where(eq(drugs.isActive, true))
    .groupBy(drugs.id, drugs.code, drugs.name, drugs.dosageForm, drugs.minStock, drugUnits.name)
    .having(sql`COALESCE(SUM(${drugBatches.currentQty}), 0) <= GREATEST(${drugs.minStock}, ${threshold})`)
    .orderBy(asc(sql`COALESCE(SUM(${drugBatches.currentQty}), 0)`))
    .limit(50);

  // 3. Batches Expiring in < 90 days
  const expiringBatches = await db
    .select({
      batchId: drugBatches.id,
      batchNumber: drugBatches.batchNumber,
      expiryDate: sql`TO_CHAR(${drugBatches.expiryDate}, 'YYYY-MM-DD')`,
      currentQty: drugBatches.currentQty,
      drugId: drugs.id,
      drugName: drugs.name,
      unitName: drugUnits.name,
      daysRemaining: sql`(${drugBatches.expiryDate} - CURRENT_DATE)`,
    })
    .from(drugBatches)
    .innerJoin(drugs, eq(drugBatches.drugId, drugs.id))
    .leftJoin(drugUnits, eq(drugs.unitId, drugUnits.id))
    .where(
      and(
        eq(drugBatches.isActive, true),
        sql`${drugBatches.currentQty} > 0`,
        sql`${drugBatches.expiryDate} <= CURRENT_DATE + INTERVAL '90 days'`
      )
    )
    .orderBy(asc(drugBatches.expiryDate))
    .limit(30);

  // 4. Total Persediaan Asset Valuation
  const [valuationRow] = await db
    .select({
      totalAssetHna: sql`COALESCE(SUM(${drugBatches.currentQty} * ${drugBatches.purchasePrice}), 0)`,
      totalAssetSelling: sql`COALESCE(SUM(${drugBatches.currentQty} * ${drugBatches.sellingPrice}), 0)`,
      totalActiveBatches: count(),
    })
    .from(drugBatches)
    .where(and(eq(drugBatches.isActive, true), sql`${drugBatches.currentQty} > 0`));

  return {
    valuation: {
      totalAssetHna: Number(valuationRow?.totalAssetHna || 0),
      totalAssetSelling: Number(valuationRow?.totalAssetSelling || 0),
      totalActiveBatches: Number(valuationRow?.totalActiveBatches || 0),
    },
    topDrugs: topDrugs.map((d, i) => ({
      rank: i + 1,
      drugId: d.drugId,
      drugName: d.drugName,
      unit: d.unit,
      totalQty: Number(d.totalQty),
      prescriptionCount: Number(d.prescriptionCount),
      totalValue: Number(d.totalValue),
    })),
    lowStock: stockRows.map((s) => ({
      drugId: s.drugId,
      drugCode: s.drugCode,
      drugName: s.drugName,
      dosageForm: s.dosageForm,
      minStock: s.minStock || 0,
      unitName: s.unitName || 'Item',
      currentStock: Number(s.currentStock),
      status: Number(s.currentStock) === 0 ? 'HABIS' : 'KRITIS',
    })),
    expiringBatches: expiringBatches.map((b) => ({
      ...b,
      daysRemaining: Number(b.daysRemaining),
    })),
  };
}

// ─── 6. Laporan Rekonsiliasi Pelayanan Peserta BPJS ───────────────────────────
async function getBpjsSummaryReport({
  startDate,
  endDate,
  polyclinicId,
  limit = 50,
  offset = 0,
}) {
  const conditions = [eq(registrations.paymentMethod, 'BPJS')];

  if (startDate) conditions.push(gte(registrations.registrationDate, startDate));
  if (endDate) conditions.push(lte(registrations.registrationDate, endDate));
  if (polyclinicId) conditions.push(eq(registrations.polyclinicId, polyclinicId));

  const whereClause = and(...conditions);

  // Summary Metrics
  const [metrics] = await db
    .select({
      totalBpjsVisits: count(),
      completedVisits: sql`COUNT(CASE WHEN ${registrations.status} = 'SELESAI' THEN 1 END)`,
      referredExternal: sql`COUNT(CASE WHEN ${encounterReferrals.referralType} = 'EXTERNAL' THEN 1 END)`,
      referredInternal: sql`COUNT(CASE WHEN ${encounterReferrals.referralType} = 'INTERNAL' THEN 1 END)`,
    })
    .from(registrations)
    .leftJoin(
      encounters,
      and(
        eq(registrations.id, encounters.registrationId),
        ne(encounters.status, 'AMENDED')
      )
    )
    .leftJoin(encounterReferrals, eq(encounters.id, encounterReferrals.encounterId))
    .where(whereClause);

  const totalBpjs = Number(metrics?.totalBpjsVisits || 0);
  const referredExt = Number(metrics?.referredExternal || 0);
  const referralRate = totalBpjs > 0 ? Number(((referredExt / totalBpjs) * 100).toFixed(1)) : 0;

  // Detailed records for reconciliation
  const items = await db
    .select({
      id: registrations.id,
      registrationNumber: registrations.registrationNumber,
      registrationDate: sql`TO_CHAR(${registrations.registrationDate}, 'YYYY-MM-DD')`,
      bpjsCardNumber: registrations.bpjsCardNumber,
      patientId: patients.id,
      patientMrn: patients.medicalRecordNumber,
      patientName: patients.name,
      patientNik: patients.identityNumber,
      patientGender: patients.gender,
      polyclinicName: polyclinics.name,
      practitionerName: practitioners.name,
      encounterStatus: encounters.status,
      complaint: registrations.complaint,
      primaryDiagnosisCode: sql`COALESCE(
        (SELECT ed.icd10_code FROM encounter_diagnoses ed 
         WHERE ed.encounter_id = ${encounters.id} AND ed.diagnosis_type = 'PRIMARY' LIMIT 1),
        (SELECT ed.icd10_code FROM encounter_diagnoses ed 
         WHERE ed.encounter_id = ${encounters.id} LIMIT 1)
      )`,
      primaryDiagnosisName: sql`COALESCE(
        (SELECT ed.icd10_name FROM encounter_diagnoses ed 
         WHERE ed.encounter_id = ${encounters.id} AND ed.diagnosis_type = 'PRIMARY' LIMIT 1),
        (SELECT ed.icd10_name FROM encounter_diagnoses ed 
         WHERE ed.encounter_id = ${encounters.id} LIMIT 1)
      )`,
      referralType: encounterReferrals.referralType,
      targetFacilityName: encounterReferrals.targetFacilityName,
      pcareNoRujukan: encounterReferrals.pcareNoRujukan,
      pcareTaccCode: encounterReferrals.pcareTaccCode,
    })
    .from(registrations)
    .innerJoin(patients, eq(registrations.patientId, patients.id))
    .innerJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .leftJoin(
      encounters,
      and(
        eq(registrations.id, encounters.registrationId),
        ne(encounters.status, 'AMENDED')
      )
    )
    .leftJoin(encounterReferrals, eq(encounters.id, encounterReferrals.encounterId))
    .where(whereClause)
    .orderBy(desc(registrations.registrationDate), desc(registrations.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    summary: {
      totalBpjsVisits: totalBpjs,
      completedVisits: Number(metrics?.completedVisits || 0),
      referredExternal: referredExt,
      referredInternal: Number(metrics?.referredInternal || 0),
      nonReferred: totalBpjs - referredExt - Number(metrics?.referredInternal || 0),
      referralRate, // % rujukan keluar (indikator Kapitasi Berbasis Komitmen)
    },
    items,
  };
}

module.exports = {
  getOverviewStats,
  getVisitsReport,
  getRevenueReport,
  getMorbidityReport,
  getPharmacyReport,
  getBpjsSummaryReport,
};
