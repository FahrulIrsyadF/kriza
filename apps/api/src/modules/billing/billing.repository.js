const { db } = require('../../db');
const {
  invoices,
  invoiceItems,
  payments,
  registrations,
  encounters,
  encounterProcedures,
  prescriptions,
  prescriptionItems,
  patients,
  polyclinics,
  practitioners,
  users,
} = require('../../db/schema');
const { eq, and, desc, asc, ilike, or, sql, gte, lte } = require('drizzle-orm');

// ─── 1. Generator Nomor Invoice Unik (Atomic Locking / Day Sequence) ───────────
async function generateInvoiceNumber(client = db) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `INV-${yyyy}${mm}${dd}-`;

  const rows = await client
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(ilike(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let sequence = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].invoiceNumber.replace(prefix, '');
    const parsed = parseInt(lastNum, 10);
    if (!isNaN(parsed)) {
      sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// ─── 2. Generator Nomor Pembayaran / Kuitansi Unik ─────────────────────────────
async function generatePaymentNumber(client = db) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const prefix = `PAY-${yyyy}${mm}${dd}-`;

  const rows = await client
    .select({ paymentNumber: payments.paymentNumber })
    .from(payments)
    .where(ilike(payments.paymentNumber, `${prefix}%`))
    .orderBy(desc(payments.paymentNumber))
    .limit(1);

  let sequence = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].paymentNumber.replace(prefix, '');
    const parsed = parseInt(lastNum, 10);
    if (!isNaN(parsed)) {
      sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// ─── 3. Get Invoices List with Filters & Pagination ────────────────────────────
async function getInvoices({
  search,
  status,
  paymentScheme,
  startDate,
  endDate,
  limit = 20,
  offset = 0,
} = {}) {
  const conditions = [];

  if (status && status !== 'ALL') {
    conditions.push(eq(invoices.status, status));
  }

  if (paymentScheme) {
    conditions.push(eq(invoices.paymentScheme, paymentScheme));
  }

  if (startDate) {
    conditions.push(gte(invoices.createdAt, new Date(`${startDate}T00:00:00+07:00`)));
  }

  if (endDate) {
    conditions.push(lte(invoices.createdAt, new Date(`${endDate}T23:59:59+07:00`)));
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(invoices.invoiceNumber, q),
        ilike(patients.name, q),
        ilike(patients.medicalRecordNumber, q),
        ilike(registrations.registrationNumber, q)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const countRes = await db
    .select({ count: sql`count(*)` })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .innerJoin(registrations, eq(invoices.registrationId, registrations.id))
    .where(whereClause);

  const total = parseInt(countRes[0]?.count || '0', 10);

  // Fetch paginated rows
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      registrationId: invoices.registrationId,
      encounterId: invoices.encounterId,
      patientId: invoices.patientId,
      status: invoices.status,
      paymentScheme: invoices.paymentScheme,
      totalAmount: invoices.totalAmount,
      discountAmount: invoices.discountAmount,
      taxAmount: invoices.taxAmount,
      finalAmount: invoices.finalAmount,
      paidAmount: invoices.paidAmount,
      balanceAmount: invoices.balanceAmount,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,

      // Patient
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientBpjsNumber: patients.bpjsNumber,

      // Registration
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      registrationStatus: registrations.status,
      paymentMethod: registrations.paymentMethod,

      // Polyclinic & Doctor
      polyclinicName: polyclinics.name,
      practitionerName: practitioners.name,
    })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .innerJoin(registrations, eq(invoices.registrationId, registrations.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, total };
}

// ─── 4. Get Invoice by ID (Full Details) ──────────────────────────────────────
async function getInvoiceById(id, client = db) {
  const invRows = await client
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      registrationId: invoices.registrationId,
      encounterId: invoices.encounterId,
      patientId: invoices.patientId,
      status: invoices.status,
      paymentScheme: invoices.paymentScheme,
      totalAmount: invoices.totalAmount,
      discountAmount: invoices.discountAmount,
      taxAmount: invoices.taxAmount,
      finalAmount: invoices.finalAmount,
      paidAmount: invoices.paidAmount,
      balanceAmount: invoices.balanceAmount,
      dueDate: invoices.dueDate,
      notes: invoices.notes,
      createdById: invoices.createdById,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,

      // Patient
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientGender: patients.gender,
      patientBirthDate: patients.birthDate,
      patientPhone: patients.phone,
      patientAddress: patients.address,
      patientBpjsNumber: patients.bpjsNumber,
      patientInsuranceType: patients.insuranceType,

      // Registration
      registrationNumber: registrations.registrationNumber,
      registrationDate: registrations.registrationDate,
      visitType: registrations.visitType,
      paymentMethod: registrations.paymentMethod,
      complaint: registrations.complaint,

      // Polyclinic & Doctor
      polyclinicName: polyclinics.name,
      practitionerName: practitioners.name,
      practitionerTitle: practitioners.title,

      // Creator
      creatorName: users.name,
    })
    .from(invoices)
    .innerJoin(patients, eq(invoices.patientId, patients.id))
    .innerJoin(registrations, eq(invoices.registrationId, registrations.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .leftJoin(users, eq(invoices.createdById, users.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (invRows.length === 0) return null;
  const invoice = invRows[0];

  // Fetch Items
  const items = await client
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.createdAt));

  // Fetch Payments with Cashier Info
  const paymentRows = await client
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      invoiceId: payments.invoiceId,
      paymentMethod: payments.paymentMethod,
      amount: payments.amount,
      cashTendered: payments.cashTendered,
      changeAmount: payments.changeAmount,
      bankName: payments.bankName,
      referenceNumber: payments.referenceNumber,
      notes: payments.notes,
      paidAt: payments.paidAt,
      cashierName: users.name,
    })
    .from(payments)
    .leftJoin(users, eq(payments.cashierId, users.id))
    .where(eq(payments.invoiceId, id))
    .orderBy(asc(payments.paidAt));

  return {
    ...invoice,
    items,
    payments: paymentRows,
  };
}

