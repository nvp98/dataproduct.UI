import { Alert, Button, Divider, Form, Input, InputNumber, Modal, Space, Table, Tooltip, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { HRC1BCChuanHoaApi } from "../../../services/HRC1BCChuanHoaApi";
import type { PhanBoDong, PhanBoKetQua } from "../../../services/HRC1BCChuanHoaApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { canXulyBm } from "../../../utils/helpers/checkAdminRole";

// Tab "Phân bổ BBGN" của trang Giao nhận Đúc phôi vuông: chia Σ Số liệu sau ĐC (kg, chiều Giao) của các NVL có cờ
// "Cấu hình phân bổ" (tab Mapping NVL) cho các LSX của ca (LSX của mẻ trong CSDL Đúc phôi vuông). Chia đều làm tròn
// số nguyên, lệnh cuối = tổng − các lệnh trước. Điều chỉnh tay + lý do theo từng LSX. Số này dùng cho vùng III Biên bản chốt.

interface Props {
  tuNgay: string;
  denNgay: string;
}

type DongBang = PhanBoDong & { key: string };

const MAU_KHOI = ["#FFFF00", "#9BC2E6", "#C6E0B4", "#F8CBAD"];

const so = (v?: number | null) => (v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 }));

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
  (error as { message?: string })?.message ??
  fallback;

