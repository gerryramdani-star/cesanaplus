/**
 * @file reports.js
 * Mengelola semua logika untuk pembuatan dan ekspor laporan presensi dan nilai.
 */

import { db } from './firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showToast } from './ui.js';

// Selektor DOM
let reportClassSelect, reportPeriodSelect, generateReportBtn, reportBtnSpinner, reportBtnText, customRangeContainer, reportStartDate, reportEndDate, reportOutput, reportGuide, reportTableBody, summaryTotalDays, summaryAvgPresence, summaryTotalStudents, summaryTotalRecords, reportChartCanvas, gradeReportClassSelect, generateGradeReportBtn, gradeReportBtnSpinner, gradeReportBtnText, gradeReportOutput, gradeReportGuide, gradeReportHeaderSubtitle, gradeReportTableContainer, gradeReportStatsContainer, gradeReportChartCanvas, attendanceReportView, gradeReportView, showAttendanceReportBtn, showGradeReportBtn;

export function initReports() {
    // Selektor Laporan Presensi
    reportClassSelect = document.getElementById('report-class-select');
    reportPeriodSelect = document.getElementById('report-period-select');
    generateReportBtn = document.getElementById('generate-report-btn');
    reportBtnSpinner = document.getElementById('report-btn-spinner');
    reportBtnText = document.getElementById('report-btn-text');
    customRangeContainer = document.getElementById('custom-range-container');
    reportStartDate = document.getElementById('report-start-date');
    reportEndDate = document.getElementById('report-end-date');
    reportOutput = document.getElementById('report-output');
    reportGuide = document.getElementById('report-guide');
    reportTableBody = document.getElementById('report-table-body');
    summaryTotalDays = document.getElementById('summary-total-days');
    summaryAvgPresence = document.getElementById('summary-avg-presence');
    summaryTotalStudents = document.getElementById('summary-total-students');
    summaryTotalRecords = document.getElementById('summary-total-records');
    reportChartCanvas = document.getElementById('report-chart');

    // Selektor Laporan Nilai
    gradeReportClassSelect = document.getElementById('grade-report-class-select');
    generateGradeReportBtn = document.getElementById('generate-grade-report-btn');
    gradeReportBtnSpinner = document.getElementById('grade-report-btn-spinner');
    gradeReportBtnText = document.getElementById('grade-report-btn-text');
    gradeReportOutput = document.getElementById('grade-report-output');
    gradeReportGuide = document.getElementById('grade-report-guide');
    gradeReportHeaderSubtitle = document.getElementById('grade-report-header-subtitle');
    gradeReportTableContainer = document.getElementById('grade-report-table-container');
    gradeReportStatsContainer = document.getElementById('grade-report-stats-container');
    gradeReportChartCanvas = document.getElementById('grade-report-chart');

    // Selektor Tombol Tab
    attendanceReportView = document.getElementById('attendance-report-view');
    gradeReportView = document.getElementById('grade-report-view');
    showAttendanceReportBtn = document.getElementById('show-attendance-report-btn');
    showGradeReportBtn = document.getElementById('show-grade-report-btn');

    // Event Listeners
    showAttendanceReportBtn.addEventListener('click', () => switchReportView('attendance'));
    showGradeReportBtn.addEventListener('click', () => switchReportView('grade'));
    generateReportBtn.addEventListener('click', generateAttendanceReport);
    reportPeriodSelect.addEventListener('change', updateReportDateRange);
    generateGradeReportBtn.addEventListener('click', generateGradeReport);
    
    document.getElementById('export-csv-btn').addEventListener('click', exportAttendanceToCsv);
    document.getElementById('export-pdf-btn').addEventListener('click', () => exportToPdf('report-printable-area', 'laporan_kehadiran.pdf'));
    document.getElementById('export-grade-csv-btn').addEventListener('click', exportGradesToCsv);
    document.getElementById('export-grade-pdf-btn').addEventListener('click', () => exportToPdf('grade-report-printable-area', 'laporan_nilai.pdf', 'l'));
}

