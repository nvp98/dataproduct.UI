import { Alert, Button, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { HRC1BCChuanHoaApi } from "../../../services/HRC1BCChuanHoaApi";
import type { ChuaMap, NvlChuanHoa, XuongChuanHoa } from "../../../services/HRC1BCChuanHoaApi";
import { DanhMucMasterApi } from "../../../services/DanhMucMasterApi";
import type { PhongBanItem, XuongItem } from "../../../services/DanhMucMasterApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { canXulyBm } from "../../../utils/helpers/checkAdminRole";

// 2 tab cấu hình mapping trong trang Giao nhận Đúc phôi vuông (KDL HRC1_DPV_GN):
//   Mapping xưởng: xưởng + bộ phận → viết tắt (cột BP bên nhận / BP bên giao)
//   Mapping NVL:   vật tư + xưởng viết tắt → Nhóm 1 (cột Nội dung 1)
// Thêm/sửa: quyền Xử lý trên KDL_HRC1_DPV_GN hoặc admin. Không xóa — bỏ chọn "Đang dùng".
// Nghiệp vụ: docs/BCSX_HRC1_DucVuong/03-GiaoNhan-Form-Dong.md §5

interface Props {
  tuNgay: string;
  denNgay: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
  (error as { message?: string })?.message ??
  fallback;

const NHAC_DONG_BO = "Đã lưu. Bấm \"Đồng bộ\" (khoảng ngày cần áp dụng) để cập nhật dữ liệu đã có.";

const useQuyenSua = () =>
  useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("userinfo") ?? "{}");
      return canXulyBm(u, BM_CONFIG.KDL.KDL_HRC1_DPV_GN);
    } catch {
      return false;
    }
  }, []);

/** Danh sách đang N/A theo khoảng ngày đang lọc của trang. */
const useChuaMap = (tuNgay: string, denNgay: string) => {
  const [chuaMap, setChuaMap] = useState<ChuaMap>({ xuong: [], nvl: [] });
  const tai = useCallback(() => {
    HRC1BCChuanHoaApi.getChuaMap(tuNgay, denNgay)
      .then(setChuaMap)
      .catch(() => setChuaMap({ xuong: [], nvl: [] }));
  }, [tuNgay, denNgay]);
  useEffect(tai, [tai]);
  return { chuaMap, taiChuaMap: tai };
};

const cotCapNhat = <T extends { nguoiCapNhat?: string | null; ngayCapNhat?: string | null }>(): ColumnsType<T> => [
  {
    title: "Cập nhật",
    key: "capNhat",
    width: 150,
    render: (_, r) => (
      <span style={{ fontSize: 12, color: "#888" }}>
        {r.nguoiCapNhat ?? "-"}
        <br />
        {r.ngayCapNhat ? dayjs(r.ngayCapNhat).format("DD/MM/YYYY HH:mm") : ""}
      </span>
    ),
  },
];

const khoangText = (tuNgay: string, denNgay: string) =>
  `${dayjs(tuNgay).format("DD/MM/YYYY")}–${dayjs(denNgay).format("DD/MM/YYYY")}`;

// ─── Tab Mapping xưởng ─────────────────────────────────────────────────────────

