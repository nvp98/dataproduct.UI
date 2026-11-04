
import { useMemo, useState } from "react";
import { Badge, Button, Collapse, Empty, Input, InputNumber, Popconfirm, Select, Space, Table, Tooltip, message } from "antd";
import { FilterOutlined, LockOutlined, UndoOutlined } from "@ant-design/icons";
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
      thoiGianPhienBan: r.thoiGianPhienBan ?? null,

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
  /** Reset Loại số điều chỉnh của cả 2 bên cho 1 dòng (gọi API); ném lỗi nếu thất bại. Không truyền = ẩn nút. */
  onResetLoaiSo?: (row: BBGNRow, lyDo: string) => Promise<void>;
}

// Bộ lọc giống bảng Nội bộ: Loại số điều chỉnh / Tên NVL / Phòng ban giao / Phòng ban nhận / Xưởng giao / Xưởng nhận.
// Chỉ ảnh hưởng hiển thị — `rows` (nguồn sự thật) vẫn giữ đủ dòng bị ẩn, nên sửa/lưu không bị mất dòng.
type FilterShape = {
  loaiSoDieuChinh?: number;
  idCa?: number;
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
  onResetLoaiSo,
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
        if (filters.idCa != null && r.idCa !== filters.idCa) return false;
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
    // Người điều chỉnh + thời gian điều chỉnh (dd/MM/yyyy HH:mm)
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

    /**
     * Cột ghi chú của từng bên: bên mình sửa được, bên kia chỉ đọc
     * (nơi hiện dòng "[Reset bởi bên ...]" sau khi reset).
     */
    const ghiChuCot = (
      title: string,
      field: "ghiChuNhap" | "ghiChuXuat"
    ) => ({
      title,
      width: 180,
      render: (_: unknown, r: BBGNRow) => {
        const value = r[field] ?? "";
        if (editable && (field === "ghiChuNhap") === laNhan) {
          return (
            <Input
              size="small"
              value={value}
              maxLength={500}
              onChange={(e) =>
                patchRow(r.idCtBBGN, { [field]: e.target.value } as Partial<BBGNRow>)
              }
            />
          );
        }
        return <div style={{ whiteSpace: "pre-line" }}>{value}</div>;
      },
    });

    return [
      {
        title: "STT",
        width: 50,
        align: "center",
        render: (_: unknown, __: BBGNRow, i: number) => i + 1,
      },
      {
        title: "Nhóm NVL",
        dataIndex: "tenNhomNVL",
        width: 130,
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
        render: (v: number | null, row: BBGNRow) => {
          if (!editable) return LOAI_SO_OPTIONS.find((o) => o.value === v)?.label ?? "";
          // Bên kia đã chọn loại số → bên mình theo, khóa; muốn đổi phải Reset loại số (cả 2 bên chọn lại)
          const khoaTheoBenKia = row.loaiSoBenKia != null;
          return (
            <Select
              size="small"
              allowClear={!khoaTheoBenKia}
              disabled={khoaTheoBenKia}
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
          );
        },
      },
      {
        title: "KL xuất",
        dataIndex: "khoiLuongXuat",
        width: 130,
        align: "right",
        render: khoiLuongCell("khoiLuongXuat"),
      },
      {
        title: "KL quy khô xuất",
        dataIndex: "klQuyKhoXuat",
        width: 120,
        align: "right",
        render: quyKhoCell("klQuyKhoXuat"),
      },
      {
        title: "KL nhập",
        dataIndex: "khoiLuongNhap",
        width: 130,
        align: "right",
        render: khoiLuongCell("khoiLuongNhap"),
      },
      {
        title: "KL quy khô nhập",
        dataIndex: "klQuyKhoNhap",
        width: 120,
        align: "right",
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
      ghiChuCot("Ghi chú bên giao", "ghiChuXuat"),
      ghiChuCot("Ghi chú bên nhận", "ghiChuNhap"),
      {
        title: "Người điều chỉnh nhận",
        width: 190,
        render: (_: unknown, r: BBGNRow) => nguoiVaThoiGian(r.nguoiNhap, r.thoiGianNhap),
      },
      {
        title: "Người điều chỉnh giao",
        width: 190,
        render: (_: unknown, r: BBGNRow) => nguoiVaThoiGian(r.nguoiXuat, r.thoiGianXuat),
      },
      {
        title: "Thao tác",
        width:  90,
        fixed: "right",
        render: (_: unknown, r: BBGNRow) => {
          const klBenKia = laNhan ? r.khoiLuongXuat : r.khoiLuongNhap;
          const coKL = !!onReset && klBenKia != null;
          const coLoai = !!onResetLoaiSo && r.loaiSoBenKia != null;
          if (!editable || (!coKL && !coLoai)) return null;
          const lyDo = ((laNhan ? r.ghiChuNhap : r.ghiChuXuat) ?? "").trim();
          if (r.phieuBenKiaKhoa) {
            return (
              <Tooltip title={`Phiếu ${r.soPhieuBenKia ?? "bên kia"} đã gửi — cần thu hồi phiếu đó trước khi reset`}>
                <Button size="small" icon={<LockOutlined />} disabled />
              </Tooltip>
            );
          }
          return (
            <Popconfirm
              title={
                `Reset ${[
                  coKL ? `KL bên ${laNhan ? "xuất" : "nhận"} (${fmt(klBenKia)})` : null,
                  coLoai ? "Loại số điều chỉnh của cả 2 bên" : null,
                ].filter(Boolean).join(" và ")}?`
              }
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
  }, [rows, editable, laNhan, nguoiKyMap, onReset, onResetLoaiSo, dangReset]);

  // Reset cho đúng 1 dòng, lý do = Ghi chú của dòng đó. Một thao tác gồm (tùy dòng đang có gì):
  // - Reset KL của bên kia (nếu bên kia đã nhập KL)
  // - Reset Loại số điều chỉnh của cả 2 bên (nếu bên kia đã chọn loại số, bên mình đang bị khóa theo)
  const resetDong = async (row: BBGNRow, lyDo: string) => {
    const klCu = laNhan ? row.khoiLuongXuat : row.khoiLuongNhap;
    const resetKL = klCu != null && !!onReset;
    const resetLoai = row.loaiSoBenKia != null && !!onResetLoaiSo;
    if (!resetKL && !resetLoai) return;
    setDangReset(row.idCtBBGN);
    try {
      if (resetKL) await onReset!(row, lyDo);
      if (resetLoai) await onResetLoaiSo!(row, lyDo);

      // Các dòng ghi chú giống hệt dòng BE nối vào ghi chú của bên mình (ResetBenKiaBBGNAsync / ResetLoaiSoBBGNAsync)
      const bayGio = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const luc = `${p2(bayGio.getDate())}/${p2(bayGio.getMonth() + 1)}/${bayGio.getFullYear()} ${p2(bayGio.getHours())}:${p2(bayGio.getMinutes())}`;
      const ben = laNhan ? "nhận" : "xuất";
      const cacDong: string[] = [];
      if (resetKL)
        cacDong.push(`[Reset bởi bên ${ben} ${luc} (KL cũ ${Number(Number(klCu).toFixed(3))}): ${lyDo.trim()}]`);
      if (resetLoai)
        cacDong.push(
          `[Reset loại số bởi bên ${ben} ${luc} (loại cũ ${(row.loaiSoDieuChinh ?? row.loaiSoBenKia) === 1 ? "Trước ẩm" : "Sau ẩm"}): ${lyDo.trim()}]`
        );
      // Ghi chú hiện tại chính là lý do vừa gõ thì thay luôn (lý do đã nằm trong dòng reset), tránh hiện lặp
      const noiGhiChu = (cu?: string | null) =>
        [cu && cu.trim() && cu.trim() !== lyDo.trim() ? cu : null, ...cacDong].filter(Boolean).join("\n");

      // Cập nhật ngay trên bảng (không đánh dấu dirty; không tải lại để giữ các chỉnh sửa chưa lưu của bên mình)
      onChange(
        rows.map((r) => {
          if (r.idCtBBGN !== row.idCtBBGN) return r;
          const next: BBGNRow = { ...r };
          if (resetKL) {
            if (laNhan) Object.assign(next, { khoiLuongXuat: null, klQuyKhoXuat: null, nguoiXuat: null, thoiGianXuat: null });
            else Object.assign(next, { khoiLuongNhap: null, klQuyKhoNhap: null, nguoiNhap: null, thoiGianNhap: null });
          }
          if (resetLoai) {
            Object.assign(next, { loaiSoDieuChinh: null, loaiSoBenKia: null, klQuyKhoNhap: null, klQuyKhoXuat: null });
          }
          if (laNhan) next.ghiChuNhap = noiGhiChu(r.ghiChuNhap);
          else next.ghiChuXuat = noiGhiChu(r.ghiChuXuat);
          return next;
        })
      );
    } catch {
      // Lỗi đã được hiển thị bởi onReset / onResetLoaiSo
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
                {filterSelect("Tên NVL", "tenVatTu", uniqueOptions(tabRows, "tenVatTu"))}
                {filterSelect(
                  "Ca",
                  "idCa",
                  Array.from(new Set(tabRows.map((r) => r.idCa).filter((v): v is number => v != null)))
                    .sort((a, b) => a - b)
                    .map((v) => ({ label: tenCa(v), value: v })),
                  120
                )}
                {filterSelect("Loại số điều chỉnh", "loaiSoDieuChinh", LOAI_SO_OPTIONS, 160)}
                {filterSelect("Phòng ban bên giao", "tenPhongBanGiao", uniqueOptions(tabRows, "tenPhongBanGiao"))}
                {filterSelect("Xưởng bên giao", "tenXuongGiao", uniqueOptions(tabRows, "tenXuongGiao"))}
                {filterSelect("Phòng ban bên nhận", "tenPhongBanNhan", uniqueOptions(tabRows, "tenPhongBanNhan"))}
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
