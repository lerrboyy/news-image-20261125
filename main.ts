// The World in One Page — Wednesday 25 November 2026.
// A program that draws the day's world news as one newspaper front page and
// writes it to /output/entry.png. Node 22, standard library only, no network,
// fully deterministic: the same input always produces the same bytes.
//
// Layout (1024 x 1024): masthead, hero scene of the Strait of Hormuz tanker
// fire with the lead headline, a markets ticker, six region panels with 31
// sourced stories, a "day in order" strip, and a sources footer.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [20, 20, 20];
const NAVY: RGB = [15, 36, 64];
const NAVY2: RGB = [24, 52, 88];
const RED: RGB = [179, 32, 44];
const GOLD: RGB = [201, 162, 39];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [90, 90, 84];
const PANEL_BG: RGB = [255, 255, 255];
const TICKER_BG: RGB = [26, 26, 26];
const HERO_BG: RGB = [18, 40, 62];

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph is 7 rows of 5 pixels, '#' = on. Uppercase letters, digits and
// the punctuation this page needs. Drawn at scale 2 (14 px tall) for body
// text and scale 3 for the lead headline.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '•': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
  '▼': ['11111', '11111', '01110', '01110', '00100', '00100', '00000'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

// ---------------------------------------------------------------- canvas
class Canvas {
  buf = new Uint8Array(W * H * 3);
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
  }
  hline(x: number, y: number, w: number, c: RGB): void {
    this.fillRect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: RGB): void {
    this.fillRect(x, y, 1, h, c);
  }
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.max(0, Math.min(x0, x1, x2));
    const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
    const minY = Math.max(0, Math.min(y0, y1, y2));
    const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x - x0) * (y2 - y0) - (y - y0) * (x2 - x0)) / d;
        const b = ((x - x1) * (y0 - y1) - (y - y1) * (x0 - x1)) / d;
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.set(x, y, c);
      }
    }
  }
  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
    }
  }
  // Draw one glyph row-set at (x, y), top-left, scaled.
  glyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
    const rows = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (rows[r][col] === '1') {
          this.fillRect(x + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
  text(x: number, y: number, s: string, scale: number, c: RGB): void {
    const up = s.toUpperCase();
    for (let i = 0; i < up.length; i++) {
      this.glyph(up[i], x + i * 6 * scale, y, scale, c);
    }
  }
  textCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
    this.text(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
  }
}

// Mix two colours by t in [0,1].
function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ------------------------------------------------------------------ data
// Every story is two short lines that fit one panel column (<= 23 chars).
// All facts are as reported on 25 November 2026; claims are labelled.
interface Panel {
  title: string;
  color: RGB;
  stories: [string, string][];
}

const PANELS: Panel[] = [
  {
    title: 'MIDDLE EAST',
    color: [140, 43, 43],
    stories: [
      ['TANKERS HIT BY MINES', '2 ABLAZE IN HORMUZ'],
      ['HOUTHIS HIT SAUDI', 'RAS TANURA REFINERY'],
      ['RIYADH TOWER STRUCK', '11 PEOPLE WOUNDED'],
      ['HAMAS COLONEL KILLED', 'ABUELOUF, IN GAZA'],
      ['SUDAN DRONE STRIKES', '19 CIVILIANS KILLED'],
    ],
  },
  {
    title: 'EUROPE',
    color: [31, 78, 121],
    stories: [
      ['RUSSIA HITS ODESA', '2 KILLED, CHILD HURT'],
      ['PUTIN: STRIKES GO ON', 'DESPITE TRUMP PLEA'],
      ['490,334 RUSSIAN DEAD', 'LEAKED FIGURES: BBC'],
      ['HUNGARY, UKRAINE TALK', "A 'FRESH START': TRADE"],
      ['SARKOZY FACES TRIAL', 'WITNESS TAMPERING'],
    ],
  },
  {
    title: 'AMERICAS',
    color: [46, 107, 52],
    stories: [
      ['US TARIFFS: 20-40%', 'ON 14 ECONOMIES'],
      ['WALL ST SLIDES', 'S&P -2.2% NAS -3.2%'],
      ['HUAWEI CONVICTED', 'TRADE SECRETS, FRAUD'],
      ['VENEZUELA DEBT $237BN', 'RESTRUCTURE AHEAD'],
      ['WHO: END US FUEL', 'BLOCKADE ON CUBA'],
      ['IOWA BLAST: ARMY', 'DESTROYS 5T EXPLOSIVES'],
    ],
  },
  {
    title: 'ASIA-PACIFIC',
    color: [122, 74, 18],
    stories: [
      ['SHENZHOU-24 DOCKS', '1ST PAKISTANI IN SPACE'],
      ['KOSPI -6.2%', 'AI DOUBTS HIT CHIPS'],
      ['GOLD MINE FLOODS', '9 DEAD, 17 TRAPPED'],
      ['SOLOMONS PACT', 'NO FOREIGN BASES'],
      ['BANGLADESH PAY +36%', 'GARMENT WAGE $139'],
      ['HONG KONG FIRE: 1 YEAR', 'SURVIVORS SEEK ANSWERS'],
    ],
  },
  {
    title: 'TECH & SPACE',
    color: [74, 46, 107],
    stories: [
      ['SPACEX: 1M SATELLITES', 'ORBITAL DATA CENTRES'],
      ['CIA, ODNI HACKED', 'US SPY DATA BREACHED'],
      ["NVIDIA'S HUANG RETURNS", 'OPEN-WEIGHT AI DEBATE'],
      ['META LAUNCHES MUSE', 'UK WATCHDOG WARNS'],
      ['MALAYSIA SUES GOOGLE', '$150M OVER YOUTUBE'],
    ],
  },
  {
    title: 'CLIMATE & WORLD',
    color: [20, 82, 74],
    stories: [
      ['COP31 TALKS FAIL', 'POPE LEO XIV CONCERNED'],
      ['LANDMINE DEATHS HIT', 'FIVE-YEAR HIGH'],
      ['SHANGHAI CHIEF PROBED', 'CORRUPTION INQUIRY'],
      ['MALAYSIA RETURNS', 'REFUGEES TO MYANMAR'],
    ],
  },
];

const TIMELINE: [string, string] = [
  'THE DAY IN ORDER:  1 KOSPI -6.2%  2 US TARIFFS PROPOSED  3 HUAWEI CONVICTED',
  '4 SHENZHOU-24 DOCKS  5 HORMUZ TANKERS ABLAZE  6 COP31 TALKS FAIL',
];

// ------------------------------------------------------------- hero scene
// A dusk Strait of Hormuz: burning tankers, smoke, a naval mine, coastline.
function drawHero(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const skyTop: RGB = [38, 48, 80];
  const skyLow: RGB = [214, 110, 52];
  const horizon = Math.floor(h * 0.58);
  for (let yy = 0; yy < horizon; yy++) {
    cv.fillRect(x, y + yy, w, 1, mix(skyTop, skyLow, yy / horizon));
  }
  // Low sun.
  cv.fillCircle(x + Math.floor(w * 0.78), y + horizon - 26, 22, [255, 214, 140]);
  cv.fillCircle(x + Math.floor(w * 0.78), y + horizon - 26, 15, [255, 232, 180]);
  // Distant coastline silhouette.
  cv.fillRect(x, y + horizon - 14, w, 14, [52, 44, 52]);
  cv.fillTriangle(x + 40, y + horizon - 14, x + 90, y + horizon - 44, x + 140, y + horizon - 14, [52, 44, 52]);
  cv.fillTriangle(x + 430, y + horizon - 14, x + 480, y + horizon - 38, x + 530, y + horizon - 14, [52, 44, 52]);
  // Sea.
  const sea: RGB = [18, 40, 62];
  cv.fillRect(x, y + horizon, w, h - horizon, sea);
  for (let i = 0; i < 9; i++) {
    const wy = y + horizon + 8 + i * 9;
    const ww = w - 30 - i * 12;
    cv.hline(x + 14 + i * 6, wy, ww, [38, 84, 120]);
  }
  // Far tanker (small, left).
  const fx = x + 52;
  const fy = y + horizon - 6;
  cv.fillRect(fx, fy - 16, 150, 16, [26, 26, 26]);
  cv.fillRect(fx + 8, fy - 30, 34, 14, [210, 210, 200]);
  cv.fillRect(fx + 118, fy - 26, 12, 10, [179, 32, 44]);
  cv.fillTriangle(fx + 66, fy - 16, fx + 82, fy - 52, fx + 98, fy - 16, [245, 158, 11]);
  cv.fillTriangle(fx + 74, fy - 16, fx + 82, fy - 38, fx + 90, fy - 16, [255, 210, 63]);
  cv.fillCircle(fx + 82, fy - 56, 10, [58, 58, 58]);
  cv.fillCircle(fx + 74, fy - 68, 13, [70, 70, 70]);
  // Near tanker (large, centre-right), ablaze.
  const nx = x + 250;
  const ny = y + h - 26;
  cv.fillRect(nx, ny - 34, 330, 34, [22, 22, 22]);
  cv.fillRect(nx, ny - 40, 330, 6, [179, 32, 44]);
  cv.fillRect(nx + 30, ny - 66, 56, 32, [228, 226, 216]);
  cv.fillRect(nx + 36, ny - 62, 10, 8, [24, 52, 88]);
  cv.fillRect(nx + 56, ny - 62, 10, 8, [24, 52, 88]);
  cv.fillRect(nx + 250, ny - 58, 22, 24, [179, 32, 44]);
  cv.fillRect(nx + 250, ny - 58, 22, 5, [255, 255, 255]);
  // Flames on the near tanker.
  const flames: [number, number, number][] = [
    [nx + 110, ny - 34, 46],
    [nx + 150, ny - 34, 62],
    [nx + 196, ny - 34, 50],
  ];
  for (const [bx, by, fh] of flames) {
    cv.fillTriangle(bx - 26, by, bx, by - fh, bx + 26, by, [226, 72, 31]);
    cv.fillTriangle(bx - 17, by, bx, by - Math.floor(fh * 0.72), bx + 17, by, [245, 158, 11]);
    cv.fillTriangle(bx - 9, by, bx, by - Math.floor(fh * 0.45), bx + 9, by, [255, 210, 63]);
  }
  // Smoke columns.
  cv.fillCircle(nx + 150, ny - 108, 20, [48, 48, 48]);
  cv.fillCircle(nx + 138, ny - 128, 24, [58, 58, 58]);
  cv.fillCircle(nx + 158, ny - 148, 26, [66, 66, 66]);
  cv.fillCircle(nx + 150, ny - 168, 22, [76, 76, 76]);
  cv.fillCircle(nx + 196, ny - 96, 14, [52, 52, 52]);
  // Naval mine in the water, foreground left (above the caption strip).
  const mx = x + 120;
  const my = y + h - 38;
  cv.fillCircle(mx, my, 12, [12, 12, 12]);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const sx = Math.round(mx + Math.cos(a) * 12);
    const sy = Math.round(my + Math.sin(a) * 12);
    const ex = Math.round(mx + Math.cos(a) * 19);
    const ey = Math.round(my + Math.sin(a) * 19);
    cv.fillTriangle(sx - 2, sy - 2, ex, ey, sx + 2, sy + 2, [12, 12, 12]);
  }
  cv.fillCircle(mx, my, 4, [90, 90, 90]);
  // Caption strip.
  cv.fillRect(x, y + h - 26, w, 26, [10, 10, 10]);
  cv.text(x + 12, y + h - 20, 'STRAIT OF HORMUZ - TWO TANKERS ABLAZE', 2, WHITE);
}