export function renderReportPage() {
    reportPeriodSelect.value = 'this_month';
    updateReportDateRange();
    reportOutput.classList.add('hidden');
    reportGuide.classList.remove('hidden');
    gradeReportOutput.classList.add('hidden');
    gradeReportGuide.classList.remove('hidden');

    reportClassSelect.innerHTML = '<option value="">Semua Kelas</option>';
    gradeReportClassSelect.innerHTML = '<option value="">Pilih Kelas...</option>';
    state.localClasses.forEach(cls => {
        reportClassSelect.add(new Option(cls.name, cls.id));
        gradeReportClassSelect.add(new Option(cls.name, cls.id));
    });
    switchReportView('attendance');
}

function switchReportView(viewToShow) {
    const isAttendance = viewToShow === 'attendance';
    attendanceReportView.classList.toggle('hidden', !isAttendance);
    gradeReportView.classList.toggle('hidden', isAttendance);
    showAttendanceReportBtn.classList.toggle('active', isAttendance);
    showGradeReportBtn.classList.toggle('active', !isAttendance);
}

function updateReportDateRange() {
    const period = reportPeriodSelect.value;
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (period === 'custom') {
        customRangeContainer.classList.remove('hidden');
        customRangeContainer.classList.add('md:grid');
        reportStartDate.value = today.toISOString().split('T')[0];
        reportEndDate.value = today.toISOString().split('T')[0];
        return;
    }
    customRangeContainer.classList.add('hidden');

    switch (period) {
        case 'last_7_days': startDate.setDate(today.getDate() - 6); break;
        case 'last_14_days': startDate.setDate(today.getDate() - 13); break;
        case 'this_month': startDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
    }
    reportStartDate.value = startDate.toISOString().split('T')[0];
    reportEndDate.value = endDate.toISOString().split('T')[0];
}

async function generateAttendanceReport() {
    reportBtnSpinner.classList.remove('hidden');
    reportBtnText.textContent = 'Memuat...';
    generateReportBtn.disabled = true;

    try {
        const classId = reportClassSelect.value;
        const startDate = reportStartDate.value;
        const endDate = reportEndDate.value;
        if (!startDate || !endDate) {
            showToast("Silakan pilih rentang tanggal.", "error");
            return;
        }

        const attendanceRef = collection(db, "userData", state.currentUser.uid, "attendance");
        const q = query(attendanceRef, where("date", ">=", startDate), where("date", "<=", endDate));
        const snapshot = await getDocs(q);
        let records = snapshot.docs.map(doc => doc.data());
        if (classId) records = records.filter(r => r.classId === classId);

        if (records.length === 0) {
            showToast("Tidak ada data absensi pada periode ini.", "error");
            reportOutput.classList.add('hidden');
            reportGuide.classList.remove('hidden');
            return;
        }

        const studentIds = [...new Set(records.map(r => r.studentId))];
        let students = state.localStudents.filter(s => studentIds.includes(s.id));
        if(classId) students = students.filter(s => s.classId === classId);

        const effectiveDays = new Set(records.map(r => r.date));
        const stats = {};
        students.forEach(s => { stats[s.id] = { name: s.name, Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0 }; });
        records.forEach(r => { if (stats[r.studentId]) stats[r.studentId][r.status]++; });

        state.setCurrentReportData(Object.values(stats).map(s => ({
            ...s, 'Kehadiran (%)': effectiveDays.size > 0 ? ((s.Hadir / effectiveDays.size) * 100).toFixed(1) : 0
        })));
        
        renderAttendanceReportUI(state.currentReportData, effectiveDays.size, students.length, records.length);

    } catch (error) {
        console.error("Gagal membuat laporan:", error);
        showToast("Terjadi kesalahan.", "error");
    } finally {
        reportBtnSpinner.classList.add('hidden');
        reportBtnText.textContent = 'Tampilkan Laporan';
        generateReportBtn.disabled = false;
    }
}

