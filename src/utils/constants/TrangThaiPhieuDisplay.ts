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
