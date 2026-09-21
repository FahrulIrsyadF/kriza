import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility untuk menggabungkan class names Tailwind dengan benar.
 * Menghindari konflik antara class yang sama.
 *
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format angka ke format mata uang Rupiah (contoh: Rp 50.000)
 * @param {number|string} number 
 * @returns {string}
 */
export function formatRupiah(number) {
  if (number === null || number === undefined || isNaN(Number(number))) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(number));
}

/**
 * Konversi angka ke kalimat terbilang bahasa Indonesia (contoh: Seratus Ribu Rupiah)
 * @param {number|string} n 
 * @returns {string}
 */
export function terbilang(n) {
  const angka = Math.floor(Math.abs(Number(n) || 0));
  if (angka === 0) return 'Nol Rupiah';

  const huruf = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function konversi(x) {
    if (x < 12) return huruf[x];
    if (x < 20) return konversi(x - 10) + ' Belas';
    if (x < 100) return konversi(Math.floor(x / 10)) + ' Puluh ' + konversi(x % 10);
    if (x < 200) return 'Seratus ' + konversi(x - 100);
    if (x < 1000) return konversi(Math.floor(x / 100)) + ' Ratus ' + konversi(x % 100);
    if (x < 2000) return 'Seribu ' + konversi(x - 1000);
    if (x < 1000000) return konversi(Math.floor(x / 1000)) + ' Ribu ' + konversi(x % 1000);
    if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + ' Juta ' + konversi(x % 1000000);
    if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + ' Miliar ' + konversi(x % 1000000000);
    return '';
  }

  return (konversi(angka).replace(/\s+/g, ' ').trim() + ' Rupiah');
}
