import { inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MAX_SNAPSHOT_BYTES,
  MAX_SNAPSHOT_DIMENSION,
  idSchema,
} from '@usenudge/shared';
import { RepositoryError } from './repository';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export function validatePng(dataUrl: string): {
  bytes: Buffer;
  width: number;
  height: number;
} {
  const invalid = () =>
    new RepositoryError(
      400,
      'INVALID_IMAGE',
      'Expected a valid, bounded PNG snapshot',
    );
  if (!dataUrl.startsWith('data:image/png;base64,')) throw invalid();
  const encoded = dataUrl.slice(22);
  if (
    encoded.length > Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      encoded,
    )
  )
    throw invalid();
  const bytes = Buffer.from(encoded, 'base64');
  if (
    bytes.length < 57 ||
    bytes.length > MAX_SNAPSHOT_BYTES ||
    bytes.toString('base64') !== encoded ||
    !bytes.subarray(0, 8).equals(signature)
  )
    throw invalid();
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let ended = false;
  const compressed: Buffer[] = [];
  const metadata = new Set<string>();
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw invalid();
    const length = bytes.readUInt32BE(offset);
    if (length > MAX_SNAPSHOT_BYTES || offset + 12 + length > bytes.length)
      throw invalid();
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (
      Bun.hash.crc32(bytes.subarray(offset + 4, offset + 8 + length)) !==
      bytes.readUInt32BE(offset + 8 + length)
    )
      throw invalid();
    if (offset === 8 && type !== 'IHDR') throw invalid();
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) throw invalid();
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (
        !width ||
        !height ||
        width > MAX_SNAPSHOT_DIMENSION ||
        height > MAX_SNAPSHOT_DIMENSION ||
        data[8] !== 8 ||
        ![2, 6].includes(data[9]!) ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      )
        throw invalid();
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      if (length !== 0 || !compressed.length || offset + 12 !== bytes.length)
        throw invalid();
      ended = true;
    } else {
      // Restrict to canvas PNGs and bounded color metadata; no text, EXIF or unknown chunks.
      const expected = { sRGB: 1, gAMA: 4, cHRM: 32, pHYs: 9 }[type];
      if (
        !expected ||
        length !== expected ||
        compressed.length ||
        metadata.has(type)
      )
        throw invalid();
      if (
        (type === 'sRGB' && data[0]! > 3) ||
        (type === 'gAMA' && data.readUInt32BE(0) === 0) ||
        (type === 'pHYs' && data[8]! > 1)
      )
        throw invalid();
      metadata.add(type);
    }
    offset += length + 12;
  }
  if (!ended) throw invalid();
  const stride = width * channels + 1;
  let pixels: Buffer;
  try {
    pixels = inflateSync(Buffer.concat(compressed), {
      maxOutputLength: stride * height,
    });
  } catch {
    throw invalid();
  }
  if (pixels.length !== stride * height) throw invalid();
  for (let row = 0; row < height; row++)
    if (pixels[row * stride]! > 4) throw invalid();
  return { bytes, width, height };
}

export class SnapshotStore {
  private directory: string;
  constructor(stateDir: string) {
    this.directory = resolve(stateDir, 'snapshots');
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
  }
  private path(id: string) {
    if (!idSchema.safeParse(id).success)
      throw new RepositoryError(400, 'INVALID_ID', 'Invalid snapshot ID');
    return resolve(this.directory, `${id}.png`);
  }
  write(id: string, bytes: Buffer) {
    writeFileSync(this.path(id), bytes, { flag: 'wx', mode: 0o600 });
  }
  read(id: string) {
    return readFileSync(this.path(id));
  }
  remove(id: string) {
    unlinkSync(this.path(id));
  }
}
