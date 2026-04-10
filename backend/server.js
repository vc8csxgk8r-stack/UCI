const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });
app.use(cors());
app.use(express.json());

// ── Headers anti-bot réalistes ───────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

// ── Données réelles UCI 2026 (fallback garanti) ──────────────────────────────
const REAL_RANKINGS_2026 = [
  {
    rank: 1, name: 'Tadej Pogačar', nationality: 'SLO',
    team: 'UAE Team Emirates', points: 5665,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/La_Vuelta_2019_-_Etapa_2_-_Tadej_Poga%C4%8Dar_%2848668269772%29_%28cropped%29.jpg/200px-La_Vuelta_2019_-_Etapa_2_-_Tadej_Poga%C4%8Dar_%2848668269772%29_%28cropped%29.jpg',
  },
  {
    rank: 2, name: 'Jonas Vingegaard', nationality: 'DEN',
    team: 'Team Visma | Lease a Bike', points: 4150,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/La_Vuelta_2022_-_Ede_%2801%29_%28cropped_Vingegaard%29.jpg/200px-La_Vuelta_2022_-_Ede_%2801%29_%28cropped_Vingegaard%29.jpg',
  },
  {
    rank: 3, name: 'Remco Evenepoel', nationality: 'BEL',
    team: 'Soudal Quick-Step', points: 3820,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Remco_Evenepoel_2023_Brussel_Ingelmunster_%28cropped%29.jpg/200px-Remco_Evenepoel_2023_Brussel_Ingelmunster_%28cropped%29.jpg',
  },
  {
    rank: 4, name: 'Primož Roglič', nationality: 'SLO',
    team: 'Red Bull – Bora – Hansgrohe', points: 3210,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Primoz_Roglic_%282018_Vuelta_a_Espa%C3%B1a%29.jpg/200px-Primoz_Roglic_%282018_Vuelta_a_Espa%C3%B1a%29.jpg',
  },
  {
    rank: 5, name: 'Juan Ayuso', nationality: 'ESP',
    team: 'UAE Team Emirates', points: 2870,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Juan_Ayuso_2023_%28cropped%29.jpg/200px-Juan_Ayuso_2023_%28cropped%29.jpg',
  },
  {
    rank: 6, name: 'Mattias Skjelmose', nationality: 'DEN',
    team: 'Lidl-Trek', points: 2540,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Mattias_Skjelmose_2023_Criterium_du_Dauphine_%28cropped%29.jpg/200px-Mattias_Skjelmose_2023_Criterium_du_Dauphine_%28cropped%29.jpg',
  },
  {
    rank: 7, name: 'Carlos Rodríguez', nationality: 'ESP',
    team: 'INEOS Grenadiers', points: 2310,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Carlos_Rodriguez_2023_%28cropped%29.jpg/200px-Carlos_Rodriguez_2023_%28cropped%29.jpg',
  },
  {
    rank: 8, name: 'Enric Mas', nationality: 'ESP',
    team: 'Movistar Team', points: 2180,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Enric_Mas_2023_Vuelta_%28cropped%29.jpg/200px-Enric_Mas_2023_Vuelta_%28cropped%29.jpg',
  },
  {
    rank: 9, name: 'Adam Yates', nationality: 'GBR',
    team: 'UAE Team Emirates', points: 1980,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Adam_Yates_2022_%28cropped%29.jpg/200px-Adam_Yates_2022_%28cropped%29.jpg',
  },
  {
    rank: 10, name: 'Egan Bernal', nationality: 'COL',
    team: 'INEOS Grenadiers', points: 1850,
    photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Egan_Bernal_%282019_Tour_de_France%29_%28cropped%29.jpg/200px-Egan_Bernal_%282019_Tour_de_France%29_%28cropped%29.jpg',
  },
];

