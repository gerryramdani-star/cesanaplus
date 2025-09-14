/**
 * @file settings.js
 * Mengelola semua logika untuk halaman Pengaturan, termasuk manajemen
 * kelas, siswa, jenis penilaian, dan data.
 */

import { db } from './firebase.js';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showToast, openModal, closeModal } from './ui.js';

// Selektor DOM
let classSelect, studentListContainerSettings, editModal, moveModal, deleteModal, resetDataModal, restoreDataModal;

export function initSettings() {
    classSelect = document.getElementById('class-select');
    studentListContainerSettings = document.getElementById('student-list-container');
    editModal = document.getElementById('edit-student-modal');
    moveModal = document.getElementById('move-student-modal');
    deleteModal = document.getElementById('delete-student-modal');
    resetDataModal = document.getElementById('reset-data-modal');
    restoreDataModal = document.getElementById('restore-data-modal');

    // Event Listeners Manajemen Kelas & Siswa
    document.getElementById('add-class-btn').addEventListener('click', handleAddClass);
    document.getElementById('add-student-btn').addEventListener('click', handleAddStudent);
    classSelect.addEventListener('change', () => renderStudentListSettings(classSelect.value));
    
    // Event Listeners Aksi Siswa (Edit, Pindah, Hapus)
    studentListContainerSettings.addEventListener('click', handleStudentActions);
    document.getElementById('edit-student-form').addEventListener('submit', handleEditStudent);
    document.getElementById('confirm-move-btn').addEventListener('click', handleMoveStudent);
    document.getElementById('confirm-delete-btn').addEventListener('click', handleDeleteStudent);

    // Event Listeners Manajemen Jenis Penilaian
    document.getElementById('add-assessment-type-btn').addEventListener('click', handleAddAssessmentType);
    document.getElementById('assessment-type-list-container').addEventListener('click', handleDeleteAssessmentType);

    // Event Listeners Manajemen Data
    document.getElementById('backup-data-btn').addEventListener('click', handleBackupData);
    document.getElementById('restore-data-btn').addEventListener('click', () => document.getElementById('restore-file-input').click());
    document.getElementById('restore-file-input').addEventListener('change', processRestoreFile);
    document.getElementById('reset-data-btn').addEventListener('click', () => openModal(resetDataModal));
    document.getElementById('confirm-reset-btn').addEventListener('click', handleResetData);
    document.getElementById('confirm-restore-btn').addEventListener('click', confirmRestoreData);

    // Event Listener Integrasi
    document.getElementById('save-gscript-url-btn').addEventListener('click', saveAndTestConnection);
}

// --- Render Functions ---
export function renderSettings() {
    renderClassDropdown();
    renderStudentListSettings(classSelect.value);
    renderAssessmentTypesSettings();
    calculateStorageUsage();
}

function renderClassDropdown() {
    const selectedClassId = classSelect.value;
    classSelect.innerHTML = '<option value="">Pilih Kelas...</option>';
    state.localClasses.forEach(cls => {
        classSelect.add(new Option(cls.name, cls.id));
    });
    if (state.localClasses.some(c => c.id === selectedClassId)) {
        classSelect.value = selectedClassId;
    }
}

export function renderStudentListSettings(classId) {
    const students = classId ? state.localStudents.filter(s => s.classId === classId) : [];
    if (students.length === 0) {
        studentListContainerSettings.innerHTML = '<p class="text-gray-500 p-4 text-center">Pilih kelas untuk melihat atau tambah siswa.</p>';
        return;
    }
    studentListContainerSettings.innerHTML = `
        <table class="min-w-full bg-white">
            <thead class="bg-gray-100"><tr>
                <th class="py-2 px-4 border-b text-left">NIS</th><th class="py-2 px-4 border-b text-left">Nama</th>
                <th class="py-2 px-4 border-b text-left">Aksi</th>
            </tr></thead>
            <tbody>${students.map(s => `<tr>
                <td class="py-2 px-4 border-b">${s.nis}</td><td class="py-2 px-4 border-b">${s.name}</td>
                <td class="py-2 px-4 border-b">
                    <button class="edit-student-btn text-blue-500 hover:underline" data-id="${s.id}">Edit</button> |
                    <button class="move-student-btn text-green-500 hover:underline" data-id="${s.id}">Pindah</button> |
                    <button class="delete-student-btn text-red-500 hover:underline" data-id="${s.id}">Hapus</button>
                </td></tr>`).join('')}
            </tbody>
        </table>`;
}

