// The World Today — Friday 20 November 2026.
// A newspaper front page that sums up the day's world news in one image.
// Node 22, standard library only, no network. Deterministic: two runs
// write byte-identical PNG files to /output/entry.png.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [248, 244, 233];
const INK: [number, number, number] = [25, 23, 19];
const RED: [number, number, number] = [163, 22, 33];
const GREY: [number, number, number] = [90, 84, 72];

// ---- 5x7 pixel font: each glyph is 7 rows, bit 4 = leftmost pixel. ----
type Glyph = number[];
const FONT: Record<string, Glyph> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [30, 1, 1, 14, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "%": [24, 25, 2, 4, 8, 19, 3],
  "$": [4, 15, 20, 14, 5, 30, 4],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  "•": [0, 0, 14, 14, 14, 0, 0],
};

function normaliseChar(ch: string): string {
  if (ch === "—" || ch === "–") return "-";
  if (ch === "’" || ch === "‘") return "'";
  if (ch === "“" || ch === "”") return '"';
  return ch.toUpperCase();
}

// ---- Canvas: an RGB buffer with small drawing helpers. ----
const buf = Buffer.alloc(W * H * 3);

function setPx(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: [number, number, number]): void {
  fillRect(x, y, w, 1, c);
}

function vline(x: number, y: number, h: number, c: [number, number, number]): void {
  fillRect(x, y, 1, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function disc(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPx(cx + x, cy + y, c);
  }
}

function fillTriangle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c: [number, number, number],
): void {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const edges: Array<[number, number, number, number]> = [
    [x0, y0, x1, y1],
    [x1, y1, x2, y2],
    [x2, y2, x0, y0],
  ];
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      for (let x = Math.ceil(lo); x <= Math.floor(hi); x++) setPx(x, y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    setPx(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const raw of s) {
    const g = FONT[normaliseChar(raw)] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentred(s: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap to a pixel width; returns lines (already upper-cased by drawText).
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawLines(lines: string[], x: number, y: number, scale: number, c: [number, number, number]): void {
  let yy = y;
  for (const ln of lines) {
    drawText(ln, x, yy, scale, c);
    yy += 9 * scale;
  }
}

// ---- Deterministic PNG encoder (filter 0, zlib level 9, no timestamps). ----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(): Buffer {
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
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Page sections (filled in by the edits that follow). ----
function drawMasthead(): void {
  drawCentred("THE WORLD TODAY", 512, 28, 6, INK);
  hline(32, 100, 960, INK);
  hline(32, 104, 960, INK);
  drawCentred("FRIDAY 20 NOVEMBER 2026 - THE DAY IN ONE IMAGE", 512, 116, 3, INK);
  hline(32, 142, 960, GREY);
}

function drawLead(): void {
  // Kicker + headline.
  drawText("THE HAGUE - WORLD COURT", 48, 158, 2, RED);
  drawText("MYANMAR COMMITTED", 48, 186, 5, INK);
  drawText("GENOCIDE, COURT RULES", 48, 231, 5, INK);
  hline(48, 292, 600, INK);
  // Deck, left column.
  const deck = wrap(
    "First state ever held responsible for genocide in the World Court's " +
      "80-year history. The Hague orders reparations for the Rohingya, " +
      "including their safe return home.",
    600,
    2,
  );
  drawLines(deck, 48, 306, 2, INK);
  drawText("VOTE 9-6 - CASE BROUGHT BY THE GAMBIA IN 2019", 48, 396, 2, GREY);
  // Scales of justice, right column.
  const cx = 840;
  disc(cx, 192, 6, INK); // finial
  fillRect(cx - 2, 198, 4, 204, INK); // pillar
  fillRect(cx - 44, 402, 88, 8, INK); // base
  fillRect(cx - 112, 210, 224, 5, INK); // beam
  // Left pan: strings + solid bowl.
  line(cx - 110, 215, cx - 135, 272, INK);
  line(cx - 110, 215, cx - 85, 272, INK);
  fillTriangle(cx - 135, 272, cx - 85, 272, cx - 110, 302, INK);
  // Right pan: strings + solid bowl.
  line(cx + 110, 215, cx + 85, 272, INK);
  line(cx + 110, 215, cx + 135, 272, INK);
  fillTriangle(cx + 85, 272, cx + 135, 272, cx + 110, 302, INK);
  // Ground shadow + caption.
  hline(700, 416, 280, RED);
  drawCentred("JUSTICE, AT LAST", 840, 428, 2, GREY);
  // Section divider.
  hline(32, 452, 960, INK);
}

function drawCell(
  x: number,
  y: number,
  kicker: string,
  headline: string,
  deck: string,
): void {
  drawText(kicker, x, y, 2, RED);
  const hl = wrap(headline, 468, 3);
  drawLines(hl, x, y + 24, 3, INK);
  const dk = wrap(deck, 468, 2).slice(0, 3);
  drawLines(dk, x, y + 24 + hl.length * 27 + 6, 2, INK);
}

function drawGrid(): void {
  const rows = [468, 612, 756];
  drawCell(
    32, rows[0], "SUMMIT - BEIJING",
    "Three powers, one table",
    "Trump, Xi and Putin hold the first-ever trilateral meeting in China; nuclear arms on the agenda.",
  );
  drawCell(
    524, rows[0], "WASHINGTON",
    "Trump delays Iran call to 2027",
    "No rush, he says - he will 'see what happens' after 1 January.",
  );
  drawCell(
    32, rows[1], "SPACE",
    "Voyager 1, a light-day away",
    "NASA confirms the milestone, nearly 50 years after launch.",
  );
  drawCell(
    524, rows[1], "CULTURE",
    "GTA VI sales pass $1.8bn",
    "Rockstar's game overtakes The Odyssey's entire global box-office run.",
  );
  drawCell(
    32, rows[2], "WEATHER",
    "Cyclone Akvan hits Odisha",
    "300,000 evacuated as the storm makes landfall on India's east coast.",
  );
  drawCell(
    524, rows[2], "EUROPE",
    "Europe open to Russia talks",
    "Leaders say they are ready for talks on ending the war in Ukraine.",
  );
  vline(512, 468, 424, GREY);
}

function drawStrip(): void {
  hline(32, 906, 960, INK);
  drawText("ALSO TODAY", 32, 926, 2, RED);
  drawText("HAYABUSA2 LANDING OFF - ANTHROPIC $1.5TN - RIYADH TOWER HIT", 164, 926, 2, INK);
  drawText("NICHOLLS CENTURY AS NEW ZEALAND BAT INDIA", 164, 946, 2, INK);
  hline(32, 972, 960, GREY);
  drawCentred("THE WORLD TODAY - FRIDAY 20 NOVEMBER 2026", 512, 984, 2, INK);
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  drawGrid();
  drawStrip();
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  fs.mkdirSync(outDir, { recursive: true });
  drawPage();
  fs.writeFileSync(`${outDir}/entry.png`, encodePng());
}

main();