export const MappingXuongDPV = ({ tuNgay, denNgay }: Props) => {
  const coQuyen = useQuyenSua();
  const [form] = Form.useForm();
  const [data, setData] = useState<XuongChuanHoa[]>([]);
  const [loading, setLoading] = useState(false);
  const [dangSua, setDangSua] = useState<XuongChuanHoa | "moi" | null>(null);
  const [saving, setSaving] = useState(false);
  const [xuongs, setXuongs] = useState<XuongItem[]>([]);
  const [phongBans, setPhongBans] = useState<PhongBanItem[]>([]);
  const { chuaMap, taiChuaMap } = useChuaMap(tuNgay, denNgay);

  const tai = useCallback(async () => {
    setLoading(true);
    try {
      setData(await HRC1BCChuanHoaApi.getXuong());
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không tải được mapping xưởng"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    tai();
    DanhMucMasterApi.getXuong().then(setXuongs).catch(() => setXuongs([]));
    DanhMucMasterApi.getPhongBan().then(setPhongBans).catch(() => setPhongBans([]));
  }, [tai]);

  const tenPhongBan = useMemo(() => new Map(phongBans.map((p) => [p.id, p.tenPhongBan ?? p.tenNgan ?? String(p.id)])), [phongBans]);
  const xuongOptions = useMemo(
    () =>
      xuongs
        .filter((x) => x.hoatDong && x.idPhongBan != null)
        .map((x) => ({ value: x.id, label: `${x.tenXuong ?? x.id} — ${tenPhongBan.get(x.idPhongBan!) ?? ""} (ID ${x.id})` })),
    [xuongs, tenPhongBan]
  );

  const moForm = (r: XuongChuanHoa | "moi", ganSan?: Partial<XuongChuanHoa>) => {
    setDangSua(r);
    form.resetFields();
    form.setFieldsValue(r === "moi" ? { isActive: true, ...ganSan } : r);
  };

  /** Chọn xưởng master → điền ID + tên xưởng + phòng ban */
  const chonXuongMaster = (id?: number) => {
    const x = xuongs.find((v) => v.id === id);
    if (!x) {
      form.setFieldsValue({ idXuong: null });
      return;
    }
    form.setFieldsValue({
      idXuong: x.id,
      xuong: x.tenXuong ?? "",
      idPhongBan: x.idPhongBan ?? null,
      boPhan: x.idPhongBan != null ? tenPhongBan.get(x.idPhongBan) ?? "" : form.getFieldValue("boPhan"),
    });
  };

  const luu = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const payload = { ...v, idXuong: v.idXuong ?? null, idPhongBan: v.idPhongBan ?? null };
      if (dangSua === "moi") await HRC1BCChuanHoaApi.createXuong(payload);
      else if (dangSua) await HRC1BCChuanHoaApi.updateXuong(dangSua.id, payload);
      message.success(NHAC_DONG_BO, 6);
      setDangSua(null);
      tai();
      taiChuaMap();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Lưu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<XuongChuanHoa> = [
    { title: "ID_Xuong", dataIndex: "idXuong", width: 85, align: "center", render: (v) => v ?? <span style={{ color: "#bbb" }}>—</span> },
    { title: "Xưởng", dataIndex: "xuong" },
    { title: "ID_PhongBan", dataIndex: "idPhongBan", width: 100, align: "center", render: (v) => v ?? "—" },
    { title: "Bộ phận", dataIndex: "boPhan", width: 160 },
    { title: "Viết tắt", dataIndex: "vietTat", width: 150, render: (v) => <b>{v}</b> },
    { title: "Thứ tự", dataIndex: "thuTu", width: 70, align: "center" },
    {
      title: "Đang dùng",
      dataIndex: "isActive",
      width: 95,
      align: "center",
      render: (v: boolean) => (v ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngưng</Tag>),
    },
    ...cotCapNhat<XuongChuanHoa>(),
    ...(coQuyen
      ? [
          {
            title: "",
            key: "sua",
            width: 50,
            align: "center" as const,
            render: (_: unknown, r: XuongChuanHoa) => (
              <Tooltip title="Sửa">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => moForm(r)} />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {chuaMap.xuong.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message={`Xưởng đang N/A (${khoangText(tuNgay, denNgay)})`}
          description={
            <Space direction="vertical" size={4}>
              {chuaMap.xuong.map((x) => (
                <span key={`${x.xuong}|${x.boPhan}`}>
                  <b>{x.xuong}</b> / {x.boPhan} {x.idXuong != null && <Tag>ID {x.idXuong}</Tag>}— {x.ben}, {x.soDong} dòng{" "}
                  {coQuyen && (
                    <Button
                      size="small"
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        moForm("moi", { idXuong: x.idXuong, xuong: x.xuong, idPhongBan: x.idPhongBan, boPhan: x.boPhan })
                      }
                    >
                      Thêm
                    </Button>
                  )}
                </span>
              ))}
            </Space>
          }
        />
      )}
      <Space style={{ marginBottom: 12 }}>
        {coQuyen && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => moForm("moi")}>
            Thêm xưởng
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={() => { tai(); taiChuaMap(); }}>
          Tải lại
        </Button>
      </Space>
      <Table<XuongChuanHoa>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        onRow={(r) => ({ style: r.isActive ? undefined : { color: "#aaa" } })}
      />

      <Modal
        title={dangSua === "moi" ? "Thêm mapping xưởng" : "Sửa mapping xưởng"}
        open={dangSua != null}
        onOk={luu}
        onCancel={() => setDangSua(null)}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Chọn xưởng trong danh mục (tự điền ID và tên)" name="idXuong">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Không chọn = xưởng chưa có trong danh mục, nhập tên tay"
              options={xuongOptions}
              onChange={chonXuongMaster}
            />
          </Form.Item>
          <Form.Item name="idPhongBan" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            label="Xưởng (đúng tên trên biên bản giao nhận)"
            name="xuong"
            rules={[{ required: true, whitespace: true, message: "Nhập tên xưởng" }, { max: 200 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Bộ phận" name="boPhan" rules={[{ required: true, whitespace: true, message: "Nhập bộ phận" }, { max: 200 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Viết tắt" name="vietTat" rules={[{ required: true, whitespace: true, message: "Nhập viết tắt" }, { max: 30 }]}>
            <Input placeholder="vd X.CBX1-NM.NL" />
          </Form.Item>
          <Space size={24}>
            <Form.Item label="Thứ tự" name="thuTu">
              <InputNumber placeholder="Tự đặt" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Đang dùng" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

// ─── Tab Mapping NVL ───────────────────────────────────────────────────────────

export const MappingNvlDPV = ({ tuNgay, denNgay }: Props) => {
  const coQuyen = useQuyenSua();
  const [form] = Form.useForm();
  const [data, setData] = useState<NvlChuanHoa[]>([]);
  const [vietTats, setVietTats] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dangSua, setDangSua] = useState<NvlChuanHoa | "moi" | null>(null);
  const [saving, setSaving] = useState(false);
  const { chuaMap, taiChuaMap } = useChuaMap(tuNgay, denNgay);

  const tai = useCallback(async () => {
    setLoading(true);
    try {
      const [nvl, xuong] = await Promise.all([HRC1BCChuanHoaApi.getNvl(), HRC1BCChuanHoaApi.getXuong()]);
      setData(nvl);
      setVietTats([...new Set(xuong.filter((x) => x.isActive).map((x) => x.vietTat))].sort());
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không tải được mapping NVL"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    tai();
  }, [tai]);

  // Cảnh báo trùng (cùng vật tư + xưởng nhưng nhiều Nhóm 1) — form lấy dòng thứ tự nhỏ nhất
  const khoaTrung = useMemo(() => {
    const dem = new Map<string, number>();
    data.filter((x) => x.isActive).forEach((x) => {
      const k = `${x.tenVatTu.toLowerCase()}|${x.xuongVietTat.toLowerCase()}`;
      dem.set(k, (dem.get(k) ?? 0) + 1);
    });
    return new Set([...dem].filter(([, n]) => n > 1).map(([k]) => k));
  }, [data]);

  const moForm = (r: NvlChuanHoa | "moi", ganSan?: Partial<NvlChuanHoa>) => {
    setDangSua(r);
    form.resetFields();
    form.setFieldsValue(r === "moi" ? { isActive: true, cauHinhPhanBo: false, ...ganSan } : r);
  };

  const luu = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (dangSua === "moi") await HRC1BCChuanHoaApi.createNvl(v);
      else if (dangSua) await HRC1BCChuanHoaApi.updateNvl(dangSua.id, v);
      message.success(NHAC_DONG_BO, 6);
      setDangSua(null);
      tai();
      taiChuaMap();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Lưu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<NvlChuanHoa> = [
    {
      title: "Tên vật tư (trên biên bản)",
      dataIndex: "tenVatTu",
      render: (v: string, r) =>
        r.isActive && khoaTrung.has(`${v.toLowerCase()}|${r.xuongVietTat.toLowerCase()}`) ? (
          <Tooltip title="Trùng vật tư + xưởng với dòng khác — form lấy dòng có thứ tự nhỏ nhất">
            {v} <Tag color="orange">trùng</Tag>
          </Tooltip>
        ) : (
          v
        ),
    },
    { title: "Xưởng (viết tắt)", dataIndex: "xuongVietTat", width: 150 },
    { title: "Nhóm 1 (Nội dung 1)", dataIndex: "nhom1", render: (v) => <b>{v}</b> },
    {
      title: "Cấu hình phân bổ",
      dataIndex: "cauHinhPhanBo",
      width: 90,
      align: "center",
      render: (v: boolean) => (v ? "x" : ""),
    },
    { title: "Thứ tự", dataIndex: "thuTu", width: 70, align: "center" },
    {
      title: "Đang dùng",
      dataIndex: "isActive",
      width: 95,
      align: "center",
      render: (v: boolean) => (v ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngưng</Tag>),
    },
    ...cotCapNhat<NvlChuanHoa>(),
    ...(coQuyen
      ? [
          {
            title: "",
            key: "sua",
            width: 50,
            align: "center" as const,
            render: (_: unknown, r: NvlChuanHoa) => (
              <Tooltip title="Sửa">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => moForm(r)} />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {chuaMap.nvl.length > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message={`Nội dung 1 đang N/A (${khoangText(tuNgay, denNgay)})`}
          description={
            <Space direction="vertical" size={4}>
              {chuaMap.nvl.map((x) => (
                <span key={`${x.tenVatTu}|${x.xuongVietTat}`}>
                  <b>{x.tenVatTu}</b> / {x.xuongVietTat} — {x.soDong} dòng{" "}
                  {coQuyen && (
                    <Button
                      size="small"
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() => moForm("moi", { tenVatTu: x.tenVatTu, xuongVietTat: x.xuongVietTat, nhom1: x.tenVatTu })}
                    >
                      Thêm
                    </Button>
                  )}
                </span>
              ))}
            </Space>
          }
        />
      )}
      {chuaMap.xuong.some((x) => x.ben.includes("nhận")) && (
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message="Có dòng chưa tra được BP bên nhận nên chưa tra được Nội dung 1 — bổ sung ở tab Mapping xưởng trước."
        />
      )}
      <Space style={{ marginBottom: 12 }}>
        {coQuyen && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => moForm("moi")}>
            Thêm NVL
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={() => { tai(); taiChuaMap(); }}>
          Tải lại
        </Button>
      </Space>
      <Table<NvlChuanHoa>
        rowKey="id"
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        onRow={(r) => ({ style: r.isActive ? undefined : { color: "#aaa" } })}
      />

      <Modal
        title={dangSua === "moi" ? "Thêm mapping NVL" : "Sửa mapping NVL"}
        open={dangSua != null}
        onOk={luu}
        onCancel={() => setDangSua(null)}
        confirmLoading={saving}
        okText="Lưu"
        cancelText="Hủy"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên vật tư (đúng tên trên biên bản giao nhận)"
            name="tenVatTu"
            rules={[{ required: true, whitespace: true, message: "Nhập tên vật tư" }, { max: 200 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Xưởng nhận (viết tắt)"
            name="xuongVietTat"
            rules={[{ required: true, message: "Chọn xưởng" }]}
            extra="Lấy từ tab Mapping xưởng"
          >
            <Select showSearch options={vietTats.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item label="Nhóm 1 (Nội dung 1)" name="nhom1" rules={[{ required: true, whitespace: true, message: "Nhập Nhóm 1" }, { max: 100 }]}>
            <Input />
          </Form.Item>
          <Space size={24}>
            <Form.Item label="Thứ tự" name="thuTu">
              <InputNumber placeholder="Tự đặt" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="Cấu hình phân bổ" name="cauHinhPhanBo" valuePropName="checked">
              <Checkbox />
            </Form.Item>
            <Form.Item label="Đang dùng" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
