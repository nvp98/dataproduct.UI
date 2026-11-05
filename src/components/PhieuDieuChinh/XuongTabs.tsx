import type { ReactNode } from "react";
import { Empty, Tabs } from "antd";

export interface XuongItem {
  id: number;
  tenXuong: string;
}

/** Khóa của tab "Tổng hợp" (không trùng id xưởng vì id xưởng là số) */
export const TONG_HOP_KEY = "tonghop";

// Mỗi xưởng của phòng ban (tên lấy từ API) 1 Tab — dùng chung cho cả 3 phần Nhập / Xuất / Nội bộ; chung
// activeXuong ở component cha nên đổi phần vẫn giữ nguyên xưởng đang xem.
// Có truyền `tongHop` thì thêm tab "Tổng hợp" ở cuối; chọn tab đó thì hiện `tongHop` thay cho `children`.
const XuongTabs = ({
  xuongList,
  activeXuong,
  onChange,
  tongHop,
  children,
}: {
  xuongList: XuongItem[];
  activeXuong: string;
  onChange: (key: string) => void;
  tongHop?: ReactNode;
  children: ReactNode;
}) =>
  xuongList.length === 0 ? (
    <Empty description="Chưa có xưởng" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  ) : (
    <>
      <Tabs
        size="small"
        activeKey={activeXuong}
        onChange={onChange}
        style={{ marginBottom: 4 }}
        items={[
          ...xuongList.map((x) => ({ key: String(x.id), label: x.tenXuong })),
          ...(tongHop ? [{ key: TONG_HOP_KEY, label: "Tổng hợp" }] : []),
        ]}
      />
      {activeXuong === TONG_HOP_KEY && tongHop ? tongHop : children}
    </>
  );

export default XuongTabs;
