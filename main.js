/**
 * @file main.js
 * Titik masuk utama aplikasi. Tugasnya hanya mengimpor modul-modul
 * yang diperlukan dan memulai aplikasi.
 */

// Path impor diperbaiki untuk menunjuk ke dalam folder 'modules/'
import { initializeApp } from './modules/firebase.js';
import { initUI } from './modules/ui.js';

// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initUI(); // Panggil fungsi inisialisasi UI agar tombol dan navigasi berfungsi
});

