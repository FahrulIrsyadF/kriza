import React, { useState } from 'react';
import { formatRupiah } from '@/lib/utils';

/**
 * Grafik Batang Tren Harian (Native SVG & CSS)
 * Ringan, reaktif, responsif, tanpa dependensi eksternal.
 */
export function TrendBarChart({
  data = [],
  dataKey = 'total',
  labelKey = 'date',
  height = 180,
  barColor = 'bg-primary',
  hoverColor = 'hover:bg-primary/80',
  isCurrency = false,
  emptyMessage = 'Belum ada data pada periode ini',
}) {
  const [hoveredItem, setHoveredItem] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20"
      >
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0), 1);

  return (
    <div className="relative flex flex-col justify-end pt-6" style={{ height }}>
      {/* Tooltip Overlay */}
      {hoveredItem && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border px-3 py-1.5 rounded-lg shadow-md text-xs pointer-events-none z-10 flex items-center gap-2">
          <span className="font-semibold text-muted-foreground">
            {hoveredItem[labelKey]}
          </span>
          <span className="font-bold font-mono text-primary">
            {isCurrency
              ? formatRupiah(hoveredItem[dataKey])
              : `${hoveredItem[dataKey]} Pasien`}
          </span>
          {hoveredItem.baru !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              ({hoveredItem.baru} Baru / {hoveredItem.lama} Lama)
            </span>
          )}
        </div>
      )}

      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
        <div className="border-b border-border w-full" />
        <div className="border-b border-border w-full" />
        <div className="border-b border-border w-full" />
      </div>

      {/* Bars Container */}
      <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-full z-0 px-2">
        {data.map((item, idx) => {
          const val = Number(item[dataKey]) || 0;
          const heightPercent = Math.max((val / maxValue) * 100, 4); // Min 4% visibility

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Bar */}
              <div className="w-full max-w-[28px] bg-muted rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 ${barColor} ${hoverColor} ${
                    hoveredItem === item ? 'brightness-125' : ''
                  }`}
                />
              </div>

              {/* Label Tanggal / X-Axis */}
              <span className="text-[10px] text-muted-foreground mt-1.5 truncate max-w-[36px] text-center select-none font-mono">
                {String(item[labelKey]).slice(-2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Metric Progress Bar Horizontal untuk Top 10 Morbiditas / Per-Poli
 */
export function HorizontalBarMetric({
  items = [],
  titleKey = 'name',
  codeKey = 'code',
  valueKey = 'total',
  subValueKey = 'percentage',
  colorClass = 'bg-primary',
}) {
  if (!items || items.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        Belum ada data untuk ditampilkan
      </div>
    );
  }

  const maxValue = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const val = Number(item[valueKey]) || 0;
        const percent = Math.min(Math.round((val / maxValue) * 100), 100);

        return (
          <div key={idx} className="group space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center font-bold text-[11px] text-foreground shrink-0">
                  {idx + 1}
                </span>
                {item[codeKey] && (
                  <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] shrink-0">
                    {item[codeKey]}
                  </span>
                )}
                <span className="font-medium text-foreground truncate" title={item[titleKey]}>
                  {item[titleKey]}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className="font-bold text-foreground">{val}</span>
                {item[subValueKey] !== undefined && (
                  <span className="text-[11px] text-muted-foreground">
                    ({item[subValueKey]}%)
                  </span>
                )}
              </div>
            </div>

            {/* Bar Track */}
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div
                style={{ width: `${percent}%` }}
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Segmented Distribution Bar (Metode Bayar / Penjamin)
 */
export function SegmentedDistributionBar({ segments = [] }) {
  const total = segments.reduce((acc, s) => acc + (Number(s.value) || 0), 0);

  if (total === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border">
        Belum ada data transaksi
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Segmented Bar */}
      <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
        {segments.map((s, idx) => {
          const val = Number(s.value) || 0;
          const pct = ((val / total) * 100).toFixed(1);
          if (val === 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%` }}
              className={`h-full ${s.color || 'bg-primary'} transition-all hover:opacity-90`}
              title={`${s.label}: ${pct}%`}
            />
          );
        })}
      </div>

      {/* Legend / Breakdown List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {segments.map((s, idx) => {
          const val = Number(s.value) || 0;
          const pct = ((val / total) * 100).toFixed(1);
          return (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-2.5 h-2.5 rounded-full ${s.color || 'bg-primary'} shrink-0`} />
                <span className="text-muted-foreground truncate">{s.label}</span>
              </div>
              <div className="text-right pl-2">
                <span className="font-bold font-mono text-foreground">{pct}%</span>
                {s.amount !== undefined && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatRupiah(s.amount)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