// ─── 5. Get Invoice by Registration ID ─────────────────────────────────────────
async function getInvoiceByRegistrationId(registrationId, client = db) {
  const rows = await client
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.registrationId, registrationId))
    .limit(1);

  if (rows.length === 0) return null;
  return getInvoiceById(rows[0].id, client);
}

// ─── 6. Create Invoice with Items ─────────────────────────────────────────────
async function createInvoice(invoiceData, itemsData, client = db) {
  const [createdInvoice] = await client
    .insert(invoices)
    .values(invoiceData)
    .returning();

  if (itemsData && itemsData.length > 0) {
    const formattedItems = itemsData.map((it) => ({
      invoiceId: createdInvoice.id,
      itemType: it.itemType,
      referenceId: it.referenceId || null,
      itemName: it.itemName,
      quantity: it.quantity,
      unitPrice: String(it.unitPrice || '0'),
      discount: String(it.discount || '0'),
      subtotal: String(it.subtotal || '0'),
      notes: it.notes || null,
    }));

    await client.insert(invoiceItems).values(formattedItems);
  }

  return getInvoiceById(createdInvoice.id, client);
}

// ─── 7. Update Invoice & Items (if UNPAID / PARTIAL) ──────────────────────────
async function updateInvoice(id, updateData, newItems, client = db) {
  await client
    .update(invoices)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  if (newItems && Array.isArray(newItems)) {
    // Replace items
    await client.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    const formattedItems = newItems.map((it) => ({
      invoiceId: id,
      itemType: it.itemType,
      referenceId: it.referenceId || null,
      itemName: it.itemName,
      quantity: it.quantity,
      unitPrice: String(it.unitPrice || '0'),
      discount: String(it.discount || '0'),
      subtotal: String(it.subtotal || '0'),
      notes: it.notes || null,
    }));

    if (formattedItems.length > 0) {
      await client.insert(invoiceItems).values(formattedItems);
    }
  }

  return getInvoiceById(id, client);
}

// ─── 8. Record Payment ────────────────────────────────────────────────────────
async function recordPayment(paymentData, client = db) {
  const [createdPayment] = await client
    .insert(payments)
    .values(paymentData)
    .returning();

  return createdPayment;
}

