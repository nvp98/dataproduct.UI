import type { BBGNRow } from "./BBGNThepLongTable";

const isEmpty = (v: unknown): boolean =>
  v == null || (typeof v === "string" && v.trim() === "");

/**
 * Validate dữ liệu bảng BBGN trước khi lưu/gửi.
 * Trả về message lỗi đầu tiên; null nếu hợp lệ.
 */
export const validateBBGNRows = (
  rows: BBGNRow[],
  opts?: {
    mode?: "save" | "send";
    scopeLabel?: string | null;
    scopeValue?: number | null;
  }
): string | null => {
  const mode = opts?.mode ?? "save";
  if (!rows || rows.length === 0) return null;
  const scopeDisplay = opts?.scopeLabel ?? (opts?.scopeValue != null ? `Máy đúc ${opts.scopeValue}` : null);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;

    if (typeof r.klThepLong === "number" && r.klThepLong < 0) {
      return `Dòng ${line}: KL thép lỏng đang âm, không thể lưu/gửi phiếu.`;
    }

    if (mode !== "send") continue;

    const mayDuc = !isEmpty(r.mayDuc) ? r.mayDuc : scopeDisplay;
    if (isEmpty(mayDuc)) return `Dòng ${line}: thiếu Máy đúc.`;
    if (isEmpty(r.me)) return `Dòng ${line}: thiếu Mẻ.`;
    if (isEmpty(r.thungSo)) return `Dòng ${line}: thiếu Thùng số.`;
    if (isEmpty(r.thoiGian)) return `Dòng ${line}: thiếu Thời gian.`;
    if (r.klLan1 == null) return `Dòng ${line}: thiếu KL lần 1.`;
    if (r.klLan2 == null) return `Dòng ${line}: thiếu KL lần 2.`;
    if (r.klLan3 == null) return `Dòng ${line}: thiếu KL lần 3.`;
    if (r.klThepLong == null) return `Dòng ${line}: thiếu KL thép lỏng.`;
    if (isEmpty(r.tinhLuyenLenThang)) return `Dòng ${line}: thiếu Tinh luyện/Lên thẳng.`;
  }

  return null;
};

