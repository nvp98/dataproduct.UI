export const PhieuActionButtonKeys = {
  Save: "save",
  SaveAndSend: "saveAndSend",
  Recall: "recall",
  RequestEdit: "requestEdit",
  Approve: "approve",
  Reject: "reject",
  Lock: "lock",
  Unlock: "unlock",
  ExportPdf: "exportPdf",
} as const;

/**
 * Các nút yêu cầu form đang mở để chỉnh sửa (chỉ dùng trên trang Tạo/Chỉnh sửa phiếu).
 * Ẩn các nút này trên trang Chi tiết (read-only).
 */
export const DETAIL_HIDDEN_BUTTON_KEYS = new Set<string>([
  PhieuActionButtonKeys.Save,
  PhieuActionButtonKeys.SaveAndSend,
  PhieuActionButtonKeys.Recall,
  PhieuActionButtonKeys.RequestEdit,
]);
