/**
 * @file firebase.js
 * Modul ini menangani semua interaksi dengan Firebase, termasuk:
 * - Inisialisasi aplikasi Firebase.
 * - Autentikasi pengguna (Login/Logout).
 * - Menyiapkan dan mengelola listener data real-time dari Firestore.
 */

import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as state from './state.js';
import { showPage, initUI } from './ui.js';
import { initDashboard } from './dashboard.js';
import { initAttendance } from './attendance.js';
import { initGrades } from './grades.js';
import { initReports } from './reports.js';
import { initSettings } from './settings.js';

// Ekspor instance auth dan db untuk digunakan modul lain
export let auth;
export let db;

const provider = new GoogleAuthProvider();

// Fungsi inisialisasi utama aplikasi
export async function initializeApp() {
    try {
        const response = await fetch('/.netlify/functions/firebase-config');
        if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
        
        const firebaseConfig = await response.json();
        if (!firebaseConfig.apiKey) throw new Error('Konfigurasi Firebase yang diterima kosong.');

        const app = initializeFirebaseApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        setupAuthListener();
        initUI(); // Inisialisasi event listener UI umum
        
    } catch (error) {
        console.error("Kesalahan Kritis Inisialisasi Firebase:", error);
        const loginButton = document.getElementById('login-btn');
        const loginInfo = document.querySelector('#login-screen p');
        if (loginButton && loginInfo) {
            loginInfo.innerHTML = '<span class="text-red-600 font-semibold">Gagal memuat konfigurasi.</span><br><span class="text-xs text-gray-500">Periksa Environment Variables di Netlify dan segarkan halaman.</span>';
            loginButton.disabled = true;
            loginButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Menangani proses login
export const handleLogin = () => {
    signInWithPopup(auth, provider).catch(error => console.error("Login Gagal:", error));
};

// Menangani proses logout
export const handleLogout = () => {
    signOut(auth).catch(error => console.error("Logout Gagal:", error));
};

// Listener untuk perubahan status autentikasi
function setupAuthListener() {
    onAuthStateChanged(auth, user => {
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const userProfileContainer = document.getElementById('user-profile');

        if (user) {
            state.setCurrentUser(user);
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            userProfileContainer.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="${user.photoURL}" alt="User Avatar" class="w-10 h-10 rounded-full">
                    <div>
                        <p class="font-semibold text-sm text-gray-800">${user.displayName}</p>
                        <button id="logout-btn" class="text-xs text-red-500 hover:underline flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            <span>Keluar</span>
                        </button>
                    </div>
                </div>`;
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
            
            setupFirestoreListeners();
            // Inisialisasi semua modul fitur
            initDashboard();
            initAttendance();
            initGrades();
            initReports();
            initSettings();

            showPage('dashboard-page');
        } else {
            state.resetState();
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
            userProfileContainer.innerHTML = '';
        }
    });
}

// Menyiapkan listener data dari Firestore
function setupFirestoreListeners() {
    if (!state.currentUser) return;
    
    // Hentikan listener lama sebelum membuat yang baru
    state.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    
    const listeners = [];

    const collections = {
        classes: { setter: state.setLocalClasses, orderByField: "name" },
        students: { setter: state.setLocalStudents, orderByField: "name" },
        assessments: { setter: state.setLocalAssessments, orderByField: "date", orderDirection: "desc" },
        assessment_types: { setter: state.setLocalAssessmentTypes, orderByField: "name" },
    };

    for (const [name, config] of Object.entries(collections)) {
        const ref = collection(db, "userData", state.currentUser.uid, name);
        const q = query(ref, orderBy(config.orderByField, config.orderDirection || "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            config.setter(data);
        }, (error) => console.error(`Gagal listen ke ${name}:`, error));
        listeners.push(unsubscribe);
    }
    
    const settingsRef = doc(db, "userData", state.currentUser.uid, "settings", "integration");
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        const settings = docSnap.exists() ? docSnap.data() : {};
        state.setIntegrationSettings(settings);
    }, (error) => {
        console.error("Gagal listen ke pengaturan:", error);
        state.setIntegrationSettings({});
    });
    listeners.push(unsubscribeSettings);

    state.setUnsubscribeListeners(listeners);
}