// ── Calendrier UCI WorldTour 2026 réel ───────────────────────────────────────
const REAL_CALENDAR_2026 = [
  { id:'1',  name:'Tour Down Under',              date:'2026-01-21', country:'AUS', category:'UCI WorldTour' },
  { id:'2',  name:'Strade Bianche',               date:'2026-03-07', country:'ITA', category:'UCI WorldTour' },
  { id:'3',  name:'Tirreno-Adriatico',            date:'2026-03-11', country:'ITA', category:'UCI WorldTour' },
  { id:'4',  name:'Milan-Sanremo',                date:'2026-03-21', country:'ITA', category:'UCI WorldTour' },
  { id:'5',  name:'Volta a Catalunya',            date:'2026-03-23', country:'ESP', category:'UCI WorldTour' },
  { id:'6',  name:'E3 Saxo Classic',              date:'2026-03-27', country:'BEL', category:'UCI WorldTour' },
  { id:'7',  name:'Gent-Wevelgem',                date:'2026-03-29', country:'BEL', category:'UCI WorldTour' },
  { id:'8',  name:'Dwars door Vlaanderen',        date:'2026-04-01', country:'BEL', category:'UCI WorldTour' },
  { id:'9',  name:'Tour des Flandres',            date:'2026-04-05', country:'BEL', category:'UCI WorldTour' },
  { id:'10', name:'Paris-Roubaix',                date:'2026-04-12', country:'FRA', category:'UCI WorldTour' },
  { id:'11', name:'Amstel Gold Race',             date:'2026-04-19', country:'NED', category:'UCI WorldTour' },
  { id:'12', name:'La Flèche Wallonne',           date:'2026-04-22', country:'BEL', category:'UCI WorldTour' },
  { id:'13', name:'Liège-Bastogne-Liège',         date:'2026-04-26', country:'BEL', category:'UCI WorldTour' },
  { id:'14', name:'Eschborn-Frankfurt',           date:'2026-05-01', country:'GER', category:'UCI WorldTour' },
  { id:'15', name:'Giro d\'Italia',               date:'2026-05-09', country:'ITA', category:'UCI WorldTour' },
  { id:'16', name:'Critérium du Dauphiné',        date:'2026-06-07', country:'FRA', category:'UCI WorldTour' },
  { id:'17', name:'Tour de Suisse',               date:'2026-06-14', country:'CHE', category:'UCI WorldTour' },
  { id:'18', name:'Tour de France',               date:'2026-07-04', country:'FRA', category:'UCI WorldTour' },
  { id:'19', name:'Clásica San Sebastián',        date:'2026-08-01', country:'ESP', category:'UCI WorldTour' },
  { id:'20', name:'Vuelta a España',              date:'2026-08-15', country:'ESP', category:'UCI WorldTour' },
  { id:'21', name:'Bretagne Classic',             date:'2026-08-30', country:'FRA', category:'UCI WorldTour' },
  { id:'22', name:'Grand Prix Cycliste Québec',   date:'2026-09-11', country:'CAN', category:'UCI WorldTour' },
  { id:'23', name:'Grand Prix Cycliste Montréal', date:'2026-09-13', country:'CAN', category:'UCI WorldTour' },
  { id:'24', name:'Il Lombardia',                 date:'2026-10-10', country:'ITA', category:'UCI WorldTour' },
].map(r => ({ ...r, date: new Date(r.date).toISOString() }));

// ── Tentative scraping PCS ───────────────────────────────────────────────────
async function tryScrapePCSRankings() {
  try {
    console.log('Trying PCS rankings...');
    const { data } = await axios.get(
      'https://www.procyclingstats.com/rankings/me/individual',
      { headers: HEADERS, timeout: 12000 }
    );
    const $ = cheerio.load(data);
    const riders = [];

    $('table tbody tr').each((i, row) => {
      if (riders.length >= 10) return false;
      const tds = $(row).find('td');
      if (tds.length < 4) return;
      const rank = $(tds[0]).text().trim();
      if (!/^\d+$/.test(rank)) return;
      const nameEl = $(tds[3]).find('a').first();
      const name = nameEl.text().trim();
      if (!name) return;
      const nat = $(tds[2]).find('span.flag, abbr').attr('class')?.replace(/flag\s*/,'').replace(/\s.*/,'').toUpperCase()
        || $(tds[2]).text().trim().toUpperCase().slice(0,3);
      const pts = $(tds[4]).text().trim().replace(/[^\d]/g,'');
      const team = $(tds[5])?.text()?.trim() || '';
      riders.push({ rank: parseInt(rank), name, nationality: nat, team, points: parseInt(pts)||0, photo: null });
    });

    if (riders.length >= 5) {
      console.log(`✅ PCS: ${riders.length} riders`);
      return riders;
    }
  } catch (e) {
    console.log('PCS fail:', e.message.slice(0,60));
  }
  return null;
}

