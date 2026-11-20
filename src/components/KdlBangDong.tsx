import { Button, Table, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { ColumnsType, ColumnType, TablePaginationConfig } from "antd/es/table";
import type { ReactNode } from "react";
import dayjs from "dayjs";
import type { KdlCot, KdlDong, KdlDongTongHopCT, KdlKey, KdlLoaiDongTH, KdlNhom } from "../services/KdlApi";
import { KDL_CACH_LAY, KDL_KIEU_DL } from "../services/KdlApi";
import { layCotLa } from "../utils/kdlCot";

// Bảng động của Kho dữ liệu động: header nhiều tầng dựng từ KDL_Form.CotJson.

const TRUONG_NHAN: Record<string, string> = {
  STT: "STT",
  Me: "Mã",
  NgaySX: "Ngày",
  CaSX: "Ca",
  Kip: "Kíp",
  MayDuc: "Thiết bị",
  Mac: "Sản phẩm",
  KichThuoc: "Quy cách",
  LenhSanXuat: "Lệnh SX",
};

/** Lấy giá trị trường header theo tên field (không phân biệt hoa thường). */
const giaTriTruong = (row: KdlDong | KdlNhom["nhom"], field: string): unknown => {
  const ten = field.charAt(0).toLowerCase() + field.slice(1);
  const nguon = row as Record<string, unknown>;
  return nguon[ten] ?? nguon[field];
};

const dinhDangSo = (v: unknown, soLe = 0) =>
  typeof v === "number" ? v.toLocaleString("vi-VN", { minimumFractionDigits: soLe, maximumFractionDigits: soLe }) : "";

const hienThiTruong = (field: string, v: unknown) => {
  if (v == null || v === "") return "";
  if (field.toLowerCase() === "ngaysx") return dayjs(v as string).format("DD/MM/YYYY");
  return String(v);
};

const tieuDe = (c: KdlCot, keys: Record<string, KdlKey>) =>
  c.label ?? (c.key ? keys[c.key]?.tenKey ?? c.key : c.field ? TRUONG_NHAN[c.field] ?? c.field : "");

const laSo = (c: KdlCot, keys: Record<string, KdlKey>) => !!c.key && keys[c.key]?.kieuDL !== KDL_KIEU_DL.CHUOI;
const soLeCot = (c: KdlCot, keys: Record<string, KdlKey>) => c.decimals ?? (c.key ? keys[c.key]?.soLe : 0) ?? 0;

/** Lọc cây cột, bỏ nhóm rỗng sau khi lọc lá. */
const locCay = (cot: KdlCot[], giu: (c: KdlCot) => boolean): KdlCot[] =>
  cot
    .filter((c) => !c.hidden)
    .map((c) => (c.children?.length ? { ...c, children: locCay(c.children, giu) } : c))
    .filter((c) => (c.children ? c.children.length > 0 : giu(c)));

// ── Bảng chi tiết (1 dòng / đối tượng) ─────────────────────────────────────

/** Ghi đè nội dung ô (vd dòng tổng); trả undefined = render mặc định. */
type GhiDeO<T> = (c: KdlCot, row: T) => ReactNode | undefined;

const dungCotChiTiet = <T extends KdlDong>(
  cot: KdlCot[],
  keys: Record<string, KdlKey>,
  sttBatDau: number,
  ghiDe?: GhiDeO<T>
): ColumnsType<T> =>
  cot
    .filter((c) => !c.hidden)
    .map((c, i) => {
      const ma = c.key ?? c.field ?? `nhom_${i}_${c.label}`;
      if (c.children?.length) {
        return { title: tieuDe(c, keys), key: ma, align: "center", children: dungCotChiTiet<T>(c.children, keys, sttBatDau, ghiDe) };
      }
      const so = laSo(c, keys);
      const col: ColumnType<T> = {
        title: tieuDe(c, keys),
        key: ma,
        width: c.width ?? 100,
        fixed: c.fixed ?? undefined,
        align: so ? "right" : c.field === "STT" || c.field === "CaSX" || c.field === "Kip" ? "center" : "left",
        render: (_: unknown, row: T, idx: number) => {
          const de = ghiDe?.(c, row);
          if (de !== undefined) return de;
          if (c.field === "STT") return sttBatDau + idx + 1;
          if (c.field) return hienThiTruong(c.field, giaTriTruong(row, c.field));
          const v = row.giaTri[c.key!];
          const text = so ? dinhDangSo(v, soLeCot(c, keys)) : (v ?? "");
          if (!row.thuCong.includes(c.key!)) return text;
          return (
            <Tooltip title="Giá trị nhập tay (ưu tiên hơn số tự động)">
              <span style={{ background: "#fff7e6", padding: "0 4px", borderRadius: 2 }}>{text}</span>
            </Tooltip>
          );
        },
      };
      return col;
    });

interface KdlBangChiTietProps {
  cot: KdlCot[];
  keys: Record<string, KdlKey>;
  data: KdlDong[];
  tong: Record<string, number | null>;
  loading?: boolean;
  pagination: TablePaginationConfig;
  /** Có cột editable → hiện nút nhập tay cuối dòng. */
  onNhapTay?: (row: KdlDong) => void;
}

export const KdlBangChiTiet = ({ cot, keys, data, tong, loading, pagination, onNhapTay }: KdlBangChiTietProps) => {
  const la = layCotLa(cot);
  const coNhapTay = !!onNhapTay && la.some((c) => c.key && c.editable);
  const sttBatDau = ((pagination.current ?? 1) - 1) * (pagination.pageSize ?? 50);

  const columns: ColumnsType<KdlDong> = [
    ...dungCotChiTiet<KdlDong>(cot, keys, sttBatDau),
    ...(coNhapTay
      ? [
          {
            title: "",
            key: "__nhapTay",
            width: 50,
            fixed: "right" as const,
            render: (_: unknown, row: KdlDong) => (
              <Tooltip title="Nhập tay">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onNhapTay!(row)} />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <Table<KdlDong>
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="idDoiTuong"
      size="small"
      bordered
      scroll={{ x: "max-content", y: 600 }}
      pagination={pagination}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ background: "#fffbe6", fontWeight: 600 }}>
            {la.map((c, i) => (
              <Table.Summary.Cell key={i} index={i} align={laSo(c, keys) ? "right" : "left"}>
                {i === 0 ? "Tổng" : c.key && laSo(c, keys) ? dinhDangSo(tong[c.key], soLeCot(c, keys)) : ""}
              </Table.Summary.Cell>
            ))}
            {coNhapTay && <Table.Summary.Cell index={la.length} />}
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};

// ── Bảng tổng hợp chi tiết (dòng đối tượng xen dòng Tổng ca / ngày / tháng / năm) ──

// Màu dòng tổng — giữ đồng bộ với KdlXemService.MauDongTong (Excel)
const MAU_DONG_TONG: Record<Exclude<KdlLoaiDongTH, "CT">, string> = {
  CA: "#DDEBF7",
  NGAY: "#FFC000",
  THANG: "#70AD47",
  NAM: "#F4B084",
};

const CSS_DONG_TONG = Object.entries(MAU_DONG_TONG)
  .map(([loai, mau]) => `.kdl-th-${loai} .ant-table-cell { background: ${mau} !important; font-weight: 600; }`)
  .join("\n");

const laField = (c: KdlCot, f: string) => c.field?.toLowerCase() === f.toLowerCase();

interface KdlBangTongHopChiTietProps {
  cot: KdlCot[];
  keys: Record<string, KdlKey>;
  data: KdlDongTongHopCT[];
  loading?: boolean;
}

export const KdlBangTongHopChiTiet = ({ cot, keys, data, loading }: KdlBangTongHopChiTietProps) => {
  // STT vô nghĩa khi xen dòng tổng → bỏ
  const cotBang = locCay(cot, (c) => !laField(c, "STT"));
  const la = layCotLa(cotBang);
  // Nhãn "Tổng ca"… ghi vào cột Ca (giống Excel), không có thì cột Mẻ
  const cotNhan = la.find((c) => laField(c, "CaSX")) ?? la.find((c) => laField(c, "Me"));

  const ghiDe: GhiDeO<KdlDongTongHopCT> = (c, row) => {
    if (!row.laTong) return undefined;
    if (c === cotNhan) return row.nhan ?? "";
    if (!c.field) return undefined;
    if (laField(c, "NgaySX")) return row.loai === "CA" || row.loai === "NGAY" ? hienThiTruong("NgaySX", row.ngaySX) : "";
    if (laField(c, "CaSX") || laField(c, "Kip")) return row.loai === "CA" ? hienThiTruong(c.field, giaTriTruong(row, c.field)) : "";
    return "";
  };

  const columns: ColumnsType<KdlDongTongHopCT> = [
    { title: "Năm", key: "__nam", width: 60, fixed: "left", align: "center", render: (_: unknown, r) => r.nam },
    { title: "Tháng", key: "__thang", width: 60, fixed: "left", align: "center", render: (_: unknown, r) => (r.thang > 0 ? r.thang : "") },
    ...dungCotChiTiet<KdlDongTongHopCT>(cotBang, keys, 0, ghiDe),
  ];
  const rongBang = 120 + la.reduce((s, c) => s + (c.width ?? 100), 0);

  return (
    <>
      <style>{CSS_DONG_TONG}</style>
      <Table<KdlDongTongHopCT>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r) => `${r.loai}|${r.nam}|${r.thang}|${r.ngaySX}|${r.caSX ?? ""}|${r.idDoiTuong}`}
        rowClassName={(r) => (r.loai === "CT" ? "" : `kdl-th-${r.loai}`)}
        size="small"
        bordered
        virtual
        scroll={{ x: rongBang, y: 600 }}
        pagination={false}
      />
    </>
  );
};

// ── Bảng tổng hợp theo chiều (Mác / LSX / Máy đúc…): mỗi cấp có dòng "Theo …" từng giá trị + dòng "Tổng …" ──

// Nền theo cấp — giữ đồng bộ với KdlXemService.MauDongTheoChieu (Excel)
const MAU_DONG_THEO_CHIEU: Record<Exclude<KdlLoaiDongTH, "CT">, string> = {
  CA: "#FFFFFF",
  NGAY: "#FFF2CC",
  THANG: "#E2EFDA",
  NAM: "#D9E1F2",
};
const NHAN_THEO_CAP: Record<KdlLoaiDongTH, string> = { CT: "", CA: "Theo ca", NGAY: "Theo ngày", THANG: "Theo tháng", NAM: "Theo năm" };

const CSS_DONG_THEO_CHIEU = [
  ...Object.entries(MAU_DONG_THEO_CHIEU).map(([loai, mau]) => `.kdl-tc-${loai} .ant-table-cell { background: ${mau} !important; }`),
  `.kdl-tc-tong .ant-table-cell { font-weight: 600; }`,
].join("\n");

interface KdlBangTongHopTheoChieuProps {
  cot: KdlCot[];
  keys: Record<string, KdlKey>;
  /** Field chiều (Mac, LenhSanXuat, MayDuc…) + nhãn hiển thị. */
  chieu: { field: string; label: string };
  /** Nhãn các chiều header (CaSX, Kip, NgaySX, Me) lấy theo CotJson. */
  nhanTruong: Record<string, string>;
  data: KdlDongTongHopCT[];
  loading?: boolean;
}

export const KdlBangTongHopTheoChieu = ({ cot, keys, chieu, nhanTruong, data, loading }: KdlBangTongHopTheoChieuProps) => {
  // Chỉ cột key số (chiều đối tượng / chuỗi không cộng được)
  const cotSo = locCay(cot, (c) => laSo(c, keys));
  const la = layCotLa(cotSo);
  const nhanMe = nhanTruong.Me;

  const columns: ColumnsType<KdlDongTongHopCT> = [
    { title: "Năm", key: "__nam", width: 60, fixed: "left", align: "center", render: (_: unknown, r) => r.nam },
    { title: "Tháng", key: "__thang", width: 60, fixed: "left", align: "center", render: (_: unknown, r) => (r.thang > 0 ? r.thang : "") },
    {
      title: nhanTruong.NgaySX ?? "Ngày",
      key: "__ngay",
      width: 95,
      fixed: "left",
      align: "center",
      render: (_: unknown, r) => (r.loai === "CA" || r.loai === "NGAY" ? hienThiTruong("NgaySX", r.ngaySX) : ""),
    },
    { title: "Loại dữ liệu", key: "__loai", width: 95, fixed: "left", render: (_: unknown, r) => NHAN_THEO_CAP[r.loai] },
    {
      title: nhanTruong.CaSX ?? "Ca",
      key: "__ca",
      width: 85,
      fixed: "left",
      align: "center",
      render: (_: unknown, r) => (r.laTong ? r.nhan ?? "" : r.loai === "CA" ? (r.caSX ?? "") : ""),
    },
    { title: nhanTruong.Kip ?? "Kíp", key: "__kip", width: 50, fixed: "left", align: "center", render: (_: unknown, r) => (r.loai === "CA" ? r.kip ?? "" : "") },
    {
      title: chieu.label,
      key: "__chieu",
      width: 120,
      fixed: "left",
      render: (_: unknown, r) => (r.laTong ? "" : hienThiTruong(chieu.field, giaTriTruong(r, chieu.field))),
    },
    {
      title: nhanMe ? `Số ${nhanMe.toLowerCase()}` : "Số lượng",
      key: "__so",
      width: 70,
      fixed: "left",
      align: "right",
      render: (_: unknown, r) => r.soDoiTuong,
    },
    ...dungCotTongHop<KdlDongTongHopCT>(cotSo, keys),
  ];
  const rongBang = 635 + la.reduce((s, c) => s + (c.width ?? 100), 0);

  return (
    <>
      <style>{CSS_DONG_THEO_CHIEU}</style>
      <Table<KdlDongTongHopCT>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r) => `${r.loai}|${r.laTong ? 1 : 0}|${r.nam}|${r.thang}|${r.ngaySX}|${r.caSX ?? ""}|${String(giaTriTruong(r, chieu.field) ?? "")}`}
        rowClassName={(r) => `kdl-tc-${r.loai}${r.laTong ? " kdl-tc-tong" : ""}`}
        size="small"
        bordered
        virtual
        scroll={{ x: rongBang, y: 600 }}
        pagination={false}
      />
    </>
  );
};

