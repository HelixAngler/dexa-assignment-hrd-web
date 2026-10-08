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
  'state.accessDenied.signOut': 'Keluar',
  'state.empty.title': 'Belum ada data',
  'state.empty.description': 'Belum ada yang bisa ditampilkan di sini.',
  'state.success.default': 'Perubahan berhasil disimpan.',
  'state.success.dismiss': 'Tutup notifikasi',

  // Sign-in
  'login.title': 'Masuk',
  'login.subtitle': 'Masuk ke konsol HRD dengan email perusahaan Anda.',
  'login.emailLabel': 'Email',
  'login.passwordLabel': 'Kata sandi',
  'login.submit': 'Masuk',
  'login.error.invalid': 'Email atau kata sandi salah.',
  'login.error.attemptsRemaining': 'Sisa percobaan: {count}',
  'login.error.locked':
    'Akun dikunci setelah terlalu banyak percobaan gagal. Coba lagi nanti.',

  // Shared auth-flow errors (sign-in and forced first-password change)
  'auth.error.network': 'Koneksi gagal. Silakan coba lagi.',
  'auth.error.generic': 'Terjadi kesalahan. Silakan coba lagi.',

  // Forced first-password change
  'firstLogin.title': 'Login Pertama',
  'firstLogin.subtitle':
    'Anda harus mengganti kata sandi sementara sebelum melanjutkan.',
  'firstLogin.newPasswordLabel': 'Kata sandi baru',
  'firstLogin.confirmPasswordLabel': 'Ulangi kata sandi',
  'firstLogin.hint': 'Minimal 8 karakter.',
  'firstLogin.submit': 'Simpan & lanjut',
  'firstLogin.mismatch': 'Kata sandi tidak sama.',

  // Routing: sessions that may not open this console
  'route.denied.employeeTitle': 'Akses ditolak',
  'route.denied.employeeDescription':
    'Halaman ini hanya untuk akun HRD. Keluar dan masuk kembali dengan akun HRD.',

  // Shared employee form (add + edit)
  'form.name': 'Nama lengkap',
  'form.email': 'Email perusahaan',
  'form.position': 'Jabatan',
  'form.phone': 'Nomor telepon',
  'form.photo': 'Foto',
  'form.photoHint': 'Opsional. Tempel URL foto atau object key penyimpanan.',
  'form.phoneKeepHint': 'Kosongkan untuk mempertahankan nomor telepon yang sudah terdaftar.',
  'form.error.required': 'Bagian ini wajib diisi.',
  'form.error.email': 'Masukkan alamat email yang valid.',
  'form.error.phone': 'Nomor telepon tidak valid. Minimal 8 digit.',
  'form.error.emailTaken': 'Email ini sudah terdaftar. Gunakan email lain.',
  'form.error.save': 'Perubahan tidak dapat disimpan. Silakan coba lagi.',
  'form.submit.add': 'Tambah karyawan',
  'form.submit.save': 'Simpan perubahan',

  // Tambah karyawan
  'karyawan.add.title': 'Tambah Karyawan',
  'karyawan.add.passwordLabel': 'Kata sandi sementara (pratinjau)',
  'karyawan.add.passwordPreviewNote':
    'Pratinjau di perangkat ini. Kata sandi yang sebenarnya diterbitkan server saat Anda menyimpan.',
  'karyawan.add.passwordRegenerate': 'Buat ulang',
  'karyawan.add.forcedChangeNote':
    'Kata sandi ini wajib diganti oleh karyawan saat login pertama kali.',
  'karyawan.add.createdTitle': 'Karyawan berhasil ditambahkan',
  'karyawan.add.createdPasswordLabel': 'Kata sandi sementara',
  'karyawan.add.createdGuidance':
    'Salin dan bagikan sekarang. Kata sandi hanya ditampilkan satu kali dan tidak dapat dilihat lagi.',
  'karyawan.add.createdCopy': 'Salin kata sandi',
  'karyawan.add.createdCopied': 'Tersalin',
  'karyawan.add.createdDone': 'Kembali ke daftar',
  'toast.karyawan.created': 'Karyawan berhasil ditambahkan.',

  // Ubah karyawan
  'karyawan.edit.title': 'Ubah Karyawan',
  'karyawan.edit.notFoundTitle': 'Karyawan tidak ditemukan',
  'karyawan.edit.notFoundDescription':
    'Data ini mungkin sudah dihapus. Kembali ke daftar untuk data terbaru.',
  'karyawan.edit.notFoundBack': 'Kembali ke daftar',
  'karyawan.edit.statusTitle': 'Status keaktifan',
  'karyawan.edit.statusApply': 'Ubah status',
  'karyawan.edit.statusConfirmTitle': 'Nonaktifkan karyawan ini?',
  'karyawan.edit.statusConfirmBody':
    'Karyawan tidak akan bisa masuk dan sesi yang sedang berjalan ditutup. Riwayat absensi tetap tersimpan.',
  'karyawan.edit.statusConfirm': 'Ya, nonaktifkan',
  'karyawan.edit.statusCancel': 'Batal',
  'karyawan.edit.resetTitle': 'Kata sandi',
  'karyawan.edit.resetAction': 'Atur ulang kata sandi',
  'karyawan.edit.resetHint':
    'Kata sandi baru berlaku untuk login berikutnya dan wajib diganti oleh karyawan.',
  'karyawan.edit.resetRevealTitle': 'Kata sandi sementara baru',
  'karyawan.edit.resetGuidance':
    'Salin dan bagikan sekarang. Kata sandi hanya ditampilkan satu kali.',
  'karyawan.edit.resetClose': 'Tutup',
  'karyawan.status.active': 'Aktif',
  'karyawan.status.deactivated': 'Nonaktif',

  // Daftar karyawan
  'karyawan.list.title': 'Daftar Karyawan',
  'karyawan.list.add': '+ Tambah',
  'karyawan.list.edit': 'Ubah',
  'karyawan.list.emptyTitle': 'Belum ada karyawan',
  'karyawan.list.emptyDescription':
    'Tambahkan karyawan pertama lewat tombol + Tambah.',
  'karyawan.column.name': 'Nama',
  'karyawan.column.email': 'Email',
  'karyawan.column.position': 'Jabatan',
  'karyawan.column.status': 'Status',
  'karyawan.column.actions': 'Aksi',
  'toast.karyawan.updated': 'Data karyawan berhasil diperbarui.',
  'toast.karyawan.statusChanged': 'Status karyawan berhasil diperbarui.',
  'toast.karyawan.passwordReset': 'Kata sandi berhasil diatur ulang.',

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
