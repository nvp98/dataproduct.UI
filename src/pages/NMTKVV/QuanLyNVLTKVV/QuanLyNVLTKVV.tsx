/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import {
  tkvvNvlApi,
  tkvvMappingApi,
  type TKVVNguyenVatLieuDto,
  type TKVVMappingDto,
  type TKVVPhanLoai,
} from "../../../services/TKVVApi";

const { Title } = Typography;

const MA_BM_TKVV = BM_CONFIG.TKVV.TKVV_BB_SanLuong;

// Mã Scope phía PLC/SCADA — phải khớp với TKVV_BBSLRepository.ResolveScopeCode ở BE.
const SCOPE_OPTIONS = [
  { label: "VV1 - Vê viên 1", value: "VV1" },
  { label: "VV2 - Vê viên 2", value: "VV2" },
  { label: "TK1 - Thiêu kết 1", value: "TK1" },
  { label: "TK2 - Thiêu kết 2", value: "TK2" },
  { label: "TK3 - Thiêu kết 3", value: "TK3" },
  { label: "TK4 - Thiêu kết 4", value: "TK4" },
];

// PhanLoai cố định theo cột trên biểu mẫu giấy — xem TKVV_SanLuongMapping.PhanLoai ở BE.
const PHAN_LOAI_OPTIONS: { label: string; value: TKVVPhanLoai; color: string }[] = [
  { label: "Loại 1", value: 1, color: "green" },
  { label: "Loại 2", value: 2, color: "blue" },
  { label: "Loại 3", value: 3, color: "orange" },
  { label: "Phế phẩm", value: 4, color: "red" },
];

const phanLoaiTag = (v: TKVVPhanLoai) => {
  const opt = PHAN_LOAI_OPTIONS.find((o) => o.value === v);
  return <Tag color={opt?.color ?? "default"}>{opt?.label ?? v}</Tag>;
};

const scopeLabel = (v: string) => SCOPE_OPTIONS.find((o) => o.value === v)?.label ?? v;

// ─── Tab 1: Danh mục sản phẩm (NVL) ─────────────────────────────────────────

