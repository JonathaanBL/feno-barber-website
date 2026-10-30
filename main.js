const root = document.documentElement;
root.classList.replace('no-js', 'js');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* Language: Spanish lives in the markup, English in data-en */
let lang = 'es';
const texts = $$('[data-en]').map(el => ({ el, es: el.textContent, en: el.dataset.en }));
const alts = $$('[data-en-alt]').map(el => ({ el, es: el.alt, en: el.dataset.enAlt }));
const arias = $$('[data-en-aria]').map(el => ({ el, es: el.getAttribute('aria-label'), en: el.dataset.enAria }));
const titles = { es: document.title, en: 'Fernando Barber | Barber in Jackson Heights, Queens' };
const langBtn = $('#lang');
function setLang(next) {
  lang = next;
  root.lang = next;
  texts.forEach(t => { t.el.textContent = t[next]; });
  alts.forEach(t => { t.el.alt = t[next]; });
  arias.forEach(t => { t.el.setAttribute('aria-label', t[next]); });
  document.title = titles[next];
  langBtn.textContent = next === 'es' ? 'EN' : 'ES';
  langBtn.setAttribute('aria-label', next === 'es' ? 'Read in English' : 'Leer en español');
  paintOpen();
  sum();
}
langBtn.addEventListener('click', () => {
  setLang(lang === 'es' ? 'en' : 'es');
  try { localStorage.setItem('lang', lang); } catch {} // private windows may refuse storage
});

/* Open now, always in New York time. Minutes from midnight, from his Booksy hours. */
const HOURS = { 0: [600, 1140], 1: [600, 1180], 2: null, 3: [600, 1180], 4: [600, 1240], 5: [600, 1240], 6: [600, 1240] };
function nyNow() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const get = t => p.find(x => x.type === t).value;
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), min: +get('hour') * 60 + +get('minute') };
}
const clock = m => `${(Math.floor(m / 60) + 11) % 12 + 1}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'AM' : 'PM'}`;
function openLine({ day, min }, l = lang) {
  const h = HOURS[day];
  if (h && min >= h[0] && min < h[1]) return l === 'es' ? `Abierto hasta las ${clock(h[1])}` : `Open until ${clock(h[1])}`;
  if (h && min < h[0]) return l === 'es' ? `Abre hoy a las ${clock(h[0])}` : `Opens today at ${clock(h[0])}`;
  let d = (day + 1) % 7;
  while (!HOURS[d]) d = (d + 1) % 7;
  return l === 'es' ? `Abre mañana a las ${clock(HOURS[d][0])}`.replace('mañana', d === (day + 1) % 7 ? 'mañana' : 'el miércoles')
    : `Opens ${d === (day + 1) % 7 ? 'tomorrow' : 'Wednesday'} at ${clock(HOURS[d][0])}`;
}
console.assert(openLine({ day: 5, min: 700 }, 'en') === 'Open until 8:40 PM');
console.assert(openLine({ day: 5, min: 500 }, 'en') === 'Opens today at 10:00 AM');
console.assert(openLine({ day: 5, min: 1300 }, 'en') === 'Opens tomorrow at 10:00 AM');
console.assert(openLine({ day: 1, min: 1300 }, 'en') === 'Opens Wednesday at 10:00 AM');
function paintOpen() {
  const now = nyNow();
  $$('[data-open]').forEach(el => { el.textContent = openLine(now); });
  $$('tr[data-day]').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === now.day));
}
setInterval(paintOpen, 60000);

/* Build your visit: one base service plus any extras */
const menu = $('#menu');
const browsBox = $('input[data-brows]', menu);
function sum() {
  const base = $('input[name=base]:checked', menu);
  browsBox.disabled = 'full' in base.dataset; // the full service already includes them
  if (browsBox.disabled) browsBox.checked = false;
  const picked = $$('input:checked', menu);
  const dollars = picked.reduce((n, i) => n + +i.value, 0);
  const min = picked.reduce((n, i) => n + +i.dataset.min, 0);
  const from = picked.some(i => 'from' in i.dataset);
  $('#total').textContent = `$${dollars}${from ? '+' : ''}`;
  $('#time').textContent = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60}` : ''}`;
}
menu.addEventListener('change', sum);
menu.addEventListener('submit', e => e.preventDefault());

let savedLang = null;
try { savedLang = localStorage.getItem('lang'); } catch {}
setLang(savedLang === 'en' ? 'en' : 'es');

/* The reel only downloads and plays while it is near the screen */
const reel = $('.reel');
if (!still) new IntersectionObserver(([e]) => {
  if (e.isIntersecting) reel.play().catch(() => {});
  else reel.pause();
}, { rootMargin: '200px' }).observe(reel);

