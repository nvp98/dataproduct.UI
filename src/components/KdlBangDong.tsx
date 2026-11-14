import { Button, Table, Tooltip } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { ColumnsType, ColumnType, TablePaginationConfig } from "antd/es/table";
import dayjs from "dayjs";
import type { KdlCot, KdlDong, KdlKey, KdlNhom } from "../services/KdlApi";
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

const dungCotChiTiet = (cot: KdlCot[], keys: Record<string, KdlKey>, sttBatDau: number): ColumnsType<KdlDong> =>
  cot
    .filter((c) => !c.hidden)
    .map((c, i) => {
      const ma = c.key ?? c.field ?? `nhom_${i}_${c.label}`;
      if (c.children?.length) {
        return { title: tieuDe(c, keys), key: ma, align: "center", children: dungCotChiTiet(c.children, keys, sttBatDau) };
      }
      const so = laSo(c, keys);
      const col: ColumnType<KdlDong> = {
        title: tieuDe(c, keys),
        key: ma,
        width: c.width ?? 100,
        fixed: c.fixed ?? undefined,
        align: so ? "right" : c.field === "STT" || c.field === "CaSX" || c.field === "Kip" ? "center" : "left",
        render: (_: unknown, row: KdlDong, idx: number) => {
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
    ...dungCotChiTiet(cot, keys, sttBatDau),
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

// ── Bảng tổng hợp (1 dòng / nhóm) ──────────────────────────────────────────

const dungCotTongHop = (cot: KdlCot[], keys: Record<string, KdlKey>): ColumnsType<KdlNhom> =>
  cot.map((c, i) =>
    c.children?.length
      ? { title: tieuDe(c, keys), key: `nhom_${i}_${c.label}`, align: "center", children: dungCotTongHop(c.children, keys) }
      : {
          title: tieuDe(c, keys),
          key: c.key!,
          width: c.width ?? 100,
          align: "right",
          render: (_: unknown, row: KdlNhom) => dinhDangSo(row.giaTri[c.key!], soLeCot(c, keys)),
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
    ...dungCotTongHop(cotSo, keys),
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
