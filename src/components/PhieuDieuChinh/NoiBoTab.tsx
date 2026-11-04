/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Collapse, Empty, Input, InputNumber, Popconfirm, Select, Space, Table, message } from "antd";
import { DeleteOutlined, FilterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { tenCa } from "../../services/PhieuDieuChinhApi";
import { tinhKhoiLuongTuQuyKho } from "../../pages/NMLG/PhieuDieuChinh/BBGNDieuChinhTable";
import XuongTabs, { type XuongItem } from "./XuongTabs";
import { LOAI_NOI_BO, recomputeRows, toNum, type TableRow } from "./noiBoUtils";

interface Props {
  /** Toàn bộ dòng chi tiết của phiếu (state ở component cha vì khi Lưu cần đọc) */
  tableData: TableRow[];
  setTableData: Dispatch<SetStateAction<TableRow[]>>;
  xuongList: XuongItem[];
  activeXuong: string;
  onChangeXuong: (key: string) => void;
  /** Phiếu đang khóa (đã gửi/duyệt) → chỉ xem */
  locked: boolean;
  loading: boolean;
  nguoiKyMap: Map<number, string>;
  currentUserId?: number | null;
}

const LOAI_SO_OPTIONS = [
  { label: "Trước ẩm", value: 1 },
  { label: "Sau ẩm", value: 2 },
];

const fmt = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 3 }) : String(v);
};

// Bộ lọc giống tab Nhập / Xuất; chỉ ảnh hưởng hiển thị — tableData (nguồn sự thật) vẫn giữ đủ dòng bị ẩn.
type FilterShape = {
  loaiSoDieuChinh?: number;
  idCa?: number;
  tenNVL?: string;
  phongBanXuat?: string;
  phongBanNhap?: string;
  xuongXuat?: string;
  xuongNhap?: string;
};

const uniqueOptions = (rows: TableRow[], field: string) =>
  Array.from(new Set(rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== ""))).map((v) => ({
    label: String(v),
    value: v as string,
  }));

