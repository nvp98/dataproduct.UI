import type { BcsxDongBase } from "../../../services/HRC1BCSXApi";

let demKhoa = 0;

/** Gán khóa FE cho dòng chưa có (_key không gửi lên API). */
export const ganKhoa = <T extends BcsxDongBase>(rows: T[] | undefined | null): T[] =>
  (rows ?? []).map((r) => (r._key ? r : { ...r, _key: `r${++demKhoa}` }));

export const dinhDangSo = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("vi-VN", { maximumFractionDigits: 3 }) : "";
