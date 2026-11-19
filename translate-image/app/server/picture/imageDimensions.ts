export type ImageDimensions = { width: number; height: number };

function pngSize(b: Buffer): ImageDimensions | null {
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): ImageDimensions | null {
  if (b.length < 10 || b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function isJpegSofMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}

function jpegSize(b: Buffer): ImageDimensions | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) return null;
    const marker = b[offset + 1]!;
    if (isJpegSofMarker(marker)) {
      return { height: b.readUInt16BE(offset + 5), width: b.readUInt16BE(offset + 7) };
    }
    offset += 2 + b.readUInt16BE(offset + 2);
  }
  return null;
}

function webpSize(b: Buffer): ImageDimensions | null {
  if (b.length < 30 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  }
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

/** 只读文件头，不解码像素；读不出返回 null（调用方按方图处理）。 */
export function readImageDimensions(bytes: Buffer): ImageDimensions | null {
  const size = pngSize(bytes) ?? jpegSize(bytes) ?? webpSize(bytes) ?? gifSize(bytes);
  if (!size || size.width <= 0 || size.height <= 0) return null;
  return size;
}

const ASPECT_RATIOS: Array<[number, number]> = [
  [1, 1],
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 4],
  [3, 2],
  [2, 3],
  [4, 5],
  [5, 4],
  [21, 9],
];

/** Gemini 出图只接受固定画幅，取对数距离最近的一档，尽量不让店面换图变形。 */
export function closestAspectRatio(size: ImageDimensions | null): string {
  if (!size) return "1:1";
  const ratio = Math.log(size.width / size.height);
  let best = "1:1";
  let bestDiff = Infinity;
  for (const [w, h] of ASPECT_RATIOS) {
    const diff = Math.abs(ratio - Math.log(w / h));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = `${w}:${h}`;
    }
  }
  return best;
}
