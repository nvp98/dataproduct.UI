import { Alert, Button, Space, Table, Typography, message } from "antd";
import type { ColumnsType, ColumnType } from "antd/es/table";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { HRC1BCChuanHoaApi } from "../../../services/HRC1BCChuanHoaApi";
import type { CotNhom, DongNhom, TongHopNhom } from "../../../services/HRC1BCChuanHoaApi";

// Tab "Tổng hợp theo nhóm" của trang Giao nhận Đúc phôi vuông: cộng Số liệu sau điều chỉnh (kg) của form
// theo Ngày / Ca / Kíp × (Chiều → Xưởng đối tác → Nhóm 1). Cột lấy từ tab Mapping NVL; chỉ đọc dữ liệu đã đồng bộ.

interface Props {
  tuNgay: string;
  denNgay: string;
}

type DongBang = DongNhom & { key: string; laTong?: boolean };

const dinhDang = (v?: number) => (v ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "-");

const cotSo = (c: CotNhom): ColumnType<DongBang> => ({
  key: c.ma,
  title: <span style={{ color: c.chieu ? "#C00000" : undefined }}>{c.nhom1}</span>,
  width: 120,
  align: "right",
  render: (_, r) => dinhDang(r.giaTri[c.ma]),
});

/** Gom cột liên kề cùng khóa thành nhóm header. */
const gom = <T,>(ds: T[], khoa: (x: T) => string) => {
  const kq: { khoa: string; ds: T[] }[] = [];
  ds.forEach((x) => {
    const k = khoa(x);
    if (kq.length && kq[kq.length - 1].khoa === k) kq[kq.length - 1].ds.push(x);
    else kq.push({ khoa: k, ds: [x] });
  });
  return kq;
};

const TongHopNhomGiaoNhanDPV = ({ tuNgay, denNgay }: Props) => {
  const [data, setData] = useState<TongHopNhom | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const tai = useCallback(async () => {
    setLoading(true);
    try {
      setData(await HRC1BCChuanHoaApi.getTongHopNhom(tuNgay, denNgay));
    } catch (error: unknown) {
      message.error((error as { message?: string })?.message ?? "Không tải được bảng tổng hợp");
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay]);

  useEffect(() => {
    tai();
  }, [tai]);

  const columns = useMemo<ColumnsType<DongBang>>(() => {
    const dau: ColumnsType<DongBang> = [
      {
        title: "Ngày",
        key: "ngay",
        width: 95,
        fixed: "left",
        align: "center",
        render: (_, r) => (r.laTong ? <b>Tổng</b> : dayjs(r.ngaySX).format("DD/MM/YYYY")),
      },
      { title: "Ca", key: "ca", width: 45, fixed: "left", align: "center", render: (_, r) => (r.laTong ? "" : r.caSX === 1 ? "N" : r.caSX === 2 ? "Đ" : "") },
      { title: "Kíp", dataIndex: "kip", width: 45, fixed: "left", align: "center" },
    ];
    // Chiều → Xưởng → Nhóm 1 (cột "Chưa map" không có chiều)
    const nhom = gom(data?.cot ?? [], (c) => c.chieu).map((g) => ({
      key: `chieu-${g.khoa}`,
      title: g.khoa || "Chưa map",
      children: gom(g.ds, (c) => c.xuong).map((x) => ({
        key: `xuong-${g.khoa}-${x.khoa}-${x.ds[0].ma}`,
        title: x.khoa,
        children: x.ds.map(cotSo),
      })),
    }));
    return [...dau, ...nhom];
  }, [data]);

  const rows = useMemo<DongBang[]>(() => {
    if (!data) return [];
    const tong: DongBang = { key: "tong", laTong: true, ngaySX: "", soDong: 0, giaTri: data.tong };
    return [tong, ...data.dong.map((d, i) => ({ ...d, key: `${d.ngaySX}-${d.caSX}-${d.kip}-${i}` }))];
  }, [data]);

  const xuatExcel = async () => {
    setExporting(true);
    try {
      await HRC1BCChuanHoaApi.exportTongHopNhom(tuNgay, denNgay);
    } catch {
      message.error("Không thể xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  const coChuaMap = !!data?.cot.some((c) => !c.chieu);

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Typography.Text strong>
          Bảng tổng hợp dữ liệu theo nhóm — {dayjs(tuNgay).format("DD/MM/YYYY")}–{dayjs(denNgay).format("DD/MM/YYYY")} (kg, Số liệu sau
          điều chỉnh)
        </Typography.Text>
        <Button icon={<ReloadOutlined />} onClick={tai}>
          Tải lại
        </Button>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={xuatExcel}>
          Xuất Excel
        </Button>
      </Space>
      {coChuaMap && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="Có dòng chưa có Nội dung 1 / BP đối tác (cột Chưa map) — bổ sung ở tab Mapping xưởng / Mapping NVL rồi bấm Đồng bộ."
        />
      )}
      <Table<DongBang>
        rowKey="key"
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: "max-content", y: 600 }}
        onRow={(r) => ({ style: r.laTong ? { fontWeight: 600, background: "#FFF2CC" } : undefined })}
      />
    </div>
  );
};

export default TongHopNhomGiaoNhanDPV;
