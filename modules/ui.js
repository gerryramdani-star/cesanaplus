/**
 * @file ui.js
 * Modul ini berisi fungsi-fungsi yang mengontrol antarmuka pengguna (UI) secara umum.
 * Seperti menampilkan notifikasi (toast), membuka/menutup modal, dan navigasi antar halaman.
 */

import * as state from './state.js';
import { renderDashboard } from './dashboard.js';
import { renderAttendancePage } from './attendance.js';
import { renderGradesDashboard, renderGradeInputPage, generateIndividualReport } from './grades.js';
import { renderReportPage } from './reports.js';
import { renderSettings, renderStudentListPage, loadIntegrationSettings } from './settings.js';

// Selektor DOM untuk elemen UI umum
let globalToast, toastMessage, pageSections, navItems, sidebar, sidebarOverlay, unsavedChangesModal;

// Fungsi untuk menginisialisasi elemen dan event listener UI
export function initUI() {
    // Inisialisasi selektor setelah DOM dimuat
    globalToast = document.getElementById('global-toast');
    toastMessage = document.getElementById('toast-message');
    pageSections = document.querySelectorAll('.page-section');
    navItems = document.querySelectorAll('.nav-item a');
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    unsavedChangesModal = document.getElementById('unsaved-changes-modal');

    // Event listener untuk tombol hamburger dan overlay
    document.getElementById('hamburger-btn').addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // Event listener untuk navigasi utama
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.currentTarget.getAttribute('href').substring(1) + '-page');
        });
    });
    
    // Event listener untuk modal "perubahan belum disimpan"
    document.getElementById('stay-on-page-btn').addEventListener('click', () => closeModal(unsavedChangesModal));
    document.getElementById('leave-page-btn').addEventListener('click', () => {
        state.setHasUnsavedChanges(false);
        closeModal(unsavedChangesModal);
        if (state.navigationTarget) {
            showPage(state.navigationTarget.pageId, state.navigationTarget.data);
        }
    });

    // Event listener untuk semua tombol "Batal" di modal
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
    });

    // Peringatan sebelum meninggalkan halaman jika ada perubahan
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    sidebar.classList.toggle('translate-x-0');
    sidebarOverlay.classList.toggle('hidden');
}

// Menampilkan notifikasi toast
export function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    globalToast.className = `fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-transform duration-300 transform`;
    globalToast.classList.add(type === 'success' ? 'bg-green-500' : 'bg-red-500');
    globalToast.classList.remove('hidden', 'translate-x-full');
    
    setTimeout(() => {
        globalToast.classList.add('translate-x-full');
        setTimeout(() => globalToast.classList.add('hidden'), 300);
    }, 4000);
}

// Membuka dan menutup modal
export const openModal = (modal) => modal.classList.add('active');
export const closeModal = (modal) => modal.classList.remove('active');

// Fungsi utama untuk navigasi halaman
export function showPage(pageId, data = null) {
    const activePage = document.querySelector('.page-section.active');
    if (activePage && activePage.id === 'absensi-page' && state.hasUnsavedChanges) {
        state.setNavigationTarget({ pageId, data });
        openModal(unsavedChangesModal);
        return;
    }
    state.setHasUnsavedChanges(false);

    pageSections.forEach(section => section.classList.remove('active'));
    navItems.forEach(item => item.parentElement.classList.remove('nav-item-active'));

    const newPage = document.getElementById(pageId);
    if (newPage) newPage.classList.add('active');

    const newNavItem = document.querySelector(`.nav-item a[href="#${pageId.replace('-page', '')}"]`);
    if (newNavItem) newNavItem.parentElement.classList.add('nav-item-active');

    if (sidebar.classList.contains('translate-x-0')) {
        toggleSidebar();
    }
    
    // Hentikan interval jam jika meninggalkan dasbor
    if (pageId !== 'dashboard-page' && state.clockInterval) {
        clearInterval(state.clockInterval);
        state.setClockInterval(null);
    }
    
    // Panggil fungsi render yang sesuai untuk halaman yang dituju
    switch(pageId) {
        case 'dashboard-page':
            renderDashboard();
            break;
        case 'grades-dashboard-page':
            renderGradesDashboard();
            break;
        case 'pengaturan-page':
            renderSettings();
            break;
        case 'laporan-page':
            renderReportPage();
            break;
        case 'integrasi-page':
            loadIntegrationSettings();
            break;
        case 'student-list-page':
            renderStudentListPage();
            break;
        case 'individual-report-page':
            if (data && data.studentId) generateIndividualReport(data.studentId);
            break;
        case 'absensi-page':
             if (data && data.classId) renderAttendancePage(data.classId);
            break;
        case 'grade-input-page':
            if (data && data.classId) renderGradeInputPage(data.classId);
            break;
    }
}
