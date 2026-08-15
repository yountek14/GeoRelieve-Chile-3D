import { initViewer, loadTerrain, setMapMode, setPalette, getPaletteNames, paletteCss } from './viewer.js';
import { initMap, setActivePoint, flyTo } from './map.js';
import { CATEGORIES } from './categories.js';
import { categoryIconSvg } from './icons.js';

const canvas = document.getElementById('viewer-canvas');
const statusEl = document.getElementById('viewer-status');
const statusText = document.getElementById('status-text');
const emptyEl = document.getElementById('viewer-empty');
const infoCard = document.getElementById('info-card');
const infoIcon = document.getElementById('info-icon');
const infoName = document.getElementById('info-name');
const infoSub = document.getElementById('info-sub');
const infoElev = document.getElementById('info-elev');
const infoCoords = document.getElementById('info-coords');
const legendEl = document.getElementById('viewer-legend');
const legendGradient = document.getElementById('legend-gradient');
const legendMin = document.getElementById('legend-min');
const legendMax = document.getElementById('legend-max');
const palettesEl = document.getElementById('palettes');

initViewer(canvas);
initMap('map', onPointSelected);

function buildPalettes() {
  getPaletteNames().forEach((name) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn' + (name === 'terreno' ? ' active' : '');
    btn.title = name;
    btn.style.background = paletteCss(name);
    btn.addEventListener('click', () => {
      setPalette(name);
      legendGradient.style.background = paletteCss(name);
      palettesEl.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
    palettesEl.appendChild(btn);
  });
}
buildPalettes();
legendGradient.style.background = paletteCss('terreno');

document.querySelectorAll('input[name="mapmode"]').forEach((r) => {
  r.addEventListener('change', () => {
    if (!r.checked) return;
    setMapMode(r.value);
    palettesEl.style.display = r.value === 'dem' ? 'flex' : 'none';
  });
});

let currentPoint = null;

function showStatus(text) {
  statusText.textContent = text;
  statusEl.classList.remove('hidden');
}

function hideStatus() {
  statusEl.classList.add('hidden');
}

async function onPointSelected(point) {
  if (currentPoint === point.name) return;
  currentPoint = point.name;

  setActivePoint(point.name);
  flyTo(point.lat, point.lon);

  const cat = CATEGORIES[point.category];
  const subtitle = point.region ? `${cat.label} · ${point.region}` : (cat ? cat.label : '');

  infoIcon.innerHTML = categoryIconSvg(point.category, cat ? cat.color : '#00bcd4', false);
  infoName.textContent = point.name;
  infoSub.textContent = subtitle;
  infoCoords.textContent = `${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}`;
  infoElev.textContent = '…';
  infoCard.classList.remove('hidden');
  legendEl.classList.remove('hidden');

  showStatus(`Descargando DEM de ${point.name}… (primera vez tarda unos segundos)`);

  try {
    const resp = await fetch(`/api/terrain?lat=${point.lat}&lon=${point.lon}&size=25`);
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Error desconocido');
    }

    loadTerrain(data);
    emptyEl.classList.add('hidden');
    legendMin.textContent = `${Math.round(data.zmin)} m`;
    legendMax.textContent = `${Math.round(data.zmax)} m`;
    infoElev.textContent = `${Math.round(data.zmin)} – ${Math.round(data.zmax)} m`;
  } catch (e) {
    console.error(e);
    statusText.textContent = `Error: ${e.message}`;
    return;
  }

  hideStatus();
}
