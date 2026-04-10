const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // 1h cache

app.use(cors());
app.use(express.json());

// ─── UCI RANKINGS ────────────────────────────────────────────────────────────
async function fetchUCIRankings() {
  const cached = cache.get('rankings');
  if (cached) return cached;

  try {
    const url = 'https://www.uci.org/road/rankings/2024/me/ind';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const riders = [];

    // Try multiple selectors for UCI ranking table
    const rows = $('table tbody tr, .rankingTable tbody tr, [class*="ranking"] tbody tr');
    
    rows.each((i, row) => {
      if (i >= 10) return false;
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const rank = $(cells[0]).text().trim();
      const nameCell = $(cells[1]);
      const name = nameCell.text().trim().replace(/\s+/g, ' ');
      const points = $(cells[cells.length - 1]).text().trim().replace(/[^\d.]/g, '');
      const nationality = $(cells[2]).text().trim() || $(cells[1]).find('span, abbr').attr('title') || '';
      const imgEl = nameCell.find('img');
      const img = imgEl.attr('src') || imgEl.attr('data-src') || '';

      if (name && rank) {
        riders.push({
          rank: parseInt(rank) || i + 1,
          name,
          nationality,
          points: parseFloat(points) || 0,
          photo: img.startsWith('http') ? img : (img ? `https://www.uci.org${img}` : null),
          id: name.toLowerCase().replace(/\s+/g, '-'),
        });
      }
    });

    if (riders.length > 0) {
      cache.set('rankings', riders);
      return riders;
    }
  } catch (e) {
    console.error('UCI scrape error:', e.message);
  }

  // Fallback: ProCyclingStats rankings
  try {
    const { data } = await axios.get('https://www.procyclingstats.com/rankings/me/individual', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    const $ = cheerio.load(data);
    const riders = [];

    $('table tbody tr').each((i, row) => {
      if (i >= 10) return false;
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const rank = $(cells[0]).text().trim();
      const nameCell = $(cells[3]);
      const name = nameCell.find('a').text().trim() || nameCell.text().trim();
      const natCell = $(cells[2]);
      const nationality = natCell.find('span').attr('class')?.replace('flag ', '') || natCell.text().trim();
      const points = $(cells[4]).text().trim().replace(/[^\d.]/g, '');
      const imgUrl = nameCell.find('img').attr('src');

      if (name) {
        riders.push({
          rank: parseInt(rank) || i + 1,
          name,
          nationality: nationality.toUpperCase().slice(0, 3),
          points: parseFloat(points.replace(',', '')) || 0,
          photo: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `https://www.procyclingstats.com${imgUrl}`) : null,
          id: name.toLowerCase().replace(/\s+/g, '-'),
        });
      }
    });

    if (riders.length > 0) {
      cache.set('rankings', riders);
      return riders;
    }
  } catch (e) {
    console.error('PCS scrape error:', e.message);
  }

  return getFallbackRankings();
}

