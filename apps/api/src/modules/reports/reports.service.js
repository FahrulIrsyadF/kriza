const repository = require('./reports.repository');

/**
 * Normalisasi rentang tanggal.
 * Default: Dari tanggal 1 bulan berjalan hingga hari ini jika tidak dispesifikasikan.
 */
function resolveDateRange(startDate, endDate) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const defaultStart = `${yyyy}-${mm}-01`;
  const defaultEnd = `${yyyy}-${mm}-${dd}`;

  return {
    startDate: startDate || defaultStart,
    endDate: endDate || defaultEnd,
  };
}

async function getOverviewStats(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getOverviewStats(range);
  return {
    dateRange: range,
    ...data,
  };
}

async function getVisitsReport(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getVisitsReport({
    ...params,
    ...range,
  });

  return {
    dateRange: range,
    ...data,
  };
}

async function getRevenueReport(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getRevenueReport({
    ...params,
    ...range,
  });

  return {
    dateRange: range,
    ...data,
  };
}

async function getMorbidityReport(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getMorbidityReport({
    ...params,
    ...range,
  });

  return {
    dateRange: range,
    ...data,
  };
}

async function getPharmacyReport(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getPharmacyReport({
    ...params,
    ...range,
  });

  return {
    dateRange: range,
    ...data,
  };
}

async function getBpjsSummaryReport(params = {}) {
  const range = resolveDateRange(params.startDate, params.endDate);
  const data = await repository.getBpjsSummaryReport({
    ...params,
    ...range,
  });

  return {
    dateRange: range,
    ...data,
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
