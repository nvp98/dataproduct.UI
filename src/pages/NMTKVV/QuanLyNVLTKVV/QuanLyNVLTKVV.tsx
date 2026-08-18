/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  InputNumber,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import {
  tkvvNvlApi,
  tkvvMappingApi,
  tkvvEmsTagApi,
  tkvvSanLuongMappingApi,
  type TKVVNguyenVatLieuDto,
  type TKVVMappingDto,
  type EMSMappingTagDto,
  type TKVVSanLuongMappingDto,
} from "../../../services/TKVVApi";

const { Title } = Typography;

// Danh sách BM thuộc nhóm TKVV — dùng cho filter MaBM
const MA_BM_OPTIONS = [
  { label: "BB Sản lượng (TKVV_BB_SanLuong)", value: BM_CONFIG.TKVV.TKVV_BB_SanLuong },
  { label: "BC Sản lượng Chi phí (TKVV_BC_SanLuongChiPhi)", value: BM_CONFIG.TKVV.TKVV_BC_SanLuongChiPhi },
];

// Mã Scope phía PLC/SCADA — hệ thống dùng số 1..6 để đồng bộ với BM và logic
// phía BE (1=TK1, 2=TK2, ..., 5=VV1, 6=VV2). tenScope là text hiển thị dễ đọc.
const SCOPE_OPTIONS = [
  { label: "TK1 - Thiêu kết 1", value: 1, tenScope: "TK1" },
  { label: "TK2 - Thiêu kết 2", value: 2, tenScope: "TK2" },
  { label: "TK3 - Thiêu kết 3", value: 3, tenScope: "TK3" },
  { label: "TK4 - Thiêu kết 4", value: 4, tenScope: "TK4" },
  { label: "VV1 - Vê viên 1", value: 5, tenScope: "VV1" },
  { label: "VV2 - Vê viên 2", value: 6, tenScope: "VV2" },
];

const getScopeCodeText = (scope: string | number | null | undefined) => {
  if (scope == null || scope === "") return null;
  if (typeof scope === "number") {
    const opt = SCOPE_OPTIONS.find((o) => o.value === scope);
    return opt?.tenScope ?? String(scope);
  }
  const normalized = scope.trim();
  const opt = SCOPE_OPTIONS.find((o) => o.tenScope === normalized || String(o.value) === normalized);
  return opt?.tenScope ?? normalized;
};


// ─── Tab 1: Danh mục NVL ─────────────────────────────────────────────────────

