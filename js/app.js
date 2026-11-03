import { calculateCycles, validateInput } from './ovulation-core.js';
document.querySelectorAll('.brand img[data-theme-logo]').forEach(img => {
  const updateLogo = () => { img.src = document.documentElement.getAttribute('data-theme') === 'dark' ? '/assets/logo-dark.svg' : '/assets/logo.svg'; };
  updateLogo();
  new MutationObserver(updateLogo).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

const form = document.querySelector('#calculator-form');
const results = document.querySelector('#results');
const resultSummary = document.querySelector('#result-summary');
const cycleList = document.querySelector('#cycle-list');
const calendarView = document.querySelector('#calendar-view');
const status = document.querySelector('#form-status');
const forgetData = document.querySelector('#forget-data');
const installButton = document.querySelector('#install-app');
const iosHint = document.querySelector('#ios-install-hint');
const INPUTS_KEY = 'ovulation-calculator:inputs';
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* Storage may be blocked. */ } }
};
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const iso = date => date.toISOString().slice(0, 10);
const todayIso = () => {
  const today = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

function setDefaultLastPeriod() {
  if (form?.elements.lastPeriod && !form.elements.lastPeriod.value) form.elements.lastPeriod.value = todayIso();
}

function readDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  const date = value instanceof Date ? value : readDate(value);
  return dateFormatter.format(date);
}

function card(cycle, index) {
  return `<article class="cycle-card">
    <div class="cycle-card__heading"><span>Cycle ${index + 1}</span><span class="cycle-card__month">${formatDate(cycle.lmp)}</span></div>
    <dl class="date-list">
      <div><dt>Estimated ovulation</dt><dd>${formatDate(cycle.ovulation)}</dd></div>
      <div><dt>Fertile window</dt><dd>${formatDate(cycle.fertileStart)} – ${formatDate(cycle.fertileEnd)}</dd></div>
      <div><dt>Expected period</dt><dd>${formatDate(cycle.nextPeriod)}</dd></div>
      <div><dt>Estimated due date</dt><dd>${formatDate(cycle.dueDate)}</dd></div>
    </dl>
  </article>`;
}

