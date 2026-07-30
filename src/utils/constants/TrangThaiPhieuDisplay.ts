/**
 * Cấu hình hiển thị trạng thái phiếu (text + color) dùng chung cho danh sách / tag.
 * Đồng bộ với backend Utils/PhieuStatusDisplay.cs.
 */
export const PHIEU_STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  0: { color: "purple", text: "Đang lưu" },
  1: { color: "pink", text: "Đã gửi" },
  2: { color: "blue", text: "Hoàn thành" },
  3: { color: "tomato", text: "Đã thu hồi" },
  4: { color: "yellow", text: "Không xác nhận" },
  5: { color: "green", text: "Chốt" },
  6: { color: "gray", text: "Đang phê duyệt" },
  7: { color: "orange", text: "Hiệu chỉnh" },
};

/**
 * Trạng thái tổng hợp riêng cho BBGN Phôi tấm HRC1/HRC2 (MaBm HRC1_BBSL_PhoiTam /
 * HRC2_BBSL_PhoiTam) — BE ghi đè TinhTrang thành 11/12 (không thuộc TrangThaiPhieuConst,
 * xem Hrc1BbgnPhoiTamEnricher/Hrc2BbgnPhoiTamEnricher). Giá trị 5 (Chốt) không nằm trong map
 * này vì nó là TinhTrang thật, dùng chung với PHIEU_STATUS_CONFIG.
 */
export const PHOI_TAM_STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  11: { color: "orange", text: "Chưa hoàn thành" },
  12: { color: "success", text: "Đã hoàn thành" },
};

/** MaBm dùng thang trạng thái riêng ở trên thay vì PHIEU_STATUS_CONFIG cho 11/12. */
export const PHOI_TAM_MA_BMS = ["HRC1_BBSL_PhoiTam", "HRC2_BBSL_PhoiTam"];

/** Lấy config hiển thị (màu + chữ) cho 1 dòng phiếu, tự chọn map theo MaBm. */
export function getPhieuStatusConfig(
  maBm: string | null | undefined,
  status: number | string | null | undefined
): { color: string; text: string } | undefined {
  if (maBm && PHOI_TAM_MA_BMS.includes(maBm)) {
    return PHOI_TAM_STATUS_CONFIG[status as string] ?? PHIEU_STATUS_CONFIG[status as string];
  }
  return PHIEU_STATUS_CONFIG[status as string];
}
