// Draws the eleven survey sites and the Perseverance landmark rover in the same
// cartoon style as the base buildings (scripts/draw_buildings.mjs): seen at an
// angle from the south, dark outline, bright flat colours, one shade colour.
// The drawings are original, made with code (AI-generated).
//
// Survey sites are 320 × 260 boxes drawn centred on their map spot. Each site's
// instrument stands at (210, 186), which is where world2d's SITE_GEAR places the
// "not explored yet" lamp and the "explored" flag. The sun is in the west (left)
// like in the orbital photo: shade on the east side, shadows fall to the east.
// Usage: node scripts/draw_sites.mjs
import { writeFileSync } from "node:fs";

const OUT = "#3a2418";
const S = `stroke="${OUT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${OUT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const line = (d, w = 3, c = OUT) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shadow = (cx, cy, rx, ry, o = 0.3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(40,15,5,${o})"/>`;
// a soft patch of ground that ties the drawing to the photo
const patch = (rx = 150, ry = 100, cy = 140) => `<ellipse cx="160" cy="${cy}" rx="${rx}" ry="${ry}" fill="#b86a45" opacity="0.22"/>
  <ellipse cx="160" cy="${cy}" rx="${rx * 0.8}" ry="${ry * 0.78}" fill="#b86a45" opacity="0.18"/>`;
