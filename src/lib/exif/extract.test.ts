import exifr from "exifr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { extractExif } from "@/lib/exif/extract";

vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}));

const parseMock = vi.mocked(exifr.parse);
const file = { name: "harbor.jpg" } as File;

describe("extractExif", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("원본 파일의 EXIF를 관리자 사진 초안 형식으로 변환한다", async () => {
    // exifr 는 DateTimeOriginal 을 실행 환경 로컬로 해석한 Date 로 돌려준다.
    // 추출은 그 벽시계 값을 사이트 기준(KST)으로 다시 읽으므로 실행 TZ 와 무관하다.
    const shotAt = new Date(2026, 3, 5, 6, 30);
    parseMock.mockResolvedValue({
      Make: " SONY ",
      Model: " ILCE-7M4 ",
      LensModel: " FE 35mm F1.4 GM ",
      FNumber: 1.4,
      ExposureTime: 1 / 250,
      ISO: 100,
      FocalLength: 35,
      ExposureCompensation: -0.7,
      WhiteBalance: "Auto",
      MeteringMode: "Pattern",
      Flash: "Off",
      DateTimeOriginal: shotAt,
      latitude: 35.1796,
      longitude: 129.0756,
    });

    await expect(extractExif(file)).resolves.toEqual({
      camera: "SONY ILCE-7M4",
      lens: "FE 35mm F1.4 GM",
      aperture: "f/1.4",
      shutter: "1/250",
      iso: "100",
      focalLength: "35 mm",
      ev: "−0.7 EV",
      wb: "Auto",
      metering: "Pattern",
      flash: "Off",
      shotAt: new Date("2026-04-05T06:30:00+09:00"),
      coords: { lat: 35.1796, lng: 129.0756 },
      fileName: "harbor.jpg",
    });
    expect(parseMock).toHaveBeenCalledWith(file, { tiff: true, exif: true, gps: true });
  });

  it("빈 EXIF 결과는 파일명만 남기고 안전한 기본값으로 변환한다", async () => {
    parseMock.mockResolvedValue(null);

    await expect(extractExif(file)).resolves.toEqual({
      camera: "",
      lens: "",
      aperture: "",
      shutter: "",
      iso: "",
      focalLength: "",
      ev: "",
      wb: "",
      metering: "",
      flash: "",
      shotAt: null,
      coords: null,
      fileName: "harbor.jpg",
    });
  });

  it("EXIF 파서 실패도 업로드를 중단하지 않고 빈 메타데이터로 처리한다", async () => {
    parseMock.mockRejectedValue(new Error("corrupt metadata"));

    const result = await extractExif(file);

    expect(result.fileName).toBe("harbor.jpg");
    expect(result.camera).toBe("");
    expect(result.coords).toBeNull();
  });

  it.each([
    [
      "1초 이상 셔터와 양수 EV",
      { ExposureTime: 2, ExposureCompensation: 0.34 },
      { shutter: "2s", ev: "+0.3 EV" },
    ],
    ["0 EV", { ExposureTime: 0.3, ExposureCompensation: 0 }, { shutter: "1/3", ev: "0 EV" }],
    ["누락된 수치", {}, { shutter: "", ev: "" }],
  ])("%s를 표시 문자열로 변환한다", async (_label, tags, expected) => {
    parseMock.mockResolvedValue(tags);

    await expect(extractExif(file)).resolves.toMatchObject(expected);
  });

  it("위도와 경도가 모두 숫자일 때만 좌표를 만든다", async () => {
    parseMock.mockResolvedValue({ latitude: 37.5, longitude: "127.0" });

    await expect(extractExif(file)).resolves.toMatchObject({ coords: null });
  });

  it("Date가 아닌 촬영일 값은 사용하지 않는다", async () => {
    parseMock.mockResolvedValue({ DateTimeOriginal: "2026-01-01" });

    await expect(extractExif(file)).resolves.toMatchObject({ shotAt: null });
  });

  // 같은 사진을 다른 타임존 기기에서 올려도 저장되는 인스턴트가 같아야 한다.
  it("촬영일시를 업로드 기기가 아니라 사이트 타임존으로 해석한다", async () => {
    parseMock.mockResolvedValue({ DateTimeOriginal: new Date(2026, 0, 2, 3, 4, 5) });

    const result = await extractExif(file);

    expect(result.shotAt?.toISOString()).toBe("2026-01-01T18:04:05.000Z");
  });
});