// ── Bảng tổng hợp (1 dòng / nhóm) ──────────────────────────────────────────

const dungCotTongHop = <T extends { giaTri: Record<string, unknown> }>(cot: KdlCot[], keys: Record<string, KdlKey>): ColumnsType<T> =>
  cot.map((c, i) =>
    c.children?.length
      ? { title: tieuDe(c, keys), key: `nhom_${i}_${c.label}`, align: "center", children: dungCotTongHop<T>(c.children, keys) }
      : {
          title: tieuDe(c, keys),
          key: c.key!,
          width: c.width ?? 100,
          align: "right",
          render: (_: unknown, row: T) => dinhDangSo(row.giaTri[c.key!], soLeCot(c, keys)),
        }
  );

interface KdlBangTongHopProps {
  cot: KdlCot[];
  keys: Record<string, KdlKey>;
  /** Chiều nhóm: tên field KDL_DoiTuong (Kip, CaSX, NgaySX, Mac…) + nhãn hiển thị. */
  nhom: { field: string; label: string }[];
  data: KdlNhom[];
  loading?: boolean;
}

export const KdlBangTongHop = ({ cot, keys, nhom, data, loading }: KdlBangTongHopProps) => {
  // Chỉ cột key số (không có field header, không có chuỗi)
  const cotSo = locCay(cot, (c) => laSo(c, keys));
  const la = layCotLa(cotSo);
  const tong = la.reduce<Record<string, number>>((acc, c) => {
    const k = c.key!;
    acc[k] = data.reduce((s, r) => s + (typeof r.giaTri[k] === "number" ? (r.giaTri[k] as number) : 0), 0);
    return acc;
  }, {});

  const columns: ColumnsType<KdlNhom> = [
    ...nhom.map((n) => ({
      title: n.label,
      key: n.field,
      width: n.field === "NgaySX" ? 100 : 90,
      fixed: "left" as const,
      render: (_: unknown, row: KdlNhom) => hienThiTruong(n.field, giaTriTruong(row.nhom, n.field)),
    })),
    { title: "Số lượng", key: "__so", width: 80, align: "right", fixed: "left", render: (_: unknown, r: KdlNhom) => r.soDoiTuong },
    ...dungCotTongHop<KdlNhom>(cotSo, keys),
  ];

  return (
    <Table<KdlNhom>
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey={(r) => nhom.map((n) => String(giaTriTruong(r.nhom, n.field))).join("|")}
      size="small"
      bordered
      scroll={{ x: "max-content" }}
      pagination={false}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ background: "#fffbe6", fontWeight: 600 }}>
            {nhom.map((_, i) => (
              <Table.Summary.Cell key={i} index={i}>{i === 0 ? "Tổng" : ""}</Table.Summary.Cell>
            ))}
            <Table.Summary.Cell index={nhom.length} align="right">
              {data.reduce((s, r) => s + r.soDoiTuong, 0)}
            </Table.Summary.Cell>
            {la.map((c, i) => (
              <Table.Summary.Cell key={c.key!} index={nhom.length + 1 + i} align="right">
                {/* Key tính khi xem (tỷ lệ) không cộng dồn được → để trống */}
                {keys[c.key!]?.cachLay === KDL_CACH_LAY.TINH_KHI_XEM ? "" : dinhDangSo(tong[c.key!], soLeCot(c, keys))}
              </Table.Summary.Cell>
            ))}
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};
