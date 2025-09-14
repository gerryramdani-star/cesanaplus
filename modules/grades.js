/**
 * @file grades.js
 * Mengelola semua logika untuk dasbor nilai, input nilai, dan laporan individu siswa.
 */

import { db } from './firebase.js';
import { collection, doc, addDoc, getDocs, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showPage, showToast, openModal, closeModal } from './ui.js';

// Selektor DOM
let gradeClassCardsContainer, gradeInputPage, gradeInputClassTitle, assessmentSelect, createAssessmentBtn, studentGradeListContainer, saveGradesBtn, createAssessmentModal, newAssessmentTypeSelect, newAssessmentNameInput, newAssessmentDateInput, saveAssessmentBtn, individualReportContent;

export function initGrades() {
    gradeClassCardsContainer = document.getElementById('grade-class-cards-container');
    gradeInputPage = document.getElementById('grade-input-page');
    gradeInputClassTitle = document.getElementById('grade-input-class-title');
    assessmentSelect = document.getElementById('assessment-select');
    createAssessmentBtn = document.getElementById('create-assessment-btn');
    studentGradeListContainer = document.getElementById('student-grade-list-container');
    saveGradesBtn = document.getElementById('save-grades-btn');
    createAssessmentModal = document.getElementById('create-assessment-modal');
    newAssessmentTypeSelect = document.getElementById('new-assessment-type-select');
    newAssessmentNameInput = document.getElementById('new-assessment-name');
    newAssessmentDateInput = document.getElementById('new-assessment-date');
    saveAssessmentBtn = document.getElementById('save-assessment-btn');
    individualReportContent = document.getElementById('individual-report-content');

    createAssessmentBtn.addEventListener('click', () => {
        newAssessmentDateInput.value = new Date().toISOString().split('T')[0];
        openModal(createAssessmentModal);
    });
    saveAssessmentBtn.addEventListener('click', handleCreateAssessment);
    assessmentSelect.addEventListener('change', loadGradesForAssessment);
    saveGradesBtn.addEventListener('click', handleSaveGrades);

    document.getElementById('back-to-student-list-btn').addEventListener('click', () => showPage('student-list-page'));
    document.getElementById('print-report-btn').addEventListener('click', () => window.print());
}

export function renderGradesDashboard() {
    gradeClassCardsContainer.innerHTML = '';
    if (state.localClasses.length === 0) {
        gradeClassCardsContainer.innerHTML = '<p class="text-gray-500 p-4 text-center col-span-full">Silakan tambahkan kelas di Pengaturan.</p>';
        return;
    }

    state.localClasses.forEach(cls => {
        const assessmentsInClass = state.localAssessments.filter(a => a.classId === cls.id).length;
        const studentsInClass = state.localStudents.filter(s => s.classId === cls.id).length;

        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer';
        card.innerHTML = `
            <h3 class="text-xl font-bold text-gray-900">${cls.name}</h3>
            <p class="text-gray-600 mt-2">Jumlah Siswa: ${studentsInClass}</p>
            <p class="text-gray-600 mt-1">Total Penilaian: ${assessmentsInClass}</p>
            <div class="mt-4 pt-4 border-t">
                <p class="text-sm text-blue-600 font-semibold">Lihat & Input Nilai →</p>
            </div>
        `;
        card.addEventListener('click', () => showPage('grade-input-page', { classId: cls.id }));
        gradeClassCardsContainer.appendChild(card);
    });
}

export function renderGradeInputPage(classId) {
    const cls = state.localClasses.find(c => c.id === classId);
    if (!cls) {
        showPage('grades-dashboard-page');
        return;
    }

    gradeInputPage.dataset.classId = classId;
    gradeInputClassTitle.textContent = `Rekap Nilai Kelas ${cls.name}`;
    
    newAssessmentTypeSelect.innerHTML = '<option value="">Pilih Jenis...</option>';
    if (state.localAssessmentTypes.length === 0) {
        newAssessmentTypeSelect.innerHTML = '<option value="" disabled>Buat Jenis Penilaian di Pengaturan</option>';
    } else {
        state.localAssessmentTypes.forEach(type => {
            newAssessmentTypeSelect.add(new Option(type.name, type.id));
        });
    }

    assessmentSelect.innerHTML = '<option value="">--- Pilih Penilaian ---</option>';
    state.localAssessments.filter(a => a.classId === classId).forEach(assessment => {
        const typeName = state.localAssessmentTypes.find(t => t.id === assessment.assessmentTypeId)?.name || 'Lainnya';
        assessmentSelect.add(new Option(`${typeName}: ${assessment.title} (${assessment.date})`, assessment.id));
    });

    studentGradeListContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">Pilih atau buat penilaian untuk memulai.</p>';
    saveGradesBtn.classList.add('hidden');
}

