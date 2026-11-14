import type { KdlCot } from "../services/KdlApi";

/** Các cột lá của cây CotJson theo đúng thứ tự hiển thị (bỏ cột ẩn). */
export const layCotLa = (cot: KdlCot[]): KdlCot[] =>
  cot.filter((c) => !c.hidden).flatMap((c) => (c.children?.length ? layCotLa(c.children) : [c]));
