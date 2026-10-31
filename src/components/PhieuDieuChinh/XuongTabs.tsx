import type { ReactNode } from "react";
import { Empty, Tabs } from "antd";

export interface XuongItem {
  id: number;
  tenXuong: string;
}

// Mỗi xưởng của phòng ban (tên lấy từ API) 1 Tab — dùng chung cho cả 3 phần Nhập / Xuất / Nội bộ; chung
// activeXuong ở component cha nên đổi phần vẫn giữ nguyên xưởng đang xem.
const XuongTabs = ({
  xuongList,
  activeXuong,
  onChange,
  children,
}: {
  xuongList: XuongItem[];
  activeXuong: string;
  onChange: (key: string) => void;
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
        items={xuongList.map((x) => ({ key: String(x.id), label: x.tenXuong }))}
      />
      {children}
    </>
  );

export default XuongTabs;
