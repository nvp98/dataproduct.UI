import { useMemo, useState } from "react";
import { Badge, Button, Collapse, Empty, Input, InputNumber, Popconfirm, Select, Space, Table, Tooltip } from "antd";
import { FilterOutlined, LockOutlined, UndoOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { tenCa } from "../../services/PhieuDieuChinhApi";
import type { XuongItem } from "./XuongTabs";

/** 1 dòng nguồn đã quy về cùng dạng (Nhập / Xuất / Nội bộ) để cộng theo xưởng */
export interface DongTongHop {
  tenNhom?: string | null;
  tenNVL?: string | null;
  maLo?: string | null;
  idCa?: number | null;
  /** Xưởng chứa dòng (id xưởng dạng chuỗi, như activeXuong) */
  /** Định danh dòng nguồn (idCtBBGN hoặc key dòng Nội bộ) — để sửa ngược về đúng dòng */
  ref: string;
  idXuong: string;
  /** Loại số không đổi được (bên kia đã chọn) */
  khoaLoaiSo?: boolean;
  /** Dòng có thể reset (bên kia đã nhập KL / chọn loại số, phiếu bên kia chưa khóa) */
  resetDuoc?: boolean;
  /** Bên kia có số nhưng phiếu của họ đã gửi/khóa nên chưa reset được */
  biKhoaReset?: boolean;
  doAm: number | null;
  /** 1 Trước ẩm, 2 Sau ẩm, null = chưa chọn */
  loaiSo?: number | null;
  kl: number | null;
  quyKho: number | null;
}

export type ThayDoiKL = { kl: number | null } | { quyKho: number | null };

interface Props {
  rows: DongTongHop[];
  xuongList: XuongItem[];
  loading?: boolean;
  /** Cho sửa Loại số / KL / Quy khô ngay trên bảng (phiếu chưa khóa) */
  editable?: boolean;
  onChangeLoaiSo?: (refs: string[], loaiSo: number | null) => void;
  onChangeKL?: (ref: string, change: ThayDoiKL) => void;
  /** Reset số bên kia / loại số cho các dòng nguồn với cùng 1 lý do; không truyền = ẩn nút Reset */
  onReset?: (refs: string[], lyDo: string) => Promise<void>;
}

interface OXuong {
  /** Chỉ có khi ô gồm đúng 1 dòng nguồn — mới sửa trực tiếp được */
  ref: string | null;
  kl: number | null;
  quyKho: number | null;
  doAm: number | null;
}

interface DongKetQua {
  key: string;
  tenNhom: string;
  tenNVL: string;
  maLo: string;
  idCa: number | null;
  /** Loại số của các dòng trong nhóm: 1/2 nếu cùng loại, "nhieu" nếu lẫn lộn, null nếu chưa chọn */
  loaiSo: number | "nhieu" | null;
  refs: string[];
  resetRefs: string[];
  biKhoaReset: boolean;
  khoaLoaiSo: boolean;
  thieuDoAm: boolean;
  theoXuong: Record<string, OXuong>;
}

const LOAI_SO_OPTIONS = [
  { label: "Trước ẩm", value: 1 },
  { label: "Sau ẩm", value: 2 },
];

// Bộ lọc theo các cột cố định của bảng; lọc trên từng dòng nguồn trước khi cộng gộp
type FilterShape = {
  tenNVL?: string;
  idCa?: number;
  loaiSo?: number;
  /** Các xưởng được chọn (id dạng chuỗi); rỗng = tất cả */
  xuong?: string[];
};

const fmt = (v: number | null | undefined) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 3 });

