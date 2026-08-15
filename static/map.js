import { CATEGORIES } from './categories.js';
import { categoryIconSvg } from './icons.js';

let map;
let layerGroups = {};
let markers = [];
let activeName = null;

export function initMap(elementId, onPointClick) {
  map = L.map(elementId, {
    zoomControl: true,
    attributionControl: false,
  }).setView([-37.5, -71.0], 4);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    subdomains: 'abc',
  }).addTo(map);

  buildFilters();
  loadCatalog(onPointClick);
}

function makeIcon(category, active) {
  const cfg = CATEGORIES[category] || CATEGORIES.ciudad;
  return L.divIcon({
    className: 'cat-marker',
    html: categoryIconSvg(category, cfg.color, active),
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function buildFilters() {
  const container = document.getElementById('filters');
  for (const [key, cfg] of Object.entries(CATEGORIES)) {
    const row = document.createElement('label');
    row.className = 'filter-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;

    const dot = document.createElement('span');
    dot.className = 'filter-dot';
    dot.innerHTML = categoryIconSvg(key, cfg.color, false);

    const txt = document.createElement('span');
    txt.className = 'filter-label';
    txt.textContent = cfg.label;

    cb.addEventListener('change', () => {
      const g = layerGroups[key];
      if (!g) return;
      if (cb.checked) map.addLayer(g);
      else map.removeLayer(g);
    });

    row.append(cb, dot, txt);
    container.appendChild(row);
  }
}

async function loadCatalog(onPointClick) {
  try {
    const resp = await fetch('/api/catalog');
    const points = await resp.json();

    for (const key of Object.keys(CATEGORIES)) {
      layerGroups[key] = L.layerGroup().addTo(map);
    }

    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lon], { icon: makeIcon(p.category, false) });
      marker.bindTooltip(p.name, { direction: 'right', offset: [10, 0] });
      marker.on('click', () => onPointClick(p));
      layerGroups[p.category].addLayer(marker);
      markers.push({ point: p, marker });
    });
  } catch (e) {
    console.error('Error cargando catalogo', e);
  }
}

export function setActivePoint(name) {
  if (activeName === name) return;
  activeName = name;

  markers.forEach(({ point, marker }) => {
    marker.setIcon(makeIcon(point.category, point.name === name));
  });
}

export function flyTo(lat, lon) {
  map.flyTo([lat, lon], Math.max(map.getZoom(), 7), { duration: 0.8 });
}
