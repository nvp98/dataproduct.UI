import { useState } from "react";
import { Checkbox } from "antd";

/**
 * Hook dùng chung để quản lý tích chọn hàng loạt trong bất kỳ Table nào.
 *
 * @param data   - Mảng dữ liệu hiển thị trong table (đã qua filter/sort).
 * @param rowKey - Tên field dùng làm key duy nhất của mỗi dòng (mặc định "idphieu").
 *
 * @returns
 *   - `selectedRowKeys`    : Danh sách key đang được chọn.
 *   - `setSelectedRowKeys` : Setter để reset hoặc cập nhật từ bên ngoài.
 *   - `checkboxColumn`     : Đối tượng cột Ant Design Table, cắm thẳng vào đầu mảng `columns`.
 */
const useRowSelection = <T extends Record<string, any>>(
  data: T[],
  rowKey: keyof T = "idphieu" as keyof T,
) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const allKeys = data.map((r) => String(r[rowKey]));
  const allSelected = allKeys.length > 0 && selectedRowKeys.length === allKeys.length;
  const indeterminate = selectedRowKeys.length > 0 && selectedRowKeys.length < allKeys.length;

  const checkboxColumn = {
    title: (
      <Checkbox
        checked={allSelected}
        indeterminate={indeterminate}
        onChange={(e) => setSelectedRowKeys(e.target.checked ? allKeys : [])}
      />
    ),
    key: "row_select",
    width: 48,
    render: (_: unknown, record: T) => {
      const key = String(record[rowKey]);
      return (
        <Checkbox
          checked={selectedRowKeys.includes(key)}
          onChange={(e) =>
            setSelectedRowKeys((prev) =>
              e.target.checked ? [...prev, key] : prev.filter((k) => k !== key),
            )
          }
        />
      );
    },
  };

  return { selectedRowKeys, setSelectedRowKeys, checkboxColumn };
};

export default useRowSelection;
