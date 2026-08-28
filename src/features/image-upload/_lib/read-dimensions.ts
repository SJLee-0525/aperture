/**
 * 이미지 Blob 의 픽셀 크기(w×h) 를 읽는다. 원본·압축본 모두에 사용.
 */
const readDimensions = async (source: Blob): Promise<{ w: number; h: number }> => {
  const bitmap = await createImageBitmap(source);
  const dims = { w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return dims;
};

export { readDimensions };