// Cộng KL / KL quy khô của các dòng cùng (Nhóm, Tên NVL, Lô, Ca) theo từng xưởng.
// Độ ẩm của ô tổng hợp = độ ẩm của NVL: có KL thì trung bình theo KL, chưa có KL thì trung bình độ ẩm các dòng.
const gop = (rows: DongTongHop[]): DongKetQua[] => {
  type Acc = {
    kl: number;
    coKl: boolean;
    quyKho: number;
    coQuyKho: boolean;
    tongKlAm: number; // Σ KL × độ ẩm (dòng có cả KL và độ ẩm)
    tongKl: number; // Σ KL (dòng có cả KL và độ ẩm)
    tongAm: number; // Σ độ ẩm (mọi dòng có độ ẩm)
    soAm: number;
    refs: string[];
  };
  const nhom = new Map<string, { dong: DongKetQua; acc: Map<string, Acc>; loai: Set<number> }>();

  rows.forEach((r) => {
    const key = [r.tenNhom ?? "", r.tenNVL ?? "", r.maLo ?? "", r.idCa ?? ""].join("|");
    let g = nhom.get(key);
    if (!g) {
      g = {
        dong: {
          key,
          tenNhom: r.tenNhom ?? "",
          tenNVL: r.tenNVL ?? "",
          maLo: r.maLo ?? "",
          idCa: r.idCa ?? null,
          loaiSo: null,
          refs: [],
          resetRefs: [],
          biKhoaReset: false,
          khoaLoaiSo: false,
          thieuDoAm: false,
          theoXuong: {},
        },
        acc: new Map(),
        loai: new Set(),
      };
      nhom.set(key, g);
    }
    const a =
      g.acc.get(r.idXuong) ??
      { kl: 0, coKl: false, quyKho: 0, coQuyKho: false, tongKlAm: 0, tongKl: 0, tongAm: 0, soAm: 0, refs: [] };
    g.dong.refs.push(r.ref);
    if (r.resetDuoc) g.dong.resetRefs.push(r.ref);
    if (r.biKhoaReset) g.dong.biKhoaReset = true;
    if (r.khoaLoaiSo) g.dong.khoaLoaiSo = true;
    if (r.doAm == null) g.dong.thieuDoAm = true;
    a.refs.push(r.ref);
    if (r.loaiSo === 1 || r.loaiSo === 2) g.loai.add(r.loaiSo);
    if (r.doAm != null) {
      a.tongAm += r.doAm;
      a.soAm += 1;
    }
    if (r.kl != null) {
      a.kl += r.kl;
      a.coKl = true;
      if (r.doAm != null) {
        a.tongKlAm += r.kl * r.doAm;
        a.tongKl += r.kl;
      }
    }
    if (r.quyKho != null) {
      a.quyKho += r.quyKho;
      a.coQuyKho = true;
    }
    g.acc.set(r.idXuong, a);
  });

  return Array.from(nhom.values()).map(({ dong, acc, loai }) => {
    dong.loaiSo = loai.size === 0 ? null : loai.size === 1 ? Array.from(loai)[0] : "nhieu";
    acc.forEach((a, idXuong) => {
      dong.theoXuong[idXuong] = {
        ref: a.refs.length === 1 ? a.refs[0] : null,
        kl: a.coKl ? Number(a.kl.toFixed(3)) : null,
        quyKho: a.coQuyKho ? Number(a.quyKho.toFixed(3)) : null,
        doAm:
          a.tongKl > 0
            ? Number((a.tongKlAm / a.tongKl).toFixed(2))
            : a.soAm > 0
              ? Number((a.tongAm / a.soAm).toFixed(2))
              : null,
      };
    });
    return dong;
  });
};

