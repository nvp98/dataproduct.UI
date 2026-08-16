/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
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
  type TKVVNguyenVatLieuDto,
  type TKVVMappingDto,
  type EMSMappingTagDto,
} from "../../../services/TKVVApi";

const { Title } = Typography;

// Danh sách BM thuộc nhóm TKVV — dùng cho filter MaBM
const MA_BM_OPTIONS = [
  { label: "BB Sản lượng (TKVV_BB_SanLuong)", value: BM_CONFIG.TKVV.TKVV_BB_SanLuong },
  { label: "BC Sản lượng Chi phí (TKVV_BC_SanLuongChiPhi)", value: BM_CONFIG.TKVV.TKVV_BC_SanLuongChiPhi },
];

// Mã Scope phía PLC/SCADA — phải khớp với TKVV_BBSLRepository.ResolveScopeCode ở BE.
const SCOPE_OPTIONS = [
  { label: "VV1 - Vê viên 1", value: "VV1", tenScope: "Vê viên 1" },
  { label: "VV2 - Vê viên 2", value: "VV2", tenScope: "Vê viên 2" },
  { label: "TK1 - Thiêu kết 1", value: "TK1", tenScope: "Thiêu kết 1" },
  { label: "TK2 - Thiêu kết 2", value: "TK2", tenScope: "Thiêu kết 2" },
  { label: "TK3 - Thiêu kết 3", value: "TK3", tenScope: "Thiêu kết 3" },
  { label: "TK4 - Thiêu kết 4", value: "TK4", tenScope: "Thiêu kết 4" },
];


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

  const handleScopeChange = (value: string) => {
    const opt = SCOPE_OPTIONS.find((o) => o.value === value);
    if (opt) form.setFieldValue("tenScope", opt.tenScope);
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
              <Input placeholder="Tự động điền khi chọn scope" />
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
  const filteredEmsTags = selectedNvlScope
    ? emsTags.filter((t) => t.xuong === selectedNvlScope)
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
        ]}
      />
    </Card>
  );
};

export default QuanLyNVLTKVV;