/* Entrances: each part of a section rises in turn */
const parts = 'h2, h3, .step p, .stair, .statement__note, .statement__pics img, .ritual__text p, .ritual__list, .ritual > img, .prices__side img, .menu fieldset, .reel, .stagework__text p, .stagework__text img, blockquote, .extras img, .extras p, .extras .link, .visit__card, .row img';
const seen = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
$$('main section').forEach(sec => $$(parts, sec).forEach((el, i) => {
  el.classList.add('rise');
  el.style.setProperty('--i', el.matches('.row img') ? Math.min(i, 6) : Math.min(i, 5));
  seen.observe(el);
}));

/* A mouse has no sideways scroll, so the row drags */
const row = $('.row');
let dragX = null;
row.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { dragX = e.clientX; row.classList.add('dragging'); row.setPointerCapture(e.pointerId); } });
row.addEventListener('pointermove', e => { if (dragX !== null) { row.scrollLeft -= e.clientX - dragX; dragX = e.clientX; } });
const endDrag = () => { dragX = null; row.classList.remove('dragging'); };
row.addEventListener('pointerup', endDrag);
row.addEventListener('pointercancel', endDrag);

/* Hero card shrinks into the booking stub */
const card = $('#card');
const stub = $('#stub');
const visit = $('#visita');
const totalBar = $('.total');
let onTotal = false, onVisit = false, onQuotes = false;
new IntersectionObserver(([e]) => { onTotal = e.isIntersecting; }).observe(totalBar);
const quiet = new IntersectionObserver(es => es.forEach(e => {
  if (e.target === visit) onVisit = e.isIntersecting; else onQuotes = e.isIntersecting;
  onScroll();
}));
quiet.observe(visit);
quiet.observe($('.voices'));
function onScroll() {
  const y = scrollY, vh = innerHeight;
  if (!still) {
    const t = Math.min(y / (vh * .75), 1);
    card.style.transform = `translateY(${y * .55}px) scale(${1 - t * .62})`;
    card.style.opacity = t > .85 ? (1 - t) / .15 : 1;
    card.style.visibility = t >= 1 ? 'hidden' : 'visible';
  }
  stub.classList.toggle('on', y > vh * .7 && !onTotal && !onVisit && !onQuotes);
  pole.scroll(y, vh);
}

/* The pole: the drawn one shows at once, the 3D one replaces it when the browser is free */
const canvas = $('#pole');
const flat = $('#pole-flat');
const stageEnd = () => { const st = $('.stage'); return st.offsetTop + st.offsetHeight; };
const flatScroll = y => { flat.style.visibility = y < stageEnd() ? 'visible' : 'hidden'; };
const pole = { scroll: flatScroll };
addEventListener('scroll', onScroll, { passive: true });
onScroll();

function keepFlat() {
  canvas.remove();
  flat.removeAttribute('hidden');
  pole.scroll = flatScroll;
  onScroll();
}

