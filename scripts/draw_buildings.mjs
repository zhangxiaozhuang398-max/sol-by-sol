// Draws the four base buildings in a cartoon three-quarter view (front wall
// and roof seen from above at an angle, dark outline, bright flat colours) and
// writes them to assets/. The drawings are original, made with code (AI-generated).
// The sun is in the west (left) like in the orbital photo: shade on the right,
// shadows fall to the east. Ground contact is near (100, 140) of each 200 x 170 box.
// Usage: node scripts/draw_buildings.mjs
import { writeFileSync } from "node:fs";

const OUT = "#3a2418";

function kit(st, id) {
  const A = st === "A";
  const S = A ? `stroke="${OUT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"` : "";
  const S2 = A ? `stroke="${OUT}" stroke-width="2" stroke-linejoin="round"` : "";
  // [flat colour for A, gradient stops (left → right / top → bottom) for C]
  const P = {
    wall: ["#efe7da", ["#fffaf2", "#e6dccd", "#b3a590"]],
    top: ["#f8f3ea", ["#ffffff", "#ece4d6"]],
    dome: ["#f6f1e8", ["#ffffff", "#f0e9dd", "#b9ab96"]],
    accent: ["#e07a3f", ["#f39a5c", "#d76c33", "#a3491d"]],
    metal: ["#a9b4bf", ["#d4dce4", "#a3aeb9", "#6f7a86"]],
    metalD: ["#7d8894", ["#98a3ae", "#5d6874"]],
    glass: ["rgba(165,228,246,0.55)", ["rgba(210,245,255,0.75)", "rgba(140,210,235,0.45)", "rgba(90,160,200,0.6)"]],
    blue: ["#3a6fd0", ["#5b8ee8", "#2f5fbf", "#1f3f86"]],
    dirt: ["#c27650", ["#d48a62", "#b06640", "#8a4a2c"]],
    light: ["#ffd56b", ["#fff2b0", "#ffc94a"]],
    plant: ["#5dbb4f", ["#8ad66d", "#4aa83f", "#2f7a2c"]],
    dish: ["#f4f0e8", ["#ffffff", "#e7e0d4", "#b8ac9a"]],
    dishIn: ["#d9d2c6", ["#c8beb0", "#efe9df", "#fbf8f2"]],
  };
  const defs = [];
  const f = (k, dir = "h") => {
    if (A) return P[k][0];
    const gid = `${id}-${k}-${dir}`;
    if (!defs.some((d) => d.includes(`"${gid}"`))) {
      const stops = P[k][1].map((c, i, a) => `<stop offset="${i / (a.length - 1)}" stop-color="${c}"/>`).join("");
      defs.push(dir === "h"
        ? `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0.35">${stops}</linearGradient>`
        : `<linearGradient id="${gid}" x1="0" y1="0" x2="0.25" y2="1">${stops}</linearGradient>`);
    }
    return `url(#${gid})`;
  };
  const shade = A ? "rgba(70,35,15,0.2)" : `url(#${id}-shade)`;
  if (!A) defs.push(`<linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(60,30,10)" stop-opacity="0"/><stop offset="1" stop-color="rgb(60,30,10)" stop-opacity="0.38"/></linearGradient>`,
    `<filter id="${id}-blur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>`);
  const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(40,15,5,${A ? 0.35 : 0.5})" ${A ? "" : `filter="url(#${id}-blur)"`}/>`;
  const shine = (d, o = 0.7) => `<path d="${d}" fill="#fff" opacity="${A ? o : o * 0.8}"/>`;
  const wrap = (body, w = 200, h = 170) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}"><defs>${defs.join("")}</defs>${body}</svg>`;
  return { A, S, S2, f, shade, shadow, shine, wrap, defs };
}

