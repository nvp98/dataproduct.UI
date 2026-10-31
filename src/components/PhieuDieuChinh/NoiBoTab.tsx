/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Checkbox, Collapse, Input, Popover, Select, Space } from "antd";
import { FilterOutlined, TableOutlined } from "@ant-design/icons";
import CustomFormTableV2 from "../FormPhieuDieuChinh";
import type { FormColumnDef } from "../FormPhieuDieuChinh";
import { tenCa } from "../../services/PhieuDieuChinhApi";
import XuongTabs, { type XuongItem } from "./XuongTabs";
import { LOAI_NOI_BO, recomputeRows, type TableRow } from "./noiBoUtils";

interface Props {
  /** Toàn bộ dòng chi tiết của phiếu (state ở component cha vì khi Lưu cần đọc) */
  tableData: TableRow[];
  setTableData: Dispatch<SetStateAction<TableRow[]>>;
  /** Phần cấu hình cột của bảng (section table1 trong file JSON biểu mẫu) */
  table1Section: any;
  xuongList: XuongItem[];
  activeXuong: string;
  onChangeXuong: (key: string) => void;
  /** Phiếu đang khóa (đã gửi/duyệt) → chỉ xem */
  locked: boolean;
  loading: boolean;
  nguoiKyMap: Map<number, string>;
  currentUserId?: number | null;
}

