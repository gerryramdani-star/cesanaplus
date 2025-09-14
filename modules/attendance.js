/**
 * @file attendance.js
 * Mengelola semua logika dan rendering untuk halaman input Presensi.
 */

import { db } from './firebase.js';
import { collection, query, where, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showPage, showToast } from './ui.js';

// Selektor DOM
let attendanceClassTitle, attendanceDateInput, recapStatusContainer, studentAttendanceList, saveAttendanceBtn;

// Fungsi inisialisasi untuk menambahkan event listener
export function initAttendance() {
    attendanceClassTitle = document.getElementById('attendance-class-title');
    attendanceDateInput = document.getElementById('attendance-date');
    recapStatusContainer = document.getElementById('recap-status-container');
    studentAttendanceList = document.getElementById('student-attendance-list');
    saveAttendanceBtn = document.getElementById('save-attendance-btn');

    saveAttendanceBtn.addEventListener('click', handleSaveAttendance);
    attendanceDateInput.addEventListener('change', loadAttendanceForDate);

    studentAttendanceList.addEventListener('click', (e) => {
        if (e.target.classList.contains('attendance-btn')) {
            state.setHasUnsavedChanges(true);
            const row = e.target.closest('.student-row');
            row.querySelectorAll('.attendance-btn').forEach(btn => btn.className = 'attendance-btn bg-gray-200 text-gray-700 px-4 py-1 rounded-full text-sm');
            const status = e.target.dataset.status;
            const colors = { Hadir: 'green-500', Sakit: 'yellow-500', Izin: 'blue-500', Alfa: 'red-500' };
            e.target.className = `attendance-btn bg-${colors[status]} text-white px-4 py-1 rounded-full text-sm`;
            row.querySelector('.keterangan-container').style.display = (status === 'Sakit' || status === 'Izin') ? 'block' : 'none';
        }
    });
}

// Merender halaman presensi untuk kelas tertentu
export async function renderAttendancePage(classId) {
    const cls = state.localClasses.find(c => c.id === classId);
    if (!cls) {
        showPage('dashboard-page');
        return;
    }
    attendanceClassTitle.textContent = `Absensi ${cls.name}`;
    attendanceClassTitle.dataset.classId = classId;
    attendanceDateInput.value = new Date().toISOString().split('T')[0];
    await loadAttendanceForDate();
}

// Memuat data presensi untuk tanggal yang dipilih
async function loadAttendanceForDate() {
    const classId = attendanceClassTitle.dataset.classId;
    const date = attendanceDateInput.value;
    const studentsInClass = state.localStudents.filter(s => s.classId === classId);

    const attendanceRef = collection(db, "userData", state.currentUser.uid, "attendance");
    const q = query(attendanceRef, where("date", "==", date), where("classId", "==", classId));
    const attendanceSnapshot = await getDocs(q);
    const attendanceData = {};
    attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        attendanceData[data.studentId] = { status: data.status, note: data.note || '' };
    });

    updateRecapStatus(attendanceSnapshot.size > 0);

    studentAttendanceList.innerHTML = studentsInClass.map(student => {
        const studentAttendance = attendanceData[student.id] || { status: 'Hadir', note: '' };
        return `<div class="student-row flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b gap-4" data-student-id="${student.id}">
            <div>
                <p class="font-bold text-gray-800">${student.name}</p>
                <p class="text-sm text-gray-500">NIS: ${student.nis} | ${student.gender}</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <div class="keterangan-container w-full sm:w-auto" style="display: ${studentAttendance.status === 'Sakit' || studentAttendance.status === 'Izin' ? 'block' : 'none'};">
                    <input type="text" class="keterangan-input border rounded px-2 py-1 text-sm w-full" placeholder="Keterangan..." value="${studentAttendance.note}">
                </div>
                <button data-status="Hadir" class="attendance-btn ${studentAttendance.status === 'Hadir' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-1 rounded-full text-sm">Hadir</button>
                <button data-status="Sakit" class="attendance-btn ${studentAttendance.status === 'Sakit' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-1 rounded-full text-sm">Sakit</button>
                <button data-status="Izin" class="attendance-btn ${studentAttendance.status === 'Izin' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-1 rounded-full text-sm">Izin</button>
                <button data-status="Alfa" class="attendance-btn ${studentAttendance.status === 'Alfa' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'} px-4 py-1 rounded-full text-sm">Alfa</button>
            </div>
        </div>`;
    }).join('');
}

// Menyimpan data presensi ke Firestore
async function handleSaveAttendance() {
    const classId = attendanceClassTitle.dataset.classId;
    const date = attendanceDateInput.value;
    const studentRows = document.querySelectorAll('.student-row');
    const batch = writeBatch(db);

    for (const row of studentRows) {
        const studentId = row.dataset.studentId;
        const status = row.querySelector('.attendance-btn[class*="bg-green-500"], .attendance-btn[class*="bg-yellow-500"], .attendance-btn[class*="bg-blue-500"], .attendance-btn[class*="bg-red-500"]').dataset.status;
        const note = row.querySelector('.keterangan-input').value;
        const student = state.localStudents.find(s => s.id === studentId);
        
        const attendanceId = `${date}_${studentId}`;
        const docRef = doc(db, "userData", state.currentUser.uid, "attendance", attendanceId);
        
        batch.set(docRef, { studentId, classId, date, status, note, nis: student.nis });
    }

    try {
        await batch.commit();
        state.setHasUnsavedChanges(false);
        showToast('Absensi berhasil disimpan!');
        updateRecapStatus(true);
    } catch (e) {
        console.error(e);
        showToast('Gagal menyimpan absensi.', 'error');
    }
}

// Memperbarui status rekap di UI
function updateRecapStatus(isRecapped) {
    recapStatusContainer.innerHTML = isRecapped
        ? `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full">Sudah direkap</span>`
        : `<span class="bg-gray-200 text-gray-700 px-3 py-1 rounded-full">Belum direkap</span>`;
}