// Habitat: a dome on a round base banked with Mars soil, an orange band, a lit
// window and an airlock door facing south (towards the player).
function habitat(st) {
  const id = `hab${st}`;
  const k = kit(st, id);
  k.defs.push(`<clipPath id="${id}-b"><path d="M30 95 V138 A70 16 0 0 0 170 138 V95 Z"/></clipPath>`,
    `<clipPath id="${id}-d"><path d="M40 95 A60 60 0 0 1 160 95 A60 13 0 0 1 40 95 Z"/></clipPath>`);
  return k.wrap(`
    ${k.shadow(118, 147, 86, 15)}
    <ellipse cx="100" cy="141" rx="82" ry="18" fill="${k.f("dirt")}" ${k.S2}/>
    <path d="M30 95 V138 A70 16 0 0 0 170 138 V95 Z" fill="${k.f("wall")}"/>
    <path d="M30 113 A70 16 0 0 0 170 113 V122 A70 16 0 0 1 30 122 Z" fill="${k.f("accent")}"/>
    <g clip-path="url(#${id}-b)"><rect x="118" y="80" width="60" height="80" fill="${k.shade}"/></g>
    <path d="M30 95 V138 A70 16 0 0 0 170 138 V95" fill="none" ${k.S}/>
    <ellipse cx="100" cy="95" rx="70" ry="16" fill="${k.f("top")}" ${k.S}/>
    <path d="M40 95 A60 60 0 0 1 160 95 A60 13 0 0 1 40 95 Z" fill="${k.f("dome")}"/>
    <g clip-path="url(#${id}-d)"><path fill-rule="evenodd" d="M30 20 H175 V110 H30 Z M28 78 A60 60 0 1 0 148 78 A60 60 0 1 0 28 78 Z" fill="${k.shade}"/></g>
    <g fill="none" stroke="${k.A ? "#cfc5b4" : "rgba(150,135,115,0.55)"}" stroke-width="1.6">
      <path d="M68 105 Q70 55 100 35"/><path d="M132 105 Q130 55 100 35"/><path d="M45 76 Q100 92 155 76"/><path d="M58 54 Q100 66 142 54"/>
    </g>
    <path d="M40 95 A60 60 0 0 1 160 95" fill="none" ${k.S}/>
    ${k.shine("M58 62 Q64 44 84 38 Q70 48 66 64 Z", 0.75)}
    <circle cx="80" cy="76" r="9" fill="${k.f("light", "v")}" ${k.S}/>
    <circle cx="77" cy="73" r="2.6" fill="#fff" opacity="0.8"/>
    <circle cx="122" cy="72" r="6" fill="${k.f("light", "v")}" ${k.S2}/>
    <path d="M86 142 V117 Q86 105 100 105 Q114 105 114 117 V142 Z" fill="${k.f("metal")}" ${k.S}/>
    <circle cx="100" cy="118" r="4.5" fill="${k.f("glass", "v")}" ${k.S2}/>
    <rect x="82" y="141" width="36" height="7" rx="2" fill="${k.f("metalD", "v")}" ${k.S2}/>
    <path d="M136 44 L144 15" stroke="${k.A ? OUT : "#6f7a86"}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="144" cy="14" r="4.2" fill="#ff5a4f" ${k.S2}/>
  `);
}

// Greenhouse: a glass house with a pitched roof, plants growing inside, a door
// in the right gable.
function greenhouse(st) {
  const id = `gh${st}`;
  const k = kit(st, id);
  const plants = [44, 60, 76, 92, 108, 124, 138].map((x, i) =>
    `<ellipse cx="${x}" cy="${128 - (i % 2) * 5}" rx="${9 + (i % 3)}" ry="${11 + (i % 2) * 3}" fill="${k.f("plant", "v")}"/>
     <circle cx="${x - 3}" cy="${123 - (i % 2) * 5}" r="2.2" fill="${i % 3 ? "#ff7a59" : "#ffd23f"}"/>`).join("");
  const frame = k.A ? "#f6f2ea" : "rgba(250,247,240,0.95)";
  return k.wrap(`
    ${k.shadow(116, 145, 84, 14)}
    <polygon points="26,140 154,140 182,121 182,128 154,147 26,147" fill="${k.f("metalD", "v")}" ${k.S2}/>
    <polygon points="150,100 176,82 176,122 150,140" fill="${k.f("glass", "v")}" ${k.S}/>
    <polygon points="150,100 163,61 176,82" fill="${k.f("glass", "v")}" ${k.S}/>
    <polygon points="157,135 169,127 169,104 157,112" fill="${k.f("metal")}" ${k.S2}/>
    <polygon points="150,100 176,82 176,122 150,140" fill="${k.shade}"/>
    ${plants}
    <polygon points="30,100 150,100 163,61 43,61" fill="${k.f("glass", "v")}" ${k.S}/>
    <ellipse cx="96" cy="88" rx="44" ry="10" fill="${k.f("plant", "v")}" opacity="0.55"/>
    <rect x="30" y="100" width="120" height="40" fill="${k.f("glass", "v")}" ${k.S}/>
    <g stroke="${frame}" stroke-width="2.6" stroke-linecap="round" fill="none">
      <path d="M60 100 V140 M90 100 V140 M120 100 V140 M30 118 H150"/>
      <path d="M60 100 L73 61 M90 100 L103 61 M120 100 L133 61 M36 81 H157"/>
      <path d="M163 61 L163 131 M150 120 L176 102"/>
    </g>
    <path d="M43 61 H163" stroke="${frame}" stroke-width="4.5" stroke-linecap="round"/>
    ${k.A ? `<path d="M30 100 H150 L163 61 H43 Z M30 100 V140 H150 V100 M150 140 L176 122 V82 L163 61" fill="none" ${k.S}/>` : ""}
    ${k.shine("M38 98 L48 66 L56 66 L46 98 Z", 0.5)}
    ${k.shine("M36 104 L46 104 L40 136 L34 136 Z", 0.35)}
  `);
}

