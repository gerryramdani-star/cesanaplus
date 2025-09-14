/**
 * @file dashboard.js
 * Mengelola semua logika dan rendering untuk halaman Dasbor.
 */

import { db } from './firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showPage } from './ui.js';
import { renderAttendancePage } from './attendance.js';

// Selektor DOM
let greetingEl, currentDateEl, currentTimeEl, summarySection, progressRingCircle, progressRingText, totalPresentEl, totalAbsentEl, classCardsContainer, emptyDashboardEl;

// Fungsi inisialisasi untuk menambahkan event listener
export function initDashboard() {
    greetingEl = document.getElementById('greeting');
    currentDateEl = document.getElementById('current-date');
    currentTimeEl = document.getElementById('current-time');
    summarySection = document.getElementById('summary-section');
    progressRingCircle = document.getElementById('progress-ring-circle');
    progressRingText = document.getElementById('progress-ring-text');
    totalPresentEl = document.getElementById('total-present');
    totalAbsentEl = document.getElementById('total-absent');
    classCardsContainer = document.getElementById('class-cards-container');
    emptyDashboardEl = document.getElementById('empty-dashboard');
}

// Fungsi untuk merender konten dasbor
export async function renderDashboard() {
    if (!state.currentUser) return;

    // Memulai atau melanjutkan jam dan sapaan
    if (!state.clockInterval) {
        updateClockAndGreeting();
        state.setClockInterval(setInterval(updateClockAndGreeting, 1000));
    }

    if (state.localClasses.length === 0) {
        emptyDashboardEl.style.display = 'block';
        summarySection.style.display = 'none';
        classCardsContainer.innerHTML = '';
        return;
    }

    emptyDashboardEl.style.display = 'none';
    summarySection.style.display = 'grid';

    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = collection(db, "userData", state.currentUser.uid, "attendance");
    const q = query(attendanceRef, where("date", "==", today));
    const attendanceSnapshot = await getDocs(q);
    const allAttendanceToday = attendanceSnapshot.docs.map(doc => doc.data());

    // Update ringkasan progres
    updateProgressSummary(allAttendanceToday);

    // Render kartu kelas
    renderClassCards(allAttendanceToday);
}

function updateClockAndGreeting() {
    const now = new Date();
    const hours = now.getHours();
    let greetingText = "Selamat Malam!";
    if (hours < 11) greetingText = "Selamat Pagi!";
    else if (hours < 15) greetingText = "Selamat Siang!";
    else if (hours < 19) greetingText = "Selamat Sore!";
    
    greetingEl.textContent = greetingText;
    currentDateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    currentTimeEl.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
}

function updateProgressSummary(attendanceToday) {
    const totalClasses = state.localClasses.length;
    const recappedClassIds = [...new Set(attendanceToday.map(a => a.classId))];
    const recappedCount = recappedClassIds.length;

    const percentage = totalClasses > 0 ? Math.round((recappedCount / totalClasses) * 100) : 0;
    progressRingCircle.style.strokeDashoffset = 100 - percentage;
    progressRingCircle.style.stroke = `hsl(${percentage * 1.2}, 70%, 45%)`;
    progressRingText.textContent = `${percentage}%`;
    
    totalPresentEl.textContent = attendanceToday.filter(a => a.status === 'Hadir').length;
    totalAbsentEl.textContent = attendanceToday.filter(a => a.status !== 'Hadir').length;
}

function renderClassCards(attendanceToday) {
    classCardsContainer.innerHTML = '';
    
    state.localClasses.forEach(cls => {
        const studentsInClass = state.localStudents.filter(s => s.classId === cls.id);
        const attendanceForClass = attendanceToday.filter(a => a.classId === cls.id);
        const isRecapped = attendanceForClass.length > 0;
        
        const summary = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
        attendanceForClass.forEach(rec => { 
            if(summary.hasOwnProperty(rec.status)) summary[rec.status]++; 
        });

        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h3 class="text-xl font-bold text-gray-900">${cls.name}</h3>
                <span class="text-xs font-bold px-2 py-1 rounded-full ${isRecapped ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}">${isRecapped ? 'Sudah Direkap' : 'Belum Direkap'}</span>
            </div>
            <p class="text-gray-600 mt-2">Jumlah Siswa: ${studentsInClass.length}</p>
            <div class="mt-4 pt-4 border-t flex justify-between items-center text-xs">
                <div class="text-center"><div class="font-bold text-lg text-green-600">${summary.Hadir}</div><div class="text-gray-500">Hadir</div></div>
                <div class="text-center"><div class="font-bold text-lg text-yellow-600">${summary.Sakit}</div><div class="text-gray-500">Sakit</div></div>
                <div class="text-center"><div class="font-bold text-lg text-blue-600">${summary.Izin}</div><div class="text-gray-500">Izin</div></div>
                <div class="text-center"><div class="font-bold text-lg text-red-600">${summary.Alfa}</div><div class="text-gray-500">Alfa</div></div>
            </div>`;
        card.addEventListener('click', () => showPage('absensi-page', { classId: cls.id }));
        classCardsContainer.appendChild(card);
    });
}
