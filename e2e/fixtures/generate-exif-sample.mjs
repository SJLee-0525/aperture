/**
 * 관리자 E2E 용 EXIF 픽스처(exif-sample.jpg) 생성기.
 *
 * 사진 관리자 E2E 는 파일 선택 → exifr 추출 → 폼 자동 입력까지 실제 파이프라인을 지나야
 * 하므로 촬영 정보가 실제로 들어 있는 JPEG 가 필요하다. 저장소에 이진 픽스처만 두면
 * 어떤 값이 들어 있는지 추적할 수 없어, 값을 코드로 선언하고 이 스크립트로 재생성한다.
 *
 *   node e2e/fixtures/generate-exif-sample.mjs
 *
 * 구조: 내장 base JPEG(64×48, System.Drawing 산출물)의 SOI 뒤에 EXIF APP1 세그먼트를
 * 끼워 넣는다. TIFF 는 리틀엔디언이고 IFD0(Make·Model·Exif IFD 포인터) + Exif IFD
 * (노출·조리개·ISO·촬영일시·초점거리·렌즈)만 담는다 — E2E 가 확인하는 최소 집합이다.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** E2E 단언과 짝을 이루는 촬영 정보 — 값을 바꾸면 photo-editor.e2e.ts 도 함께 바꾼다. */
const EXIF_VALUES = {
  make: "SONY",
  model: "ILCE-7M4",
  exposureTime: [1, 250], // → 셔터 1/250
  fNumber: [28, 10], // → 조리개 f/2.8
  iso: 400,
  dateTimeOriginal: "2026:05:04 10:30:00",
  focalLength: [35, 1], // → 초점거리 35 mm
  lensModel: "FE 35mm F1.8",
};

/** 64×48 회색-주황 base JPEG (EXIF 없음). */
const BASE_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAwAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDz+iivaPh78PfD+ueD9Pvr7T/PupfM3yedIucSMBwGA6AV9LxTxTguEcFDHY6EpQlJQSgk3dqT6yirWi+vbQ+eyXJcRnuIlhsNKKkouXvNpWTS6J66ni9FfRX/AAqfwp/0Cv8AyYl/+Lo/4VP4U/6BX/kxL/8AF1+W/wDEbeHf+fFf/wABp/8Ayw+z/wCIdZr/AM/Kf3y/+QPnWivor/hU/hT/AKBX/kxL/wDF1861+g8J8bZdxj7f6hTnH2XLfnUVfm5rW5ZS/ld726Hy2ecO4vIPZ/WpRfPe3K29rXvdLuFFFFfoJ8sFfRXwn/5J/pX/AG1/9GvXzrXtHw9+IXh/Q/B+n2N9qHkXUXmb4/JkbGZGI5CkdCK/DvF/LsbmeQ0aOBoyqzVaLahFyduSor2SbtdpX80fpHAeLw+DzOpUxNSMIum1eTSV+aOl31PUKK5H/hbHhT/oK/8AkvL/APEUf8LY8Kf9BX/yXl/+Ir+Qf9UuIv8AoXV//BVT/wCRP3f+3Mq/6C6f/gcf8zrq+R6+iv8AhbHhT/oK/wDkvL/8RXzrX9MeDGUZjlf9ofX8POlzeytzwlG9vaXtzJXtdXttdH5B4g47CY36r9VqxnbnvyyTtfktezdr2Ciiiv6XPx8KKKKACiiigAooooAKKKKAP//Z";

/** TIFF 값 형식 코드. */
const ASCII = 2;
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;

/**
 * ASCII 값을 NUL 종료 바이트로 만든다.
 *
 * @param {string} text 담을 문자열.
 * @returns {Buffer} NUL 이 붙은 바이트.
 */
const ascii = (text) => Buffer.from(`${text}\0`, "ascii");

/**
 * 부호 없는 분수(rational) 8바이트를 만든다.
 *
 * @param {[number, number]} pair 분자·분모.
 * @returns {Buffer} 리틀엔디언 LONG 두 개.
 */
const rational = ([numerator, denominator]) => {
  const bytes = Buffer.alloc(8);
  bytes.writeUInt32LE(numerator, 0);
  bytes.writeUInt32LE(denominator, 4);
  return bytes;
};

/**
 * IFD 하나를 조립한다. 4바이트에 들어가지 않는 값은 heap 에 쌓고 offset 을 기록한다.
 *
 * @param {Array<{ tag: number; type: number; count: number; value: Buffer }>} entries 태그 오름차순 항목.
 * @param {number} ifdOffset TIFF 시작 기준 이 IFD 의 offset.
 * @returns {{ bytes: Buffer; size: number }} IFD 본문 + heap 을 이어 붙인 바이트.
 */
