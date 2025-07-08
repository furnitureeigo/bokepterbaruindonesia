// scripts/generate-indexnow-key.js
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch'; // Perlu diinstal: npm install node-fetch@2

const PUBLIC_DIR = 'public'; // Folder public Astro Anda
const UUID_API_URL = 'https://www.uuidgenerator.net/api/version1'; 

async function generateIndexNowKeyFile() {
  let API_KEY_NAME = null; // Inisialisasi dengan null

  try {
    // --- Langkah 1: Periksa apakah file kunci sudah ada ---
    // Cari file .txt di PUBLIC_DIR yang namanya terlihat seperti UUID
    const filesInPublic = await fs.readdir(PUBLIC_DIR);
    const existingKeyFile = filesInPublic.find(file => 
      file.endsWith('.txt') && 
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.txt$/.test(file) // Regex untuk UUID v4, tapi juga cocok untuk v1
    );

    if (existingKeyFile) {
      // Jika file ditemukan, baca namanya dan gunakan sebagai API_KEY_NAME
      API_KEY_NAME = existingKeyFile.replace('.txt', '');
      console.log(`File kunci IndexNow sudah ada: ${path.join(PUBLIC_DIR, existingKeyFile)}`);
      console.log(`Menggunakan kunci yang sudah ada: ${API_KEY_NAME}`);
      return; // Hentikan eksekusi skrip karena file sudah ada
    }

    // --- Langkah 2: Jika tidak ada file kunci yang ditemukan, generate UUID baru ---
    console.log('File kunci IndexNow belum ditemukan. Mencoba mengambil UUID v1 dari API...');
    const response = await fetch(UUID_API_URL);

    if (!response.ok) {
      throw new Error(`Gagal mengambil UUID v1: ${response.status} ${response.statusText}`);
    }

    API_KEY_NAME = await response.text(); // UUID dikembalikan sebagai teks biasa
    API_KEY_NAME = API_KEY_NAME.trim(); // Hapus spasi atau newline yang mungkin ada

    // Validasi dasar UUID v1
    if (!API_KEY_NAME || API_KEY_NAME.length !== 36 || !API_KEY_NAME.includes('-')) {
      throw new Error(`UUID v1 yang diterima tidak valid: "${API_KEY_NAME}"`);
    }

    console.log(`Berhasil mendapatkan UUID v1 baru: ${API_KEY_NAME}`);

  } catch (error) {
    console.error(`Kesalahan saat memverifikasi atau mengambil UUID: ${error.message}`);
    console.warn('File kunci IndexNow tidak akan dibuat karena kesalahan.');
    return;
  }

  // --- Langkah 3: Tulis file kunci jika API_KEY_NAME berhasil didapatkan (baru atau lama) ---
  const fileName = `${API_KEY_NAME}.txt`; // Nama file: [UUID].txt
  const filePath = path.join(PUBLIC_DIR, fileName);
  const fileContent = API_KEY_NAME; // Isi file adalah nilai UUID itu sendiri

  try {
    // Pastikan direktori public/ ada (jika belum ada)
    await fs.mkdir(PUBLIC_DIR, { recursive: true });

    // Tulis konten ke dalam file
    await fs.writeFile(filePath, fileContent);
    console.log(`Berhasil membuat file kunci IndexNow baru: ${filePath}`);
    console.log(`Isi file: "${fileContent}"`);

  } catch (error) {
    console.error(`Gagal menulis file kunci IndexNow: ${error}`);
  }
}

generateIndexNowKeyFile();