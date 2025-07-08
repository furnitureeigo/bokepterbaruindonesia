// scripts/notify-indexnow.js
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { url } from '../src/utils/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}
// --- Akhir Fungsi slugify ---

// --- Konfigurasi Anda - Sekarang ambil dari variabel lingkungan ---
const YOUR_DOMAIN = url;
const PUBLIC_DIR = 'public'; // Must match the PUBLIC_DIR in generate-indexnow-key.js
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
// --- Akhir Konfigurasi ---

if (!YOUR_DOMAIN) {
  console.error("Error: PUBLIC_SITE_URL is not defined in environment variables for IndexNow script. Please check your .env file.");
  process.exit(1);
}

// Path langsung ke file videos.json Anda
const VIDEOS_JSON_PATH = path.resolve(__dirname, '../src/data/videos.json');
// Path ke cache URL terakhir yang dikirim (akan disimpan di root proyek)
const LAST_SENT_URLS_CACHE = path.resolve(__dirname, '../.indexnow_cache.json');

async function getIndexNowKey() {
  try {
    const filesInPublic = await fs.readdir(PUBLIC_DIR);
    const existingKeyFile = filesInPublic.find(file =>
      file.endsWith('.txt') &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.txt$/.test(file)
    );

    if (existingKeyFile) {
      const apiKeyName = existingKeyFile.replace('.txt', '');
      console.log(`Found IndexNow key file: ${existingKeyFile}`);
      return apiKeyName;
    } else {
      console.error('IndexNow key file not found in public directory. Please run generate-indexnow-key.js first.');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error reading public directory for IndexNow key: ${error.message}`);
    process.exit(1);
  }
}

async function getAllVideoUrls() {
  try {
    const fileContent = await fs.readFile(VIDEOS_JSON_PATH, 'utf-8');
    const allVideos = JSON.parse(fileContent);

    if (!Array.isArray(allVideos)) {
      console.error('Data videos.json tidak dalam format array yang diharapkan.');
      return [];
    }

    return allVideos.map(video => {
      const slug = slugify(video.title || 'untitled-video');
      return `${YOUR_DOMAIN}/${slug}-${video.id}/`;
    });
  } catch (error) {
    console.error('Gagal memuat atau memproses videos.json:', error);
    return [];
  }
}

async function sendToIndexNow(urlsToSend, API_KEY_NAME) {
  if (urlsToSend.length === 0) {
    console.log('Tidak ada URL baru atau yang diperbarui untuk dikirim ke IndexNow.');
    return;
  }

  const API_KEY_LOCATION = `${YOUR_DOMAIN}/${API_KEY_NAME}.txt`;

  const chunkSize = 10000;
  for (let i = 0; i < urlsToSend.length; i += chunkSize) {
    const chunk = urlsToSend.slice(i, i + chunkSize);

    const payload = {
      host: new URL(YOUR_DOMAIN).hostname,
      key: API_KEY_NAME,
      keyLocation: API_KEY_LOCATION,
      urlList: chunk,
    };

    try {
      console.log(`Mengirim ${chunk.length} URL ke IndexNow (chunk ${Math.floor(i / chunkSize) + 1})...`);
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Berhasil mengirim chunk URL ke IndexNow. Status: ${response.status}`);
      } else {
        console.error(`Gagal mengirim chunk URL ke IndexNow: ${response.status} - ${response.statusText}`);
        const errorBody = await response.text();
        console.error('Response body:', errorBody);
      }
    } catch (error) {
      console.error('Terjadi kesalahan saat mengirim ke IndexNow:', error);
    }
  }
}

async function main() {
  const API_KEY_NAME = await getIndexNowKey(); // Get the API key before proceeding
  const currentUrls = await getAllVideoUrls();
  let lastSentUrls = [];

  try {
    const cacheContent = await fs.readFile(LAST_SENT_URLS_CACHE, 'utf-8');
    lastSentUrls = JSON.parse(cacheContent);
  } catch (error) {
    console.log('Cache IndexNow tidak ditemukan atau rusak, akan mengirim semua URL baru.');
  }

  const urlsToSubmit = currentUrls.filter(url => !lastSentUrls.includes(url));

  await sendToIndexNow(urlsToSubmit, API_KEY_NAME); // Pass API_KEY_NAME to sendToIndexNow

  try {
    await fs.writeFile(LAST_SENT_URLS_CACHE, JSON.stringify(currentUrls), 'utf-8');
    console.log('Cache IndexNow berhasil diperbarui.');
  } catch (error) {
    console.error('Gagal memperbarui cache IndexNow:', error);
  }
}

main();
