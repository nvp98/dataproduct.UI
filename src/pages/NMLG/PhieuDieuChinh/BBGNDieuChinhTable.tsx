
import { useMemo, useState } from "react";
import { Badge, Button, Collapse, Empty, Input, InputNumber, Popconfirm, Select, Space, Table, Tooltip, message } from "antd";
import { FilterOutlined, UndoOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  LOAI_BBGN_NHAP,
  tenCa,
  type LoaiBBGN,
  type PhieuDieuChinhBBGNLineDto,
  type SavePhieuDieuChinhBBGNDto,
} from "../../../services/PhieuDieuChinhApi";

/**
 * Bảng điều chỉnh BBGN.
 *
 * - Cho phép nhập cả KL xuất và KL nhập.
 * - Độ ẩm lấy từ BBGN, chỉ đọc.
 * - Sau ẩm cần độ ẩm để tính KL quy khô; Trước ẩm thì không cần.
 * - Trước ẩm: KL quy khô = KL.
 * - Sau ẩm: KL quy khô = KL * (100 - Độ ẩm) / 100.
 */

export interface BBGNRow extends PhieuDieuChinhBBGNLineDto {
  dirty?: boolean;
}

const LOAI_SO_OPTIONS = [
  { label: "Trước ẩm", value: 1 },
  { label: "Sau ẩm", value: 2 },
];

const fmt = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return "";

  const n = Number(v);

  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 3 })
    : String(v);
};

const layIdNguoiDung = (): number | null => {
  try {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored)?.iD_TaiKhoan ?? null : null;
  } catch {
    return null;
  }
};

/**
 * Tính khối lượng quy khô (cùng quy tắc với backend).
 *
 * Trước ẩm: quy khô = KL (không cần độ ẩm). Sau ẩm: quy khô = KL * (100 - độ ẩm) / 100,
 * thiếu độ ẩm thì không tính. Chưa có KL hoặc chưa chọn loại số thì để trống.
 */
export const tinhQuyKho = (
  khoiLuong: number | null | undefined,
  loaiSo: number | null | undefined,
  doAm: number | null | undefined
): number | null => {
  if (khoiLuong == null) return null;
  if (loaiSo === 1) return Number(khoiLuong.toFixed(3));
  if (loaiSo === 2 && doAm != null) {
    return Number((khoiLuong * (100 - doAm) / 100).toFixed(3));
  }
  return null;
};

/**
 * Tính ngược khối lượng từ KL quy khô (cùng loại số điều chỉnh và độ ẩm).
 *
 * Trước ẩm: KL = KL quy khô. Sau ẩm: KL = KL quy khô * 100 / (100 - độ ẩm).
 * Thiếu loại số / độ ẩm (khi Sau ẩm) hoặc độ ẩm >= 100 thì không tính.
 */
export const tinhKhoiLuongTuQuyKho = (
  quyKho: number | null | undefined,
  loaiSo: number | null | undefined,
  doAm: number | null | undefined
): number | null => {
  if (quyKho == null) return null;
  if (loaiSo === 1) return Number(quyKho.toFixed(3));
  if (loaiSo === 2 && doAm != null && doAm < 100) {
    return Number(((quyKho * 100) / (100 - doAm)).toFixed(3));
  }
  return null;
};

/**
 * Tạo dữ liệu gửi lên backend.
 */
export const taoItemsLuu = (
  loai: LoaiBBGN,
  rows: BBGNRow[]
): SavePhieuDieuChinhBBGNDto[] =>
  rows
    .filter((r) => r.dirty)
    .map((r) => ({
      idCtBBGN: r.idCtBBGN,
      idVatTu: r.idVatTu,
      tenVatTu: r.tenVatTu,
      maLo: r.maLo,
      tenXuongGiao: r.tenXuongGiao,
      tenPhongBanGiao: r.tenPhongBanGiao,
      tenXuongNhan: r.tenXuongNhan,
      tenPhongBanNhan: r.tenPhongBanNhan,
      loaiSoDieuChinh: r.loaiSoDieuChinh,

      khoiLuong:
        loai === LOAI_BBGN_NHAP
          ? r.khoiLuongNhap
          : r.khoiLuongXuat,

      doAm: r.doAm,

      ghiChu:
        (loai === LOAI_BBGN_NHAP
          ? r.ghiChuNhap
          : r.ghiChuXuat) || null,

      moTa:
        [r.tenVatTu, r.maLo]
          .filter(Boolean)
          .join(" - ") || null,
    }));

