import { describe, expect, it } from "vitest";
import { findExifThumbnail, rotationOf } from "./exif-thumbnail.ts";

const THUMBNAIL = [0xff, 0xd8, 1, 2, 3, 0xff, 0xd9];

type ExifOptions = {
  littleEndian?: boolean;
  orientation?: number;
  /** false: IFD0 has no pointer to IFD1. */
  withIfd1?: boolean;
  /** Changes the length of the thumbnail in IFD1. */
  thumbnailLength?: number;
  /** A segment before the EXIF segment, for example an APP0 (JFIF) segment. */
  segmentBefore?: boolean;
};

/** A JPEG file with an EXIF segment: IFD0 with the orientation, IFD1 with the thumbnail. */
function jpegWithExif(options: ExifOptions = {}): ArrayBuffer {
  const { littleEndian = true, orientation = 6, withIfd1 = true, segmentBefore = false } = options;
  const thumbnailLength = options.thumbnailLength ?? THUMBNAIL.length;
  // TIFF: header (8), IFD0 with 1 entry (2 + 12 + 4), IFD1 with 2 entries (2 + 24 + 4), thumbnail.
  const ifd0 = 8;
  const ifd1 = ifd0 + 18;
  const thumbnailStart = ifd1 + 30;
  const tiff = new DataView(new ArrayBuffer(thumbnailStart + THUMBNAIL.length));
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 42, littleEndian);
  tiff.setUint32(4, ifd0, littleEndian);
  tiff.setUint16(ifd0, 1, littleEndian);
  tiff.setUint16(ifd0 + 2, 0x0112, littleEndian);
  tiff.setUint16(ifd0 + 4, 3, littleEndian);
  tiff.setUint32(ifd0 + 6, 1, littleEndian);
  tiff.setUint16(ifd0 + 10, orientation, littleEndian);
  tiff.setUint32(ifd0 + 14, withIfd1 ? ifd1 : 0, littleEndian);
  tiff.setUint16(ifd1, 2, littleEndian);
  tiff.setUint16(ifd1 + 2, 0x0201, littleEndian);
  tiff.setUint16(ifd1 + 4, 4, littleEndian);
  tiff.setUint32(ifd1 + 6, 1, littleEndian);
  tiff.setUint32(ifd1 + 10, thumbnailStart, littleEndian);
  tiff.setUint16(ifd1 + 14, 0x0202, littleEndian);
  tiff.setUint16(ifd1 + 16, 4, littleEndian);
  tiff.setUint32(ifd1 + 18, 1, littleEndian);
  tiff.setUint32(ifd1 + 22, thumbnailLength, littleEndian);
  tiff.setUint32(ifd1 + 26, 0, littleEndian);
  new Uint8Array(tiff.buffer).set(THUMBNAIL, thumbnailStart);

  const app0 = segmentBefore ? [0xff, 0xe0, 0, 4, 0, 0] : [];
  const app1Length = 2 + 6 + tiff.byteLength;
  const bytes = [
    0xff,
    0xd8,
    ...app0,
    0xff,
    0xe1,
    app1Length >> 8,
    app1Length & 0xff,
    ...[0x45, 0x78, 0x69, 0x66, 0, 0],
    ...new Uint8Array(tiff.buffer),
    // The image data would follow here.
    0xff,
    0xda,
    0,
    2,
  ];
  return new Uint8Array(bytes).buffer;
}

describe("findExifThumbnail", () => {
  it("finds the thumbnail and the orientation (little endian, as in most phones)", () => {
    const result = findExifThumbnail(jpegWithExif({ segmentBefore: true }));
    expect(result && Array.from(result.bytes)).toEqual(THUMBNAIL);
    expect(result?.orientation).toBe(6);
  });

  it("reads big endian EXIF data (some cameras)", () => {
    const result = findExifThumbnail(jpegWithExif({ littleEndian: false, orientation: 8 }));
    expect(result && Array.from(result.bytes)).toEqual(THUMBNAIL);
    expect(result?.orientation).toBe(8);
  });

  it("gives null without IFD1 or with a thumbnail that is longer than the data", () => {
    expect(findExifThumbnail(jpegWithExif({ withIfd1: false }))).toBeNull();
    expect(findExifThumbnail(jpegWithExif({ thumbnailLength: 1000 }))).toBeNull();
    expect(findExifThumbnail(jpegWithExif({ thumbnailLength: 0 }))).toBeNull();
  });

  it("gives null for a JPEG without EXIF data", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xda, 0, 2]);
    expect(findExifThumbnail(jpeg.buffer)).toBeNull();
  });

  it("gives null for other files and for broken data", () => {
    expect(findExifThumbnail(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(findExifThumbnail(new Uint8Array([0xff, 0xd8, 0x12, 0x34, 0, 0]).buffer)).toBeNull();
    expect(findExifThumbnail(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 40]).buffer)).toBeNull();
    // The EXIF segment is cut off (only the first bytes of the file were read).
    expect(findExifThumbnail(jpegWithExif().slice(0, 30))).toBeNull();
    expect(findExifThumbnail(new ArrayBuffer(1))).toBeNull();
  });
});

describe("rotationOf", () => {
  it("gives the clockwise rotation for each EXIF orientation", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 0].map(rotationOf)).toEqual([
      0, 0, 180, 180, 90, 90, 270, 270, 0,
    ]);
  });
});