const NvlTab = ({
  data,
  loading,
  selectedMaBM,
  onReload,
}: {
  data: TKVVNguyenVatLieuDto[];
  loading: boolean;
  selectedMaBM: string;
  onReload: () => void;
}) => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVNguyenVatLieuDto | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ trangThai: true, maBM: selectedMaBM });
    setModalOpen(true);
  };

  const openEdit = (record: TKVVNguyenVatLieuDto) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleScopeChange = (value: number) => {
    const opt = SCOPE_OPTIONS.find((o) => o.value === value);
    if (opt) {
      form.setFieldValue("scope", opt.value);
      form.setFieldValue("tenScope", opt.tenScope);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await tkvvNvlApi.update(editing.id, { ...values, maBM: selectedMaBM });
        message.success("Cập nhật NVL thành công");
      } else {
        await tkvvNvlApi.create({ ...values, maBM: selectedMaBM });
        message.success("Thêm NVL thành công");
      }
      setModalOpen(false);
      onReload();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu NVL");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvNvlApi.delete(id);
      message.success("Đã xóa NVL");
      onReload();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa NVL");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm NVL
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        columns={[
          { title: "STT", key: "stt", width: 55, align: "center", render: (_: unknown, __: unknown, i: number) => i + 1 },
          { title: "Tên NVL", dataIndex: "tenNVL" },
          { title: "ĐVT", dataIndex: "donViTinh", width: 90, align: "center" },
          {
            title: "Scope",
            dataIndex: "scope",
            width: 100,
            align: "center",
            render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : null,
          },
          { title: "Tên scope", dataIndex: "tenScope", width: 140 },
          { title: "Thứ tự", dataIndex: "thuTu", width: 80, align: "center" },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 110,
            align: "center",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>,
          },
          { title: "Ghi chú", dataIndex: "ghiChu" },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVNguyenVatLieuDto) => (
              <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Popconfirm title="Xóa NVL này?" onConfirm={() => handleDelete(record.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa NVL" : "Thêm NVL"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tenNVL" label="Tên NVL" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: Quặng Vê Viên TP" />
          </Form.Item>
          <Form.Item name="donViTinh" label="Đơn vị tính">
            <Input placeholder="VD: Tấn" />
          </Form.Item>
          <Space style={{ width: "100%" }} size="middle">
            <Form.Item name="scope" label="Scope (xưởng)" style={{ width: 180 }}>
              <Select
                allowClear
                placeholder="Chọn scope"
                options={SCOPE_OPTIONS.map(({ label, value }) => ({ label, value }))}
                onChange={handleScopeChange}
              />
            </Form.Item>
            <Form.Item name="tenScope" label="Tên scope" style={{ flex: 1 }}>
              <Input placeholder="Tự động điền khi chọn scope" readOnly />
            </Form.Item>
          </Space>
          <Form.Item name="thuTu" label="Thứ tự hiển thị">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          {editing && (
            <Form.Item name="trangThai" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngừng" />
            </Form.Item>
          )}
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ─── Tab 2: Mapping NVL ↔ Tag EMS ────────────────────────────────────────────

const CA_OPTIONS = [
  { label: "Ca ngày (1)", value: 1 },
  { label: "Ca đêm (2)", value: 2 },
];

const KIP_OPTIONS = [
  { label: "Kíp A", value: "A" },
  { label: "Kíp B", value: "B" },
  { label: "Kíp C", value: "C" },
];

const MappingTab = ({ nvlOptions }: { nvlOptions: TKVVNguyenVatLieuDto[] }) => {
  const [data, setData] = useState<TKVVMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [emsTags, setEmsTags] = useState<EMSMappingTagDto[]>([]);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVMappingDto | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tkvvMappingApi.getList();
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách Mapping");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tải danh mục Tag EMS một lần khi tab mount
  useEffect(() => {
    tkvvEmsTagApi.getList().then((res) => setEmsTags(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: TKVVMappingDto) => {
    setEditing(record);
    form.setFieldsValue({
      nguyenVatLieuID: record.nguyenVatLieuID,
      tagIDEMS: record.tagIDEMS,
      ca: record.ca,
      trangThai: record.trangThai,
      ghiChu: record.ghiChu,
    });
    setModalOpen(true);
  };

  // Khi chọn Tag EMS: auto-fill Ca từ thông tin tag (Ca ngày=1, Ca đêm=2)
  const handleTagEMSChange = (tagIDEMS: string) => {
    const tag = emsTags.find((t) => t.tagIDEMS === tagIDEMS);
    if (tag?.ca != null) form.setFieldValue("ca", tag.ca);
  };

  // Lọc EMS tags theo scope của NVL đang chọn
  const selectedNvlId = Form.useWatch("nguyenVatLieuID", form);
  const selectedNvlScope = nvlOptions.find((n) => n.id === selectedNvlId)?.scope ?? null;
  const selectedNvlScopeCode = getScopeCodeText(selectedNvlScope);
  const filteredEmsTags = selectedNvlScopeCode
    ? emsTags.filter((t) => t.xuong === selectedNvlScopeCode)
    : emsTags;

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await tkvvMappingApi.update(editing.id, values);
        message.success("Cập nhật mapping thành công");
      } else {
        await tkvvMappingApi.create(values);
        message.success("Thêm mapping thành công");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvMappingApi.delete(id);
      message.success("Đã ngừng mapping");
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa mapping");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={nvlOptions.length === 0}>
          Thêm mapping
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        columns={[
          { title: "Xưởng", dataIndex: "scopeNVL", width: 90, align: "center" },
          { title: "Tên NVL", dataIndex: "tenNVL" },
          { title: "Tag ID EMS", dataIndex: "tagIDEMS", width: 130, align: "center" },
          {
            title: "Ca",
            dataIndex: "ca",
            width: 100,
            align: "center",
            render: (v: number) =>
              v === 1 ? <Tag color="orange">Ca ngày</Tag> : <Tag color="blue">Ca đêm</Tag>,
          },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 110,
            align: "center",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>,
          },
          { title: "Ghi chú", dataIndex: "ghiChu" },
          {
            title: "Ngày cập nhật",
            dataIndex: "ngayCapNhat",
            width: 140,
            render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "",
          },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVMappingDto) => (
              <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Popconfirm title="Ngừng mapping này?" onConfirm={() => handleDelete(record.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa mapping" : "Thêm mapping"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nguyenVatLieuID" label="Nguyên vật liệu" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select
              placeholder="Chọn NVL"
              showSearch
              optionFilterProp="label"
              options={nvlOptions.map((n) => ({
                label: `[${n.scope ?? "?"}] ${n.tenNVL}`,
                value: n.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="tagIDEMS" label="Tag ID EMS" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select
              placeholder={selectedNvlScope ? `Tag của xưởng ${selectedNvlScope}` : "Chọn NVL trước để lọc tag"}
              showSearch
              optionFilterProp="label"
              onChange={handleTagEMSChange}
              options={filteredEmsTags.map((t) => ({
                label: `${t.tagIDEMS} — ${t.tenCan ?? t.tagName}`,
                value: t.tagIDEMS,
              }))}
            />
          </Form.Item>
          <Form.Item name="ca" label="Ca" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select options={CA_OPTIONS} placeholder="Tự động điền khi chọn Tag EMS" />
          </Form.Item>
          {editing && (
            <Form.Item name="trangThai" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngừng" />
            </Form.Item>
          )}
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {nvlOptions.length === 0 && (
        <Typography.Text type="warning">
          Chưa có sản phẩm nào — hãy thêm NVL ở tab "Danh mục NVL" trước khi tạo mapping.
        </Typography.Text>
      )}
    </div>
  );
};

// ─── Tab 3: Danh mục Cân (EMS) ───────────────────────────────────────────────

const DanhMucCanTab = ({ defaultXuong }: { defaultXuong?: string }) => {
  const [data, setData] = useState<EMSMappingTagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [xuongFilter, setXuongFilter] = useState<string | undefined>(defaultXuong);

  const fetchData = useCallback(async (xuong?: string) => {
    setLoading(true);
    try {
      const res = await tkvvEmsTagApi.getList(xuong ? { xuong } : undefined);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh mục cân từ EMS");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(xuongFilter);
  }, [fetchData, xuongFilter]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <span style={{ fontWeight: 500 }}>Xưởng:</span>
          <Select
            allowClear
            placeholder="Tất cả xưởng"
            style={{ width: 220 }}
            options={SCOPE_OPTIONS.map(({ label, value }) => ({ label, value }))}
            value={xuongFilter}
            onChange={(v) => setXuongFilter(v)}
          />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData(xuongFilter)}>
          Làm mới
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 30, showSizeChanger: true }}
        size="small"
        scroll={{ x: 900 }}
        columns={[
          {
            title: "STT",
            key: "stt",
            width: 55,
            align: "center",
            render: (_: unknown, __: unknown, i: number) => i + 1,
          },
          { title: "Xưởng", dataIndex: "xuong", width: 100, align: "center" },
          { title: "Tên cân", dataIndex: "tenCan", ellipsis: true },
          { title: "Mã cân", dataIndex: "maCan", width: 130 },
          {
            title: "Tag ID EMS",
            dataIndex: "tagIDEMS",
            width: 130,
            align: "center",
          },
          { title: "Tag Name", dataIndex: "tagName", ellipsis: true },
          {
            title: "Ca",
            dataIndex: "ca",
            width: 100,
            align: "center",
            render: (v: number | null) => {
              if (v === 1) return <Tag color="orange">Ca ngày</Tag>;
              if (v === 2) return <Tag color="blue">Ca đêm</Tag>;
              return <Tag color="default">—</Tag>;
            },
          },
          { title: "Loại", dataIndex: "loai", width: 120 },
          { title: "Ghi chú", dataIndex: "ghiChu", ellipsis: true },
        ]}
      />
    </div>
  );
};

// ─── Tab 4: Mapping Cân (EMS) → Xưởng theo Ngày/Ca/Kíp ───────────────────────
// Cấu hình Tag của cân nào (trong "Danh mục Cân") tính vào Xưởng nào, hiệu lực
// trong khoảng Từ ngày/Đến ngày — dùng cho "Tổng tự động (PLC)" trên phiếu Biên
// bản sản lượng. Kíp chỉ để ghi chú/lọc hiển thị, chưa được dùng khi tính tổng.

const SanLuongMappingTab = ({ defaultScope }: { defaultScope?: string }) => {
  const [data, setData] = useState<TKVVSanLuongMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [emsTags, setEmsTags] = useState<EMSMappingTagDto[]>([]);
  const [scopeFilter, setScopeFilter] = useState<string | undefined>(defaultScope);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVSanLuongMappingDto | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (scope?: string) => {
    setLoading(true);
    try {
      const res = await tkvvSanLuongMappingApi.getList(scope ? { scope } : undefined);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách mapping cân → xưởng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(scopeFilter);
  }, [fetchData, scopeFilter]);

  useEffect(() => {
    tkvvEmsTagApi.getList().then((res) => setEmsTags(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    if (scopeFilter) form.setFieldValue("scope", scopeFilter);
    setModalOpen(true);
  };

  const openEdit = (record: TKVVSanLuongMappingDto) => {
    setEditing(record);
    form.setFieldsValue({
      tagID: record.tagID,
      scope: record.scope,
      ca: record.ca,
      kip: record.kip,
      tuNgay: record.tuNgay ? dayjs(record.tuNgay) : null,
      denNgay: record.denNgay ? dayjs(record.denNgay) : null,
      trangThai: record.trangThai,
      ghiChu: record.ghiChu,
    });
    setModalOpen(true);
  };

  // Khi chọn Tag EMS: auto-fill Ca từ thông tin tag (Ca ngày=1, Ca đêm=2)
  const handleTagChange = (tagIDEMS: string) => {
    const tag = emsTags.find((t) => t.tagIDEMS === tagIDEMS);
    if (tag?.ca != null) form.setFieldValue("ca", tag.ca);
  };

  // Lọc danh mục cân theo Xưởng đang chọn trong form
  const selectedScope = Form.useWatch("scope", form);
  const selectedScopeCode = getScopeCodeText(selectedScope);
  const filteredEmsTags = selectedScopeCode
    ? emsTags.filter((t) => t.xuong === selectedScopeCode)
    : emsTags;

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto = {
      ...values,
      tuNgay: values.tuNgay ? values.tuNgay.format("YYYY-MM-DD") : null,
      denNgay: values.denNgay ? values.denNgay.format("YYYY-MM-DD") : null,
    };
    setSaving(true);
    try {
      if (editing) {
        await tkvvSanLuongMappingApi.update(editing.id, dto);
        message.success("Cập nhật mapping thành công");
      } else {
        await tkvvSanLuongMappingApi.create(dto);
        message.success("Thêm mapping thành công");
      }
      setModalOpen(false);
      fetchData(scopeFilter);
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvSanLuongMappingApi.delete(id);
      message.success("Đã ngừng mapping");
      fetchData(scopeFilter);
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa mapping");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <span style={{ fontWeight: 500 }}>Xưởng:</span>
          <Select
            allowClear
            placeholder="Tất cả xưởng"
            style={{ width: 220 }}
            options={SCOPE_OPTIONS.map(({ label, value }) => ({ label, value }))}
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v)}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm mapping
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        scroll={{ x: 1000 }}
        columns={[
          { title: "Xưởng", dataIndex: "scope", width: 90, align: "center" },
          {
            title: "Cân (Tag ID)",
            key: "tagID",
            width: 220,
            render: (_: unknown, r: TKVVSanLuongMappingDto) => (
              <span>{r.tagID}{r.tenCan ? ` — ${r.tenCan}` : ""}</span>
            ),
          },
          {
            title: "Ca",
            dataIndex: "ca",
            width: 100,
            align: "center",
            render: (v: number) => (v === 1 ? <Tag color="orange">Ca ngày</Tag> : <Tag color="blue">Ca đêm</Tag>),
          },
          {
            title: "Kíp",
            dataIndex: "kip",
            width: 80,
            align: "center",
            render: (v: string | null) => v ? <Tag>{v}</Tag> : "—",
          },
          {
            title: "Từ ngày",
            dataIndex: "tuNgay",
            width: 110,
            render: (v: string | null) => v ? dayjs(v).format("DD/MM/YYYY") : "—",
          },
          {
            title: "Đến ngày",
            dataIndex: "denNgay",
            width: 110,
            render: (v: string | null) => v ? dayjs(v).format("DD/MM/YYYY") : "—",
          },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 110,
            align: "center",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>,
          },
          { title: "Ghi chú", dataIndex: "ghiChu" },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVSanLuongMappingDto) => (
              <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Popconfirm title="Ngừng mapping này?" onConfirm={() => handleDelete(record.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa mapping" : "Thêm mapping"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="scope" label="Xưởng" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select placeholder="Chọn xưởng" options={SCOPE_OPTIONS.map(({ label, value }) => ({ label, value }))} />
          </Form.Item>
          <Form.Item name="tagID" label="Cân (Tag ID EMS)" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select
              placeholder={selectedScope ? `Cân của xưởng ${selectedScope}` : "Chọn xưởng trước để lọc cân"}
              showSearch
              optionFilterProp="label"
              onChange={handleTagChange}
              options={filteredEmsTags.map((t) => ({
                label: `${t.tagIDEMS} — ${t.tenCan ?? t.tagName}`,
                value: t.tagIDEMS,
              }))}
            />
          </Form.Item>
          <Space style={{ width: "100%" }} size="middle">
            <Form.Item name="ca" label="Ca" style={{ flex: 1 }} rules={[{ required: true, message: "Bắt buộc" }]}>
              <Select options={CA_OPTIONS} placeholder="Tự động điền khi chọn cân" />
            </Form.Item>
            <Form.Item name="kip" label="Kíp" style={{ flex: 1 }}>
              <Select allowClear options={KIP_OPTIONS} placeholder="Không bắt buộc" />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }} size="middle">
            <Form.Item name="tuNgay" label="Từ ngày" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Không giới hạn" />
            </Form.Item>
            <Form.Item name="denNgay" label="Đến ngày" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Không giới hạn" />
            </Form.Item>
          </Space>
          {editing && (
            <Form.Item name="trangThai" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngừng" />
            </Form.Item>
          )}
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ─── Trang chính ─────────────────────────────────────────────────────────────

const QuanLyNVLTKVV = () => {
  const [selectedMaBM, setSelectedMaBM] = useState<string>(BM_CONFIG.TKVV.TKVV_BB_SanLuong);
  const [scopeFilter, setScopeFilter] = useState<string | undefined>();
  const [nvlData, setNvlData] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [nvlLoading, setNvlLoading] = useState(false);

  const loadNvl = useCallback(async () => {
    setNvlLoading(true);
    try {
      const res = await tkvvNvlApi.getList({
        maBM: selectedMaBM,
        ...(scopeFilter ? { scope: scopeFilter } : {}),
      });
      setNvlData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh mục NVL");
    } finally {
      setNvlLoading(false);
    }
  }, [selectedMaBM, scopeFilter]);

  useEffect(() => {
    loadNvl();
  }, [loadNvl]);

  const activeNvlOptions = useMemo(() => nvlData.filter((n) => n.trangThai), [nvlData]);

  return (
    <Card style={{ margin: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Quản lý NVL &amp; Mapping (NM.TKVV)</Title>

      {/* ─ Thanh lọc chung ─ */}
      <Space style={{ marginBottom: 16 }} wrap>
        <span style={{ fontWeight: 500 }}>Mã BM:</span>
        <Select
          style={{ width: 320 }}
          options={MA_BM_OPTIONS}
          value={selectedMaBM}
          onChange={(v) => {
            setSelectedMaBM(v);
            setScopeFilter(undefined);
          }}
        />
        <span style={{ fontWeight: 500 }}>Scope:</span>
        <Select
          allowClear
          placeholder="Tất cả scope"
          style={{ width: 200 }}
          options={SCOPE_OPTIONS.map(({ label, value }) => ({ label, value }))}
          value={scopeFilter}
          onChange={(v) => setScopeFilter(v)}
        />
      </Space>

      <Tabs
        defaultActiveKey="nvl"
        items={[
          {
            key: "nvl",
            label: "Danh mục NVL",
            children: (
              <NvlTab
                data={nvlData}
                loading={nvlLoading}
                selectedMaBM={selectedMaBM}
                onReload={loadNvl}
              />
            ),
          },
          {
            key: "mapping",
            label: "Mapping Tag PLC ↔ NVL",
            children: <MappingTab nvlOptions={activeNvlOptions} />,
          },
          {
            key: "danh-muc-can",
            label: "Danh mục Cân (EMS)",
            children: <DanhMucCanTab defaultXuong={scopeFilter} />,
          },
          {
            key: "mapping-can-xuong",
            label: "Mapping Cân → Xưởng",
            children: <SanLuongMappingTab defaultScope={scopeFilter} />,
          },
        ]}
      />
    </Card>
  );
};

export default QuanLyNVLTKVV;