// Phần Nội bộ - Xuất vào sản xuất: mỗi xưởng nhận 1 tab, dòng thuộc xưởng nào do idLoCao (= ID xưởng nhận).
const NoiBoTab = ({
  tableData,
  setTableData,
  table1Section,
  xuongList,
  activeXuong,
  onChangeXuong,
  locked,
  loading,
  nguoiKyMap,
  currentUserId,
}: Props) => {
  // ─── Cột hiển thị ───────────────────────────────────────────────────────────
  // Bảng chi tiết có ~21 cột, quá rộng để xem hết cùng lúc — cho phép người dùng
  // ẩn bớt cột ít dùng, nhớ lựa chọn qua các lần mở trang (localStorage, chỉ là
  // tiện ích hiển thị riêng cho máy này, không phải dữ liệu nghiệp vụ).
  const HIDDEN_COLUMNS_STORAGE_KEY = "taoPhieuDieuChinh_hiddenColumns";
  const DEFAULT_HIDDEN_COLUMNS = useMemo(() => ["idNhomNVL", "viTri", "phanLoai"], []);

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_HIDDEN_COLUMNS;
    } catch {
      return DEFAULT_HIDDEN_COLUMNS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(hiddenColumns));
    } catch {
      /* localStorage có thể bị chặn (private mode...) — bỏ qua, không ảnh hưởng chức năng chính */
    }
  }, [hiddenColumns]);

  // Danh sách cột có thể ẩn/hiện — làm phẳng nhóm "Bên xuất"/"Bên nhập". "Thứ tự" luôn hiển thị.
  const toggleableColumns = useMemo(() => {
    const result: { dataIndex: string; label: string }[] = [];
    (table1Section?.columns ?? []).forEach((col: any) => {
      if (col.dataIndex === "thuTu") return;
      if (col.children) {
        col.children.forEach((child: any) => {
          if (child.dataIndex) result.push({ dataIndex: child.dataIndex, label: `${col.title} - ${child.title}` });
        });
      } else if (col.dataIndex) {
        result.push({ dataIndex: col.dataIndex, label: col.title });
      }
    });
    return result;
  }, [table1Section]);

  // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — khóa ô lại khi Trước ẩm,
  // xử lý ngay trong trang này qua custom render (không sửa CustomFormTable dùng chung).
  // Sửa Độ ẩm cũng tính là sửa số liệu — tự gán "Người điều chỉnh giao" (xem recomputeRows).
  const handleDoAmChange = useCallback((rowKey: string | undefined, value: string) => {
    setTableData((prev) =>
      recomputeRows(
        prev.map((r) => (r.key === rowKey ? { ...r, doAm: value } : r)),
        prev,
        currentUserId
      )
    );
  }, [currentUserId, setTableData]);

  // "Loại điều chỉnh" — nguồn cho các Tab (Nhập - Xuất / Nội bộ - Xuất SX) và cho hiển thị
  // nhãn ở cột loaiDieuChinh trong bảng (xem tableColumns bên dưới).
  const loaiDieuChinhOptions = useMemo(
    () => (table1Section?.columns ?? []).find((c: any) => c.dataIndex === "loaiDieuChinh")?.options ?? [],
    [table1Section]
  );

  const tableColumns = useMemo(() => {
    return (table1Section?.columns ?? []).map((col: any) => {
      if (col.key === "khoiLuongQuyKhoXuat" && col.key === "khoiLuongXuat") {
        return {
          ...col,
          disabled: true,
        };
      }
      // "Loại điều chỉnh" nay do tab con quyết định (xem activeSub) — chỉ hiển thị nhãn, không
      // cho sửa tay trong bảng để tránh dòng "biến mất" khỏi tab đang xem sau khi đổi giá trị.
      if (col.dataIndex === "loaiDieuChinh") {
        return {
          ...col,
          type: "index",
          render: (value: any) => (
            <div style={{ paddingLeft: 8 }}>
              {loaiDieuChinhOptions.find((o: any) => String(o.value) === String(value))?.label ?? "—"}
            </div>
          ),
        };
      }
      // Ca lấy từ dòng nguồn — chỉ hiển thị "Ca ngày" / "Ca đêm", không sửa tay
      if (col.dataIndex === "idCa") {
        return {
          ...col,
          type: "index",
          render: (value: any) => <div style={{ paddingLeft: 8 }}>{tenCa(value)}</div>,
        };
      }
      // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — dùng type "index" để tự
      // render Input riêng (CustomFormTable không hỗ trợ khóa ô theo từng dòng).
      if (col.dataIndex === "doAm") {
        return {
          ...col,
          type: "index",
          render: (value: any, record: TableRow) => {
            const disabled = String(record.loaiSoDieuChinh) === "1";
            return (
              <Input
                value={value ?? ""}
                disabled={disabled || locked}
                onChange={(e) => handleDoAmChange(record.key, e.target.value)}
                style={disabled ? { backgroundColor: "#f5f5f5" } : undefined}
              />
            );
          },
        };
      }

      // Người điều chỉnh nhận — không chọn tay nữa, tự động gán người (bên nhận) vừa sửa
      // Khối lượng/Độ ẩm của dòng (xem recomputeRows). Chỉ hiển thị tên, không cho sửa trực
      // tiếp ở đây.
      if (col.dataIndex === "nguoiDieuChinhNhan") {
        return {
          ...col,
          type: "index",
          render: (value: any) => (
            <div style={{ paddingLeft: 8, color: value ? undefined : "#bbb" }}>
              {value ? (nguoiKyMap.get(Number(value)) ?? `#${value}`) : "Chưa có"}
            </div>
          ),
        };
      }

      return col;
    }) as FormColumnDef[];
  }, [table1Section, handleDoAmChange, nguoiKyMap, locked, loaiDieuChinhOptions]);

  // Áp dụng lựa chọn ẩn/hiện cột lên tableColumns — nhóm "Bên xuất"/"Bên nhập" nào
  // bị ẩn hết cột con thì bỏ luôn cả nhóm.
  const visibleTableColumns = useMemo(() => {
    const filterCol = (col: FormColumnDef): FormColumnDef | null => {
      if (col.children) {
        const filteredChildren = col.children.filter((c) => !hiddenColumns.includes(c.dataIndex ?? ""));
        if (filteredChildren.length === 0) return null;
        return { ...col, children: filteredChildren };
      }
      if (col.dataIndex && hiddenColumns.includes(col.dataIndex)) return null;
      return col;
    };
    return tableColumns
      .filter((col) => col.dataIndex !== "loaiDieuChinh")
      .map(filterCol)
      .filter((c): c is FormColumnDef => c !== null);
  }, [tableColumns, hiddenColumns]);

  // Dòng Nội bộ thuộc xưởng nào (idLoCao = ID xưởng nhận). Dòng chưa rõ xưởng (hoặc xưởng không còn trong danh sách)
  // hiện ở xưởng đầu tiên để không bị "biến mất" — không có tab riêng cho dòng này.
  // Dòng cũ lưu idLoCao là mã lò (chưa phải ID xưởng) thì tra theo tên xưởng nhận để vẫn về đúng tab.
  const xuongCuaDong = (r: TableRow): string => {
    const id = Number(r.idLoCao);
    if (xuongList.some((x) => x.id === id)) return String(id);
    const theoTen = r.xuongNhap ? xuongList.find((x) => x.tenXuong === r.xuongNhap) : undefined;
    return String(theoTen?.id ?? xuongList[0]?.id ?? "");
  };

  // ─── Bộ lọc bảng "Chi tiết điều chỉnh" ─────────────────────────────────────
  // Lọc theo Loại số điều chỉnh / Tên NVL / Phòng ban bên giao / Phòng ban bên nhận / Xưởng bên
  // giao / Xưởng bên nhận. Mỗi (Tab lò cao, vùng) giữ bộ lọc RIÊNG. Bộ lọc chỉ ảnh hưởng hiển
  // thị — tableData (nguồn sự thật) vẫn giữ đủ dòng bị ẩn/ở Tab khác.
  type FilterShape = {
    loaiSoDieuChinh?: string | number;
    tenNVL?: string;
    phongBanXuat?: string;
    phongBanNhap?: string;
    xuongXuat?: string;
    xuongNhap?: string;
    ca?:string;
  };
  const [filtersByVung, setFiltersByVung] = useState<Record<string, FilterShape>>({});
  const setVungFilters = useCallback(
    (key: string, updater: (f: FilterShape) => FilterShape) => {
      setFiltersByVung((prev) => ({ ...prev, [key]: updater(prev[key] ?? {}) }));
    },
    []
  );

  const loaiSoDieuChinhOptions = useMemo(
    () => (table1Section?.columns ?? []).find((c: any) => c.dataIndex === "loaiSoDieuChinh")?.options ?? [],
    [table1Section]
  );

  // Dòng của bảng Nội bộ = đúng lò cao đang chọn + loại điều chỉnh Nội bộ - Xuất SX.
  const rowsOfLoai = () =>
    tableData.filter((r) => xuongCuaDong(r) === activeXuong && Number(r.loaiDieuChinh) === LOAI_NOI_BO);

  const applyFilters = (rows: TableRow[], f: FilterShape) =>
    rows.filter((row) => {
      if (f.loaiSoDieuChinh != null && f.loaiSoDieuChinh !== "" && String(row.loaiSoDieuChinh) !== String(f.loaiSoDieuChinh)) return false;
      if (f.tenNVL && row.tenNVL !== f.tenNVL) return false;
      if (f.phongBanXuat && row.phongBanXuat !== f.phongBanXuat) return false;
      if (f.phongBanNhap && row.phongBanNhap !== f.phongBanNhap) return false;
      if (f.xuongXuat && row.xuongXuat !== f.xuongXuat) return false;
      if (f.xuongNhap && row.xuongNhap !== f.xuongNhap) return false;
      return true;
    });

  const uniqueOptions = (rows: TableRow[], field: string) =>
    Array.from(new Set(rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== ""))).map((v) => ({
      label: String(v),
      value: v as string,
    }));

  // Mỗi bảng chỉ thao tác trên tập con đang hiển thị (đúng Tab + vùng + bộ lọc) — cần ghép lại với
  // các dòng ở Tab/vùng khác/bị ẩn trong tableData gốc để không mất dữ liệu khi thêm/sửa/xóa.
  // Dòng mới thêm (chưa từng có trong tableData) tự gán "Loại điều chỉnh" theo vùng và lò cao theo
  // Tab đang mở, để dòng vừa thêm không "biến mất" khỏi bảng ngay sau khi thêm.
  const handleVungDataChange = useCallback(
    (visibleRows: TableRow[], newRows: TableRow[]) => {
      setTableData((prev) => {
        const newRowsByKey = new Map(newRows.map((r) => [r.key, r]));
        const visibleKeys = new Set(visibleRows.map((r) => r.key));
        const merged: TableRow[] = [];
        prev.forEach((row) => {
          if (visibleKeys.has(row.key)) {
            const updated = newRowsByKey.get(row.key);
            if (updated) {
              merged.push(updated);
              newRowsByKey.delete(row.key);
            }
          } else {
            merged.push(row);
          }
        });
        newRowsByKey.forEach((row) => {
          const hasLoai = row.loaiDieuChinh != null && row.loaiDieuChinh !== "";
          const hasLoCao = row.idLoCao != null && row.idLoCao !== "";
          merged.push({
            ...row,
            loaiDieuChinh: hasLoai ? row.loaiDieuChinh : LOAI_NOI_BO,
            idLoCao: hasLoCao ? row.idLoCao : Number(activeXuong),
          });
        });
        return recomputeRows(merged, prev, currentUserId);
      });
    },
    [activeXuong, currentUserId, setTableData]
  );

  const renderVungDieuChinh = () => {
    const key = String(activeXuong);
    const filters = filtersByVung[key] ?? {};
    const vungRows = rowsOfLoai();
    const visibleRows = applyFilters(vungRows, filters);
    const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "").length;
    const setF = (updater: (f: FilterShape) => FilterShape) => setVungFilters(key, updater);

    const filterSelect = (placeholder: string, field: keyof FilterShape, options: any[], width = 180) => (
      <Select
        allowClear
        showSearch
        size="small"
        placeholder={placeholder}
        style={{ width }}
        options={options}
        value={(filters[field] as any) ?? undefined}
        onChange={(value) => setF((f) => ({ ...f, [field]: value }))}
        optionFilterProp="label"
      />
    );

    return (
      <div style={{ marginBottom: 16 }}>
        <Collapse
          size="small"
          className="pdc-compact-filters"
          style={{ marginBottom: 8 }}
          items={[
            {
              key: "filters",
              label: (
                <Space>
                  <FilterOutlined />
                  Bộ lọc
                  {activeFilterCount > 0 && <Badge count={activeFilterCount} size="small" />}
                </Space>
              ),
              children: (
                <Space wrap size="small">
                  {filterSelect("Loại số điều chỉnh", "loaiSoDieuChinh", loaiSoDieuChinhOptions, 160)}
                  {filterSelect("Tên NVL", "tenNVL", uniqueOptions(vungRows, "tenNVL"))}
                  {filterSelect("Phòng ban bên giao", "phongBanXuat", uniqueOptions(vungRows, "phongBanXuat"))}
                  {filterSelect("Phòng ban bên nhận", "phongBanNhap", uniqueOptions(vungRows, "phongBanNhap"))}
                  {filterSelect("Xưởng bên giao", "xuongXuat", uniqueOptions(vungRows, "xuongXuat"))}
                  {filterSelect("Xưởng bên nhận", "xuongNhap", uniqueOptions(vungRows, "xuongNhap"))}
                  {filterSelect("Ca", "ca", uniqueOptions(vungRows, "ca"))}
                  {activeFilterCount > 0 && (
                    <Button size="small" onClick={() => setF(() => ({}))}>
                      Xóa lọc
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />

        {/* Giới hạn bảng trong khung riêng — cuộn ngang/dọc chỉ diễn ra bên trong bảng, không kéo
            giãn/cuộn theo cả trang. 2 vùng xếp dọc nên mỗi bảng chỉ chiếm khoảng nửa chiều cao. */}
        <div style={{ maxWidth: "100%", overflow: "auto" }}>
          <CustomFormTableV2
            key={key}
            columns={visibleTableColumns}
            initialData={visibleRows}
            onDataChange={(newRows: TableRow[]) => handleVungDataChange(visibleRows, newRows)}
            loading={loading}
            editable={!locked}
            showAddButton={!locked}
            showDeleteButton={!locked}
            minRows={0}
            scrollY="max(360px, calc(100vh - 300px))"
            pagination={{ pageSize: 50 }}
            showPlaceholder={false}
          />
        </div>
      </div>
    );
  };

  return (
    <div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
      <Popover
        trigger="click"
        placement="bottomRight"
        title="Chọn cột hiển thị"
        content={
          <div style={{ width: 280, maxHeight: 340, overflow: "auto" }}>
            <Checkbox.Group
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
              value={toggleableColumns.filter((o) => !hiddenColumns.includes(o.dataIndex)).map((o) => o.dataIndex)}
              onChange={(checked) => {
                const checkedSet = new Set(checked as string[]);
                setHiddenColumns(toggleableColumns.filter((o) => !checkedSet.has(o.dataIndex)).map((o) => o.dataIndex));
              }}
            >
              {toggleableColumns.map((o) => (
                <Checkbox key={o.dataIndex} value={o.dataIndex}>{o.label}</Checkbox>
              ))}
            </Checkbox.Group>
            <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }} onClick={() => setHiddenColumns([])}>
              Hiện tất cả cột
            </Button>
          </div>
        }
      >
        <Badge count={hiddenColumns.length} size="small">
          <Button size="small" icon={<TableOutlined />}>Cột hiển thị</Button>
        </Badge>
      </Popover>
    </div>

      <XuongTabs xuongList={xuongList} activeXuong={activeXuong} onChange={onChangeXuong}>
        {renderVungDieuChinh()}
      </XuongTabs>
    </div>
  );
};

export default NoiBoTab;