// ---------------------------------------------------------------- layout
function drawPage(cv: Canvas): void {
  cv.fillRect(0, 0, W, H, PAPER);

  // Masthead.
  cv.fillRect(0, 0, W, 88, NAVY);
  cv.fillRect(0, 88, W, 4, GOLD);
  cv.textCentered(W / 2, 12, 'THE WORLD IN ONE PAGE', 5, WHITE);
  cv.textCentered(
    W / 2,
    58,
    'WEDNESDAY 25 NOVEMBER 2026  •  31 STORIES  •  7 REGIONS',
    2,
    [255, 214, 140],
  );

  // Hero: scene left, lead story right.
  const heroY = 100;
  const heroH = 228;
  const sceneW = 624;
  drawHero(cv, 16, heroY, sceneW, heroH);
  const leadX = 16 + sceneW + 16;
  const leadW = W - 16 - leadX;
  cv.fillRect(leadX, heroY, leadW, heroH, PANEL_BG);
  cv.fillRect(leadX, heroY, leadW, 4, RED);
  cv.fillRect(leadX + 12, heroY + 16, 62, 22, RED);
  cv.text(leadX + 20, heroY + 20, 'LEAD', 2, WHITE);
  cv.text(leadX + 12, heroY + 52, 'TANKERS ABLAZE IN', 3, INK);
  cv.text(leadX + 12, heroY + 80, 'THE STRAIT OF', 3, INK);
  cv.text(leadX + 12, heroY + 108, 'HORMUZ', 3, RED);
  cv.text(leadX + 12, heroY + 148, 'IRGC: MINES HIT TWO', 2, INK);
  cv.text(leadX + 12, heroY + 168, 'TANKERS; FIRES BURN', 2, INK);
  cv.text(leadX + 12, heroY + 194, 'HOUTHIS HIT REFINERY', 2, GREY);
  cv.text(leadX + 12, heroY + 214, 'AND RIYADH TOWER: 11 HURT', 2, GREY);

  // Markets ticker.
  const tickY = heroY + heroH + 8;
  cv.fillRect(16, tickY, W - 32, 34, TICKER_BG);
  cv.text(
    28,
    tickY + 10,
    'KOSPI ▼ -6.2%  •  S&P 500 ▼ -2.2%  •  NASDAQ ▼ -3.2%  •  TARIFFS 20-40% ON 14',
    2,
    WHITE,
  );

  // Region panels: 3 columns x 2 rows.
  const gridY = tickY + 34 + 10;
  const gridH = 548;
  const gap = 12;
  const colW = Math.floor((W - 32 - gap * 2) / 3);
  const rowH = Math.floor((gridH - gap) / 2);
  PANELS.forEach((panel, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const px = 16 + col * (colW + gap);
    const py = gridY + row * (rowH + gap);
    cv.fillRect(px, py, colW, rowH, PANEL_BG);
    cv.fillRect(px, py, colW, 32, panel.color);
    cv.text(px + 12, py + 9, panel.title, 2, WHITE);
    const n = panel.stories.length;
    const innerTop = py + 32 + 8;
    const innerH = rowH - 32 - 16;
    const slot = innerH / n;
    panel.stories.forEach(([head, detail], i) => {
      const sy = Math.floor(innerTop + i * slot);
      const chipX = px + 12;
      const chipY = sy + 2;
      cv.fillRect(chipX, chipY, 18, 18, panel.color);
      cv.text(chipX + 6, chipY + 3, String(i + 1), 2, WHITE);
      cv.text(px + 38, sy, head, 2, INK);
      cv.text(px + 38, sy + 17, detail, 2, GREY);
    });
  });

  // Timeline: the day in order, two lines so every beat fits.
  const tlY = gridY + gridH + 10;
  cv.fillRect(16, tlY, W - 32, 56, NAVY2);
  cv.text(28, tlY + 8, TIMELINE[0], 2, WHITE);
  cv.text(28, tlY + 32, TIMELINE[1], 2, [255, 214, 140]);

  // Footer: one line, inside the page.
  const ftY = tlY + 56 + 8;
  cv.textCentered(
    W / 2,
    ftY + 2,
    'SOURCES: REUTERS, AP, BBC, JUST SECURITY - CLAIMS LABELLED AS CLAIMS.',
    2,
    GREY,
  );
}

// ------------------------------------------------------------ PNG encode
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePng(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter none
    raw.set(cv.buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  // Clear the contents of the output directory only; never remove the
  // directory itself (it may be a mount point for the grader).
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), { recursive: true, force: true });
  }
  const cv = new Canvas();
  drawPage(cv);
  const png = encodePng(cv);
  if (png.length > 1048576) {
    throw new Error(`entry.png is ${png.length} bytes, over the 1 MiB limit`);
  }
  writeFileSync(join(outDir, 'entry.png'), png);
  const sha = createHash('sha256').update(png).digest('hex');
  console.log(`wrote entry.png: ${png.length} bytes, sha256 ${sha}`);
}

main();
