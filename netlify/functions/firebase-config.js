// File: netlify/functions/firebase-config.js

/**
 * Ini adalah "Fungsi Tanpa Server" (Serverless Function) untuk Netlify.
 * Tugasnya adalah membaca kunci-kunci rahasia Firebase Anda dari 
 * "Environment Variables" yang sudah Anda atur di dasbor Netlify.
 * * Ketika file index.html Anda memanggil '/.netlify/functions/firebase-config', 
 * kode ini akan berjalan di server Netlify, mengambil kunci-kunci tersebut,
 * dan mengirimkannya kembali ke browser dengan aman.
 */
exports.handler = async function(event, context) {
  
  // Ambil nilai dari Environment Variables di Netlify.
  // Pastikan nama variabel (misal: VITE_FIREBASE_API_KEY) sama persis
  // dengan yang Anda masukkan di pengaturan situs Netlify.
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  // Kirim konfigurasi sebagai respons dalam format JSON.
  return {
    statusCode: 200, // Artinya berhasil
    body: JSON.stringify(firebaseConfig),
  };
};