const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const addDays = (date, days) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
function renderMonth(cycle) {
  const first = new Date(cycle.lmp.getFullYear(), cycle.lmp.getMonth(), 1);
  const last = new Date(cycle.nextPeriod.getFullYear(), cycle.nextPeriod.getMonth() + 1, 0);
  const fertile = new Set();
  for (let date = new Date(cycle.fertileStart); date <= cycle.fertileEnd; date = addDays(date, 1)) fertile.add(dayKey(date));
  const cells = [];
  for (let date = addDays(first, -first.getDay()); date <= last || date.getDay() !== 0; date = addDays(date, 1)) {
    const current = date.getMonth() === first.getMonth();
    const key = dayKey(date);
    const isFertile = fertile.has(key);
    const isOvulation = key === dayKey(cycle.ovulation);
    const isPeriod = key === dayKey(cycle.lmp);
    const classes = [current ? '' : 'muted', isFertile ? 'fertile' : '', isOvulation ? 'ovulation' : '', isPeriod ? 'period' : ''].filter(Boolean).join(' ');
    const label = `${dateFormatter.format(date)}${isFertile ? ', estimated fertile day' : ''}${isOvulation ? ', estimated ovulation' : ''}${isPeriod ? ', period start' : ''}`;
    cells.push(`<td class="${classes}"><span aria-label="${label}">${date.getDate()}</span></td>`);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
  return `<div class="card-label">Month view</div><h2 id="calendar-heading">${monthFormatter.format(first)}</h2><p>Cycle 1: ${formatDate(cycle.lmp)} through ${formatDate(cycle.nextPeriod)}</p><table aria-label="${monthFormatter.format(first)} estimated cycle calendar"><thead><tr>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => `<th scope="col">${day.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${weeks.join('')}</tbody></table><div class="calendar-legend" aria-label="Calendar legend"><span><i class="period"></i> Period start</span><span><i class="fertile"></i> Fertile window</span><span><i class="ovulation"></i> Estimated ovulation</span></div>`;
}

function render(cycles, irregular) {
  const first = cycles[0];
  resultSummary.innerHTML = `<div class="summary-kicker">Your next estimated fertile window</div>
    <h2>${formatDate(first.fertileStart)} – ${formatDate(first.fertileEnd)}</h2>
    <div class="summary-grid">
      <div><span>Estimated ovulation</span><strong>${formatDate(first.ovulation)}</strong></div>
      <div><span>Expected period</span><strong>${formatDate(first.nextPeriod)}</strong></div>
      <div><span>Estimated due date</span><strong>${formatDate(first.dueDate)}</strong></div>
    </div>
    <p class="notice">${irregular ? 'Because irregular cycles are selected, these dates may be less reliable.' : 'These dates are estimates. Ovulation can vary from cycle to cycle.'}</p>`;
  cycleList.innerHTML = cycles.map(card).join('');
  if (calendarView) calendarView.innerHTML = renderMonth(first);
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const input = { lmp: data.get('lastPeriod'), cycleLength: Number(data.get('cycleLength')), lutealPhase: Number(data.get('lutealPhase')), count: 7 };
  const validation = validateInput(input);
  if (!validation.valid) {
    status.textContent = validation.errors.join(' ');
    status.className = 'form-status form-status--error';
    return;
  }
  status.textContent = validation.warnings.join(' ');
  status.className = validation.warnings.length ? 'form-status form-status--warning' : 'form-status';
  const remember = data.get('remember') === 'on';
  if (remember) {
    const saved = { v: 1, lastPeriod: input.lmp, cycleLength: input.cycleLength, lutealPhase: input.lutealPhase, irregular: data.get('irregular') === 'on' };
    storage.set(INPUTS_KEY, JSON.stringify(saved));
  } else storage.remove(INPUTS_KEY);
  if (forgetData) forgetData.hidden = !remember;
  render(calculateCycles(input), data.get('irregular') === 'on');
});

function clearResults() {
  if (results) results.hidden = true;
  if (calendarView) calendarView.innerHTML = '';
  if (resultSummary) resultSummary.innerHTML = '';
  if (cycleList) cycleList.innerHTML = '';
}

function loadSavedInputs() {
  if (!form) return;
  setDefaultLastPeriod();
  const raw = storage.get(INPUTS_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    const cycleOption = [...form.elements.cycleLength.options].some(option => option.value === String(saved.cycleLength));
    const lutealOption = [...form.elements.lutealPhase.options].some(option => option.value === String(saved.lutealPhase));
    const valid = saved?.v === 1 && typeof saved.lastPeriod === 'string' && cycleOption && lutealOption && validateInput({ lmp: saved.lastPeriod, cycleLength: Number(saved.cycleLength), lutealPhase: Number(saved.lutealPhase) }).valid;
    if (!valid) { storage.remove(INPUTS_KEY); return; }
    form.elements.lastPeriod.value = saved.lastPeriod;
    form.elements.cycleLength.value = String(saved.cycleLength);
    form.elements.lutealPhase.value = String(saved.lutealPhase);
    form.elements.irregular.checked = saved.irregular === true;
    form.elements.remember.checked = true;
    if (forgetData) forgetData.hidden = false;
    if (status) status.textContent = 'Loaded your saved details from this device.';
  } catch { storage.remove(INPUTS_KEY); }
}
loadSavedInputs();

document.querySelector('#reset-calculator')?.addEventListener('click', () => {
  form.reset();
  setDefaultLastPeriod();
  clearResults();
  status.textContent = '';
});

forgetData?.addEventListener('click', () => {
  storage.remove(INPUTS_KEY);
  form.reset();
  setDefaultLastPeriod();
  clearResults();
  forgetData.hidden = true;
  status.textContent = 'Saved details removed from this device.';
});

document.querySelector('#print-results')?.addEventListener('click', () => window.print());
document.querySelector('#copy-summary')?.addEventListener('click', async event => {
  const text = resultSummary?.innerText + '\n\n' + [...document.querySelectorAll('.cycle-card')].map(card => card.innerText).join('\n\n');
  await navigator.clipboard.writeText(text);
  event.currentTarget.textContent = 'Copied';
  setTimeout(() => { event.currentTarget.textContent = 'Copy summary'; }, 1800);
});

document.querySelector('#download-ics')?.addEventListener('click', () => {
  const firstCard = document.querySelector('.cycle-card');
  if (!firstCard) return;
  const data = new FormData(form);
  const cycles = calculateCycles({ lmp: data.get('lastPeriod'), cycleLength: Number(data.get('cycleLength')), lutealPhase: Number(data.get('lutealPhase')), count: 1 });
  const cycle = cycles[0];
  const day = date => iso(date).replaceAll('-', '');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Ovulation Calculator//EN\nBEGIN:VEVENT\nUID:${day(cycle.ovulation)}@ovulation-calculator.org\nDTSTART;VALUE=DATE:${day(cycle.fertileStart)}\nDTEND;VALUE=DATE:${day(cycle.fertileEnd)}\nSUMMARY:Estimated fertile window\nEND:VEVENT\nEND:VCALENDAR`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  link.download = 'fertile-window.ics';
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector('[data-menu-toggle]')?.addEventListener('click', event => {
  const nav = document.querySelector('#site-nav');
  const open = nav.toggleAttribute('data-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});

const themeToggle = document.querySelector('[data-theme-toggle]');
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = storage.get('ovulation-theme');
const initialTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (systemDark() ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', initialTheme);
function updateThemeLabel() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (!themeToggle) return;
  themeToggle.innerHTML = dark ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg><span class="visually-hidden">Switch to light mode</span>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg><span class="visually-hidden">Switch to dark mode</span>';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
updateThemeLabel();
themeToggle?.addEventListener('click', () => {
  const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  const dark = nextTheme === 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  if (nextTheme === (systemDark() ? 'dark' : 'light')) {
    storage.remove('ovulation-theme');
  } else storage.set('ovulation-theme', dark ? 'dark' : 'light');
  updateThemeLabel();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', event => {
  if (!storage.get('ovulation-theme')) {
    document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
  }
  updateThemeLabel();
});
window.addEventListener('load', () => navigator.serviceWorker?.register('/sw.js').catch(() => {}));
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; if (installButton && !matchMedia('(display-mode: standalone)').matches) installButton.hidden = false; });
installButton?.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; });
window.addEventListener('appinstalled', () => { if (installButton) installButton.hidden = true; });
if (iosHint && /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) iosHint.hidden = false;