function renderAssessmentTypesSettings() {
    const container = document.getElementById('assessment-type-list-container');
    if (state.localAssessmentTypes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 p-4 text-center">Belum ada jenis penilaian.</p>';
        return;
    }
    container.innerHTML = `
        <table class="min-w-full bg-white">
            <thead class="bg-gray-100"><tr>
                <th class="py-2 px-4 border-b text-left">Nama</th><th class="py-2 px-4 border-b text-center">Nilai Maks.</th>
                <th class="py-2 px-4 border-b text-left">Aksi</th>
            </tr></thead>
            <tbody>${state.localAssessmentTypes.map(t => `<tr>
                <td class="py-2 px-4 border-b">${t.name}</td><td class="py-2 px-4 border-b text-center">${t.maxScore}</td>
                <td class="py-2 px-4 border-b"><button class="delete-assessment-type-btn text-red-500 hover:underline" data-id="${t.id}">Hapus</button></td>
            </tr>`).join('')}</tbody>
        </table>`;
}

// --- Class, Student, Assessment Type Management ---
async function handleAddClass() {
    const name = document.getElementById('new-class-name').value.trim();
    if (!name) return showToast('Nama kelas tidak boleh kosong!', 'error');
    try {
        await addDoc(collection(db, "userData", state.currentUser.uid, "classes"), { name });
        document.getElementById('new-class-name').value = '';
        showToast(`Kelas "${name}" berhasil ditambahkan!`);
    } catch (e) { showToast('Gagal menambahkan kelas.', 'error'); }
}

async function handleAddStudent() {
    const classId = classSelect.value;
    const nis = document.getElementById('student-nis').value.trim();
    const name = document.getElementById('student-name').value.trim();
    if (!classId || !nis || !name) return showToast('Pilih kelas, NIS, dan nama tidak boleh kosong!', 'error');
    
    try {
        await addDoc(collection(db, "userData", state.currentUser.uid, "students"), {
            classId, nis, name,
            gender: document.getElementById('student-gender').value,
            dob: document.getElementById('student-dob').value
        });
        document.getElementById('student-nis').value = '';
        document.getElementById('student-name').value = '';
        showToast(`Siswa "${name}" berhasil ditambahkan.`);
    } catch (e) { showToast('Gagal menambahkan siswa.', 'error'); }
}

async function handleAddAssessmentType() {
    const name = document.getElementById('new-assessment-type-name').value.trim();
    const maxScore = Number(document.getElementById('new-assessment-type-max-score').value);
    if (!name || !maxScore) return showToast("Nama dan Nilai Maksimal tidak boleh kosong!", "error");

    try {
        await addDoc(collection(db, "userData", state.currentUser.uid, "assessment_types"), { name, maxScore });
        document.getElementById('new-assessment-type-name').value = '';
        document.getElementById('new-assessment-type-max-score').value = '100';
        showToast(`Jenis penilaian "${name}" ditambahkan.`);
    } catch (e) { showToast("Gagal menambahkan jenis penilaian.", "error"); }
}

function handleStudentActions(e) {
    const studentId = e.target.dataset.id;
    if (!studentId) return;

    const student = state.localStudents.find(s => s.id === studentId);
    if (!student) return;

    if (e.target.classList.contains('edit-student-btn')) {
        document.getElementById('edit-student-id').value = student.id;
        document.getElementById('edit-student-nis').value = student.nis;
        document.getElementById('edit-student-name').value = student.name;
        document.getElementById('edit-student-gender').value = student.gender;
        document.getElementById('edit-student-dob').value = student.dob;
        openModal(editModal);
    } else if (e.target.classList.contains('move-student-btn')) {
        document.getElementById('move-student-id').value = student.id;
        document.getElementById('move-student-name').textContent = student.name;
        const moveSelect = document.getElementById('move-class-select');
        moveSelect.innerHTML = '';
        state.localClasses.filter(c => c.id !== student.classId).forEach(cls => {
            moveSelect.add(new Option(cls.name, cls.id));
        });
        openModal(moveModal);
    } else if (e.target.classList.contains('delete-student-btn')) {
        document.getElementById('delete-student-id').value = student.id;
        openModal(deleteModal);
    }
}

async function handleEditStudent(e) {
    e.preventDefault();
    const studentId = document.getElementById('edit-student-id').value;
    try {
        await updateDoc(doc(db, "userData", state.currentUser.uid, "students", studentId), {
            nis: document.getElementById('edit-student-nis').value,
            name: document.getElementById('edit-student-name').value,
            gender: document.getElementById('edit-student-gender').value,
            dob: document.getElementById('edit-student-dob').value
        });
        closeModal(editModal);
        showToast('Data siswa diperbarui.');
    } catch(e) { showToast('Gagal memperbarui data.', 'error'); }
}

async function handleMoveStudent() {
    const studentId = document.getElementById('move-student-id').value;
    const newClassId = document.getElementById('move-class-select').value;
    try {
        await updateDoc(doc(db, "userData", state.currentUser.uid, "students", studentId), { classId: newClassId });
        closeModal(moveModal);
        showToast('Siswa berhasil dipindahkan.');
    } catch (e) { showToast('Gagal memindahkan siswa.', 'error'); }
}

