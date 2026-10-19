/* =========================================================
 * My Little Study — script.js
 * Modules: Storage / Calendar / Tasks / Spotify / News /
 *          Pixel sprites / Food marquee / Widgets
 * ========================================================= */
'use strict';

/* ---------------------------------------------------------
 * 1. Config
 * --------------------------------------------------------- */
const STORAGE_KEY = 'my-little-study-v1';

/** Five list categories; colors map to CSS variables in style.css */
const CATEGORIES = [
  { key: 'sport',   name: '🏃 Sport',   color: 'var(--c-sport)' },
  { key: 'reading', name: '📖 Reading', color: 'var(--c-reading)' },
  { key: 'study',   name: '🎓 Study',   color: 'var(--c-study)' },
  { key: 'english', name: '🔤 English', color: 'var(--c-english)' },
  { key: 'other',   name: '📌 Other',   color: 'var(--c-other)' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];        // indexed by Date.getDay()
const WEEKDAY_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

/** Food photos shown in the marquee (files in /assets) */
const MENU = ['pancake', 'ramen', 'sandwich', 'yogurt', 'pasta', 'katsudon', 'steak'];

/** Default data — weekly routines use `weekdays` (getDay(): 0 = Sunday) */
const DEFAULT_STATE = {
  events: [
    { id: 1, title: 'Gym',          cat: 'sport', time: '19:00', weekdays: [1, 3, 5] },
    { id: 2, title: 'Swimming',     cat: 'sport', time: '18:00', weekdays: [2] },
    { id: 3, title: 'Badminton',    cat: 'sport', time: '14:00', weekdays: [6] },
    { id: 4, title: 'Lab Meeting',  cat: 'study', time: '10:00', weekdays: [1] },
    { id: 5, title: 'Part-time job', cat: 'other', time: '18:00', weekdays: [4] },
  ],
  tasks: [
    { id: 11, cat: 'sport',   title: 'Squat 80 kg',                     done: false },
    { id: 12, cat: 'sport',   title: 'Swim 1000 m freestyle non-stop',  done: false },
    { id: 13, cat: 'reading', title: 'Finish "Atomic Habits"',           done: false },
    { id: 14, cat: 'study',   title: 'Write the literature review',     done: false },
    { id: 15, cat: 'study',   title: 'Run experiment set #2',           done: false },
    { id: 16, cat: 'english', title: 'TOEIC listening Part 3 practice', done: false },
    { id: 17, cat: 'english', title: 'Learn 50 TOEIC words',            done: false },
    { id: 18, cat: 'other',   title: 'Tidy up my room',                 done: false },
  ],
  activeTab: 'sport',
  spotifyUrl: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn', // Lofi Beats
  newsSource: 'bbc',
  memo: '',
  streak: { count: 0, last: null },
};

/* ---------------------------------------------------------
 * 2. State & Storage
 * --------------------------------------------------------- */
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { ...structuredClone(DEFAULT_STATE), ...saved };
  } catch (_) { /* private mode or corrupted data → fall back to defaults */ }
  return structuredClone(DEFAULT_STATE);
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}
const uid = () => Date.now() + Math.floor(Math.random() * 1000);

/* ---------------------------------------------------------
 * 3. Utils
 * --------------------------------------------------------- */