const NvlTab = ({
  data,
  loading,
  onReload,
}: {
  data: TKVVNguyenVatLieuDto[];
  loading: boolean;
  onReload: () => void;
}) => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVNguyenVatLieuDto | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ trangThai: true });
    setModalOpen(true);
  };

  const openEdit = (record: TKVVNguyenVatLieuDto) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await tkvvNvlApi.update(editing.id, { ...values, maBM: MA_BM_TKVV });
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await tkvvNvlApi.create({ ...values, maBM: MA_BM_TKVV });
        message.success("Thêm sản phẩm thành công");
      }
      setModalOpen(false);
      onReload();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvNvlApi.delete(id);
      message.success("Đã xóa sản phẩm");
      onReload();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa sản phẩm");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        columns={[
          { title: "Tên sản phẩm", dataIndex: "tenNVL" },
          { title: "ĐVT", dataIndex: "donViTinh", width: 90, align: "center" },
          { title: "Thứ tự", dataIndex: "thuTu", width: 90, align: "center" },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 120,
            align: "center",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>,
          },
          { title: "Ghi chú", dataIndex: "ghiChu" },
          {
            title: "Thao tác",
            key: "action",
            width: 100,
            render: (_: unknown, record: TKVVNguyenVatLieuDto) => (
              <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => handleDelete(record.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tenNVL" label="Tên sản phẩm" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: Quặng Vê Viên TP" />
          </Form.Item>
          <Form.Item name="donViTinh" label="Đơn vị tính">
            <Input placeholder="VD: Tấn" />
          </Form.Item>
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

// ─── Tab 2: Mapping Tag PLC ↔ Sản phẩm ──────────────────────────────────────

const MappingTab = ({ nvlOptions }: { nvlOptions: TKVVNguyenVatLieuDto[] }) => {
  const [data, setData] = useState<TKVVMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVMappingDto | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (scope?: string) => {
    setLoading(true);
    try {
      const res = await tkvvMappingApi.getList(scope ? { scope } : undefined);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách Mapping");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(scopeFilter);
  }, [fetchData, scopeFilter]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ trangThai: true });
    setModalOpen(true);
  };

  const openEdit = (record: TKVVMappingDto) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      tuNgay: record.tuNgay ? dayjs(record.tuNgay) : null,
      denNgay: record.denNgay ? dayjs(record.denNgay) : null,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      tuNgay: values.tuNgay ? values.tuNgay.format("YYYY-MM-DD") : null,
      denNgay: values.denNgay ? values.denNgay.format("YYYY-MM-DD") : null,
    };
    setSaving(true);
    try {
      if (editing) {
        await tkvvMappingApi.update(editing.id, payload);
        message.success("Cập nhật mapping thành công");
      } else {
        await tkvvMappingApi.create(payload);
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
      await tkvvMappingApi.delete(id);
      message.success("Đã ngừng mapping");
      fetchData(scopeFilter);
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa mapping");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <Select
          allowClear
          placeholder="Lọc theo xưởng"
          style={{ width: 220 }}
          options={SCOPE_OPTIONS}
          value={scopeFilter}
          onChange={(v) => setScopeFilter(v)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={nvlOptions.length === 0}>
          Thêm mapping
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        columns={[
          { title: "Xưởng", dataIndex: "scope", width: 140, render: scopeLabel },
          { title: "TagID", dataIndex: "tagID", width: 160 },
          { title: "MaKey", dataIndex: "maKey", width: 140 },
          { title: "Sản phẩm", dataIndex: "tenNVL" },
          {
            title: "Phân loại",
            dataIndex: "phanLoai",
            width: 110,
            align: "center",
            render: phanLoaiTag,
          },
          { title: "Từ ngày", dataIndex: "tuNgay", width: 110 },
          { title: "Đến ngày", dataIndex: "denNgay", width: 110 },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 110,
            align: "center",
            render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đang dùng" : "Ngừng"}</Tag>,
          },
          {
            title: "Thao tác",
            key: "action",
            width: 100,
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
          <Form.Item name="scope" label="Xưởng" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select options={SCOPE_OPTIONS} placeholder="Chọn xưởng" />
          </Form.Item>
          <Form.Item name="tagID" label="Tag ID (PLC)" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: VV2_L1_WEIGHT" />
          </Form.Item>
          <Form.Item name="maKey" label="Mã Key hiển thị" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: VV2.Loai1" />
          </Form.Item>
          <Form.Item name="nguyenVatLieuID" label="Sản phẩm" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select
              placeholder="Chọn sản phẩm"
              options={nvlOptions.map((n) => ({ label: n.tenNVL, value: n.id }))}
            />
          </Form.Item>
          <Form.Item name="phanLoai" label="Phân loại" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Select options={PHAN_LOAI_OPTIONS.map(({ label, value }) => ({ label, value }))} placeholder="Chọn phân loại" />
          </Form.Item>
          <Form.Item name="thuTu" label="Thứ tự hiển thị">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%" }} size="middle">
            <Form.Item name="tuNgay" label="Hiệu lực từ ngày" style={{ width: 160 }}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="denNgay" label="Đến ngày" style={{ width: 160 }}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
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

      {nvlOptions.length === 0 && (
        <Typography.Text type="warning">
          Chưa có sản phẩm nào ở tab "Danh mục sản phẩm" — hãy thêm sản phẩm trước khi tạo mapping.
        </Typography.Text>
      )}
    </div>
  );
};

// ─── Trang chính ─────────────────────────────────────────────────────────────

const QuanLyNVLTKVV = () => {
  const [nvlData, setNvlData] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [nvlLoading, setNvlLoading] = useState(false);

  const loadNvl = useCallback(async () => {
    setNvlLoading(true);
    try {
      const res = await tkvvNvlApi.getList({ maBM: MA_BM_TKVV });
      setNvlData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh mục sản phẩm");
    } finally {
      setNvlLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNvl();
  }, [loadNvl]);

  const activeNvlOptions = useMemo(() => nvlData.filter((n) => n.trangThai), [nvlData]);

  return (
    <Card style={{ margin: 24 }}>
      <Title level={4}>Quản lý sản phẩm &amp; Mapping (NM.TKVV)</Title>
      <Tabs
        defaultActiveKey="nvl"
        items={[
          {
            key: "nvl",
            label: "Danh mục sản phẩm",
            children: <NvlTab data={nvlData} loading={nvlLoading} onReload={loadNvl} />,
          },
          {
            key: "mapping",
            label: "Mapping Tag PLC ↔ Sản phẩm",
            children: <MappingTab nvlOptions={activeNvlOptions} />,
          },
        ]}
      />
    </Card>
  );
};

export default QuanLyNVLTKVV;
