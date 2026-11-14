import { deflateSync } from 'node:zlib';

function chunk(type: string, bytes: Buffer): Buffer {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(Bun.hash.crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([size, name, bytes, checksum]);
}
export function png(width = 2, height = 2, pixels?: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk(
      'IDAT',
      deflateSync(pixels ?? Buffer.alloc((width * 4 + 1) * height)),
    ),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
export const pngUrl = (bytes = png()) =>
  `data:image/png;base64,${bytes.toString('base64')}`;