const $ = sel => document.querySelector(sel);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Create an element and fill it with textContent (prevents XSS) */
function el(tag, { cls, text, attrs } = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ---------------------------------------------------------
 * 4. Calendar
 * --------------------------------------------------------- */
const cal = {
  view: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // month being shown
  selected: ymd(new Date()),
};

/** All events on a given day (one-off + weekly), sorted by time */
function eventsOn(dateStr) {
  const dow = parseYmd(dateStr).getDay();
  return state.events
    .filter(e => (e.weekdays ? e.weekdays.includes(dow) : e.date === dateStr))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

function renderCalendar() {
  const grid = $('#calendarGrid');
  grid.innerHTML = '';
  const y = cal.view.getFullYear(), m = cal.view.getMonth();
  $('#monthLabel').textContent = `${MONTHS[m]} ${y}`;

  // Weeks start on Monday
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - offset);
  const todayStr = ymd(new Date());

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ds = ymd(d);
    const cell = el('button', { cls: 'day', attrs: { type: 'button', 'aria-label': ds } });
    if (d.getMonth() !== m) cell.classList.add('other-month');
    if (ds === todayStr) cell.classList.add('today');
    if (ds === cal.selected) cell.classList.add('selected');

    cell.appendChild(el('span', { cls: 'num', text: d.getDate() }));
    const evs = eventsOn(ds);
    evs.slice(0, 3).forEach(e => {
      const chip = el('span', { cls: 'chip', text: `${e.time || ''} ${e.title}`.trim() });
      chip.style.background = CAT[e.cat].color;
      cell.appendChild(chip);
    });
    if (evs.length > 3) cell.appendChild(el('span', { cls: 'more', text: `+${evs.length - 3}` }));

    cell.onclick = () => { cal.selected = ds; renderCalendar(); };
    cell.ondblclick = () => openEventDialog({ date: ds });
    grid.appendChild(cell);
  }
  renderAgenda();
}