async function loadGradesForAssessment() {
    const classId = gradeInputPage.dataset.classId;
    const assessmentId = assessmentSelect.value;

    if (!assessmentId) {
        studentGradeListContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">Pilih penilaian untuk menampilkan daftar siswa.</p>';
        saveGradesBtn.classList.add('hidden');
        return;
    }

    const studentsInClass = state.localStudents.filter(s => s.classId === classId);
    studentGradeListContainer.innerHTML = '<div class="text-center p-4">Memuat data nilai...</div>';

    const gradesRef = collection(db, "userData", state.currentUser.uid, "grades");
    const q = query(gradesRef, where("assessmentId", "==", assessmentId));
    const gradeSnapshot = await getDocs(q);
    const gradeData = Object.fromEntries(gradeSnapshot.docs.map(doc => [doc.data().studentId, doc.data().gradeValue]));

    let tableHTML = `<table class="min-w-full bg-white"><thead class="bg-gray-100"><tr>
        <th class="py-2 px-4 border-b text-left w-16">No.</th>
        <th class="py-2 px-4 border-b text-left">Nama Siswa</th>
        <th class="py-2 px-4 border-b text-left w-40">Nilai</th>
    </tr></thead><tbody>`;

    studentsInClass.forEach((student, index) => {
        const grade = gradeData[student.id] || '';
        tableHTML += `<tr class="student-grade-row" data-student-id="${student.id}">
            <td class="py-2 px-4 border-b">${index + 1}</td>
            <td class="py-2 px-4 border-b">${student.name}</td>
            <td class="py-2 px-4 border-b"><input type="number" min="0" max="100" class="grade-input w-full p-2 border rounded" value="${grade}" placeholder="0-100"></td>
        </tr>`;
    });

    tableHTML += '</tbody></table>';
    studentGradeListContainer.innerHTML = tableHTML;
    saveGradesBtn.classList.remove('hidden');
}

async function handleCreateAssessment() {
    const assessmentTypeId = newAssessmentTypeSelect.value;
    const title = newAssessmentNameInput.value.trim();
    const date = newAssessmentDateInput.value;
    const classId = gradeInputPage.dataset.classId;

    if (!assessmentTypeId || !title || !date || !classId) {
        showToast("Semua kolom harus diisi!", "error");
        return;
    }
    try {
        const assessmentsRef = collection(db, "userData", state.currentUser.uid, "assessments");
        const newDoc = await addDoc(assessmentsRef, { title, date, classId, assessmentTypeId });
        
        closeModal(createAssessmentModal);
        newAssessmentNameInput.value = '';
        newAssessmentDateInput.value = '';
        newAssessmentTypeSelect.value = '';
        showToast("Penilaian baru berhasil dibuat.");
        
        // Refresh and select the new assessment
        renderGradeInputPage(classId); // This re-renders the dropdown
        setTimeout(() => { // Timeout to allow DOM update
            assessmentSelect.value = newDoc.id;
            loadGradesForAssessment();
        }, 100);

    } catch(e) {
        showToast("Gagal membuat penilaian.", "error");
        console.error(e);
    }
}

async function handleSaveGrades() {
    const assessmentId = assessmentSelect.value;
    if (!assessmentId) return;

    const studentRows = document.querySelectorAll('.student-grade-row');
    const batch = writeBatch(db);

    for (const row of studentRows) {
        const studentId = row.dataset.studentId;
        const gradeValue = row.querySelector('.grade-input').value;
        const gradeDocId = `${assessmentId}_${studentId}`;

        if (gradeValue !== '') {
            const docRef = doc(db, "userData", state.currentUser.uid, "grades", gradeDocId);
            batch.set(docRef, { studentId, assessmentId, gradeValue: Number(gradeValue) });
        }
    }

    try {
        await batch.commit();
        showToast("Nilai berhasil disimpan!");
    } catch (e) {
        showToast("Gagal menyimpan nilai.", "error");
        console.error(e);
    }
}

