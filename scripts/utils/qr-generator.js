/**
 * Generador nativo de codigos QR sobre Canvas HTML5
 * Implementacion en Vanilla JS puro con correccion de errores Reed-Solomon
 * Reglas estrictas: Cero dependencias npm, cero barras verticales, maximo 300 lineas
 */

const GF_EXP = new Array(512);
const GF_LOG = new Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val;
    GF_EXP[i + 255] = val;
    GF_LOG[val] = i;
    val = val << 1;
    if (val >= 256) {
      val = val ^ 285;
    }
  }
})();

function gfMul(x, y) {
  if (x === 0) {
    return 0;
  }
  if (y === 0) {
    return 0;
  }
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGenPoly(k) {
  let poly = [1];
  for (let i = 0; i < k; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] = next[j] ^ poly[j];
      next[j + 1] = next[j + 1] ^ gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data, k) {
  const gen = rsGenPoly(k);
  const rem = new Array(k).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < k - 1; j++) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[k - 1] = gfMul(gen[k], factor);
  }
  return rem;
}

const VERSIONS = [
  { version: 1, size: 21, dataBytes: 19, ecBytes: 7 },
  { version: 2, size: 25, dataBytes: 34, ecBytes: 10 },
  { version: 3, size: 29, dataBytes: 55, ecBytes: 15 },
  { version: 4, size: 33, dataBytes: 80, ecBytes: 20 },
  { version: 5, size: 37, dataBytes: 108, ecBytes: 26 }
];

function selectVersion(byteCount) {
  for (let i = 0; i < VERSIONS.length; i++) {
    if (byteCount + 3 <= VERSIONS[i].dataBytes) {
      return VERSIONS[i];
    }
  }
  return VERSIONS[VERSIONS.length - 1];
}

function encodeUtf8(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else if (code < 2048) {
      bytes.push(192 + (code >> 6));
      bytes.push(128 + (code & 63));
    } else {
      bytes.push(224 + (code >> 12));
      bytes.push(128 + ((code >> 6) & 63));
      bytes.push(128 + (code & 63));
    }
  }
  return bytes;
}

function createCodewords(textBytes, targetDataBytes) {
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(4, 4);
  pushBits(textBytes.length, 8);
  for (let i = 0; i < textBytes.length; i++) {
    pushBits(textBytes[i], 8);
  }

  const neededBits = targetDataBytes * 8;
  const termLen = Math.min(4, neededBits - bits.length);
  for (let i = 0; i < termLen; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) + bits[i + j];
    }
    codewords.push(byteVal);
  }

  let padToggle = 0;
  while (codewords.length < targetDataBytes) {
    codewords.push(padToggle === 0 ? 0xEC : 0x11);
    padToggle = 1 - padToggle;
  }
  return codewords;
}

function buildMatrix(versionInfo, allCodewords) {
  const size = versionInfo.size;
  const matrix = Array.from({ length: size }, function () {
    return new Array(size).fill(0);
  });
  const reserved = Array.from({ length: size }, function () {
    return new Array(size).fill(false);
  });

  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const my = row + r;
        const mx = col + c;
        if (my >= 0 && my < size && mx >= 0 && mx < size) {
          let isBlack = false;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            if (r === 0 || r === 6 || c === 0 || c === 6) {
              isBlack = true;
            }
            if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              isBlack = true;
            }
          }
          matrix[my][mx] = isBlack ? 1 : 0;
          reserved[my][mx] = true;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  if (versionInfo.version >= 2) {
    const center = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const my = center + r;
        const mx = center + c;
        let isBlack = false;
        if (Math.abs(r) === 2 || Math.abs(c) === 2) {
          isBlack = true;
        }
        if (r === 0 && c === 0) {
          isBlack = true;
        }
        matrix[my][mx] = isBlack ? 1 : 0;
        reserved[my][mx] = true;
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    const bit = i % 2 === 0 ? 1 : 0;
    if (!reserved[6][i]) {
      matrix[6][i] = bit;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = bit;
      reserved[i][6] = true;
    }
  }

  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = true;

  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }

  const bitStream = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      bitStream.push((allCodewords[i] >> b) & 1);
    }
  }

  let bitIdx = 0;
  let dir = -1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) {
      c--;
    }
    const rStart = dir === -1 ? size - 1 : 0;
    const rEnd = dir === -1 ? -1 : size;
    const step = dir === -1 ? -1 : 1;

    for (let r = rStart; r !== rEnd; r += step) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const mx = c - colOffset;
        if (!reserved[r][mx]) {
          const bitVal = bitIdx < bitStream.length ? bitStream[bitIdx] : 0;
          bitIdx++;
          const masked = (r + mx) % 2 === 0 ? bitVal ^ 1 : bitVal;
          matrix[r][mx] = masked;
        }
      }
    }
    dir = dir * -1;
    c -= 2;
  }

  const formatBits = 0x762C;
  for (let i = 0; i < 15; i++) {
    const bit = (formatBits >> i) & 1;
    if (i < 6) {
      matrix[8][i] = bit;
    } else if (i < 8) {
      matrix[8][i + 1] = bit;
    } else {
      matrix[14 - i][8] = bit;
    }
    if (i < 7) {
      matrix[size - 1 - i][8] = bit;
    } else {
      matrix[8][size - 15 + i] = bit;
    }
  }

  return matrix;
}

export function renderQRCode(canvas, text) {
  if (!canvas) {
    return;
  }
  const safeText = text ? String(text) : 'https://fidelizacard.pe';
  const textBytes = encodeUtf8(safeText);
  const versionInfo = selectVersion(textBytes.length);
  const dataCodewords = createCodewords(textBytes, versionInfo.dataBytes);
  const ecCodewords = rsComputeRemainder(dataCodewords, versionInfo.ecBytes);
  const allCodewords = dataCodewords.concat(ecCodewords);
  const matrix = buildMatrix(versionInfo, allCodewords);

  const ctx = canvas.getContext('2d');
  const size = versionInfo.size;
  const quietZone = 4;
  const fullSize = size + quietZone * 2;
  const scale = Math.floor(canvas.width / fullSize);
  const offset = Math.floor((canvas.width - fullSize * scale) / 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#030712';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        const x = offset + (c + quietZone) * scale;
        const y = offset + (r + quietZone) * scale;
        ctx.fillRect(x, y, scale, scale);
      }
    }
  }
}

export function downloadQRCode(canvas, filename) {
  if (!canvas) {
    return;
  }
  const link = document.createElement('a');
  link.download = filename ? filename : 'qr-fidelizacard.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