// Tab "Tổng hợp": mỗi dòng là 1 (Nhóm NVL, Tên NVL, Lô, Ca); mỗi xưởng 1 nhóm cột Độ ẩm / KL / Quy khô.
const TongHopTable = ({ rows, xuongList, loading, editable, onChangeLoaiSo, onChangeKL, onReset }: Props) => {
  // Lý do đang gõ trong hộp xác nhận Reset và khóa dòng đang gọi API
  const [lyDo, setLyDo] = useState("");
  const [dangReset, setDangReset] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterShape>({});
  const activeFilterCount = Object.values(filters).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "")).length;
  const data = useMemo(
    () =>
      gop(
        rows.filter((r) => {
          if (filters.tenNVL && (r.tenNVL ?? "") !== filters.tenNVL) return false;
          if (filters.idCa != null && r.idCa !== filters.idCa) return false;
          if (filters.loaiSo != null && r.loaiSo !== filters.loaiSo) return false;
          if (filters.xuong?.length && !filters.xuong.includes(r.idXuong)) return false;
          return true;
        })
      ),
    [rows, filters]
  );

  const optionsOf = (pick: (r: DongTongHop) => string | null | undefined) =>
    Array.from(new Set(rows.map(pick).filter((v): v is string => !!v))).map((v) => ({ label: v, value: v }));

  const filterSelect = (
    placeholder: string,
    field: Exclude<keyof FilterShape, "xuong">,
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
      onChange={(value) => setFilters((f) => ({ ...f, [field]: value ?? undefined }))}
      optionFilterProp="label"
    />
  );

  // Ô KL / Quy khô: nhập được khi ô chỉ gồm 1 dòng nguồn; nhiều dòng thì chỉ xem tổng (sửa ở tab xưởng)
  const oSua = (o: OXuong | undefined, v: number | null | undefined, tao: (val: number | null) => ThayDoiKL) => {
    if (!editable || !onChangeKL || !o) return fmt(v);
    if (!o.ref) {
      return (
        <Tooltip title="Ô gồm nhiều dòng — sửa ở tab xưởng">
          <span>{fmt(v)}</span>
        </Tooltip>
      );
    }
    const ref = o.ref;
    return (
      <InputNumber
        size="small"
        min={0}
        step={0.001}
        precision={3}
        value={v ?? null}
        onChange={(val) => onChangeKL(ref, tao(val))}
        style={{ width: 90 }}
      />
    );
  };

  const columns: ColumnsType<DongKetQua> = useMemo(
    () => [
      { title: "STT", width: 50, align: "center", fixed: "left", render: (_: unknown, __: DongKetQua, i: number) => i + 1 },
      { title: "Nhóm NVL", dataIndex: "tenNhom", width: 130, fixed: "left" },
      { title: "Tên NVL", dataIndex: "tenNVL", width: 180, fixed: "left" },
      { title: "Lô", dataIndex: "maLo", width: 110, fixed: "left" },
      { title: "Ca", dataIndex: "idCa", width: 90, fixed: "left", render: (v: number | null) => tenCa(v) },
      {
        title: "Loại số điều chỉnh",
        dataIndex: "loaiSo",
        width: 130,
        fixed: "left",
        render: (v: number | "nhieu" | null, r: DongKetQua) =>
          editable && onChangeLoaiSo ? (
            <Select
              size="small"
              allowClear={!r.khoaLoaiSo}
              disabled={r.khoaLoaiSo}
              placeholder={v === "nhieu" ? "Nhiều loại" : "Chọn"}
              value={v === "nhieu" ? undefined : (v ?? undefined)}
              style={{ width: "100%" }}
              options={LOAI_SO_OPTIONS.map((o) => ({ ...o, disabled: o.value === 2 && r.thieuDoAm }))}
              onChange={(val) => onChangeLoaiSo(r.refs, val ?? null)}
            />
          ) : v === "nhieu" ? (
            "Nhiều loại"
          ) : (
            (LOAI_SO_OPTIONS.find((o) => o.value === v)?.label ?? "")
          ),
      },
      ...xuongList
        .filter((x) => !filters.xuong?.length || filters.xuong.includes(String(x.id)))
        .map((x) => {
        const id = String(x.id);
        return {
          title: x.tenXuong,
          align: "center" as const,
          children: [
            {
              title: "Độ ẩm",
              width: 80,
              align: "right" as const,
              render: (_: unknown, r: DongKetQua) => fmt(r.theoXuong[id]?.doAm),
            },
            {
              title: "KL",
              width: 100,
              align: "right" as const,
              render: (_: unknown, r: DongKetQua) =>
                oSua(r.theoXuong[id], r.theoXuong[id]?.kl, (val) => ({ kl: val })),
            },
            {
              title: "Quy khô",
              width: 100,
              align: "right" as const,
              render: (_: unknown, r: DongKetQua) =>
                oSua(r.theoXuong[id], r.theoXuong[id]?.quyKho, (val) => ({ quyKho: val })),
            },
          ],
        };
      }),
      ...(editable && onReset
        ? [
            {
              title: "Thao tác",
              width: 80,
              fixed: "right" as const,
              align: "center" as const,
              render: (_: unknown, r: DongKetQua) => {
                if (r.resetRefs.length === 0) {
                  return r.biKhoaReset ? (
                    <Tooltip title="Phiếu của bên kia đã gửi — cần thu hồi phiếu đó trước khi reset">
                      <Button size="small" icon={<LockOutlined />} disabled />
                    </Tooltip>
                  ) : null;
                }
                return (
                  <Popconfirm
                    title={`Reset số bên kia / loại số của ${r.resetRefs.length} dòng?`}
                    description={
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="Nhập lý do reset (bắt buộc)"
                        value={lyDo}
                        maxLength={500}
                        onChange={(e) => setLyDo(e.target.value)}
                        style={{ width: 260 }}
                      />
                    }
                    okText="Reset"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, disabled: !lyDo.trim() }}
                    onOpenChange={(open) => open && setLyDo("")}
                    onConfirm={async () => {
                      setDangReset(r.key);
                      try {
                        await onReset(r.resetRefs, lyDo.trim());
                      } finally {
                        setDangReset(null);
                      }
                    }}
                  >
                    <Button size="small" danger icon={<UndoOutlined />} loading={dangReset === r.key} />
                  </Popconfirm>
                );
              },
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [xuongList, filters.xuong, editable, onChangeLoaiSo, onChangeKL, onReset, lyDo, dangReset]
  );

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
                {filterSelect("Tên NVL", "tenNVL", optionsOf((r) => r.tenNVL))}
                {filterSelect(
                  "Ca",
                  "idCa",
                  Array.from(new Set(rows.filter((r) => r.idCa != null).map((r) => r.idCa as number)))
                    .sort((a, b) => a - b)
                    .map((v) => ({ label: tenCa(v), value: v })),
                  120
                )}
                {filterSelect("Loại số điều chỉnh", "loaiSo", LOAI_SO_OPTIONS, 160)}
                <Select
                  mode="multiple"
                  allowClear
                  size="small"
                  placeholder="Xưởng"
                  style={{ minWidth: 220 }}
                  maxTagCount="responsive"
                  options={xuongList.map((x) => ({ label: x.tenXuong, value: String(x.id) }))}
                  value={filters.xuong ?? []}
                  onChange={(v) => setFilters((f) => ({ ...f, xuong: v.length ? v : undefined }))}
                  optionFilterProp="label"
                />
                {activeFilterCount > 0 && (
                  <Button size="small" onClick={() => setFilters({})}>
                    Xóa lọc
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Table<DongKetQua>
        size="small"
        bordered
        loading={loading}
        rowKey="key"
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        scroll={{ x: "max-content", y: "max(360px, calc(100vh - 420px))" }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu." />,
        }}
      />
    </div>
  );
};

export default TongHopTable;