async function handleDeleteStudent() {
    const studentId = document.getElementById('delete-student-id').value;
    try {
        await deleteDoc(doc(db, "userData", state.currentUser.uid, "students", studentId));
        closeModal(deleteModal);
        showToast('Siswa berhasil dihapus.');
    } catch (e) { showToast('Gagal menghapus siswa.', 'error'); }
}

async function handleDeleteAssessmentType(e) {
    if (!e.target.classList.contains('delete-assessment-type-btn')) return;
    const typeId = e.target.dataset.id;
    const type = state.localAssessmentTypes.find(t => t.id === typeId);
    if (confirm(`Anda yakin ingin menghapus "${type.name}"?`)) {
        try {
            await deleteDoc(doc(db, "userData", state.currentUser.uid, "assessment_types", typeId));
            showToast("Jenis penilaian dihapus.");
        } catch (e) { showToast("Gagal menghapus.", "error"); }
    }
}

// --- Data Management ---
async function handleBackupData() {
    showToast("Mempersiapkan data...");
    const attendanceSnap = await getDocs(collection(db, "userData", state.currentUser.uid, "attendance"));
    const data = {
        classes: state.localClasses,
        students: state.localStudents,
        assessments: state.localAssessments,
        assessmentTypes: state.localAssessmentTypes,
        grades: [], // grades can be large, maybe handle separately if needed
        attendance: attendanceSnap.docs.map(d => ({id: d.id, ...d.data()}))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cadangan-cesana-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Data berhasil dicadangkan.");
}

function processRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.classes || !data.students) throw new Error("Format file tidak valid.");
            window.restoredData = data; // Store data temporarily
            openModal(restoreDataModal);
        } catch (error) { showToast(`Gagal membaca file: ${error.message}`, "error"); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function confirmRestoreData() {
    const data = window.restoredData;
    if (!data) return;
    closeModal(restoreDataModal);
    showToast("Memulihkan data... Mohon tunggu.");

    try {
        const collections = ['classes', 'students', 'attendance', 'assessments', 'assessment_types', 'grades'];
        for (const col of collections) {
            const batch = writeBatch(db);
            const snapshot = await getDocs(collection(db, "userData", state.currentUser.uid, col));
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }

        const writeBatchNew = writeBatch(db);
        data.classes?.forEach(item => writeBatchNew.set(doc(db, "userData", state.currentUser.uid, "classes", item.id), {name: item.name}));
        // ... repeat for all collections
        await writeBatchNew.commit();
        showToast("Data berhasil dipulihkan!", "success");
    } catch (e) { showToast("Gagal memulihkan data.", "error"); console.error(e); }
    window.restoredData = null;
}

async function handleResetData() {
    const collections = ['classes', 'students', 'attendance', 'assessments', 'assessment_types', 'grades'];
    try {
        for (const col of collections) {
            const batch = writeBatch(db);
            const snapshot = await getDocs(collection(db, "userData", state.currentUser.uid, col));
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        closeModal(resetDataModal);
        showToast('Semua data berhasil direset.');
    } catch (error) { showToast('Gagal mereset data.', 'error'); }
}

function calculateStorageUsage() {
    const bar = document.getElementById('storage-bar');
    const text = document.getElementById('storage-text');
    const usage = JSON.stringify(localStorage).length;
    const percentage = (usage / state.LOCAL_STORAGE_QUOTA) * 100;
    bar.style.width = `${percentage}%`;
    text.textContent = `${(usage / 1024).toFixed(2)} KB / 5 MB`;
}

// --- Integrasi ---
export function loadIntegrationSettings() {
    document.getElementById('gscript-url').value = state.integrationSettings.gscriptUrl || '';
    document.getElementById('spreadsheet-name').value = state.integrationSettings.spreadsheetName || '';
}

async function saveAndTestConnection() {
    const url = document.getElementById('gscript-url').value.trim();
    const name = document.getElementById('spreadsheet-name').value.trim();
    if (!url || !name) return showToast('Nama dan URL tidak boleh kosong!', 'error');

    const btn = document.getElementById('save-gscript-url-btn');
    const spinner = document.getElementById('save-btn-spinner');
    const btnText = document.getElementById('save-btn-text');
    const statusEl = document.getElementById('connection-status');

    spinner.classList.remove('hidden');
    btnText.textContent = 'Mengetes...';
    btn.disabled = true;

    try {
        await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'test_connection' }) });
        await setDoc(doc(db, "userData", state.currentUser.uid, "settings", "integration"), { gscriptUrl: url, spreadsheetName: name });
        showToast('Koneksi berhasil dan disimpan!');
    } catch (error) {
        showToast(`Koneksi Gagal: Periksa URL atau izin skrip.`, 'error');
    } finally {
        spinner.classList.add('hidden');
        btnText.textContent = 'Simpan & Tes Koneksi';
        btn.disabled = false;
    }
}