function renderAgenda() {
  const d = parseYmd(cal.selected);
  $('#agendaTitle').textContent = `${WEEKDAY_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const list = $('#agendaList');
  list.innerHTML = '';
  const evs = eventsOn(cal.selected);
  if (!evs.length) {
    list.appendChild(el('li', { cls: 'muted', text: 'Nothing planned — double-click a day to add an event.' }));
    return;
  }
  evs.forEach(e => {
    const li = el('li');
    li.appendChild(el('span', { cls: 'time', text: e.time || '—' }));
    li.appendChild(el('span', { cls: 'grow', text: e.title }));
    const tag = el('span', { cls: 'tag', text: e.weekdays ? 'weekly' : CAT[e.cat].name });
    tag.style.background = CAT[e.cat].color;
    li.appendChild(tag);
    const del = el('button', { cls: 'del', text: '✕', attrs: { title: 'Delete', type: 'button' } });
    del.onclick = () => {
      const msg = e.weekdays
        ? `"${e.title}" repeats weekly. Delete it from every week?`
        : `Delete "${e.title}"?`;
      if (!confirm(msg)) return;
      state.events = state.events.filter(x => x.id !== e.id);
      saveState(); renderCalendar();
    };
    li.appendChild(del);
    list.appendChild(li);
  });
}

/* ---------- Event dialog ---------- */
function setupEventDialog() {
  const catSel = $('#evCat');
  CATEGORIES.forEach(c => catSel.add(new Option(c.name, c.key)));

  // Weekday checkboxes, Monday → Sunday
  const field = $('#weekdayField');
  [1, 2, 3, 4, 5, 6, 0].forEach(dow => {
    const lbl = el('label');
    const cb = el('input', { attrs: { type: 'checkbox', value: dow } });
    lbl.append(cb, WEEKDAY_SHORT[dow]);
    field.appendChild(lbl);
  });

  $('#evRepeat').onchange = e => {
    $('#weekdayField').hidden = !e.target.checked;
    $('#dateField').hidden = e.target.checked;
  };

  $('#eventDialog').addEventListener('close', () => {
    if ($('#eventDialog').returnValue !== 'ok') return;
    const title = $('#evTitle').value.trim();
    if (!title) return;
    const ev = { id: uid(), title, cat: catSel.value, time: $('#evTime').value };

    if ($('#evRepeat').checked) {
      ev.weekdays = [...field.querySelectorAll('input:checked')].map(i => Number(i.value));
      if (!ev.weekdays.length) return toast('⚠️ Pick at least one weekday');
    } else {
      ev.date = $('#evDate').value;
      if (!ev.date) return toast('⚠️ Please choose a date');
      cal.selected = ev.date;
      const d = parseYmd(ev.date);
      cal.view = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    state.events.push(ev);
    saveState(); renderCalendar();
    toast(`✅ Added "${title}"`);
  });
}

/** Open the dialog, optionally pre-filled (used when sending a list item to the calendar) */
function openEventDialog({ title = '', cat = state.activeTab, date = cal.selected } = {}) {
  $('#evTitle').value = title;
  $('#evCat').value = cat;
  $('#evDate').value = date;
  $('#evRepeat').checked = false;
  $('#weekdayField').hidden = true;
  $('#dateField').hidden = false;
  $('#weekdayField').querySelectorAll('input').forEach(i => (i.checked = false));
  $('#eventDialog').showModal();
  $('#evTitle').focus();
}

/* ---------------------------------------------------------
 * 5. Tabbed task lists
 * --------------------------------------------------------- */
function renderTabs() {
  const nav = $('#tabs');
  nav.innerHTML = '';
  CATEGORIES.forEach(c => {
    const left = state.tasks.filter(t => t.cat === c.key && !t.done).length;
    const active = state.activeTab === c.key;
    const b = el('button', { cls: 'tab', text: c.name,
      attrs: { role: 'tab', type: 'button', 'aria-selected': active } });
    b.appendChild(el('span', { cls: 'count', text: left }));
    if (active) b.style.background = c.color;
    b.onclick = () => { state.activeTab = c.key; saveState(); renderTasks(); };
    nav.appendChild(b);
  });
}

function renderTasks() {
  renderTabs();
  const list = $('#taskList');
  list.innerHTML = '';
  const items = state.tasks
    .filter(t => t.cat === state.activeTab)
    .sort((a, b) => a.done - b.done); // unfinished first

  if (!items.length) {
    list.appendChild(el('li', { cls: 'muted', text: 'This list is empty — add a goal!' }));
    return;
  }
  items.forEach(t => {
    const li = el('li', { cls: t.done ? 'done' : '' });
    const cb = el('input', { attrs: { type: 'checkbox', 'aria-label': `Mark "${t.title}" as done` } });
    cb.checked = t.done;
    cb.onchange = () => { t.done = cb.checked; saveState(); renderTasks(); };

    const toCal = el('button', { cls: 'del', text: '📅', attrs: { title: 'Add to calendar', type: 'button' } });
    toCal.onclick = () => openEventDialog({ title: t.title, cat: t.cat });

    const del = el('button', { cls: 'del', text: '✕', attrs: { title: 'Delete', type: 'button' } });
    del.onclick = () => { state.tasks = state.tasks.filter(x => x.id !== t.id); saveState(); renderTasks(); };

    li.append(cb, el('span', { cls: 'grow', text: t.title }), toCal, del);
    list.appendChild(li);
  });
}

function setupTasks() {
  $('#taskForm').onsubmit = e => {
    e.preventDefault();
    const input = $('#taskInput');
    const title = input.value.trim();
    if (!title) return;
    state.tasks.push({ id: uid(), cat: state.activeTab, title, done: false });
    input.value = '';
    saveState(); renderTasks();
  };
}

/* ---------------------------------------------------------
 * 6. Spotify player (official embed)
 * --------------------------------------------------------- */
/** Turn a share link into an embed URL; returns null if invalid */
function toSpotifyEmbed(url) {
  const m = String(url).match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/
  );
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null;
}

function setupSpotify() {
  const frame = $('#spotifyFrame');
  const load = url => {
    const embed = toSpotifyEmbed(url);
    if (!embed) return toast('⚠️ Please paste an open.spotify.com share link');
    frame.src = embed;
    state.spotifyUrl = url;
    saveState();
  };
  load(state.spotifyUrl);
  $('#spotifyForm').onsubmit = e => {
    e.preventDefault();
    load($('#spotifyUrl').value.trim());
    $('#spotifyUrl').value = '';
  };
}

/* ---------------------------------------------------------
 * 7. World news
 * GitHub Pages is static and can't read RSS directly (CORS),
 * so feeds go through the free rss2json service; cached for 30 min.
 * --------------------------------------------------------- */
const NEWS_SOURCES = {
  bbc:      { name: 'BBC World',          rss: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  npr:      { name: 'NPR World',          rss: 'https://feeds.npr.org/1004/rss.xml' },
  guardian: { name: 'The Guardian World', rss: 'https://www.theguardian.com/world/rss' },
};
const NEWS_CACHE_MS = 30 * 60 * 1000;
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

function timeAgo(dateStr) {
  const t = new Date(dateStr.replace(' ', 'T') + 'Z'); // rss2json returns UTC
  const mins = Math.round((Date.now() - t) / 60000);
  if (isNaN(mins)) return '';
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

const isHttpUrl = u => /^https?:\/\//i.test(u || '');

async function loadNews(force = false) {
  const key = state.newsSource;
  const src = NEWS_SOURCES[key];
  const list = $('#newsList');
  const cacheKey = `news-cache-${key}`;

  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(cacheKey));
      if (c && Date.now() - c.at < NEWS_CACHE_MS) return renderNews(c.items, src, c.at);
    } catch (_) {}
  }

  list.innerHTML = '';
  for (let i = 0; i < 5; i++) list.appendChild(el('li', { cls: 'skeleton' }));

  try {
    const res = await fetch(RSS2JSON + encodeURIComponent(src.rss));
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'feed error');
    const items = data.items.slice(0, 12).map(it => ({
      title: it.title,
      link: it.link,
      date: it.pubDate,
      thumb: it.thumbnail || it.enclosure?.link || '',
    }));
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), items })); } catch (_) {}
    renderNews(items, src, Date.now());
  } catch (err) {
    list.innerHTML = '';
    list.appendChild(el('li', { cls: 'muted', text: '😵 Couldn\'t load the news. Check your connection and press ⟳ to try again.' }));
    $('#newsMeta').textContent = '';
    console.error(err);
  }
}

function renderNews(items, src, at) {
  const list = $('#newsList');
  list.innerHTML = '';
  items.forEach(n => {
    if (!isHttpUrl(n.link)) return;
    const li = el('li');
    if (isHttpUrl(n.thumb)) li.appendChild(el('img', { attrs: { src: n.thumb, alt: '', loading: 'lazy' } }));
    const box = el('div');
    box.appendChild(el('a', { text: n.title, attrs: { href: n.link, target: '_blank', rel: 'noopener noreferrer' } }));
    box.appendChild(el('div', { cls: 'meta', text: `${src.name} · ${timeAgo(n.date)}` }));
    li.appendChild(box);
    list.appendChild(li);
  });
  const t = new Date(at);
  $('#newsMeta').textContent = `Updated ${pad(t.getHours())}:${pad(t.getMinutes())} · source: ${src.name} RSS`;
}

function setupNews() {
  // Saved choice may point to a removed source → fall back to BBC
  if (!NEWS_SOURCES[state.newsSource]) state.newsSource = 'bbc';
  const sel = $('#newsSource');
  Object.entries(NEWS_SOURCES).forEach(([k, s]) => sel.add(new Option(s.name, k)));
  sel.value = state.newsSource;
  sel.onchange = () => { state.newsSource = sel.value; saveState(); loadNews(); };
  $('#newsRefresh').onclick = () => loadNews(true);
  loadNews();
}

/* ---------------------------------------------------------
 * 8. Pixel-art sprites
 * Each sprite = character grid + palette; '.' is transparent.
 * Drawn as SVG <rect>s with shape-rendering: crispEdges.
 * --------------------------------------------------------- */
const PALETTE = {
  k: '#3b2414', w: '#fff3e2', W: '#f5ecdf', p: '#d8c3a5', l: '#b9a68c',
  c: '#7a3e12', C: '#c06a24', y: '#b07a1a', Y: '#f2c96b',
  r: '#9e1f2a', R: '#e2474f', g: '#5e8a3a', S: '#e9c27e',
  B: '#5a3215', d: '#7a4a24', D: '#c98a4b', b: '#6b3f1d',
  P: '#f0a6b8', s: '#7fc7d9', o: '#a8611f', O: '#e8a552', h: '#c47f3a',
};

const SPRITES = {
  pudding:   ['....cccc....', '...cCCCCc...', '..yYYYYYYy..', '..yYYYYYYy..', '.yYYYYYYYYy.',
              '.yYYYYYYYYy.', 'yYYYYYYYYYYy', 'wwwwwwwwwwww', '.wwwwwwwwww.'],
  coffee:    ['kkkkkkkkk...', 'kBBBBBBBk...', 'kWWWWWWWkkk.', 'kWWWWWWWk.k.', 'kWWWWWWWk.k.',
              'kWWWWWWWkkk.', '.kWWWWWk....', '..kkkkk.....', 'pppppppppp..'],
  cake:      ['....rr..g...', '...rRRrg....', '..rRRRRr....', 'wwwwwwwwwwww', 'SSSSSSSSSSSS',
              'SSSSSSSSSSSS', 'wwrwwrwwrwww', 'SSSSSSSSSSSS', 'SSSSSSSSSSSS', 'pppppppppppp'],
  donut:     ['...dddddd...', '.ddPPsPPPdd.', 'dPPPPPPPsPPd', 'dPsPd..dPPPd', 'dPPPd..dPsPd',
              'dDPPPddPPPDd', '.dDDDDDDDDd.', '...dddddd...'],
  pancake:   ['....YYYY....', '..bbbbbbbb..', '.OOOOOOOOOO.', '.hhhhhhhhhh.', '.OOOOOOOOOO.',
              '.hhhhhhhhhh.', '.OOOOOOOOOO.', 'pppppppppppp'],
  croissant: ['....oooo....', '..oOOoOOoo..', '.oOOoOOoOOo.', 'oOOoOOoOOoOo', 'oOOoOOoOOoOo',
              '.ooOOoOOoo..', '...oooooo...'],
  book:      ['.kkkk..kkkk.', 'kWWWWkkWWWWk', 'kWllWkkWllWk', 'kWWWWkkWWWWk', 'kWllWkkWllWk',
              'kWWWWkkWWWWk', 'kkkkkkkkkkkk', '..bbbbbbbb..'],
};

function spriteSVG(name, scale = 5) {
  const grid = SPRITES[name];
  if (!grid) return null;
  const rows = grid.length, cols = grid[0].length;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${cols} ${rows}`);
  svg.setAttribute('width', cols * scale);
  svg.setAttribute('height', rows * scale);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = PALETTE[ch];
      if (!fill) return;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', 1); rect.setAttribute('height', 1);
      rect.setAttribute('fill', fill);
      svg.appendChild(rect);
    });
  });
  return svg;
}