export async function generateIndividualReport(studentId) {
    individualReportContent.innerHTML = `<div class="text-center p-8"><p class="font-semibold">Memuat laporan siswa...</p></div>`;
    const student = state.localStudents.find(s => s.id === studentId);
    if (!student) {
        individualReportContent.innerHTML = `<p class="text-red-500">Siswa tidak ditemukan.</p>`;
        return;
    }
    const studentClass = state.localClasses.find(c => c.id === student.classId) || { name: 'N/A' };

    try {
        // Fetch Attendance Data
        const attendanceRef = collection(db, "userData", state.currentUser.uid, "attendance");
        const attendanceQuery = query(attendanceRef, where("studentId", "==", studentId));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceSummary = { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 };
        attendanceSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (attendanceSummary.hasOwnProperty(status)) attendanceSummary[status]++;
        });

        // Fetch Grades Data
        const gradesRef = collection(db, "userData", state.currentUser.uid, "grades");
        const gradesQuery = query(gradesRef, where("studentId", "==", studentId));
        const gradesSnapshot = await getDocs(gradesQuery);
        const gradesData = gradesSnapshot.docs.map(doc => doc.data());

        // Build HTML
        renderReportHTML(student, studentClass, attendanceSummary, gradesData);

        // Render Chart
        renderIndividualChart(attendanceSummary);

    } catch (error) {
        console.error("Gagal membuat laporan individual:", error);
        individualReportContent.innerHTML = `<p class="text-red-500">Terjadi kesalahan.</p>`;
    }
}

function renderReportHTML(student, studentClass, attendanceSummary, gradesData) {
    let gradesTableHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Belum ada nilai.</td></tr>';
    if (gradesData.length > 0) {
        gradesTableHTML = gradesData.map(grade => {
            const assessment = state.localAssessments.find(a => a.id === grade.assessmentId);
            if (!assessment) return '';
            const type = state.localAssessmentTypes.find(t => t.id === assessment.assessmentTypeId) || { name: 'Penilaian' };
            return `<tr>
                        <td class="py-2 px-4 border-b">${type.name}: ${assessment.title}</td>
                        <td class="py-2 px-4 border-b text-center">${assessment.date}</td>
                        <td class="py-2 px-4 border-b text-center font-bold text-lg">${grade.gradeValue}</td>
                    </tr>`;
        }).join('');
    }

    individualReportContent.innerHTML = `
        <div class="space-y-8">
            <div>
                <h2 class="text-3xl font-bold text-center text-gray-800">Rapor Individual Siswa</h2>
                <p class="text-center text-gray-500">Tahun Ajaran 2025/2026</p>
            </div>
            <div class="p-4 border rounded-lg bg-gray-50">
                <h3 class="text-lg font-semibold mb-2 border-b pb-2">Informasi Siswa</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Nama:</strong> ${student.name}</div>
                    <div><strong>NIS:</strong> ${student.nis}</div>
                    <div><strong>Kelas:</strong> ${studentClass.name}</div>
                    <div><strong>Jenis Kelamin:</strong> ${student.gender}</div>
                </div>
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-4">Rekapitulasi Kehadiran</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="p-4 bg-green-100 rounded-lg"><p class="text-2xl font-bold text-green-700">${attendanceSummary.Hadir}</p><p class="text-sm text-green-600">Hadir</p></div>
                        <div class="p-4 bg-yellow-100 rounded-lg"><p class="text-2xl font-bold text-yellow-700">${attendanceSummary.Sakit}</p><p class="text-sm text-yellow-600">Sakit</p></div>
                        <div class="p-4 bg-blue-100 rounded-lg"><p class="text-2xl font-bold text-blue-700">${attendanceSummary.Izin}</p><p class="text-sm text-blue-600">Izin</p></div>
                        <div class="p-4 bg-red-100 rounded-lg"><p class="text-2xl font-bold text-red-700">${attendanceSummary.Alfa}</p><p class="text-sm text-red-600">Alfa</p></div>
                    </div>
                    <div class="h-48 md:h-56"><canvas id="individual-report-attendance-chart"></canvas></div>
                </div>
            </div>
            <div>
                <h3 class="text-lg font-semibold mb-4">Rekapitulasi Nilai</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white">
                        <thead class="bg-gray-200">
                            <tr>
                                <th class="py-2 px-4 border-b text-left">Jenis Penilaian</th>
                                <th class="py-2 px-4 border-b text-center">Tanggal</th>
                                <th class="py-2 px-4 border-b text-center">Nilai</th>
                            </tr>
                        </thead>
                        <tbody>${gradesTableHTML}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
}

function renderIndividualChart(summary) {
    const chartCanvas = document.getElementById('individual-report-attendance-chart');
    if (!chartCanvas) return;
    
    if (state.individualReportAttendanceChart) state.individualReportAttendanceChart.destroy();
    
    const totalDays = Object.values(summary).reduce((a, b) => a + b, 0);
    if (totalDays > 0) {
        const newChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Hadir', 'Sakit', 'Izin', 'Alfa'],
                datasets: [{ data: Object.values(summary), backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
        state.setIndividualReportAttendanceChart(newChart);
    } else {
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Belum ada data kehadiran', chartCanvas.width / 2, chartCanvas.height / 2);
    }
}