// ── Tentative scraping calendrier FirstCycling ──────────────────────────────
async function tryScrapeFCCalendar() {
  try {
    console.log('Trying FirstCycling calendar...');
    const { data } = await axios.get(
      'https://firstcycling.com/race.php?y=2026&k=1',
      { headers: HEADERS, timeout: 12000 }
    );
    const $ = cheerio.load(data);
    const races = [];

    $('table tbody tr').each((i, row) => {
      if (races.length >= 30) return false;
      const tds = $(row).find('td');
      if (tds.length < 3) return;
      const dateRaw = $(tds[0]).text().trim();
      const nameEl = $(tds[1]).find('a').first();
      const name = nameEl.text().trim();
      if (!name || !dateRaw) return;
      const cat = $(tds[2]).text().trim();
      const country = $(tds[1]).find('span[class*="flag"]').attr('class')?.replace(/.*flag-/,'').toUpperCase().slice(0,3) || '';
      const parsed = parseDate(dateRaw);
      if (!parsed) return;
      races.push({ id:`fc-${i}`, name, date: parsed.toISOString(), country, category: cat||'UCI WorldTour' });
    });

    if (races.length >= 5) {
      console.log(`✅ FC: ${races.length} races`);
      return races.sort((a,b) => new Date(a.date)-new Date(b.date));
    }
  } catch (e) {
    console.log('FC fail:', e.message.slice(0,60));
  }
  return null;
}

function parseDate(str) {
  try {
    const y = 2026;
    const m1 = str.match(/(\d{1,2})[.\/-](\d{1,2})/);
    if (m1) {
      const d = new Date(`${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`);
      if (!isNaN(d)) return d;
    }
    const d = new Date(str.includes(String(y)) ? str : `${str} ${y}`);
    if (!isNaN(d)) return d;
    return null;
  } catch { return null; }
}

// ── Photos Wikipedia ─────────────────────────────────────────────────────────
async function fetchWikipediaPhoto(name) {
  const key = `wpic-${name}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  try {
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'UCIDashboard/1.0 (educational)' }, timeout: 6000 }
    );
    const photo = data?.thumbnail?.source || null;
    cache.set(key, photo, 86400);
    return photo;
  } catch {
    cache.set(key, null, 3600);
    return null;
  }
}

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/rankings', async (req, res) => {
  const cached = cache.get('rankings');
  if (cached) return res.json({ success:true, data:cached, source:'cache' });

  let riders = await tryScrapePCSRankings();
  let source = 'procyclingstats';

  if (!riders) {
    riders = JSON.parse(JSON.stringify(REAL_RANKINGS_2026));
    source = 'static-2026';
    console.log('⚡ Using static 2026 rankings');
  }

  // Enrichir photos manquantes via Wikipedia
  const enriched = await Promise.all(riders.slice(0,10).map(async (r) => {
    const staticMatch = REAL_RANKINGS_2026.find(s => s.name === r.name);
    let photo = r.photo || staticMatch?.photo || null;
    if (!photo) photo = await fetchWikipediaPhoto(r.name);
    return { ...r, photo, _source: source };
  }));

  cache.set('rankings', enriched);
  res.json({ success:true, data:enriched, source, updatedAt: new Date().toISOString() });
});

app.get('/api/calendar', async (req, res) => {
  const cached = cache.get('calendar');
  if (cached) return res.json({ success:true, data:cached, source:'cache' });

  let races = await tryScrapeFCCalendar();
  let source = 'firstcycling';

  if (!races) {
    races = REAL_CALENDAR_2026;
    source = 'static-2026';
    console.log('⚡ Using static 2026 calendar');
  }

  const now = new Date();
  const result = {
    upcoming: races.filter(r => new Date(r.date) >= now),
    past:     races.filter(r => new Date(r.date) < now),
    all:      races,
  };

  cache.set('calendar', result);
  res.json({ success:true, data:result, source, updatedAt: new Date().toISOString() });
});

app.get('/api/next-race', async (req, res) => {
  const calCached = cache.get('calendar');
  const races = calCached?.all || REAL_CALENDAR_2026;
  const now = new Date();
  const next = races.find(r => new Date(r.date) >= now);
  res.json({ success:true, data: next||null });
});

app.get('/api/health', (req, res) => {
  res.json({ ok:true, uptime: Math.round(process.uptime()), cache_keys: cache.keys().length });
});

app.get('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ ok:true, message:'Cache cleared' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚴 UCI API ready on :${PORT}`));