function renderSprites() {
  document.querySelectorAll('[data-sprite]').forEach((node, i) => {
    const svg = spriteSVG(node.dataset.sprite, Number(node.dataset.scale) || 5);
    if (!svg) return;
    node.replaceChildren(svg);
    node.style.setProperty('--d', `${(i % 6) * 0.35}s`); // stagger the bobbing
  });
}

/* ---------------------------------------------------------
 * 9. Food marquee — list rendered twice so the loop is seamless
 * --------------------------------------------------------- */
function renderMenu() {
  const track = $('#menuTrack');
  if (!track) return; // marquee removed from the page
  [...MENU, ...MENU].forEach(name => {
    const plate = el('div', { cls: 'plate' });
    plate.appendChild(el('img', { attrs: { src: `assets/food-${name}.jpg`, alt: name, loading: 'lazy' } }));
    track.appendChild(plate);
  });
}

/* ---------------------------------------------------------
 * 10. Widgets: clock, quotes, memo, reading streak
 * --------------------------------------------------------- */
function setupClock() {
  const tick = () => {
    const n = new Date();
    $('#clockH').textContent = pad(n.getHours());
    $('#clockM').textContent = pad(n.getMinutes());
    $('#clockS').textContent = pad(n.getSeconds());
    $('#clockDate').textContent = `${WEEKDAY_LONG[n.getDay()]} · ${MONTHS[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}`;
  };
  tick();
  setInterval(tick, 1000);
}