const svg = (body, w = 320, h = 260, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

// ---------- instruments, each standing on (x, y) ----------
function weatherMast(x, y) {
  return `${shadow(x + 12, y + 4, 16, 4)}
    ${line(`M${x - 10} ${y + 5} L${x} ${y - 34} L${x + 10} ${y + 5}`)}
    ${line(`M${x} ${y} V${y - 58}`, 5)}${line(`M${x} ${y} V${y - 58}`, 2, "#ece6dc")}
    ${line(`M${x - 13} ${y - 54} H${x + 13}`)}
    <circle cx="${x - 14}" cy="${y - 52}" r="4.5" fill="#f4efe6" ${S2}/><circle cx="${x + 14}" cy="${y - 52}" r="4.5" fill="#f4efe6" ${S2}/>
    <path d="M${x} ${y - 58} L${x + 13} ${y - 62} L${x} ${y - 66} Z" fill="#e07a3f" ${S2}/>
    <rect x="${x - 8}" y="${y - 32}" width="16" height="11" rx="2" fill="#f4efe6" ${S2}/><circle cx="${x + 3}" cy="${y - 26.5}" r="2" fill="#7ad67a"/>`;
}
function seismometer(x, y) {
  return `${shadow(x + 8, y + 3, 24, 6)}
    ${line(`M${x - 18} ${y} C${x - 34} ${y + 4} ${x - 40} ${y - 6} ${x - 52} ${y - 2}`, 2.5, "#5d6874")}
    <ellipse cx="${x}" cy="${y}" rx="21" ry="6.5" fill="#cfc6b8" ${S2}/>
    <path d="M${x - 18} ${y} A18 21 0 0 1 ${x + 18} ${y} Z" fill="#f6f2ea" ${S}/>
    <path d="M${x - 9} ${y - 12} Q${x - 6} ${y - 18} ${x + 1} ${y - 19}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <path d="M${x + 6} ${y - 1} A18 21 0 0 0 ${x + 16} ${y - 9}" fill="none" stroke="rgba(70,35,15,0.25)" stroke-width="4"/>`;
}
function coreDrill(x, y) {
  return `${shadow(x + 10, y + 6, 20, 5)}
    ${line(`M${x - 14} ${y + 8} L${x} ${y - 32} L${x + 14} ${y + 8} M${x} ${y - 32} L${x + 3} ${y + 10}`)}
    <rect x="${x - 6}" y="${y - 28}" width="12" height="24" rx="2.5" fill="#e07a3f" ${S2}/>
    <rect x="${x - 6}" y="${y - 28}" width="12" height="6" rx="2" fill="#f4efe6" ${S2}/>
    ${line(`M${x} ${y - 4} V${y + 8}`, 3.5, "#5d6874")}`;
}
function sampleCase(x, y) {
  return `${shadow(x + 6, y + 9, 20, 5)}
    <path d="M${x - 8} ${y - 13} q8 -9 16 0" fill="none" ${S2}/>
    <polygon points="${x - 14},${y - 8} ${x + 14},${y - 8} ${x + 20},${y - 13} ${x - 8},${y - 13}" fill="#ffffff" ${S2}/>
    <polygon points="${x + 14},${y - 8} ${x + 20},${y - 13} ${x + 20},${y + 3} ${x + 14},${y + 8}" fill="#cfc6b8" ${S2}/>
    <rect x="${x - 14}" y="${y - 8}" width="28" height="16" rx="2" fill="#f4efe6" ${S2}/>
    <rect x="${x - 14}" y="${y - 2}" width="28" height="3.5" fill="#e07a3f"/>`;
}
function scanner(x, y) {
  return `<path d="M${x - 4} ${y - 30} L${x - 70} ${y - 6} L${x - 58} ${y + 8} Z" fill="rgba(127,227,218,0.3)"/>
    ${shadow(x + 10, y + 6, 18, 5)}
    ${line(`M${x - 13} ${y + 8} L${x} ${y - 24} L${x + 13} ${y + 8} M${x} ${y - 24} L${x + 2} ${y + 9}`)}
    <rect x="${x - 13}" y="${y - 38}" width="24" height="15" rx="4" fill="#f4efe6" ${S2}/>
    <circle cx="${x - 9}" cy="${y - 30.5}" r="4.5" fill="#4fd1c5" ${S2}/><circle cx="${x - 10}" cy="${y - 32}" r="1.4" fill="#fff"/>`;
}
function sampleTubes(x, y) {
  let t = shadow(x + 6, y + 8, 26, 5);
  for (let i = 0; i < 4; i++) {
    t += `<g transform="translate(${x - 15 + i * 10} ${y + (i % 2) * 2}) rotate(68)">
      <rect x="-3.5" y="-11" width="7" height="22" rx="3.5" fill="#f4efe6" ${S2}/><rect x="-3.5" y="-11" width="7" height="6" rx="2" fill="#e07a3f" ${S2}/></g>`;
  }
  return t;
}

// an X-ray probe on a tripod, tilted at the rock (like the PIXL and APXS instruments on rovers)
function xrayProbe(x, y) {
  return `${shadow(x + 10, y + 6, 18, 5)}
    ${line(`M${x - 12} ${y + 8} L${x} ${y - 22} L${x + 12} ${y + 8} M${x} ${y - 22} L${x + 2} ${y + 9}`)}
    <g transform="rotate(-28 ${x} ${y - 28})"><rect x="${x - 18}" y="${y - 34}" width="26" height="12" rx="5" fill="#f4efe6" ${S2}/>
    <rect x="${x - 22}" y="${y - 32}" width="6" height="8" rx="2" fill="#5d6874" ${S2}/></g>
    <circle cx="${x + 4}" cy="${y - 30}" r="2.2" fill="#ff5a4f"/>`;
}
// a small helicopter like Ingenuity, which flew in Jezero crater: four legs, two rotors, a solar panel on top
function helicopter(x, y) {
  return `${shadow(x + 10, y + 4, 22, 5)}
    ${line(`M${x - 6} ${y - 14} L${x - 14} ${y + 2} M${x + 6} ${y - 14} L${x + 14} ${y + 2} M${x - 3} ${y - 14} L${x - 6} ${y + 4} M${x + 3} ${y - 14} L${x + 7} ${y + 4}`, 2)}
    <rect x="${x - 8}" y="${y - 24}" width="16" height="12" rx="2" fill="#f4efe6" ${S2}/>
    <rect x="${x - 8}" y="${y - 24}" width="16" height="4" fill="#d8cfc0"/>
    ${line(`M${x} ${y - 24} V${y - 48}`, 2.5)}
    <ellipse cx="${x}" cy="${y - 36}" rx="30" ry="3" fill="#5d6874" ${S2}/>
    <ellipse cx="${x}" cy="${y - 44}" rx="30" ry="3" fill="#7d8894" ${S2} transform="rotate(12 ${x} ${y - 44})"/>
    <rect x="${x - 9}" y="${y - 54}" width="18" height="6" rx="1.5" fill="#3a6fd0" ${S2}/>`;
}
// a pressurised crew rover, for the all-day expeditions (facing west)
function crewRover(x, y) {
  const wheel = (cx) => `<circle cx="${cx}" cy="${y}" r="7" fill="#3b3633" ${S2}/><circle cx="${cx}" cy="${y}" r="2.6" fill="#a9b4bf"/>`;
  return `${shadow(x + 8, y + 6, 34, 6)}
    <path d="M${x - 30} ${y - 6} L${x - 26} ${y - 26} Q${x - 22} ${y - 34} ${x - 10} ${y - 34} L${x + 22} ${y - 34} Q${x + 30} ${y - 34} ${x + 30} ${y - 24} L${x + 30} ${y - 6} Z" fill="#f4efe6" ${S}/>
    <path d="M${x + 14} ${y - 34} L${x + 22} ${y - 34} Q${x + 30} ${y - 34} ${x + 30} ${y - 24} L${x + 30} ${y - 6} L${x + 14} ${y - 6} Z" fill="rgba(70,35,15,0.2)"/>
    <path d="M${x - 26} ${y - 26} Q${x - 22} ${y - 33} ${x - 12} ${y - 33} L${x - 8} ${y - 33} L${x - 8} ${y - 20} L${x - 27} ${y - 20} Z" fill="#4fd1c5" ${S2}/>
    <rect x="${x - 30}" y="${y - 12}" width="60" height="5" fill="#e07a3f"/>
    ${wheel(x - 20)}${wheel(x)}${wheel(x + 20)}`;
}

// ---------- the five sites further out (stage 2 and 3 of the mission) ----------
// An iron meteorite: a dark, shiny lump with "thumbprint" dents melted in by the fall through the air.
function meteorite() {
  const dimples = [[118, 112, 10, 6], [150, 100, 8, 5], [168, 124, 11, 6], [132, 136, 9, 5], [186, 108, 7, 4]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#2b2826"/><ellipse cx="${x - rx * 0.2}" cy="${y - ry * 0.3}" rx="${rx * 0.5}" ry="${ry * 0.35}" fill="#4a4441"/>`).join("");
  return svg(`${patch(150, 100)}
    <ellipse cx="160" cy="150" rx="110" ry="44" fill="#d08a5e" opacity="0.4"/>
    <ellipse cx="160" cy="150" rx="88" ry="30" fill="none" stroke="#a8603a" stroke-width="5" opacity="0.6"/>
    ${shadow(170, 158, 76, 18, 0.32)}
    <path d="M86 150 C80 112 104 84 146 80 C190 76 226 96 230 126 C234 150 214 162 170 164 C130 166 92 166 86 150 Z" fill="#4a4441" ${S}/>
    <path d="M196 92 C222 104 234 128 226 148 C216 160 196 162 180 162 C206 150 214 120 196 92 Z" fill="#2b2826"/>
    ${dimples}
    ${line("M104 106 C116 90 138 84 158 86", 4, "#c9d1d8")}
    ${line("M112 122 Q122 112 136 110", 2.5, "#a9b4bf")}
    <ellipse cx="60" cy="176" rx="7" ry="4" fill="#bfae9c" ${S2}/><ellipse cx="262" cy="150" rx="6" ry="4" fill="#bfae9c" ${S2}/>
    ${xrayProbe(210, 186)}`);
}

// Old lava on the crater floor: dark slabs split by cracks, with a round patch a rover has ground smooth to look inside.
function lava() {
  const slabs = ["M40 120 L96 104 L120 132 L70 152 Z", "M96 104 L156 92 L170 120 L120 132 Z", "M156 92 L220 90 L236 116 L170 120 Z",
    "M220 90 L276 102 L284 132 L236 116 Z", "M70 152 L120 132 L134 168 L84 182 Z", "M120 132 L170 120 L186 154 L134 168 Z",
    "M170 120 L236 116 L244 150 L186 154 Z", "M236 116 L284 132 L280 164 L244 150 Z"];
  const cols = ["#6e5a4e", "#7d675a", "#5f4d43", "#86705f"];
  return svg(`${patch(155, 100)}
    ${shadow(166, 150, 130, 40, 0.25)}
    ${slabs.map((d, i) => `<path d="${d}" fill="${cols[i % 4]}" ${S}/>`).join("")}
    ${line("M104 112 L118 124 M188 100 L196 112 M150 140 L160 150 M250 128 L262 138", 1.6)}
    ${line("M50 122 L94 108 M100 106 L150 96 M160 94 L214 92", 2.5, "#a99383")}
    <ellipse cx="152" cy="140" rx="14" ry="8" fill="#b9a69a" ${S2}/><ellipse cx="149" cy="138" rx="6" ry="3" fill="#d8cabf"/>
    ${coreDrill(210, 186)}`);
}

// The fan in the north: a second river spread its sand here in lobes, one over another.
function northfan() {
  const lobes = [[0.95, "#f0cfa8"], [0.8, "#e6bb90"], [0.64, "#dca97c"], [0.48, "#cf9a6c"]];
  const lobe = (r) => `M70 40 L${70 + r * 230} ${40 + r * 50} Q${70 + r * 210} ${40 + r * 190} ${70 + r * 40} ${40 + r * 190} Z`;
  const ch = "M70 40 C120 70 170 90 230 110 M70 40 C100 90 120 140 150 190 M100 60 C150 110 170 130 200 160";
  return svg(`${patch(150, 100)}
    ${shadow(150, 150, 130, 70, 0.22)}
    ${lobes.map(([r, c]) => `<path d="${lobe(r)}" fill="${c}" ${S}/>`).join("")}
    ${line("M40 10 C52 22 60 30 70 40", 14, "#a8653f")}${line("M40 10 C52 22 60 30 70 40", 3)}
    ${line(ch, 3, "#b47a58")}${line(ch, 1.2, "#f6dcbf")}
    ${helicopter(210, 186)}`);
}

// The outlet valley in the east: where the lake overflowed and cut through the crater rim,
// leaving teardrop-shaped islands pointing downstream.
function outlet() {
  const blob = "M20 130 C20 52 90 20 165 20 C250 20 305 60 305 130 C305 205 245 244 160 244 C80 244 20 210 20 130 Z";
  const top = "M0 96 C60 104 110 92 160 104 C210 116 260 100 320 108";
  const bottom = "M0 164 C60 172 110 158 160 170 C210 182 260 166 320 176";
  const island = (x, y, w, h) => `<path d="M${x} ${y} C${x + w * 0.3} ${y - h} ${x + w} ${y - h * 0.6} ${x + w} ${y} C${x + w} ${y + h * 0.6} ${x + w * 0.3} ${y + h} ${x} ${y} Z" fill="#d99a6c" ${S2}/>`;
  return svg(`
    <defs><clipPath id="oblob"><path d="${blob}"/></clipPath></defs>
    ${shadow(170, 140, 150, 112, 0.25)}
    <g clip-path="url(#oblob)">
      <rect x="0" y="0" width="320" height="260" fill="#e2a577"/>
      <path d="${top} L320 176 C260 166 210 182 160 170 C110 158 60 172 0 164 Z" fill="#9c5b3a"/>
      <path d="${top} L320 118 C260 110 210 126 160 114 C110 102 60 114 0 106 Z" fill="#4e2a1c"/>
      ${island(70, 136, 60, 12)}${island(170, 140, 70, 14)}
      ${line(top, 3)}${line(bottom, 3)}
      ${line("M30 150 Q60 144 90 150 M200 156 Q240 150 280 158", 1.6, "#f3c79f")}
    </g>
    <path d="${blob}" fill="none" ${S}/>
    ${crewRover(210, 186)}`);
}

// A big, deep crater on the east side: steps in its walls and boulders on its floor.
function eastcrater() {
  return svg(`${patch(155, 105)}
    ${shadow(162, 132, 136, 66, 0.22)}
    <ellipse cx="150" cy="122" rx="134" ry="64" fill="#dca07a" ${S}/>
    <ellipse cx="150" cy="118" rx="112" ry="50" fill="#a8653f" ${S}/>
    <ellipse cx="152" cy="124" rx="86" ry="36" fill="#8f5034" ${S}/>
    <ellipse cx="154" cy="130" rx="56" ry="20" fill="#6e3d28" ${S}/>
    <path d="M38 118 A112 50 0 0 1 120 70 Q80 92 60 120 Z" fill="rgba(60,25,10,0.3)"/>
    ${line("M24 116 A134 64 0 0 1 112 60", 3.5, "#f2c39c")}
    <ellipse cx="150" cy="132" rx="8" ry="5" fill="#bfae9c" ${S2}/><ellipse cx="170" cy="128" rx="6" ry="4" fill="#bfae9c" ${S2}/>
    <ellipse cx="34" cy="176" rx="9" ry="6" fill="#bfae9c" ${S2}/><ellipse cx="282" cy="166" rx="8" ry="5" fill="#bfae9c" ${S2}/>
    ${crewRover(210, 186)}`);
}

// ---------- the six survey sites ----------
function dune() {
  const L = "#e2a173", D = "#a8603a";
  const mound = (x0, x1, top, base, crest) => {
    const w = x1 - x0, mid = x0 + w * 0.48;
    const body = `M${x0} ${base} C${x0 + w * 0.07} ${top + (base - top) * 0.36} ${x0 + w * 0.27} ${top} ${mid} ${top} C${x0 + w * 0.76} ${top} ${x0 + w * 0.93} ${top + (base - top) * 0.4} ${x1} ${base}`;
    const cx = x0 + w * crest;
    const slip = `M${cx} ${top + 6} C${x0 + w * 0.88} ${top + (base - top) * 0.2} ${x0 + w * 0.97} ${top + (base - top) * 0.55} ${x1} ${base} C${x1 - w * 0.1} ${base - 4} ${x1 - w * 0.17} ${base - (base - top) * 0.2} ${x1 - w * 0.22} ${base - (base - top) * 0.4} C${x1 - w * 0.26} ${base - (base - top) * 0.6} ${cx + w * 0.02} ${top + (base - top) * 0.3} ${cx} ${top + 6} Z`;
    return `${shadow(x0 + w * 0.56, base + 2, w * 0.5, (base - top) * 0.18)}
      <path d="${body} Z" fill="${L}"/><path d="${slip}" fill="${D}"/><path d="${body}" fill="none" ${S}/>
      <path d="M${x0} ${base} H${x1}" ${S}/>`;
  };
  return svg(`${patch()}
    ${mound(205, 310, 74, 118, 0.68)}
    ${mound(38, 246, 80, 170, 0.68)}
    ${line("M70 142 Q95 130 122 138 M58 158 Q90 148 126 154 M96 114 Q118 104 142 110", 2.5, "#f3c79f")}
    ${line("M232 104 Q248 96 262 100", 2, "#f3c79f")}
    ${mound(28, 128, 198, 236, 0.68)}
    ${weatherMast(210, 186)}`);
}

function crater() {
  const rocks = [[40, 172, 9, 6], [272, 152, 8, 5], [254, 92, 7, 5], [62, 90, 8, 5], [108, 196, 7, 4], [292, 120, 5, 4], [28, 128, 6, 4]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#bfae9c" ${S2}/><ellipse cx="${x - rx * 0.3}" cy="${y - ry * 0.35}" rx="${rx * 0.4}" ry="${ry * 0.3}" fill="#e6dccd"/>`).join("");
  return svg(`${patch(155, 105)}
    <ellipse cx="150" cy="132" rx="146" ry="80" fill="#d08a5e" opacity="0.45"/>
    ${shadow(162, 136, 120, 58, 0.22)}
    <ellipse cx="150" cy="128" rx="118" ry="56" fill="#dca07a" ${S}/>
    <ellipse cx="150" cy="124" rx="92" ry="40" fill="#8f5034" ${S}/>
    <path d="M58 124 A92 40 0 0 1 242 124 A92 22 0 0 0 58 124 Z" fill="#c07a52"/>
    <path d="M58 124 A92 40 0 0 1 116 87 Q84 104 78 125 Z" fill="rgba(60,25,10,0.35)"/>
    <ellipse cx="156" cy="134" rx="60" ry="15" fill="#7d432b"/>
    <ellipse cx="150" cy="124" rx="92" ry="40" fill="none" ${S}/>
    ${line("M40 118 A118 56 0 0 1 118 74", 3.5, "#f2c39c")}
    ${rocks}
    ${seismometer(210, 186)}`);
}

function cliff() {
  const bands = [["#d9965f", 100], ["#b8703f", 118], ["#e0a676", 132], ["#a9633a", 146], ["#cf8a57", 158]]
    .map(([c, y]) => `<rect x="30" y="${y}" width="240" height="20" fill="${c}"/>`).join("");
  const seams = [118, 132, 146, 158].map((y, i) => line(`M46 ${y + 2} Q100 ${y - 3 + i} 150 ${y} T254 ${y - 2}`, 1.6, "#7a4a35")).join("");
  return svg(`${patch(152, 100)}
    <defs><clipPath id="wall"><path d="M48 104 L252 98 L257 168 L44 173 Z"/></clipPath></defs>
    ${shadow(170, 174, 118, 16)}
    <g clip-path="url(#wall)">${bands}${seams}<rect x="205" y="90" width="60" height="90" fill="rgba(60,25,10,0.22)"/></g>
    <path d="M48 104 L252 98 L257 168 L44 173 Z" fill="none" ${S}/>
    <path d="M48 104 L88 66 L208 58 L252 98 Z" fill="#e8b388" ${S}/>
    <path d="M102 92 L215 88 L216 101 L100 104 Z" fill="#c07848" ${S}/>
    <path d="M102 92 L120 72 L190 68 L215 88 Z" fill="#f0c39a" ${S}/>
    ${line("M92 70 L120 66", 2.5, "#f8dcbf")}
    <ellipse cx="40" cy="178" rx="9" ry="5" fill="#bfae9c" ${S2}/><ellipse cx="262" cy="172" rx="7" ry="4" fill="#bfae9c" ${S2}/><ellipse cx="120" cy="184" rx="6" ry="4" fill="#bfae9c" ${S2}/>
    ${coreDrill(210, 186)}`);
}

function riverbed() {
  // a winding channel: raised banks, a sunken floor whose far (north) wall is lit, round pebbles on the floor
  const P = [[48, 96], [112, 84], [128, 146], [176, 140], [224, 134], [240, 166], [288, 172]]; // two joined cubic curves
  const c = `M${P[0]} C${P[1]} ${P[2]} ${P[3]} C${P[4]} ${P[5]} ${P[6]}`;
  const at = (t) => { // point on the centre line, t in 0..2
    const seg = t < 1 ? 0 : 3, u = t < 1 ? t : t - 1;
    const [a, b, d, e] = [P[seg], P[seg + 1], P[seg + 2], P[seg + 3]];
    const k = (i) => (1 - u) ** 3 * a[i] + 3 * (1 - u) ** 2 * u * b[i] + 3 * (1 - u) * u * u * d[i] + u ** 3 * e[i];
    return [k(0), k(1)];
  };
  const cols = ["#d9d0c4", "#bfae9c", "#a99886", "#e6dccd"];
  let pebbles = "";
  for (let i = 0; i < 20; i++) {
    const [x, y] = at(0.04 + (i / 19) * 1.92);
    const ox = ((i * 37) % 11) - 5, oy = ((i * 53) % 13) - 4, rx = 5 + ((i * 7) % 4), ry = rx * 0.65;
    pebbles += `<ellipse cx="${(x + ox).toFixed(1)}" cy="${(y + oy).toFixed(1)}" rx="${rx}" ry="${ry.toFixed(1)}" fill="${cols[i % 4]}" stroke="${OUT}" stroke-width="1.6"/>
      <ellipse cx="${(x + ox - rx * 0.3).toFixed(1)}" cy="${(y + oy - ry * 0.35).toFixed(1)}" rx="${(rx * 0.4).toFixed(1)}" ry="${(ry * 0.3).toFixed(1)}" fill="#fff" opacity="0.6"/>`;
  }
  return svg(`${patch(155, 105)}
    ${line(c, 88, "rgba(232,176,135,0.75)")}
    ${line(c, 50)}${line(c, 44, "#9c5b3a")}
    <g transform="translate(0 -14)">${line(c, 14, "#c98258")}</g>
    ${pebbles}
    ${line("M30 132 Q52 126 70 136 M246 232 Q262 238 280 236 M150 104 Q170 108 186 104", 2, "#f3c79f")}
    ${sampleCase(210, 186)}`);
}

function canyon() {
  const blob = "M20 130 C20 52 90 20 165 20 C250 20 305 60 305 130 C305 205 245 244 160 244 C80 244 20 210 20 130 Z";
  const valley = "M150 10 C170 70 120 120 110 160 C100 200 60 230 30 260 L95 260 C130 215 165 185 180 150 C195 110 215 60 205 10 Z";
  return svg(`
    <defs><clipPath id="blob"><path d="${blob}"/></clipPath></defs>
    ${shadow(170, 140, 150, 112, 0.25)}
    <g clip-path="url(#blob)">
      <rect x="0" y="0" width="320" height="260" fill="#e2a577"/>
      <path d="M0 0 H150 C170 70 120 120 110 160 C100 200 60 230 30 260 H0 Z" fill="#d99a6c"/>
      <path d="${valley}" fill="#6e3d28"/>
      <path d="M205 10 C215 60 195 110 180 150 C165 185 130 215 95 260 L78 260 C113 212 150 180 164 146 C178 106 196 60 188 10 Z" fill="#c07a50"/>
      <path d="M188 10 C196 60 178 106 164 146 C150 180 113 212 78 260 L68 260 C102 214 140 182 154 146 C168 108 184 60 176 10 Z" fill="#a8653f"/>
      <path d="M150 10 C170 70 120 120 110 160 C100 200 60 230 30 260 L46 260 C76 230 114 200 124 162 C136 122 184 72 164 10 Z" fill="#4e2a1c"/>
      ${line("M150 10 C170 70 120 120 110 160 C100 200 60 230 30 260", 3)}
      ${line("M205 10 C215 60 195 110 180 150 C165 185 130 215 95 260", 3)}
      ${line("M128 60 Q118 90 102 100", 2, "#f3c79f")}${line("M240 60 Q262 70 280 66 M236 222 Q256 214 276 218", 2, "#f3c79f")}
      <ellipse cx="128" cy="210" rx="6" ry="4" fill="#bfae9c" ${S2}/><ellipse cx="160" cy="120" rx="5" ry="3" fill="#bfae9c" ${S2}/>
    </g>
    <path d="${blob}" fill="none" ${S}/>
    ${scanner(210, 186)}`);
}

function delta() {
  const fan = "M30 90 C60 60 110 70 140 80 C190 60 250 70 285 110 C300 140 290 175 260 190 C230 205 190 200 160 190 C120 200 70 180 45 150 C30 130 25 110 30 90 Z";
  const front = "M45 150 C70 180 120 200 160 190 C190 200 230 205 260 190 C290 175 300 140 285 110 L293 118 C307 152 298 188 266 203 C232 219 190 213 160 205 C118 213 66 195 42 160 Z";
  const ch = "M14 92 C40 94 80 100 110 110 C140 120 170 130 200 140 C220 147 240 150 262 152 M110 110 C140 98 180 92 222 98 C238 100 252 104 266 112 M150 124 C160 150 180 168 206 176 M200 140 C218 128 244 126 270 132";
  return svg(`${patch(155, 105)}
    ${shadow(172, 160, 130, 50, 0.25)}
    <path d="${front}" fill="#a8633d" ${S}/>
    <path d="${fan}" fill="#e3ad82" ${S}/>
    <path d="M14 92 C22 92 26 92 30 92" stroke="${OUT}" stroke-width="3"/>
    ${line(ch, 7, "#b47a58")}${line(ch, 2, "#f0c9a6")}
    ${line("M60 80 Q80 72 104 78", 2.5, "#f6d5b5")}
    ${sampleTubes(210, 186)}`);
}

// ---------- the landmark: a six-wheeled rover like Perseverance, facing west ----------
function rover() {
  const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3b3633" ${S}/><circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="#a9b4bf" ${S2}/>`;
  return svg(`
    ${shadow(112, 140, 72, 12, 0.35)}
    ${wheel(64, 110, 12)}${wheel(104, 110, 12)}${wheel(144, 110, 12)}
    <polygon points="156,84 176,74 182,94 162,104" fill="#5d544d" ${S}/>
    ${line("M164 82 L169 99 M171 79 L175 96", 1.6, "#8a7d71")}
    <polygon points="40,96 150,96 166,82 56,82" fill="#f7f2ea" ${S}/>
    <polygon points="150,96 166,82 166,106 150,120" fill="#c9bfb0" ${S}/>
    <rect x="40" y="96" width="110" height="24" fill="#e4dccf" ${S}/>
    ${line("M48 108 H142", 1.6, "#bfb3a2")}
    <ellipse cx="128" cy="88" rx="10" ry="4.5" fill="#fff" ${S2}/>
    ${line("M62 86 V38", 5)}${line("M62 86 V38", 2.2, "#ece6dc")}
    <rect x="50" y="24" width="28" height="15" rx="3.5" fill="#f4efe6" ${S2}/>
    <circle cx="58" cy="31.5" r="3.6" fill="#1f3b40"/><circle cx="70" cy="31.5" r="3.6" fill="#1f3b40"/>
    <circle cx="57" cy="30.5" r="1.2" fill="#bfe3df"/><circle cx="69" cy="30.5" r="1.2" fill="#bfe3df"/>
    ${line("M42 104 L22 92 L18 114", 4.5)}${line("M42 104 L22 92 L18 114", 2, "#a9b4bf")}
    <circle cx="18" cy="116" r="5.5" fill="#a9b4bf" ${S2}/>
    ${line("M52 130 L76 117 L98 132 M98 132 L122 117 L142 130", 3.5, "#7d8894")}
    ${wheel(52, 130, 14)}${wheel(98, 132, 14)}${wheel(144, 130, 14)}`, 200, 170);
}

const files = {
  site_dune: dune, site_crater: crater, site_cliff: cliff, site_riverbed: riverbed, site_canyon: canyon, site_delta: delta,
  site_meteorite: meteorite, site_lava: lava, site_northfan: northfan, site_outlet: outlet, site_eastcrater: eastcrater, rover,
};
for (const [name, draw] of Object.entries(files)) {
  const out = draw().replace(/\s*\n\s*/g, "\n");
  writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), out + "\n");
  console.log(`assets/${name}.svg`, out.length, "bytes");
}