const buildIfd = (entries, ifdOffset) => {
  const body = Buffer.alloc(2 + entries.length * 12 + 4);
  body.writeUInt16LE(entries.length, 0);

  const heapParts = [];
  let heapOffset = ifdOffset + body.length;

  entries.forEach(({ tag, type, count, value }, index) => {
    const at = 2 + index * 12;
    body.writeUInt16LE(tag, at);
    body.writeUInt16LE(type, at + 2);
    body.writeUInt32LE(count, at + 4);
    if (value.length <= 4) {
      value.copy(body, at + 8);
    } else {
      body.writeUInt32LE(heapOffset, at + 8);
      heapParts.push(value);
      heapOffset += value.length;
    }
  });
  // 다음 IFD 없음.
  body.writeUInt32LE(0, 2 + entries.length * 12);

  const bytes = Buffer.concat([body, ...heapParts]);
  return { bytes, size: bytes.length };
};

const shortValue = (value) => {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value, 0);
  return bytes;
};

const longValue = (value) => {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value, 0);
  return bytes;
};

// --- TIFF 조립: 헤더(8) → IFD0 → Exif IFD. Exif IFD offset 은 IFD0 크기가 정해진 뒤 확정된다.
const TIFF_HEADER_SIZE = 8;
const IFD0_OFFSET = TIFF_HEADER_SIZE;

const ifd0Entries = (exifIfdOffset) => [
  { tag: 0x010f, type: ASCII, count: EXIF_VALUES.make.length + 1, value: ascii(EXIF_VALUES.make) },
  {
    tag: 0x0110,
    type: ASCII,
    count: EXIF_VALUES.model.length + 1,
    value: ascii(EXIF_VALUES.model),
  },
  { tag: 0x8769, type: LONG, count: 1, value: longValue(exifIfdOffset) },
];

// 첫 pass 로 IFD0 크기를 재고, 그 값으로 Exif IFD offset 을 넣어 다시 조립한다.
const ifd0Size = buildIfd(ifd0Entries(0), IFD0_OFFSET).size;
const exifIfdOffset = IFD0_OFFSET + ifd0Size;
const ifd0 = buildIfd(ifd0Entries(exifIfdOffset), IFD0_OFFSET);

const exifIfd = buildIfd(
  [
    { tag: 0x829a, type: RATIONAL, count: 1, value: rational(EXIF_VALUES.exposureTime) },
    { tag: 0x829d, type: RATIONAL, count: 1, value: rational(EXIF_VALUES.fNumber) },
    { tag: 0x8827, type: SHORT, count: 1, value: shortValue(EXIF_VALUES.iso) },
    {
      tag: 0x9003,
      type: ASCII,
      count: EXIF_VALUES.dateTimeOriginal.length + 1,
      value: ascii(EXIF_VALUES.dateTimeOriginal),
    },
    { tag: 0x920a, type: RATIONAL, count: 1, value: rational(EXIF_VALUES.focalLength) },
    {
      tag: 0xa434,
      type: ASCII,
      count: EXIF_VALUES.lensModel.length + 1,
      value: ascii(EXIF_VALUES.lensModel),
    },
  ],
  exifIfdOffset,
);

const tiffHeader = Buffer.alloc(TIFF_HEADER_SIZE);
tiffHeader.write("II", 0, "ascii");
tiffHeader.writeUInt16LE(0x2a, 2);
tiffHeader.writeUInt32LE(IFD0_OFFSET, 4);

const tiff = Buffer.concat([tiffHeader, ifd0.bytes, exifIfd.bytes]);

// APP1 = 마커(FFE1) + 길이(자기 자신 포함 2바이트) + "Exif\0\0" + TIFF.
const exifHeader = Buffer.from("Exif\0\0", "ascii");
const app1Body = Buffer.concat([exifHeader, tiff]);
const app1 = Buffer.alloc(4 + app1Body.length);
app1.writeUInt16BE(0xffe1, 0);
app1.writeUInt16BE(app1Body.length + 2, 2);
app1Body.copy(app1, 4);

// base JPEG 의 SOI(FFD8) 바로 뒤에 APP1 을 끼운다.
const base = Buffer.from(BASE_JPEG_BASE64, "base64");
if (base.readUInt16BE(0) !== 0xffd8) throw new Error("base JPEG 가 SOI 로 시작하지 않는다.");
const output = Buffer.concat([base.subarray(0, 2), app1, base.subarray(2)]);

const target = join(dirname(fileURLToPath(import.meta.url)), "exif-sample.jpg");
writeFileSync(target, output);
console.log(`${target} (${output.length} bytes)`);