// Solar panels: two rows of tilted panels on legs, and a small power box.
function panels(st) {
  const id = `pn${st}`;
  const k = kit(st, id);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const row = (bl, br, tr, tl, cols, legs) => {
    const quad = [bl, br, tr, tl].map((p) => p.join(",")).join(" ");
    const edge = [bl, br, [br[0], br[1] + 5], [bl[0], bl[1] + 5]].map((p) => p.join(",")).join(" ");
    let grid = "";
    for (let i = 1; i < cols; i++) { const a = lerp(bl, br, i / cols), b = lerp(tl, tr, i / cols); grid += `M${a.join(" ")} L${b.join(" ")} `; }
    const m1 = lerp(bl, tl, 0.5), m2 = lerp(br, tr, 0.5);
    grid += `M${m1.join(" ")} L${m2.join(" ")}`;
    const legLines = legs.map(([x, y, h]) => `<path d="M${x} ${y} V${y + h}" stroke="${k.A ? OUT : "#5d6874"}" stroke-width="${k.A ? 4 : 3.5}" stroke-linecap="round"/>`).join("");
    const sh = lerp(bl, br, 0.18), sh2 = lerp(bl, br, 0.32), sh3 = lerp(tl, tr, 0.42), sh4 = lerp(tl, tr, 0.28);
    return `${legLines}
      <polygon points="${edge}" fill="${k.f("metalD", "v")}" ${k.S2}/>
      <polygon points="${quad}" fill="${k.f("blue", "v")}" ${k.S}/>
      <path d="${grid}" stroke="${k.A ? "#a9c6f5" : "rgba(190,215,255,0.6)"}" stroke-width="1.4" fill="none"/>
      <polygon points="${[sh, sh2, sh3, sh4].map((p) => p.join(",")).join(" ")}" fill="#fff" opacity="${k.A ? 0.28 : 0.22}"/>
      ${k.A ? `<polygon points="${quad}" fill="none" ${k.S}/>` : ""}`;
  };
  return k.wrap(`
    ${k.shadow(112, 140, 90, 13)}
    ${row([52, 80], [178, 80], [188, 48], [62, 48], 6, [[72, 80, 16], [168, 80, 16]])}
    ${row([20, 124], [156, 124], [168, 88], [32, 88], 6, [[36, 126, 16], [140, 126, 16]])}
    <rect x="160" y="116" width="22" height="24" rx="3" fill="${k.f("wall")}" ${k.S}/>
    <rect x="160" y="116" width="22" height="24" rx="3" fill="${k.shade}"/>
    <path d="M166 124 l4 -5 l-1 4 h4 l-4 6 l1 -4 z" fill="${k.f("light", "v")}"/>
  `);
}

// Antenna: a big white dish on a mast, tipped up towards Earth, on a small
// equipment box, with a red light on the feed.
function antenna(st) {
  const id = `an${st}`;
  const k = kit(st, id);
  return k.wrap(`
    ${k.shadow(114, 146, 50, 11)}
    <polygon points="80,121 118,121 128,113 90,113" fill="${k.f("top")}" ${k.S}/>
    <rect x="80" y="121" width="38" height="22" fill="${k.f("wall")}" ${k.S}/>
    <polygon points="118,121 128,113 128,135 118,143" fill="${k.f("wall")}" ${k.S}/>
    <polygon points="118,121 128,113 128,135 118,143" fill="${k.shade}"/>
    <rect x="86" y="127" width="10" height="5" rx="1.5" fill="#7ad67a"/><rect x="99" y="127" width="10" height="5" rx="1.5" fill="${k.f("light", "v")}"/>
    <rect x="96" y="68" width="10" height="50" fill="${k.f("metal")}" ${k.S}/>
    <g transform="rotate(-24 101 60)">
      <ellipse cx="101" cy="62" rx="50" ry="22" fill="${k.f("dish")}" ${k.S}/>
      <ellipse cx="101" cy="59" rx="43" ry="16" fill="${k.f("dishIn", "v")}"/>
      ${k.A ? `<ellipse cx="101" cy="59" rx="43" ry="16" fill="none" stroke="${OUT}" stroke-width="1.5" opacity="0.5"/>` : ""}
      <path d="M62 62 L101 18 M140 62 L101 18 M101 74 L101 18" stroke="${k.A ? OUT : "#7d8894"}" stroke-width="2.2" fill="none"/>
      <rect x="95" y="12" width="12" height="11" rx="2" fill="${k.f("metal")}" ${k.S2}/>
      <circle cx="101" cy="9" r="3.8" fill="#ff5a4f" ${k.S2}/>
      ${k.shine("M60 56 Q70 44 92 42 Q74 48 66 60 Z", 0.6)}
    </g>
  `);
}

for (const [name, draw] of Object.entries({ habitat, greenhouse, panels, antenna })) {
  const svg = draw("A").replace(/\s*\n\s*/g, "\n");
  writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg + "\n");
  console.log(`assets/${name}.svg`, svg.length, "bytes");
}