interface BBGNDieuChinhTableProps {
  /** 1 = Nhập, 3 = Xuất */
  loai: LoaiBBGN;
  rows: BBGNRow[];
  onChange: (rows: BBGNRow[]) => void;
  editable: boolean;
  nguoiKyMap: Map<number, string>;
  loading?: boolean;
  filter?: (row: BBGNRow) => boolean;
  /** Khóa của tab đang xem (id xưởng) — mỗi tab giữ bộ lọc riêng */
  filterKey?: string;
  /** Reset số điều chỉnh của bên kia (gọi API); ném lỗi nếu thất bại. Không truyền = ẩn nút Reset (vd phiếu chưa lưu). */
  onReset?: (row: BBGNRow, lyDo: string) => Promise<void>;
}

// Bộ lọc giống bảng Nội bộ: Loại số điều chỉnh / Tên NVL / Phòng ban giao / Phòng ban nhận / Xưởng giao / Xưởng nhận.
// Chỉ ảnh hưởng hiển thị — `rows` (nguồn sự thật) vẫn giữ đủ dòng bị ẩn, nên sửa/lưu không bị mất dòng.
type FilterShape = {
  loaiSoDieuChinh?: number;
  tenVatTu?: string;
  tenPhongBanGiao?: string;
  tenPhongBanNhan?: string;
  tenXuongGiao?: string;
  tenXuongNhan?: string;
};

const uniqueOptions = (rows: BBGNRow[], field: keyof FilterShape) =>
  Array.from(
    new Set(rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== ""))
  ).map((v) => ({ label: String(v), value: v as string | number }));

const OWN_BG = "#fffbe6";

