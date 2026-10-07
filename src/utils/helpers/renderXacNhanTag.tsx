import { Tag } from "antd";

/**
 * Render 1 Tag trạng thái xác nhận theo bộ phận (Đúc/Kho/Cán/GĐ-PGĐ NM/PKH...), dựa trên số ID
 * Slab đã xác nhận (xn) trên tổng số ID Slab của phiếu (total). Dùng chung cho danh sách phiếu
 * BBGN Phôi tấm HRC1 và HRC2 (xem Hrc1BbgnPhoiTamEnricher / Hrc2BbgnPhoiTamEnricher ở BE):
 *   - total không xác định / = 0 → "-" (chưa có dữ liệu slab)
 *   - xn = 0                     → "Chưa XN" (màu hiện tại: cam)
 *   - 0 < xn < total              → "Đã XN xn/total" (xanh dương nhạt — xác nhận chưa hết)
 *   - xn = total                  → "Đã XN" (màu hiện tại: xanh lá)
 */
export const renderXacNhanTag = (
  label: string,
  xn: number | null | undefined,
  total: number | null | undefined,
) => {
  if (total == null || total === 0) {
    return <Tag color="default">{label}: -</Tag>;
  }
  if (xn == null || xn === 0) {
    return <Tag color="orange">{label}: Chưa XN</Tag>;
  }
  if (xn >= total) {
    return <Tag color="green">{label}: Đã XN</Tag>;
  }
  return <Tag color="blue">{label}: Đã XN {xn}/{total}</Tag>;
};
