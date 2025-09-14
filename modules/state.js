/**
 * @file state.js
 * Bertindak sebagai "single source of truth" atau sumber data terpusat untuk aplikasi.
 * Semua data penting seperti info pengguna, daftar kelas, dan siswa disimpan di sini.
 */

export let currentUser = null;
export let localClasses = [];
export let localStudents = [];
export let localAssessments = []; 
export let localAssessmentTypes = [];
export let integrationSettings = {};
export let unsubscribeListeners = [];
export let hasUnsavedChanges = false;
export let navigationTarget = null;
export let clockInterval = null;
export let reportChart = null;
export let gradeReportChart = null;
export let individualReportAttendanceChart = null;
export let currentReportData = [];
export let currentGradeReportData = { headers: [], rows: [], stats: [] };

export const LOCAL_STORAGE_QUOTA = 5 * 1024 * 1024;

// Fungsi untuk mengubah state (mutator)
export function setCurrentUser(user) { currentUser = user; }
export function setLocalClasses(classes) { localClasses = classes; }
export function setLocalStudents(students) { localStudents = students; }
export function setLocalAssessments(assessments) { localAssessments = assessments; }
export function setLocalAssessmentTypes(types) { localAssessmentTypes = types; }
export function setIntegrationSettings(settings) { integrationSettings = settings; }
export function setUnsubscribeListeners(listeners) { unsubscribeListeners = listeners; }
export function setHasUnsavedChanges(value) { hasUnsavedChanges = value; }
export function setNavigationTarget(target) { navigationTarget = target; }
export function setClockInterval(interval) { clockInterval = interval; }
export function setReportChart(chart) { reportChart = chart; }
export function setGradeReportChart(chart) { gradeReportChart = chart; }
export function setIndividualReportAttendanceChart(chart) { individualReportAttendanceChart = chart; }
export function setCurrentReportData(data) { currentReportData = data; }
export function setCurrentGradeReportData(data) { currentGradeReportData = data; }

// Fungsi untuk mereset state saat logout
export function resetState() {
    currentUser = null;
    localClasses = [];
    localStudents = [];
    localAssessments = [];
    localAssessmentTypes = [];
    integrationSettings = {};
    
    // Hentikan semua listener Firestore
    unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners = [];

    // Hentikan interval jam jika ada
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}
