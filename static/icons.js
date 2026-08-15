const GLYPHS = {
  ciudad: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.5 17 V11 M5.5 11 H8.5 M8.5 11 V17"/>
    <path d="M10 17 V8 M10 8 H14 M14 8 V17"/>
    <path d="M15.5 17 V12 M15.5 12 H18.5 M18.5 12 V17"/>
  </g>`,
  volcan: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 18 L9.5 9.5 L11 10.5 L13 10.5 L14.5 9.5 L20 18 Z"/>
    <path d="M10.5 4.5 c0 -1.4 3 -1.4 3 0"/>
  </g>`,
  cumbre: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 18 L10.5 7.5 L16.5 18"/>
    <path d="M12 18 L17 10 L21 18" opacity="0.5"/>
    <path d="M8.5 11.5 L10.5 7.5 L12.5 11.5" fill="#fff" stroke="none"/>
  </g>`,
  lago: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 9 c2.4 -1.7 4.8 -1.7 7.2 0 c2.4 1.7 4.8 1.7 7.2 0"/>
    <path d="M4.5 15 c2.4 -1.7 4.8 -1.7 7.2 0 c2.4 1.7 4.8 1.7 7.2 0"/>
  </g>`,
  glaciar: `<g stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 4 V20 M5.5 8 L18.5 16 M18.5 8 L5.5 16"/>
    <path d="M12 7.5 V9.5 M10.8 9 L11.4 10.5 M13.2 9 L12.6 10.5"/>
  </g>`,
  salar: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3 L20 12 L12 21 L4 12 Z"/>
    <path d="M12 3 V21 M4 12 H20 M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"/>
  </g>`,
  isla: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 14 C6 9 18 9 18 14"/>
    <path d="M4 19 c1.5 -1.2 3 -1.2 4.5 0"/>
    <path d="M15.5 19 c1.5 -1.2 3 -1.2 4.5 0"/>
  </g>`,
  parque: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20 V12"/>
    <path d="M12 5 L6.5 13 H17.5 Z"/>
    <path d="M12 9 L8 15 H16 Z"/>
  </g>`,
  rio: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 3.5 C13 6.5 4 9 9.5 12.5 C14 15.5 6 18 11 21"/>
  </g>`,
  geiser: `<g stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 20 H19"/>
    <path d="M12 18 C12 12 10 10 12 6 C14 10 12 12 12 18"/>
    <path d="M8 4 c-1 0 -1.5 0.6 -1 1.2"/>
    <path d="M16 3 c1 -0.2 1.6 0.4 1 1"/>
  </g>`,
};

export function categoryIconSvg(category, color, active) {
  const glyph = GLYPHS[category] || GLYPHS.ciudad;
  const ring = active
    ? '<circle cx="12" cy="12" r="11" fill="none" stroke="#ffeb3b" stroke-width="2.5"/>'
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
    ${ring}
    <circle cx="12" cy="12" r="10.5" fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
    ${glyph}
  </svg>`;
}