/** Public-domain quotes, rotated */
const QUOTES = [
  { t: 'Festina lente.', by: 'Augustus — make haste slowly' },
  { t: 'The roots of education are bitter, but the fruit is sweet.', by: 'Aristotle' },
  { t: 'It is not that we have a short time to live, but that we waste much of it.', by: 'Seneca' },
  { t: 'Knowledge is power.', by: 'Francis Bacon' },
  { t: 'Well begun is half done.', by: 'Aristotle' },
  { t: 'Nothing will come of nothing.', by: 'William Shakespeare' },
];

function setupQuotes() {
  const box = $('#quote');
  let i = Math.floor(Math.random() * QUOTES.length);
  const show = () => {
    box.classList.remove('show');
    setTimeout(() => {
      $('#quoteText').textContent = `"${QUOTES[i].t}"`;
      $('#quoteBy').textContent = `— ${QUOTES[i].by}`;
      box.classList.add('show');
      i = (i + 1) % QUOTES.length;
    }, 400);
  };
  show();
  setInterval(show, 12000);
}

function setupMemo() {
  const memo = $('#memo');
  memo.value = state.memo || '';
  let timer;
  memo.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.memo = memo.value; saveState(); }, 400); // debounce
  };
}

/** Reading streak: +1 if you checked in yesterday, otherwise restart at 1 */
function setupStreak() {
  const countEl = $('#streakCount');
  const btn = $('#streakBtn');
  const today = ymd(new Date());
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const s = state.streak || { count: 0, last: null };

  if (s.last && s.last !== today && s.last !== ymd(yest)) s.count = 0; // streak broken
  const render = () => {
    countEl.textContent = s.count;
    btn.disabled = s.last === today;
    btn.textContent = s.last === today ? 'Checked in today ✓' : 'I read today!';
  };
  btn.onclick = () => {
    if (s.last === today) return;
    s.count = s.last === ymd(yest) ? s.count + 1 : 1;
    s.last = today;
    state.streak = s;
    saveState();
    render();
    countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop');
    toast(`📚 ${s.count}-day streak — keep it up!`);
  };
  render();
}

/** Pill nav: smooth-scroll to sections */
function setupNavPills() {
  document.querySelectorAll('.pill-nav a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

/* ---------------------------------------------------------
 * 11. Init
 * --------------------------------------------------------- */
function init() {
  const now = new Date();
  $('#today').textContent = `${WEEKDAY_LONG[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  $('#prevMonth').onclick = () => { cal.view.setMonth(cal.view.getMonth() - 1); renderCalendar(); };
  $('#nextMonth').onclick = () => { cal.view.setMonth(cal.view.getMonth() + 1); renderCalendar(); };
  $('#todayBtn').onclick = () => {
    cal.view = new Date(now.getFullYear(), now.getMonth(), 1);
    cal.selected = ymd(now);
    renderCalendar();
  };
  $('#addEventBtn').onclick = () => openEventDialog();

  setupEventDialog();
  setupTasks();
  setupSpotify();
  setupNews();
  renderSprites();
  renderMenu();
  setupClock();
  setupQuotes();
  setupMemo();
  setupStreak();
  setupNavPills();
  renderCalendar();
  renderTasks();
}

document.addEventListener('DOMContentLoaded', init);