// a matcap paints metal and glass from one small image, with no lighting maths per pixel
function matcapImage(THREE, horizontal, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const ramp = horizontal ? g.createLinearGradient(0, 0, 128, 0) : g.createLinearGradient(0, 0, 0, 128);
  stops.forEach(([at, colour]) => ramp.addColorStop(at, colour));
  g.fillStyle = ramp;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function startPole() {
  let THREE;
  try { THREE = await import('three'); }
  catch { keepFlat(); return; }

  const small = innerWidth < 800;
  const dpr = devicePixelRatio || 1;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: dpr < 2 }); }
  catch { keepFlat(); return; }
  renderer.setPixelRatio(Math.min(dpr, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);

  // stripes: Chile's red, white and blue, with its star riding the blue band
  const c = document.createElement('canvas');
  c.width = c.height = small ? 512 : 1024;
  const g = c.getContext('2d');
  const bands = ['#c4121a', '#f4f1ea', '#0f3b8c', '#f4f1ea'];
  const band = c.width / bands.length;
  g.fillStyle = bands[0];
  g.fillRect(0, 0, c.width, c.height);
  for (let i = -bands.length; i < bands.length * 2; i++) {
    g.fillStyle = bands[(i + bands.length * 3) % bands.length];
    g.beginPath();
    g.moveTo(i * band, c.height);
    g.lineTo((i + 1) * band, c.height);
    g.lineTo((i + 1) * band + c.width, 0);
    g.lineTo(i * band + c.width, 0);
    g.fill();
  }
  const star = (x, y, r) => {
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .42 : r;
      g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    }
    g.closePath();
    g.fillStyle = '#f4f1ea';
    g.fill();
  };
  // blue band is index 2: its centre line crosses the top edge at 2.5 bands, running down-left
  for (const f of [.25, .75]) star(((2.5 * band + c.width * (1 - f)) % c.width), c.height * f, c.width * .06);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const sides = small ? 40 : 64;
  const group = new THREE.Group();
  scene.add(group);
  const stripes = new THREE.Mesh(
    new THREE.CylinderGeometry(.5, .5, 3.6, sides, 1, true),
    new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .42 })
  );
  group.add(stripes);
  // the glass only adds its highlights on top of the stripes
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(.56, .56, 3.6, sides, 1, true),
    new THREE.MeshMatcapMaterial({
      matcap: matcapImage(THREE, true, [[0, '#000'], [.2, '#000'], [.27, '#8a8a8a'], [.33, '#000'], [.72, '#000'], [.8, '#2a2a2a'], [.9, '#000'], [1, '#000']]),
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor // adds colour only: the rim stays see-through
    })
  );
  group.add(glass);

  // turned chrome caps: a profile spun around the pole's axis
  const chrome = new THREE.MeshMatcapMaterial({
    matcap: matcapImage(THREE, true, [[0, '#2b2b2b'], [.16, '#f7f7f7'], [.3, '#6a6a6a'], [.5, '#dcdcdc'], [.68, '#454545'], [.86, '#ffffff'], [1, '#333333']])
  });
  const profile = [[0, 0], [.62, 0], [.62, .06], [.56, .1], [.56, .2], [.66, .25], [.66, .31], [.48, .4], [.34, .5], [.3, .62], [.22, .7], [.2, .74], [.26, .84], [.2, .95], [0, 1]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const lathe = new THREE.LatheGeometry(profile, sides);
  const top = new THREE.Mesh(lathe, chrome);
  top.position.y = 1.8;
  const bottom = new THREE.Mesh(lathe, chrome);
  bottom.position.y = -1.8;
  bottom.rotation.x = Math.PI;
  group.add(top, bottom);

  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);

  const hero = $('.hero');
  let progress = 0, spin = 0, px = 0, py = 0, tx = 0, ty = 0, visible = true, running = false;

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { size(); onScroll(); });
  size();

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  function draw() {
    const phone = camera.aspect < 1;
    // 0 = beside the hero card; 1..3 = held through the three stage screens
    const p = progress;
    const inStage = ease(Math.min(p, 1));
    const hx = phone ? 0 : 3.15, sx = phone ? 0 : 2.05;
    const hy = phone ? 1.6 : 0, sy = phone ? 2.4 : 0;
    const hz = phone ? 19 : 11, sz = phone ? 19 : 8.6;
    group.position.x = lerp(hx, sx, inStage);
    group.position.y = lerp(hy, sy, inStage);
    const push = Math.max(p - 1, 0); // moves in on the star, then back out
    camera.position.set(0, 0, lerp(hz, sz, inStage) - Math.sin(Math.min(push / 2, 1) * Math.PI) * (phone ? 0 : 2.6)); // no room to push in over phone text
    group.rotation.z = lerp(.1, -.06, inStage) + px * .05;
    group.rotation.x = py * .05;
    stripes.rotation.y = spin;
    renderer.render(scene, camera);
  }

  const frameMs = small ? 33 : 16; // 30 fps is plenty for a pole on a phone
  let last = 0, frames = 0, sampled = 0, slowTotal = 0;
  function loop(now) {
    if (!visible) { running = false; return; }
    requestAnimationFrame(loop);
    if (now - last < frameMs - 2) return;
    const gap = now - last;
    last = now;
    // a device that cannot keep up goes back to the drawn pole; the first frames and tab switches don't count
    if (++frames > 3 && sampled < 30 && gap < 1000) {
      sampled++;
      slowTotal += gap;
      if (sampled === 30 && slowTotal / 30 > 80) {
        visible = false;
        keepFlat();
        renderer.dispose();
        return;
      }
    }
    spin = now * .00045 + scrollY * .0035;
    px += (tx - px) * .06;
    py += (ty - py) * .06;
    draw();
  }
  function run() {
    if (still || running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  pole.scroll = (y, vh) => {
    const h = hero.offsetHeight;
    progress = y < h ? y / h : 1 + (y - h) / vh;
    visible = y < stageEnd();
    canvas.style.visibility = visible ? 'visible' : 'hidden';
    if (still) draw();
    else if (visible) run();
  };
  onScroll();
  draw();
  canvas.classList.add('on');
  setTimeout(() => { if (canvas.isConnected) flat.setAttribute('hidden', ''); }, 600);
  if (!still) addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  run();
}

// data-saver and very low-memory phones keep the drawn pole
if (!navigator.connection?.saveData && !(navigator.deviceMemory <= 2)) {
  addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(startPole, { timeout: 2500 });
    else setTimeout(startPole, 1200);
  });
}