function renderAttendanceReportUI(reportData, days, studentCount, recordCount) {
    reportTableBody.innerHTML = reportData.map(stats => `<tr>
        <td class="py-2 px-4 border-b text-left">${stats.name}</td>
        <td class="py-2 px-4 border-b text-center">${stats.Hadir}</td>
        <td class="py-2 px-4 border-b text-center">${stats.Sakit}</td>
        <td class="py-2 px-4 border-b text-center">${stats.Izin}</td>
        <td class="py-2 px-4 border-b text-center">${stats.Alfa}</td>
        <td class="py-2 px-4 border-b text-center">${stats['Kehadiran (%)']}%</td>
    </tr>`).join('');

    const totalHadir = reportData.reduce((sum, s) => sum + s.Hadir, 0);
    summaryTotalDays.textContent = days;
    summaryTotalStudents.textContent = studentCount;
    summaryTotalRecords.textContent = recordCount;
    summaryAvgPresence.textContent = `${(studentCount * days > 0 ? (totalHadir / (studentCount * days)) * 100 : 0).toFixed(1)}%`;
    
    if (state.reportChart) state.reportChart.destroy();
    const newChart = new Chart(reportChartCanvas, {
        type: 'bar',
        data: {
            labels: ['Hadir', 'Sakit', 'Izin', 'Alfa'],
            datasets: [{ label: 'Jumlah', data: ['Hadir', 'Sakit', 'Izin', 'Alfa'].map(s => reportData.reduce((sum, d) => sum + d[s], 0)), backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    state.setReportChart(newChart);

    reportGuide.classList.add('hidden');
    reportOutput.classList.remove('hidden');
}

async function generateGradeReport() {
    gradeReportBtnSpinner.classList.remove('hidden');
    gradeReportBtnText.textContent = 'Memuat...';
    generateGradeReportBtn.disabled = true;

    try {
        const classId = gradeReportClassSelect.value;
        if (!classId) {
            showToast("Silakan pilih kelas.", "error");
            return;
        }

        const assessments = state.localAssessments.filter(a => a.classId === classId);
        if (assessments.length === 0) {
            showToast("Tidak ada data penilaian untuk kelas ini.", "error");
            return;
        }

        const gradesRef = collection(db, "userData", state.currentUser.uid, "grades");
        const q = query(gradesRef, where("assessmentId", "in", assessments.map(a => a.id)));
        const gradesSnapshot = await getDocs(q);
        const grades = gradesSnapshot.docs.map(doc => doc.data());
        const students = state.localStudents.filter(s => s.classId === classId);

        state.setCurrentGradeReportData(processGradeDataForReport(students, assessments, grades));
        renderGradeReportUI(state.currentGradeReportData, state.localClasses.find(c => c.id === classId).name);

    } catch (error) {
        console.error("Gagal membuat laporan nilai:", error);
        showToast("Terjadi kesalahan.", "error");
    } finally {
        gradeReportBtnSpinner.classList.add('hidden');
        gradeReportBtnText.textContent = 'Tampilkan Rapor Kelas';
        generateGradeReportBtn.disabled = false;
    }
}

function processGradeDataForReport(students, assessments, grades) {
    assessments.sort((a, b) => new Date(a.date) - new Date(b.date));
    const gradeMap = Object.fromEntries(grades.map(g => [`${g.studentId}_${g.assessmentId}`, g.gradeValue]));

    const headers = ["NIS", "Nama Siswa", ...assessments.map(a => `${state.localAssessmentTypes.find(t=>t.id===a.assessmentTypeId)?.name || ''}: ${a.title}`), "Rata-Rata"];
    
    const rows = students.map(student => {
        const row = [student.nis, student.name];
        let total = 0, count = 0;
        assessments.forEach(a => {
            const grade = gradeMap[`${student.id}_${a.id}`];
            row.push(grade ?? '');
            if (grade !== undefined) { total += Number(grade); count++; }
        });
        row.push(count > 0 ? (total / count).toFixed(1) : '-');
        return row;
    });

    const stats = assessments.map((a, i) => {
        const scores = rows.map(r => r[i + 2]).filter(g => g !== '').map(Number);
        if (scores.length === 0) return { avg: '-', max: '-', min: '-' };
        return {
            avg: (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1),
            max: Math.max(...scores),
            min: Math.min(...scores)
        };
    });

    return { headers, rows, stats, assessments };
}

function renderGradeReportUI({ headers, rows, stats }, className) {
    gradeReportHeaderSubtitle.textContent = `Kelas: ${className}`;
    gradeReportTableContainer.innerHTML = `
        <table class="min-w-full bg-white text-sm">
            <thead class="bg-gray-200"><tr>${headers.map(h => `<th class="py-2 px-3 border-b text-left font-semibold">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="py-2 px-3 border-b ${i > 1 ? 'text-center' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;
    
    const statHeaders = headers.slice(2, -1);
    gradeReportStatsContainer.innerHTML = `
        <table class="min-w-full bg-white text-sm">
            <thead class="bg-gray-50"><tr><th class="py-2 px-3 border-b text-left font-semibold">Statistik</th>${statHeaders.map(h => `<th class="py-2 px-3 border-b text-center font-semibold">${h}</th>`).join('')}</tr></thead>
            <tbody>
                <tr><td class="py-2 px-3 border-b font-semibold">Rata-Rata Kelas</td>${stats.map(s => `<td class="py-2 px-3 border-b text-center">${s.avg}</td>`).join('')}</tr>
                <tr><td class="py-2 px-3 border-b font-semibold">Nilai Tertinggi</td>${stats.map(s => `<td class="py-2 px-3 border-b text-center">${s.max}</td>`).join('')}</tr>
                <tr><td class="py-2 px-3 border-b font-semibold">Nilai Terendah</td>${stats.map(s => `<td class="py-2 px-3 border-b text-center">${s.min}</td>`).join('')}</tr>
            </tbody>
        </table>`;

    if (state.gradeReportChart) state.gradeReportChart.destroy();
    const newChart = new Chart(gradeReportChartCanvas, {
        type: 'bar',
        data: { labels: statHeaders, datasets: [{ label: 'Rata-Rata Nilai', data: stats.map(s => s.avg), backgroundColor: 'rgba(79, 70, 229, 0.7)' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
    });
    state.setGradeReportChart(newChart);

    gradeReportGuide.classList.add('hidden');
    gradeReportOutput.classList.remove('hidden');
}

// --- Fungsi Ekspor ---
function exportAttendanceToCsv() {
    if (state.currentReportData.length === 0) return showToast("Tidak ada data.", "error");
    const headers = ["Nama Siswa", "Hadir", "Sakit", "Izin", "Alfa", "Kehadiran (%)"];
    const csv = [headers.join(','), ...state.currentReportData.map(row => headers.map(h => row[h]).join(','))].join('\n');
    downloadFile(csv, 'laporan_kehadiran.csv', 'text/csv;charset=utf-8;');
}

function exportGradesToCsv() {
    const { headers, rows } = state.currentGradeReportData;
    if (rows.length === 0) return showToast("Tidak ada data.", "error");
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    downloadFile(csv, 'laporan_nilai.csv', 'text/csv;charset=utf-8;');
}

function exportToPdf(elementId, filename, orientation = 'p') {
    showToast("Membuat PDF...", "success");
    const { jsPDF } = window.jspdf;
    html2canvas(document.getElementById(elementId)).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(filename);
    }).catch(err => showToast("Gagal membuat PDF.", "error"));
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