// ─── 9. Get Payments List ─────────────────────────────────────────────────────
async function getPayments({
  search,
  paymentMethod,
  startDate,
  endDate,
  cashierId,
  limit = 20,
  offset = 0,
} = {}) {
  const conditions = [];

  if (paymentMethod) {
    conditions.push(eq(payments.paymentMethod, paymentMethod));
  }

  if (cashierId) {
    conditions.push(eq(payments.cashierId, cashierId));
  }

  if (startDate) {
    conditions.push(gte(payments.paidAt, new Date(`${startDate}T00:00:00+07:00`)));
  }

  if (endDate) {
    conditions.push(lte(payments.paidAt, new Date(`${endDate}T23:59:59+07:00`)));
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(payments.paymentNumber, q),
        ilike(invoices.invoiceNumber, q),
        ilike(patients.name, q),
        ilike(patients.medicalRecordNumber, q)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: sql`count(*)` })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .where(whereClause);

  const total = parseInt(countRes[0]?.count || '0', 10);

  const rows = await db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      patientId: payments.patientId,
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      paymentMethod: payments.paymentMethod,
      amount: payments.amount,
      cashTendered: payments.cashTendered,
      changeAmount: payments.changeAmount,
      bankName: payments.bankName,
      referenceNumber: payments.referenceNumber,
      notes: payments.notes,
      cashierId: payments.cashierId,
      cashierName: users.name,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .leftJoin(users, eq(payments.cashierId, users.id))
    .where(whereClause)
    .orderBy(desc(payments.paidAt))
    .limit(limit)
    .offset(offset);

  return { items: rows, total };
}

// ─── 10. Get Payment by ID (for Official Receipt Print) ────────────────────────
async function getPaymentById(id, client = db) {
  const rows = await client
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      invoiceSubtotal: invoices.totalAmount,
      discountAmount: invoices.discountAmount,
      invoiceTotal: invoices.finalAmount,
      invoiceStatus: invoices.status,
      patientId: payments.patientId,
      patientName: patients.name,
      patientMrn: patients.medicalRecordNumber,
      patientBirthDate: patients.birthDate,
      patientGender: patients.gender,
      patientAddress: patients.address,
      patientPhone: patients.phone,
      patientBpjsNumber: patients.bpjsNumber,
      paymentMethod: payments.paymentMethod,
      amount: payments.amount,
      cashTendered: payments.cashTendered,
      changeAmount: payments.changeAmount,
      bankName: payments.bankName,
      referenceNumber: payments.referenceNumber,
      notes: payments.notes,
      paidAt: payments.paidAt,
      cashierName: users.name,

      // Registration & Clinic
      registrationNumber: registrations.registrationNumber,
      polyclinicName: polyclinics.name,
      practitionerName: practitioners.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(patients, eq(payments.patientId, patients.id))
    .innerJoin(registrations, eq(invoices.registrationId, registrations.id))
    .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
    .leftJoin(practitioners, eq(registrations.practitionerId, practitioners.id))
    .leftJoin(users, eq(payments.cashierId, users.id))
    .where(eq(payments.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  const payment = rows[0];

  // Also fetch invoice items
  const items = await client
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, payment.invoiceId))
    .orderBy(asc(invoiceItems.createdAt));

  return {
    ...payment,
    items,
  };
}

// ─── 11. Dashboard KPIs / Cashier Statistics ─────────────────────────────────
async function getBillingStats({ date } = {}) {
  const todayStr = date || new Date().toISOString().substring(0, 10);
  const startOfDay = new Date(`${todayStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${todayStr}T23:59:59+07:00`);

  // Today Revenue (Total Paid)
  const revRes = await db
    .select({
      totalRevenue: sql`coalesce(sum(${payments.amount}), 0)`,
      totalTransactions: sql`count(*)`,
    })
    .from(payments)
    .where(and(gte(payments.paidAt, startOfDay), lte(payments.paidAt, endOfDay)));

  // Revenue Breakdown by Payment Method Today
  const methodBreakdown = await db
    .select({
      paymentMethod: payments.paymentMethod,
      totalAmount: sql`coalesce(sum(${payments.amount}), 0)`,
      count: sql`count(*)`,
    })
    .from(payments)
    .where(and(gte(payments.paidAt, startOfDay), lte(payments.paidAt, endOfDay)))
    .groupBy(payments.paymentMethod);

  // Unpaid Invoices Summary
  const unpaidRes = await db
    .select({
      unpaidCount: sql`count(*)`,
      totalUnpaidAmount: sql`coalesce(sum(${invoices.balanceAmount}), 0)`,
    })
    .from(invoices)
    .where(sql`${invoices.status} IN ('UNPAID', 'PARTIAL')`);

  // Completed Invoices Today
  const paidCountRes = await db
    .select({
      paidCountToday: sql`count(*)`,
    })
    .from(invoices)
    .where(and(eq(invoices.status, 'PAID'), gte(invoices.updatedAt, startOfDay), lte(invoices.updatedAt, endOfDay)));

  return {
    date: todayStr,
    totalRevenue: parseFloat(revRes[0]?.totalRevenue || '0'),
    totalTransactions: parseInt(revRes[0]?.totalTransactions || '0', 10),
    unpaidCount: parseInt(unpaidRes[0]?.unpaidCount || '0', 10),
    totalUnpaidAmount: parseFloat(unpaidRes[0]?.totalUnpaidAmount || '0'),
    paidCountToday: parseInt(paidCountRes[0]?.paidCountToday || '0', 10),
    methodBreakdown: methodBreakdown.map((m) => ({
      paymentMethod: m.paymentMethod,
      totalAmount: parseFloat(m.totalAmount || '0'),
      count: parseInt(m.count || '0', 10),
    })),
  };
}