function getFallbackRankings() {
  return [
    { rank: 1, name: 'Tadej Pogačar', nationality: 'SLO', points: 22018, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=TP&backgroundColor=e74c3c', id: 'tadej-pogacar' },
    { rank: 2, name: 'Jonas Vingegaard', nationality: 'DEN', points: 18456, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=JV&backgroundColor=3498db', id: 'jonas-vingegaard' },
    { rank: 3, name: 'Remco Evenepoel', nationality: 'BEL', points: 16234, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=RE&backgroundColor=2ecc71', id: 'remco-evenepoel' },
    { rank: 4, name: 'Primož Roglič', nationality: 'SLO', points: 14567, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=PR&backgroundColor=9b59b6', id: 'primoz-roglic' },
    { rank: 5, name: 'Juan Ayuso', nationality: 'ESP', points: 12890, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=JA&backgroundColor=e67e22', id: 'juan-ayuso' },
    { rank: 6, name: 'Mattias Skjelmose', nationality: 'DEN', points: 11234, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=MS&backgroundColor=1abc9c', id: 'mattias-skjelmose' },
    { rank: 7, name: 'Carlos Rodríguez', nationality: 'ESP', points: 10567, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=CR&backgroundColor=e74c3c', id: 'carlos-rodriguez' },
    { rank: 8, name: 'Egan Bernal', nationality: 'COL', points: 9876, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=EB&backgroundColor=f39c12', id: 'egan-bernal' },
    { rank: 9, name: 'Enric Mas', nationality: 'ESP', points: 9234, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=EM&backgroundColor=2980b9', id: 'enric-mas' },
    { rank: 10, name: 'Adam Yates', nationality: 'GBR', points: 8765, photo: 'https://api.dicebear.com/7.x/initials/svg?seed=AY&backgroundColor=27ae60', id: 'adam-yates' },
  ];
}

// ─── UCI CALENDAR ─────────────────────────────────────────────────────────────
async function fetchUCICalendar() {
  const cached = cache.get('calendar');
  if (cached) return cached;

  const races = [];

  // Try ProCyclingStats calendar
  try {
    const year = new Date().getFullYear();
    const { data } = await axios.get(`https://www.procyclingstats.com/races.php?year=${year}&circuit=1&class=1.UWT&filter=Filter`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });
    const $ = cheerio.load(data);

    $('table tbody tr, ul.list.fs14 li').each((i, row) => {
      if (races.length >= 30) return false;

      const dateText = $(row).find('td:first-child, .date').text().trim();
      const nameEl = $(row).find('td a, .name a');
      const name = nameEl.text().trim();
      const catEl = $(row).find('td:nth-child(3), .cat');
      const cat = catEl.text().trim();
      const countryEl = $(row).find('td:nth-child(2), .country');
      const country = countryEl.find('span.flag').attr('class')?.replace('flag ', '').toUpperCase() || countryEl.text().trim();

      if (!name || !dateText) return;

      // Parse date
      const parsed = parseDateStr(dateText, year);
      if (!parsed) return;

      races.push({
        id: `race-${i}`,
        name,
        date: parsed.toISOString(),
        category: cat || 'UCI WorldTour',
        country: country.toUpperCase().slice(0, 3),
        url: nameEl.attr('href') ? `https://www.procyclingstats.com${nameEl.attr('href')}` : null,
      });
    });
  } catch (e) {
    console.error('Calendar scrape error:', e.message);
  }

  if (races.length > 0) {
    // Sort by date
    races.sort((a, b) => new Date(a.date) - new Date(b.date));
    cache.set('calendar', races);
    return races;
  }

  return getFallbackCalendar();
}

function parseDateStr(str, year) {
  try {
    const clean = str.replace(/\s+/g, ' ').trim();
    // Formats: "01/04", "01.04", "01/04 - 05/04", "1 Apr"
    const match = clean.match(/(\d{1,2})[.\/](\d{1,2})/);
    if (match) {
      const d = new Date(`${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`);
      if (!isNaN(d)) return d;
    }
    const d = new Date(clean);
    if (!isNaN(d)) return d;
    return null;
  } catch { return null; }
}

function getFallbackCalendar() {
  const now = new Date();
  const y = now.getFullYear();
  return [
    { id: '1', name: 'Tour de France', date: new Date(`${y}-07-05`).toISOString(), category: 'UCI WorldTour', country: 'FRA', url: 'https://www.letour.fr' },
    { id: '2', name: 'Giro d\'Italia', date: new Date(`${y}-05-09`).toISOString(), category: 'UCI WorldTour', country: 'ITA', url: null },
    { id: '3', name: 'Vuelta a España', date: new Date(`${y}-08-16`).toISOString(), category: 'UCI WorldTour', country: 'ESP', url: null },
    { id: '4', name: 'Paris-Roubaix', date: new Date(`${y}-04-13`).toISOString(), category: 'UCI WorldTour', country: 'FRA', url: null },
    { id: '5', name: 'Liège-Bastogne-Liège', date: new Date(`${y}-04-27`).toISOString(), category: 'UCI WorldTour', country: 'BEL', url: null },
    { id: '6', name: 'Amstel Gold Race', date: new Date(`${y}-04-13`).toISOString(), category: 'UCI WorldTour', country: 'NED', url: null },
    { id: '7', name: 'La Flèche Wallonne', date: new Date(`${y}-04-23`).toISOString(), category: 'UCI WorldTour', country: 'BEL', url: null },
    { id: '8', name: 'Critérium du Dauphiné', date: new Date(`${y}-06-08`).toISOString(), category: 'UCI WorldTour', country: 'FRA', url: null },
    { id: '9', name: 'Tour de Suisse', date: new Date(`${y}-06-15`).toISOString(), category: 'UCI WorldTour', country: 'CHE', url: null },
    { id: '10', name: 'Il Lombardia', date: new Date(`${y}-10-11`).toISOString(), category: 'UCI WorldTour', country: 'ITA', url: null },
    { id: '11', name: 'Strade Bianche', date: new Date(`${y}-03-08`).toISOString(), category: 'UCI WorldTour', country: 'ITA', url: null },
    { id: '12', name: 'Tirreno-Adriatico', date: new Date(`${y}-03-10`).toISOString(), category: 'UCI WorldTour', country: 'ITA', url: null },
    { id: '13', name: 'Milan-Sanremo', date: new Date(`${y}-03-22`).toISOString(), category: 'UCI WorldTour', country: 'ITA', url: null },
    { id: '14', name: 'Tour des Flandres', date: new Date(`${y}-04-06`).toISOString(), category: 'UCI WorldTour', country: 'BEL', url: null },
    { id: '15', name: 'Eschborn-Frankfurt', date: new Date(`${y}-05-01`).toISOString(), category: 'UCI WorldTour', country: 'GER', url: null },
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ─── RIDER PHOTO FETCH ────────────────────────────────────────────────────────
async function fetchRiderPhoto(name) {
  const cacheKey = `photo-${name}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const url = `https://www.procyclingstats.com/rider/${slug}`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });
    const $ = cheerio.load(data);
    const img = $('div.riderimage img, .rider-photo img, img.photo').first().attr('src');
    if (img) {
      const photoUrl = img.startsWith('http') ? img : `https://www.procyclingstats.com${img}`;
      cache.set(cacheKey, photoUrl, 86400);
      return photoUrl;
    }
  } catch (e) {
    // silent
  }
  return null;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/rankings', async (req, res) => {
  try {
    const riders = await fetchUCIRankings();
    // Try to enhance photos
    const enhanced = await Promise.all(riders.map(async (r) => {
      if (!r.photo || r.photo.includes('dicebear')) {
        const photo = await fetchRiderPhoto(r.name);
        return { ...r, photo: photo || r.photo };
      }
      return r;
    }));
    res.json({ success: true, data: enhanced, source: 'live', updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/calendar', async (req, res) => {
  try {
    const races = await fetchUCICalendar();
    const now = new Date();
    const upcoming = races.filter(r => new Date(r.date) >= now);
    const past = races.filter(r => new Date(r.date) < now);
    res.json({ success: true, data: { upcoming, past, all: races }, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/next-race', async (req, res) => {
  try {
    const races = await fetchUCICalendar();
    const now = new Date();
    const next = races.find(r => new Date(r.date) >= now);
    res.json({ success: true, data: next || null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ ok: true, message: 'Cache cleared' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`UCI API server running on port ${PORT}`));
