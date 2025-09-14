/**
 * @file main.js
 * Titik masuk utama aplikasi. Tugasnya hanya mengimpor modul-modul
 * yang diperlukan dan memulai aplikasi.
 */

import { initializeApp } from './modules/firebase.js';

// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