// Phần Nội bộ - Xuất vào sản xuất: mỗi xưởng nhận 1 tab, dòng thuộc xưởng nào do idLoCao (= ID xưởng nhận).
// Giao diện giống tab Nhập / Xuất (bộ lọc + bảng); dữ liệu vẫn là các dòng LG_PhieuDieuChinh_ChiTiet loại Nội bộ.
const NoiBoTab = ({
  tableData,
  setTableData,
  xuongList,
  activeXuong,
  onChangeXuong,
  locked,
  loading,
  nguoiKyMap,
  currentUserId,
}: Props) => {
  // Dòng Nội bộ thuộc xưởng nào (idLoCao = ID xưởng nhận). Dòng chưa rõ xưởng (hoặc xưởng không còn trong danh sách)
  // hiện ở xưởng đầu tiên để không bị "biến mất" — không có tab riêng cho dòng này.
  // Dòng cũ lưu idLoCao là mã lò (chưa phải ID xưởng) thì tra theo tên xưởng nhận để vẫn về đúng tab.
  const xuongCuaDong = (r: TableRow): string => {
    const id = Number(r.idLoCao);
    if (xuongList.some((x) => x.id === id)) return String(id);
    const theoTen = r.xuongNhap ? xuongList.find((x) => x.tenXuong === r.xuongNhap) : undefined;
    return String(theoTen?.id ?? xuongList[0]?.id ?? "");
  };

  const [filtersByKey, setFiltersByKey] = useState<Record<string, FilterShape>>({});
  const filterId = String(activeXuong);
  const filters = filtersByKey[filterId] ?? {};
  const setF = (updater: (f: FilterShape) => FilterShape) =>
    setFiltersByKey((prev) => ({ ...prev, [filterId]: updater(prev[filterId] ?? {}) }));
  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "").length;

  // Dòng của xưởng đang xem (trước khi áp bộ lọc)
  const tabRows = tableData.filter(
    (r) => xuongCuaDong(r) === activeXuong && Number(r.loaiDieuChinh) === LOAI_NOI_BO
  );

  const visibleRows = tabRows.filter((r) => {
    if (filters.loaiSoDieuChinh != null && Number(r.loaiSoDieuChinh) !== filters.loaiSoDieuChinh) return false;
    if (filters.idCa != null && Number(r.idCa) !== filters.idCa) return false;
    if (filters.tenNVL && r.tenNVL !== filters.tenNVL) return false;
    if (filters.phongBanXuat && r.phongBanXuat !== filters.phongBanXuat) return false;
    if (filters.phongBanNhap && r.phongBanNhap !== filters.phongBanNhap) return false;
    if (filters.xuongXuat && r.xuongXuat !== filters.xuongXuat) return false;
    if (filters.xuongNhap && r.xuongNhap !== filters.xuongNhap) return false;
    return true;
  });

  const filterSelect = (
    placeholder: string,
    field: keyof FilterShape,
    options: { label: string; value: string | number }[],
    width = 180
  ) => (
    <Select
      allowClear
      showSearch
      size="small"
      placeholder={placeholder}
      style={{ width }}
      options={options}
      value={filters[field] ?? undefined}
      onChange={(value) => setF((f) => ({ ...f, [field]: value }))}
      optionFilterProp="label"
    />
  );

  // Sửa 1 dòng rồi tính lại KL quy khô / người điều chỉnh (xem recomputeRows)
  const patchRow = useCallback(
    (key: string | undefined, change: Partial<TableRow>) => {
      setTableData((prev) =>
        recomputeRows(
          prev.map((r) => (r.key === key ? { ...r, ...change } : r)),
          prev,
          currentUserId
        )
      );
    },
    [currentUserId, setTableData]
  );

  const xoaDong = useCallback(
    (key: string | undefined) => setTableData((prev) => prev.filter((r) => r.key !== key)),
    [setTableData]
  );

  const columns: ColumnsType<TableRow> = useMemo(() => {
    const nguoiVaThoiGian = (id: number | null, thoiGian?: string | null) => {
      if (!id) return "";
      const d = thoiGian ? new Date(thoiGian) : null;
      const p2 = (n: number) => String(n).padStart(2, "0");
      const gio =
        d && !Number.isNaN(d.getTime())
          ? `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
          : null;
      return (
        <div style={{ lineHeight: 1.3 }}>
          <div>{nguoiKyMap.get(Number(id)) ?? `#${id}`}</div>
          {gio && <div style={{ fontSize: 12, color: "#8c8c8c" }}>{gio}</div>}
        </div>
      );
    };

    return [
      { title: "STT", width: 50, align: "center", render: (_: unknown, __: TableRow, i: number) => i + 1 },
      { title: "Nhóm NVL", dataIndex: "tenNhomNVL", width: 130 },
      { title: "Tên NVL", dataIndex: "tenNVL", width: 180 },
      { title: "Lô", dataIndex: "maLo", width: 110 },
      { title: "Ca", dataIndex: "idCa", width: 90, render: (v: number | null) => tenCa(v) },
      { title: "Xưởng giao", dataIndex: "xuongXuat", width: 150 },
      { title: "Xưởng nhận", dataIndex: "xuongNhap", width: 150 },
      {
        title: "Độ ẩm (%)",
        dataIndex: "doAm",
        width: 100,
        align: "right",
        // Độ ẩm chỉ nhập được khi Loại số điều chỉnh khác "Trước ẩm"
        render: (v: number | string | null, row: TableRow) =>
          !locked && String(row.loaiSoDieuChinh) !== "1" ? (
            <InputNumber
              size="small"
              min={0}
              max={100}
              step={0.01}
              value={toNum(v)}
              onChange={(val) => patchRow(row.key, { doAm: val ?? null })}
              style={{ width: 80 }}
            />
          ) : (
            fmt(v)
          ),
      },
      {
        title: "Loại số điều chỉnh",
        dataIndex: "loaiSoDieuChinh",
        width: 130,
        render: (v: number | string | null, row: TableRow) =>
          locked ? (
            LOAI_SO_OPTIONS.find((o) => o.value === Number(v))?.label ?? ""
          ) : (
            <Select
              size="small"
              allowClear
              placeholder="Chọn"
              value={v != null && v !== "" ? Number(v) : undefined}
              style={{ width: "100%" }}
              options={LOAI_SO_OPTIONS}
              onChange={(val) => patchRow(row.key, { loaiSoDieuChinh: val ?? null })}
            />
          ),
      },
      {
        title: "KL xuất",
        dataIndex: "khoiLuongXuat",
        width: 110,
        align: "right",
        render: (v: number | null) => fmt(v),
      },
      {
        title: "KL quy khô xuất",
        dataIndex: "khoiLuongQuyKhoXuat",
        width: 120,
        align: "right",
        render: (v: number | null) => fmt(v),
      },
      {
        title: "KL nhập",
        dataIndex: "khoiLuongNhap",
        width: 130,
        align: "right",
        render: (v: number | string | null, row: TableRow) =>
          !locked ? (
            <InputNumber
              size="small"
              min={0}
              step={0.001}
              precision={3}
              value={toNum(v)}
              onChange={(val) => patchRow(row.key, { khoiLuongNhap: val ?? null })}
              style={{ width: 110 }}
            />
          ) : (
            fmt(v)
          ),
      },
      {
        title: "KL quy khô nhập",
        dataIndex: "khoiLuongQuyKhoNhap",
        width: 120,
        align: "right",
        // Nhập KL quy khô → tính ngược KL (cùng loại số điều chỉnh và độ ẩm), như tab Nhập / Xuất
        render: (v: number | string | null, row: TableRow) =>
          !locked ? (
            <InputNumber
              size="small"
              min={0}
              step={0.001}
              precision={3}
              value={toNum(v)}
              onChange={(val) => {
                const loaiSo = toNum(row.loaiSoDieuChinh);
                const kl = tinhKhoiLuongTuQuyKho(val, loaiSo, toNum(row.doAm));
                if (val != null && kl == null) {
                  message.warning(
                    loaiSo == null
                      ? "Chọn Loại số điều chỉnh trước khi nhập KL quy khô."
                      : "Cần nhập Độ ẩm (Sau ẩm) mới tính ngược được từ KL quy khô."
                  );
                  return;
                }
                patchRow(row.key, { khoiLuongNhap: kl });
              }}
              style={{ width: 110 }}
            />
          ) : (
            fmt(v)
          ),
      },
      {
        title: "Ghi chú",
        dataIndex: "ghiChu",
        width: 180,
        render: (v: string | null, row: TableRow) =>
          !locked ? (
            <Input
              size="small"
              value={v ?? ""}
              maxLength={500}
              onChange={(e) => patchRow(row.key, { ghiChu: e.target.value })}
            />
          ) : (
            <div style={{ whiteSpace: "pre-line" }}>{v ?? ""}</div>
          ),
      },
      {
        title: "Người điều chỉnh",
        width: 190,
        render: (_: unknown, r: TableRow) => nguoiVaThoiGian(r.nguoiDieuChinhNhan, r.thoiGianDieuChinhNhan),
      },
      {
        title: "Thao tác",
        width: 70,
        fixed: "right",
        render: (_: unknown, r: TableRow) =>
          locked ? null : (
            <Popconfirm
              title="Xóa dòng này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => xoaDong(r.key)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ),
      },
    ];
  }, [locked, nguoiKyMap, patchRow, xoaDong]);

  return (
    <XuongTabs xuongList={xuongList} activeXuong={activeXuong} onChange={onChangeXuong}>
      <div>
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
                  {filterSelect("Tên NVL", "tenNVL", uniqueOptions(tabRows, "tenNVL"))}
                  {filterSelect(
                    "Ca",
                    "idCa",
                    Array.from(new Set(tabRows.filter((r) => r.idCa != null && r.idCa !== "").map((r) => Number(r.idCa))))
                      .sort((a, b) => a - b)
                      .map((v) => ({ label: tenCa(v), value: v })),
                    120
                  )}
                  {filterSelect("Loại số điều chỉnh", "loaiSoDieuChinh", LOAI_SO_OPTIONS, 160)}
                  {filterSelect("Phòng ban bên giao", "phongBanXuat", uniqueOptions(tabRows, "phongBanXuat"))}
                  {filterSelect("Xưởng bên giao", "xuongXuat", uniqueOptions(tabRows, "xuongXuat"))}
                  {filterSelect("Phòng ban bên nhận", "phongBanNhap", uniqueOptions(tabRows, "phongBanNhap"))}
                  {filterSelect("Xưởng bên nhận", "xuongNhap", uniqueOptions(tabRows, "xuongNhap"))}
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

        <Table<TableRow>
          size="small"
          bordered
          loading={loading}
          rowKey="key"
          columns={columns}
          dataSource={visibleRows}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          scroll={{ x: "max-content", y: "max(360px, calc(100vh - 420px))" }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có dữ liệu. Bấm Tải dữ liệu để lấy dòng từ nguồn."
              />
            ),
          }}
        />
      </div>
    </XuongTabs>
  );
};

export default NoiBoTab;