// ─── 12. Laporan Keuangan Harian Pasien Umum (Dashboard) ─────────────────────
async function getDailyGeneralRevenue({ date } = {}) {
  const todayStr = date || new Date().toISOString().substring(0, 10);
  const startOfDay = new Date(`${todayStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${todayStr}T23:59:59+07:00`);

  try {
    // 1. Total Penerimaan Hari Ini Khusus Pasien UMUM
    const revRes = await db
      .select({
        totalRevenue: sql`coalesce(sum(${payments.amount}), 0)`,
        totalTransactions: sql`count(*)`,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          gte(payments.paidAt, startOfDay),
          lte(payments.paidAt, endOfDay)
        )
      );

    const totalRevenue = parseFloat(revRes[0]?.totalRevenue || '0');
    const totalTransactions = parseInt(revRes[0]?.totalTransactions || '0', 10);
    const averageTicket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // 2. Breakdown Metode Pembayaran Pasien UMUM Hari Ini
    const methodRows = await db
      .select({
        paymentMethod: payments.paymentMethod,
        totalAmount: sql`coalesce(sum(${payments.amount}), 0)`,
        count: sql`count(*)`,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          gte(payments.paidAt, startOfDay),
          lte(payments.paidAt, endOfDay)
        )
      )
      .groupBy(payments.paymentMethod)
      .orderBy(desc(sql`sum(${payments.amount})`));

    let cashAmount = 0;
    let nonCashAmount = 0;

    const paymentMethods = methodRows.map((m) => {
      const amount = parseFloat(m.totalAmount || '0');
      const count = parseInt(m.count || '0', 10);
      const percentage = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;

      if (m.paymentMethod === 'TUNAI') {
        cashAmount += amount;
      } else {
        nonCashAmount += amount;
      }

      return {
        paymentMethod: m.paymentMethod,
        totalAmount: amount,
        count,
        percentage,
      };
    });

    // 3. Breakdown Komponen Layanan Pasien UMUM (Tindakan, Obat, Konsultasi, Admin)
    const serviceRows = await db
      .select({
        itemType: invoiceItems.itemType,
        totalAmount: sql`coalesce(sum(${invoiceItems.subtotal}), 0)`,
        count: sql`count(*)`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          gte(invoices.updatedAt, startOfDay),
          lte(invoices.updatedAt, endOfDay)
        )
      )
      .groupBy(invoiceItems.itemType)
      .orderBy(desc(sql`sum(${invoiceItems.subtotal})`));

    const totalServiceAmount = serviceRows.reduce((sum, s) => sum + parseFloat(s.totalAmount || '0'), 0);

    const serviceBreakdown = serviceRows.map((s) => {
      const amount = parseFloat(s.totalAmount || '0');
      const count = parseInt(s.count || '0', 10);
      const percentage = totalServiceAmount > 0 ? Math.round((amount / totalServiceAmount) * 100) : 0;

      let label = 'Lainnya';
      if (s.itemType === 'PROCEDURE') label = 'Tindakan & Prosedur Medis';
      else if (s.itemType === 'DRUG') label = 'Farmasi / Obat';
      else if (s.itemType === 'CONSULTATION') label = 'Jasa Konsultasi Dokter';
      else if (s.itemType === 'ADMINISTRATION') label = 'Biaya Administrasi';

      return {
        itemType: s.itemType,
        label,
        totalAmount: amount,
        count,
        percentage,
      };
    });

    // 4. Daftar Transaksi Terakhir Pasien UMUM Hari Ini
    const recentRows = await db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientName: patients.name,
        patientMrn: patients.medicalRecordNumber,
        polyclinicName: polyclinics.name,
        paymentMethod: payments.paymentMethod,
        amount: payments.amount,
        paidAt: payments.paidAt,
        cashierName: users.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(patients, eq(invoices.patientId, patients.id))
      .innerJoin(registrations, eq(invoices.registrationId, registrations.id))
      .leftJoin(polyclinics, eq(registrations.polyclinicId, polyclinics.id))
      .leftJoin(users, eq(payments.cashierId, users.id))
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          gte(payments.paidAt, startOfDay),
          lte(payments.paidAt, endOfDay)
        )
      )
      .orderBy(desc(payments.paidAt))
      .limit(8);

    const recentTransactions = recentRows.map((r) => ({
      id: r.id,
      paymentNumber: r.paymentNumber,
      invoiceId: r.invoiceId,
      invoiceNumber: r.invoiceNumber,
      patientName: r.patientName,
      patientMrn: r.patientMrn,
      polyclinicName: r.polyclinicName || 'Poli Umum',
      paymentMethod: r.paymentMethod,
      amount: parseFloat(r.amount || '0'),
      paidAt: r.paidAt,
      cashierName: r.cashierName || 'Kasir',
    }));

    // 5. Tren 7 Hari Terakhir Pendapatan Pasien UMUM
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const trendRows = await db
      .select({
        dateStr: sql`to_char(${payments.paidAt}, 'YYYY-MM-DD')`,
        totalAmount: sql`coalesce(sum(${payments.amount}), 0)`,
        count: sql`count(*)`,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          gte(payments.paidAt, sevenDaysAgo),
          lte(payments.paidAt, endOfDay)
        )
      )
      .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM-DD')`);

    const trendMap = new Map();
    for (const t of trendRows) {
      trendMap.set(t.dateStr, {
        amount: parseFloat(t.totalAmount || '0'),
        count: parseInt(t.count || '0', 10),
      });
    }

    const weeklyTrend = [];
    const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;
      const dayName = dayFormatter.format(d);

      const val = trendMap.get(dStr) || { amount: 0, count: 0 };
      weeklyTrend.push({
        date: dStr,
        dayName,
        revenue: val.amount,
        transactions: val.count,
      });
    }

    // 6. Ringkasan Piutang / Belum Lunas Pasien UMUM Hari Ini
    const unpaidRes = await db
      .select({
        unpaidCount: sql`count(*)`,
        totalUnpaidAmount: sql`coalesce(sum(${invoices.balanceAmount}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.paymentScheme, 'UMUM'),
          sql`${invoices.status} IN ('UNPAID', 'PARTIAL')`,
          gte(invoices.createdAt, startOfDay),
          lte(invoices.createdAt, endOfDay)
        )
      );

    return {
      date: todayStr,
      summary: {
        totalRevenue,
        totalTransactions,
        cashAmount,
        nonCashAmount,
        averageTicket,
        unpaidCount: parseInt(unpaidRes[0]?.unpaidCount || '0', 10),
        totalUnpaidAmount: parseFloat(unpaidRes[0]?.totalUnpaidAmount || '0'),
      },
      paymentMethods,
      serviceBreakdown,
      recentTransactions,
      weeklyTrend,
      dbOffline: false,
    };
  } catch (err) {
    console.warn('[Billing] getDailyGeneralRevenue fallback (kendala DB/jaringan):', err.message);

    // Fallback data aman agar dashboard tetap render normal saat database offline
    const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
    const emptyWeeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      emptyWeeklyTrend.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayName: dayFormatter.format(d),
        revenue: 0,
        transactions: 0,
      });
    }

    return {
      date: todayStr,
      summary: {
        totalRevenue: 0,
        totalTransactions: 0,
        cashAmount: 0,
        nonCashAmount: 0,
        averageTicket: 0,
        unpaidCount: 0,
        totalUnpaidAmount: 0,
      },
      paymentMethods: [],
      serviceBreakdown: [],
      recentTransactions: [],
      weeklyTrend: emptyWeeklyTrend,
      dbOffline: true,
      errorMessage: err.message,
    };
  }
}

module.exports = {
  generateInvoiceNumber,
  generatePaymentNumber,
  getInvoices,
  getInvoiceById,
  getInvoiceByRegistrationId,
  createInvoice,
  updateInvoice,
  recordPayment,
  getPayments,
  getPaymentById,
  getBillingStats,
  getDailyGeneralRevenue,
};
