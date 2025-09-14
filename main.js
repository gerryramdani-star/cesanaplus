/**
 * @file main.js
 * Titik masuk utama aplikasi. Tugasnya hanya mengimpor modul-modul
 * yang diperlukan dan memulai aplikasi.
 */

// NOTE: Asumsi path ke modules/firebase.js sudah benar.
// Jika file ui.js, settings.js, dll. berada di folder yang sama dengan main.js,
// maka path import mungkin perlu disesuaikan.
import { initializeApp } from './modules/firebase.js'; 
import { initUI } from './ui.js';

// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi Firebase dan UI
    initializeApp();
    initUI();
});
