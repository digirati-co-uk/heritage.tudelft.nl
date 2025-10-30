export type ZoomRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function parseXywh(xywh: string) {
  const regex = /\d+,\d+,\d+,\d+$/;
  if (regex.test(xywh)) {
    const arr = xywh.split(",");
    const numArr: number[] = arr.map((n) => Number.parseInt(n));
    return {
      x: numArr[0],
      y: numArr[1],
      width: numArr[2],
      height: numArr[3],
    };
  }
  return undefined;
}
