import { Button, Input, InputNumber, Table, Tooltip } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType, ColumnType } from "antd/es/table";
import type { BcsxDongBase } from "../../../services/HRC1BCSXApi";
import { NGUON_BCSX } from "../../../services/HRC1BCSXApi";
import { dinhDangSo, ganKhoa } from "./bangNhapUtils";

// Bảng nhập dùng chung cho 4 vùng của Biên bản chốt số liệu Xưởng ĐPV.
// - STT tự đánh; dòng "Tổng kíp …" + "Tổng cộng" tự cộng các cột `cong`.
// - Sửa 1 dòng lấy từ Kho dữ liệu (nguon = 1) → chuyển nguon = 3 (nhập tay).

export type KieuCot = "chu" | "so" | "nguyen" | "kip";

export interface CotNhap<T> {
  key: keyof T & string;
  title: string;
  kieu: KieuCot;
  width?: number;
  /** Header tầng 1 (vd "Phôi nguội"). */
  nhom?: string;
  /** Cộng ở dòng tổng. */
  cong?: boolean;
  /** Không cho sửa (vd cột Tổng). */
  chiDoc?: boolean;
  /** Giá trị hiển thị khi chỉ đọc (mặc định row[key]). */
  tinh?: (row: T) => number | string | null | undefined;
}

const giaTriSo = (v: unknown) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

interface BangNhapBCSXProps<T extends BcsxDongBase> {
  cot: CotNhap<T>[];
  rows: T[];
  onChange?: (rows: T[]) => void;
  editable: boolean;
  /** Dòng mới khi bấm "Thêm dòng". */
  taoDongMoi?: () => T;
  /** Hiện dòng "Tổng kíp" theo từng kíp (Thép lỏng, Điện, NVL). */
  tongTheoKip?: boolean;
  rowClassName?: (row: T) => string;
  loading?: boolean;
  scrollY?: number;
}

function BangNhapBCSX<T extends BcsxDongBase>({
  cot,
  rows,
  onChange,
  editable,
  taoDongMoi,
  tongTheoKip,
  rowClassName,
  loading,
  scrollY,
}: BangNhapBCSXProps<T>) {
  const sua = (key: string, field: keyof T, value: unknown) => {
    onChange?.(
      rows.map((r) => {
        if (r._key !== key) return r;
        const moi = { ...r, [field]: value } as T;
        if (moi.nguon === NGUON_BCSX.TU_DONG) moi.nguon = NGUON_BCSX.NHAP_TAY;
        return moi;
      })
    );
  };

  const oNhap = (c: CotNhap<T>, row: T) => {
    const v = c.tinh ? c.tinh(row) : row[c.key];
    if (!editable || c.chiDoc) {
      return c.kieu === "so" || c.kieu === "nguyen" ? dinhDangSo(v) : ((v as string | null | undefined) ?? "");
    }
    if (c.kieu === "so" || c.kieu === "nguyen") {
      return (
        <InputNumber
          size="small"
          controls={false}
          style={{ width: "100%" }}
          value={typeof v === "number" ? v : null}
          precision={c.kieu === "nguyen" ? 0 : undefined}
          formatter={(x) => (x == null || `${x}` === "" ? "" : `${x}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
          parser={(x) => (x ? Number(x.replace(/,/g, "")) : (null as unknown as number))}
          onChange={(x) => sua(row._key!, c.key, x ?? null)}
        />
      );
    }
    return (
      <Input
        size="small"
        maxLength={c.kieu === "kip" ? 1 : undefined}
        value={(v as string | null | undefined) ?? ""}
        onChange={(e) => sua(row._key!, c.key, c.kieu === "kip" ? e.target.value.toUpperCase() : e.target.value)}
      />
    );
  };

  const la: ColumnType<T>[] = cot.map((c) => ({
    title: c.title,
    key: c.key,
    width: c.width ?? 100,
    align: c.kieu === "so" || c.kieu === "nguyen" ? "right" : c.kieu === "kip" ? "center" : "left",
    render: (_: unknown, row: T) => oNhap(c, row),
  }));

  // Header 2 tầng theo `nhom`
  const columns: ColumnsType<T> = [
    { title: "STT", key: "__stt", width: 50, align: "center", fixed: "left", render: (_: unknown, __: T, i: number) => i + 1 },
  ];
  for (let i = 0; i < cot.length; i++) {
    const nhom = cot[i].nhom;
    if (!nhom) {
      columns.push(la[i]);
      continue;
    }
    const con: ColumnType<T>[] = [];
    while (i < cot.length && cot[i].nhom === nhom) con.push(la[i++]);
    i--;
    columns.push({ title: nhom, key: `nhom_${nhom}`, align: "center", children: con });
  }
  if (editable) {
    columns.push({
      title: "",
      key: "__xoa",
      width: 44,
      fixed: "right",
      render: (_: unknown, row: T) => (
        <Tooltip title="Xóa dòng">
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(rows.filter((r) => r._key !== row._key))} />
        </Tooltip>
      ),
    });
  }

  // Dòng tổng: theo kíp (thứ tự xuất hiện) + tổng cộng
  const tong = (ds: T[]) =>
    cot.map((c) => (c.cong ? ds.reduce((s, r) => s + giaTriSo(c.tinh ? c.tinh(r) : r[c.key]), 0) : null));
  const cacKip = tongTheoKip ? [...new Set(rows.map((r) => r.kip ?? ""))] : [];
  const dongTong: { nhan: string; gt: (number | null)[] }[] = [
    ...cacKip.map((k) => ({ nhan: `Tổng kíp ${k || "(trống)"}`, gt: tong(rows.filter((r) => (r.kip ?? "") === k)) })),
    { nhan: "Tổng cộng", gt: tong(rows) },
  ];
  const coCong = cot.some((c) => c.cong);

  return (
    <>
      <Table<T>
        columns={columns}
        dataSource={rows}
        rowKey={(r) => r._key!}
        size="small"
        bordered
        loading={loading}
        pagination={false}
        rowClassName={rowClassName}
        scroll={{ x: "max-content", y: scrollY }}
        summary={() =>
          rows.length > 0 && coCong ? (
            <Table.Summary fixed>
              {dongTong.map((d, j) => (
                <Table.Summary.Row key={j} style={{ background: j === dongTong.length - 1 ? "#fff1b8" : "#fffbe6", fontWeight: 600 }}>
                  <Table.Summary.Cell index={0} />
                  {cot.map((c, i) => (
                    <Table.Summary.Cell key={c.key} index={i + 1} align={c.cong ? "right" : "left"}>
                      {i === 0 ? d.nhan : c.cong ? dinhDangSo(d.gt[i]) : ""}
                    </Table.Summary.Cell>
                  ))}
                  {editable && <Table.Summary.Cell index={cot.length + 1} />}
                </Table.Summary.Row>
              ))}
            </Table.Summary>
          ) : null
        }
      />
      {editable && taoDongMoi && (
        <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => onChange?.([...rows, ...ganKhoa([taoDongMoi()])])}>
          Thêm dòng
        </Button>
      )}
    </>
  );
}

export default BangNhapBCSX;