const BBGNDieuChinhTable = ({
  loai,
  rows,
  onChange,
  editable,
  nguoiKyMap,
  loading,
  filter,
  filterKey,
  onReset,
}: BBGNDieuChinhTableProps) => {
  const laNhan = loai === LOAI_BBGN_NHAP;

  // Dòng của tab đang xem (trước khi áp bộ lọc)
  const tabRows = useMemo(
    () => (filter ? rows.filter(filter) : rows),
    [rows, filter]
  );

  // idCtBBGN của dòng đang gọi API reset (null = không có)
  const [dangReset, setDangReset] = useState<number | null>(null);

  const [filtersByKey, setFiltersByKey] = useState<Record<string, FilterShape>>({});
  const filterId = filterKey ?? "all";
  const filters = filtersByKey[filterId] ?? {};
  const setF = (updater: (f: FilterShape) => FilterShape) =>
    setFiltersByKey((prev) => ({ ...prev, [filterId]: updater(prev[filterId] ?? {}) }));
  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "").length;

  const visibleRows = useMemo(
    () =>
      tabRows.filter((r) => {
        if (filters.loaiSoDieuChinh != null && r.loaiSoDieuChinh !== filters.loaiSoDieuChinh) return false;
        if (filters.tenVatTu && r.tenVatTu !== filters.tenVatTu) return false;
        if (filters.tenPhongBanGiao && r.tenPhongBanGiao !== filters.tenPhongBanGiao) return false;
        if (filters.tenPhongBanNhan && r.tenPhongBanNhan !== filters.tenPhongBanNhan) return false;
        if (filters.tenXuongGiao && r.tenXuongGiao !== filters.tenXuongGiao) return false;
        if (filters.tenXuongNhan && r.tenXuongNhan !== filters.tenXuongNhan) return false;
        return true;
      }),
    [tabRows, filters]
  );

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

  /**
   * Cập nhật dòng và tính lại KL quy khô của bên đang sửa.
   */
  const patchRow = (
    idCtBBGN: number,
    change: Partial<BBGNRow>
  ) => {
    onChange(
      rows.map((r) => {
        if (r.idCtBBGN !== idCtBBGN) {
          return r;
        }

        const next: BBGNRow = {
          ...r,
          ...change,
          dirty: true,
        };

        // Loại số điều chỉnh là của riêng bên đang xem → chỉ tính lại KL quy khô của bên mình;
        // số của bên kia giữ nguyên như đã lưu.
        const nguoiHienTai = layIdNguoiDung();
        const fKl = laNhan ? "khoiLuongNhap" : "khoiLuongXuat";
        const fQk = laNhan ? "klQuyKhoNhap" : "klQuyKhoXuat";
        // Nhập KL quy khô → tính ngược KL; còn lại (nhập KL, đổi loại số...) → tính KL quy khô từ KL.
        // Cả 2 trường hợp đều tính lại KL quy khô từ KL đã làm tròn để số hiển thị trùng số sẽ lưu.
        if (fQk in change) {
          next[fKl] = tinhKhoiLuongTuQuyKho(
            change[fQk] as number | null,
            next.loaiSoDieuChinh,
            next.doAm
          );
        }
        next[fQk] = tinhQuyKho(next[fKl], next.loaiSoDieuChinh, next.doAm);
        // Ghi nhận người sửa ngay khi sửa khối lượng (BE cũng ghi lại khi Lưu, làm vậy để cột
        // "Người điều chỉnh" hiện luôn mà không cần tải lại).
        if (fKl in change || fQk in change) {
          const coKl = next[fKl] != null;
          const nguoi = laNhan ? "nguoiNhap" : "nguoiXuat";
          const thoiGian = laNhan ? "thoiGianNhap" : "thoiGianXuat";
          next[nguoi] = coKl ? nguoiHienTai : null;
          next[thoiGian] = coKl ? new Date().toISOString() : null;
        }

        return next;
      })
    );
  };

  const columns: ColumnsType<BBGNRow> = useMemo(() => {
    const nguoiVaThoiGian = (id: number | null) =>
      id ? (
        <div style={{ lineHeight: 1.3 }}>
          <div>{nguoiKyMap.get(Number(id)) ?? `#${id}`}</div>
        </div>
      ) : (
        ""
      );

    const ownCell = () => ({
      style: { background: OWN_BG },
    });

    const ownHeader = () => ({
      style: { background: OWN_BG },
    });

    /**
     * Cột khối lượng: chỉ nhập được số của bên mình (tab Nhập → KL nhập, tab Xuất → KL xuất);
     * số của bên kia chỉ đọc.
     */
    const khoiLuongCell = (
      field: "khoiLuongNhap" | "khoiLuongXuat"
    ) => (v: number | null, row: BBGNRow) =>
      editable && (field === "khoiLuongNhap") === laNhan ? (
        <InputNumber
          size="small"
          min={0}
          step={0.001}
          precision={3}
          value={v}
          onChange={(val) =>
            patchRow(row.idCtBBGN, {
              [field]: val,
            } as Partial<BBGNRow>)
          }
          style={{ width: 110 }}
        />
      ) : (
        fmt(v)
      );

    /**
     * Cột KL quy khô: bên mình nhập được (tự tính ngược KL), bên kia chỉ đọc.
     * Cần chọn Loại số điều chỉnh (và có độ ẩm nếu Sau ẩm) mới tính ngược được.
     */
    const quyKhoCell = (
      field: "klQuyKhoNhap" | "klQuyKhoXuat"
    ) => (v: number | null, row: BBGNRow) =>
      editable && (field === "klQuyKhoNhap") === laNhan ? (
        <InputNumber
          size="small"
          min={0}
          step={0.001}
          precision={3}
          value={v}
          onChange={(val) => {
            if (val != null && tinhKhoiLuongTuQuyKho(val, row.loaiSoDieuChinh, row.doAm) == null) {
              message.warning(
                row.loaiSoDieuChinh == null
                  ? "Chọn Loại số điều chỉnh trước khi nhập KL quy khô."
                  : "Dòng này không có độ ẩm nên không tính ngược được từ KL quy khô (Sau ẩm)."
              );
              return;
            }
            patchRow(row.idCtBBGN, { [field]: val } as Partial<BBGNRow>);
          }}
          style={{ width: 110 }}
        />
      ) : (
        fmt(v)
      );

    return [
      {
        title: "STT",
        width: 50,
        align: "center",
        render: (_: unknown, __: BBGNRow, i: number) => i + 1,
      },
      {
        title: "Tên NVL",
        dataIndex: "tenVatTu",
        width: 180,
      },
      {
        title: "Lô",
        dataIndex: "maLo",
        width: 110,
      },
      {
        title: "Ca",
        dataIndex: "idCa",
        width: 90,
        render: (v: number | null) => tenCa(v),
      },
      {
        title: "Xưởng giao",
        dataIndex: "tenXuongGiao",
        width: 150,
      },
      {
        title: "Xưởng nhận",
        dataIndex: "tenXuongNhan",
        width: 150,
      },
      {
        title: "Độ ẩm (BBGN)",
        dataIndex: "doAm",
        width: 100,
        align: "right",
        render: (v: number | null) => fmt(v),
      },
      {
        title: "Loại số điều chỉnh",
        dataIndex: "loaiSoDieuChinh",
        width: 130,
        render: (v: number | null, row: BBGNRow) =>
          editable ? (
            <Select
              size="small"
              allowClear
              placeholder="Chọn"
              value={v ?? undefined}
              style={{ width: "100%" }}
              options={LOAI_SO_OPTIONS.map((o) => ({
                ...o,
                disabled: o.value === 2 && row.doAm == null,
              }))}
              onChange={(val) =>
                patchRow(row.idCtBBGN, {
                  loaiSoDieuChinh: val ?? null,
                })
              }
            />
          ) : (
            LOAI_SO_OPTIONS.find((o) => o.value === v)?.label ?? ""
          ),
      },
      {
        title: "KL xuất",
        dataIndex: "khoiLuongXuat",
        width: 130,
        align: "right",
        onCell: laNhan ? undefined : ownCell,
        onHeaderCell: laNhan ? undefined : ownHeader,
        render: khoiLuongCell("khoiLuongXuat"),
      },
      {
        title: "KL quy khô xuất",
        dataIndex: "klQuyKhoXuat",
        width: 120,
        align: "right",
        onCell: laNhan ? undefined : ownCell,
        render: quyKhoCell("klQuyKhoXuat"),
      },
      {
        title: "KL nhập",
        dataIndex: "khoiLuongNhap",
        width: 130,
        align: "right",
        onCell: laNhan ? ownCell : undefined,
        onHeaderCell: laNhan ? ownHeader : undefined,
        render: khoiLuongCell("khoiLuongNhap"),
      },
      {
        title: "KL quy khô nhập",
        dataIndex: "klQuyKhoNhap",
        width: 120,
        align: "right",
        onCell: laNhan ? ownCell : undefined,
        render: quyKhoCell("klQuyKhoNhap"),
      },
      {
        title: "Chênh lệch",
        width: 100,
        align: "right",
        render: (_: unknown, r: BBGNRow) => {
          if (
            r.khoiLuongNhap == null ||
            r.khoiLuongXuat == null
          ) {
            return "";
          }

          const cl = Number(
            (r.khoiLuongNhap - r.khoiLuongXuat).toFixed(3)
          );

          return (
            <span
              style={
                cl !== 0
                  ? { color: "#cf1322", fontWeight: 600 }
                  : undefined
              }
            >
              {fmt(cl)}
            </span>
          );
        },
      },
      {
        title: "Ghi chú",
        width: 180,
        render: (_: unknown, r: BBGNRow) => {
          const value =
            (laNhan ? r.ghiChuNhap : r.ghiChuXuat) ?? "";
          // Ghi chú của bên kia (chỉ đọc) — nơi hiện dòng "[Reset bởi bên ...]" sau khi reset
          const ghiChuBenKia = ((laNhan ? r.ghiChuXuat : r.ghiChuNhap) ?? "").trim();

          return (
            <div>
              {editable ? (
                <Input
                  size="small"
                  value={value}
                  maxLength={500}
                  onChange={(e) =>
                    patchRow(
                      r.idCtBBGN,
                      laNhan
                        ? { ghiChuNhap: e.target.value }
                        : { ghiChuXuat: e.target.value }
                    )
                  }
                />
              ) : (
                value
              )}
              {ghiChuBenKia && (
                <div style={{ marginTop: 2, fontSize: 12, color: "#8c8c8c", whiteSpace: "pre-line" }}>
                  Ghi chú bên {laNhan ? "xuất" : "nhận"}: {ghiChuBenKia}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Người điều chỉnh nhận",
        width: 190,
        render: (_: unknown, r: BBGNRow) => nguoiVaThoiGian(r.nguoiNhap),
      },
      {
        title: "Người điều chỉnh giao",
        width: 190,
        render: (_: unknown, r: BBGNRow) => nguoiVaThoiGian(r.nguoiXuat),
      },
      {
        title: "Thao tác",
        width:  90,
        fixed: "right",
        render: (_: unknown, r: BBGNRow) => {
          const klBenKia = laNhan ? r.khoiLuongXuat : r.khoiLuongNhap;
          if (!editable || !onReset || klBenKia == null) return null;
          const lyDo = ((laNhan ? r.ghiChuNhap : r.ghiChuXuat) ?? "").trim();
          return (
            <Popconfirm
              title={`Reset KL bên ${laNhan ? "xuất" : "nhận"} (${fmt(klBenKia)})?`}
              description={lyDo ? `Lý do: ${lyDo}` : undefined}
              okText="Reset"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              disabled={!lyDo}
              onConfirm={() => resetDong(r, lyDo)}
            >
              <Tooltip title={lyDo ? undefined : "Nhập Ghi chú (lý do) của dòng này trước khi reset"}>
                <Button
                  size="small"
                  danger
                  icon={<UndoOutlined />}
                  loading={dangReset === r.idCtBBGN}
                  // Thiếu ghi chú: chặn tại chỗ và báo ngay (Popconfirm bị tắt nên không tự hiện hỏi xác nhận)
                  onClick={() => !lyDo && message.warning("Phải nhập Ghi chú (lý do) của dòng này trước khi reset.")}
                >
                </Button>
              </Tooltip>
            </Popconfirm>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, editable, laNhan, nguoiKyMap, onReset, dangReset]);

  // Reset số của bên kia cho đúng 1 dòng, lý do = Ghi chú của dòng đó
  const resetDong = async (row: BBGNRow, lyDo: string) => {
    if (!onReset) return;
    setDangReset(row.idCtBBGN);
    try {
      const klCu = laNhan ? row.khoiLuongXuat : row.khoiLuongNhap;
      await onReset(row, lyDo);
      // Dòng ghi chú giống hệt dòng BE nối vào ghi chú bên kia (LG_PhieuDieuChinhRepository.ResetBenKiaBBGNAsync)
      const bayGio = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const dong =
        `[Reset bởi bên ${laNhan ? "nhận" : "xuất"} ` +
        `${p2(bayGio.getDate())}/${p2(bayGio.getMonth() + 1)}/${bayGio.getFullYear()} ${p2(bayGio.getHours())}:${p2(bayGio.getMinutes())}` +
        ` (KL cũ ${klCu == null ? "" : Number(Number(klCu).toFixed(3))}): ${lyDo.trim()}]`;
      const noiGhiChu = (cu?: string | null) => (cu && cu.trim() ? `${cu}\n${dong}` : dong);
      // Xóa số bên kia + hiện dòng lý do trong ghi chú bên kia ngay trên bảng (không đánh dấu dirty; không tải lại
      // để giữ các chỉnh sửa chưa lưu của bên mình)
      onChange(
        rows.map((r) =>
          r.idCtBBGN !== row.idCtBBGN
            ? r
            : laNhan
              ? { ...r, khoiLuongXuat: null, klQuyKhoXuat: null, nguoiXuat: null, thoiGianXuat: null, ghiChuXuat: noiGhiChu(r.ghiChuXuat) }
              : { ...r, khoiLuongNhap: null, klQuyKhoNhap: null, nguoiNhap: null, thoiGianNhap: null, ghiChuNhap: noiGhiChu(r.ghiChuNhap) }
        )
      );
    } catch {
      // Lỗi đã được hiển thị bởi onReset
    } finally {
      setDangReset(null);
    }
  };

  return (
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
                {filterSelect("Loại số điều chỉnh", "loaiSoDieuChinh", LOAI_SO_OPTIONS, 160)}
                {filterSelect("Tên NVL", "tenVatTu", uniqueOptions(tabRows, "tenVatTu"))}
                {filterSelect("Phòng ban bên giao", "tenPhongBanGiao", uniqueOptions(tabRows, "tenPhongBanGiao"))}
                {filterSelect("Phòng ban bên nhận", "tenPhongBanNhan", uniqueOptions(tabRows, "tenPhongBanNhan"))}
                {filterSelect("Xưởng bên giao", "tenXuongGiao", uniqueOptions(tabRows, "tenXuongGiao"))}
                {filterSelect("Xưởng bên nhận", "tenXuongNhan", uniqueOptions(tabRows, "tenXuongNhan"))}
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

      <Table<BBGNRow>
        size="small"
        bordered
        loading={loading}
        rowKey="idCtBBGN"
        columns={columns}
        dataSource={visibleRows}
        pagination={{
          pageSize: 50,
          hideOnSinglePage: true,
        }}
        scroll={{
          x: "max-content",
          y: "max(360px, calc(100vh - 420px))",
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                laNhan
                  ? "Không có dòng BBGN nào nhận vào xưởng này theo Ngày đã chọn"
                  : "Không có dòng BBGN nào xuất từ xưởng này theo Ngày đã chọn"
              }
            />
          ),
        }}
      />
    </div>
  );
};

export default BBGNDieuChinhTable;
