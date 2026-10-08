/**
 * Indonesian dictionary for the HRD admin app.
 *
 * Flat, dotted keys keep lookups cheap and make parity with `en.ts`
 * enforceable at compile time via `DictKey`.
 */
export const id = {
  // App shell / navigation
  'shell.appName': 'HRD Absensi',
  'shell.navLabel': 'Navigasi utama',
  'shell.openMenu': 'Buka menu navigasi',
  'shell.closeMenu': 'Tutup menu navigasi',
  'shell.toggleLanguage': 'Ganti bahasa',
  'nav.karyawan': 'Karyawan',
  'nav.absensi': 'Absensi',

  // Feedback states
  'state.loading.title': 'Memuat data…',
  'state.serverError.title': 'Terjadi kesalahan server',
  'state.serverError.description': 'Tidak ada data yang berubah. Silakan coba lagi.',
  'state.serverError.retry': 'Coba lagi',
  'state.accessDenied.title': 'Akses ditolak',
  'state.accessDenied.description':
    'Anda tidak memiliki izin untuk melihat halaman ini.',
  'state.accessDenied.back': 'Kembali',
  'state.empty.title': 'Belum ada data',
  'state.empty.description': 'Belum ada yang bisa ditampilkan di sini.',
  'state.success.default': 'Perubahan berhasil disimpan.',
  'state.success.dismiss': 'Tutup notifikasi',

  // Profile-change alert banners
  'alert.regionLabel': 'Notifikasi perubahan profil',
  'alert.changedFields': 'mengubah {fields}',
  'alert.passwordLine': 'Kata sandi diubah',
  'alert.dismiss': 'Tutup notifikasi',
  'alert.field.phone': 'nomor telepon',
  'alert.field.photo': 'foto',
  'alert.field.password': 'kata sandi',
} as const;

/** Every legal translation key, derived from the complete (Indonesian) dictionary. */
export type DictKey = keyof typeof id;