const PhanBoGiaoNhanDPV = ({ tuNgay, denNgay }: Props) => {
  const [form] = Form.useForm();
  const [data, setData] = useState<PhanBoKetQua | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dangSua, setDangSua] = useState<DongBang | null>(null);
  const [saving, setSaving] = useState(false);

  const coQuyen = useMemo(() => {
    try {
      return canXulyBm(JSON.parse(localStorage.getItem("userinfo") ?? "{}"), BM_CONFIG.KDL.KDL_HRC1_DPV_GN);
    } catch {
      return false;
    }
  }, []);

  const tai = useCallback(async () => {
    setLoading(true);
    try {
      setData(await HRC1BCChuanHoaApi.getPhanBo(tuNgay, denNgay));
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không tải được bảng phân bổ"));
    } finally {
      setLoading(false);
    }
  }, [tuNgay, denNgay]);

  useEffect(() => {
    tai();
  }, [tai]);

  const rows = useMemo<DongBang[]>(
    () => (data?.dong ?? []).map((d) => ({ ...d, key: `${d.ngaySX}-${d.caSX}-${d.maDong}` })),
    [data]
  );
  const soCaChuaLsx = rows.filter((r) => r.lenhSanXuat === "").length;

  const moSua = (r: DongBang) => {
    setDangSua(r);
    form.resetFields();
    form.setFieldsValue({
      ghiChu: r.ghiChu ?? "",
      dc: (data?.khoi ?? []).map((k) => ({ dieuChinh: r.o[k.ma]?.dieuChinh ?? null, lyDo: r.o[k.ma]?.lyDo ?? "" })),
    });
  };

  const luu = async () => {
    if (!dangSua || !data) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      await HRC1BCChuanHoaApi.luuDieuChinhPhanBo({
        ngaySX: dangSua.ngaySX,
        caSX: dangSua.caSX,
        kip: dangSua.kip,
        lenhSanXuat: dangSua.lenhSanXuat,
        ghiChu: v.ghiChu,
        dieuChinh: data.khoi.map((k, i) => ({
          nhom1: k.nhom1,
          xuongVietTat: k.xuong,
          dieuChinh: v.dc?.[i]?.dieuChinh ?? null,
          lyDo: v.dc?.[i]?.lyDo ?? null,
        })),
      });
      message.success("Đã lưu điều chỉnh");
      setDangSua(null);
      tai();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Lưu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnsType<DongBang>>(() => {
    const gopCa = (r: DongBang) => ({ rowSpan: r.dauCa ? r.soDongCa : 0 });
    const dau: ColumnsType<DongBang> = [
      { title: "Ngày", key: "ngay", width: 95, fixed: "left", align: "center", onCell: gopCa, render: (_, r) => dayjs(r.ngaySX).format("DD/MM/YYYY") },
      { title: "Ca", key: "ca", width: 45, fixed: "left", align: "center", onCell: gopCa, render: (_, r) => (r.caSX === 1 ? "N" : "Đ") },
      { title: "Kíp", dataIndex: "kip", width: 45, fixed: "left", align: "center", onCell: gopCa },
      { title: "Mã dòng", dataIndex: "maDong", width: 70, fixed: "left", align: "center" },
      {
        title: "LSX",
        key: "lsx",
        width: 120,
        fixed: "left",
        render: (_, r) => (r.lenhSanXuat ? r.lenhSanXuat : <Typography.Text type="danger">(chưa có LSX)</Typography.Text>),
      },
      { title: "Số lệnh trong ca", dataIndex: "soLenhTrongCa", width: 75, align: "center", onCell: gopCa },
    ];
    const khoi: ColumnsType<DongBang> = (data?.khoi ?? []).map((k, i) => ({
      key: `khoi-${k.ma}`,
      title: (
        <span>
          {k.nhom1}
          <br />
          <span style={{ fontWeight: 400, fontSize: 12 }}>{k.xuong}</span>
        </span>
      ),
      onHeaderCell: () => ({ style: { background: MAU_KHOI[i % MAU_KHOI.length] } }),
      children: [
        {
          title: "Tổng ca",
          key: `${k.ma}-tong`,
          width: 95,
          align: "right" as const,
          onCell: (r: DongBang) => ({ rowSpan: r.dauCa ? r.soDongCa : 0, style: { background: "#FFFDE7", fontWeight: 600 } }),
          render: (_: unknown, r: DongBang) => so(r.o[k.ma]?.tongCa),
        },
        {
          title: "Phân bổ",
          key: `${k.ma}-pb`,
          width: 95,
          align: "right" as const,
          onCell: (r: DongBang) => ({ style: r.o[k.ma]?.dieuChinh != null ? { background: "#FFF59D" } : {} }),
          render: (_: unknown, r: DongBang) => {
            const o = r.o[k.ma];
            if (!o) return "";
            return o.dieuChinh != null ? (
              <Tooltip title={`Chia đều ${so(o.phanBo)} ${o.dieuChinh >= 0 ? "+" : "−"} ${so(Math.abs(o.dieuChinh))}`}>{so(o.phanBoCuoi)}</Tooltip>
            ) : (
              so(o.phanBoCuoi)
            );
          },
        },
        {
          title: "Check",
          key: `${k.ma}-check`,
          width: 75,
          align: "right" as const,
          onCell: (r: DongBang) => ({ rowSpan: r.dauCa ? r.soDongCa : 0 }),
          render: (_: unknown, r: DongBang) => {
            const c = r.o[k.ma]?.check ?? 0;
            return <span style={c !== 0 ? { color: "#d4380d", fontWeight: 600 } : undefined}>{so(c)}</span>;
          },
        },
        {
          title: "Điều chỉnh",
          key: `${k.ma}-dc`,
          width: 85,
          align: "right" as const,
          render: (_: unknown, r: DongBang) => so(r.o[k.ma]?.dieuChinh),
        },
        {
          title: "Lý do",
          key: `${k.ma}-lydo`,
          width: 160,
          render: (_: unknown, r: DongBang) => r.o[k.ma]?.lyDo ?? "",
        },
      ],
    }));
    const cuoi: ColumnsType<DongBang> = [
      { title: "Ghi chú", dataIndex: "ghiChu", width: 180 },
      ...(coQuyen
        ? [
            {
              title: "",
              key: "sua",
              width: 45,
              fixed: "right" as const,
              align: "center" as const,
              render: (_: unknown, r: DongBang) =>
                r.lenhSanXuat ? (
                  <Tooltip title="Điều chỉnh / ghi chú">
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => moSua(r)} />
                  </Tooltip>
                ) : null,
            },
          ]
        : []),
    ];
    return [...dau, ...khoi, ...cuoi];
    // moSua chỉ đọc state hiện tại khi bấm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, coQuyen]);

  const xuatExcel = async () => {
    setExporting(true);
    try {
      await HRC1BCChuanHoaApi.exportPhanBo(tuNgay, denNgay);
    } catch {
      message.error("Không thể xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Typography.Text strong>
          Phân bổ BBGN theo LSX — {dayjs(tuNgay).format("DD/MM/YYYY")}–{dayjs(denNgay).format("DD/MM/YYYY")} (kg)
        </Typography.Text>
        <Button icon={<ReloadOutlined />} onClick={tai}>
          Tải lại
        </Button>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={xuatExcel}>
          Xuất Excel
        </Button>
      </Space>
      {data && data.khoi.length === 0 && (
        <Alert style={{ marginBottom: 12 }} type="info" showIcon message='Chưa có NVL nào bật "Cấu hình phân bổ" ở tab Mapping NVL.' />
      )}
      {soCaChuaLsx > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message={`Có ${soCaChuaLsx} ca có NVL nhưng chưa có LSX trong CSDL Đúc phôi vuông — bổ sung LSX (màn hình LSX Đúc phôi vuông) rồi Đồng bộ CSDL.`}
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
      />

      <Modal
        title={dangSua ? `Điều chỉnh phân bổ — ${dayjs(dangSua.ngaySX).format("DD/MM/YYYY")} ca ${dangSua.caSX === 1 ? "N" : "Đ"} — LSX ${dangSua.lenhSanXuat}` : ""}
        open={dangSua != null}
        onOk={luu}
        onCancel={() => setDangSua(null)}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        destroyOnClose
      >
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message="Điều chỉnh (kg, +/−) cộng vào số chia đều. Chuyển số giữa các LSX trong ca để cột Check giữ bằng 0. Để trống = bỏ điều chỉnh."
        />
        <Form form={form} layout="vertical">
          {(data?.khoi ?? []).map((k, i) => (
            <div key={k.ma}>
              <Divider orientation="left" style={{ margin: "4px 0 8px" }}>
                {k.nhom1} ({k.xuong}) — chia đều {so(dangSua?.o[k.ma]?.phanBo)}
              </Divider>
              <Space align="start" style={{ width: "100%" }}>
                <Form.Item label="Điều chỉnh" name={["dc", i, "dieuChinh"]}>
                  <InputNumber style={{ width: 140 }} precision={0} />
                </Form.Item>
                <Form.Item
                  label="Lý do"
                  name={["dc", i, "lyDo"]}
                  style={{ width: 360 }}
                  dependencies={[["dc", i, "dieuChinh"]]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator: (_, value) => {
                        const dc = getFieldValue(["dc", i, "dieuChinh"]);
                        return dc && !`${value ?? ""}`.trim()
                          ? Promise.reject(new Error("Nhập lý do khi có điều chỉnh"))
                          : Promise.resolve();
                      },
                    }),
                    { max: 500 },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Space>
            </div>
          ))}
          <Form.Item label="Ghi chú" name="ghiChu" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhanBoGiaoNhanDPV;
