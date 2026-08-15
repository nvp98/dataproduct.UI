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
  tkvvEmsTagApi,
  type TKVVNguyenVatLieuDto,
  type TKVVMappingDto,
  type EMSMappingTagDto,
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

const scopeLabel = (v: string) => SCOPE_OPTIONS.find((o) => o.value === v)?.label ?? v;

// Ca ngày và ca đêm dùng 2 Tag PLC khác nhau — bắt buộc chọn khi tạo Mapping.
const CA_OPTIONS = [
  { label: "Ca 1 - Ngày", value: 1 },
  { label: "Ca 2 - Đêm", value: 2 },
];

const caLabel = (v: number) => CA_OPTIONS.find((o) => o.value === v)?.label ?? String(v);

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

// ─── Tab 2: Mapping Tag PLC ↔ Xưởng (1 Tag = 1 BM/xưởng, không gắn sản phẩm) ──

const MappingTab = () => {
  const [data, setData] = useState<TKVVMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string | undefined>();
  const [caFilter, setCaFilter] = useState<number | undefined>();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVMappingDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Danh sách Tag PLC lấy từ EMS (dbo.EMS_GetMappingTag) theo Xưởng đang chọn trong
  // modal — chỉ để gợi ý/tự điền TagIDEMS + TagName + Ca, người dùng vẫn có thể tự
  // gõ tay nếu Tag chưa có trong EMS.
  const [emsTags, setEmsTags] = useState<EMSMappingTagDto[]>([]);
  const [emsLoading, setEmsLoading] = useState(false);
  const modalScope = Form.useWatch("scope", form);

  useEffect(() => {
    if (!modalOpen || !modalScope) {
      setEmsTags([]);
      return;
    }
    setEmsLoading(true);
    tkvvEmsTagApi
      .getList({ xuong: modalScope })
      .then((list) => setEmsTags(Array.isArray(list) ? list : []))
      .catch(() => message.error("Không thể tải danh sách Tag từ EMS"))
      .finally(() => setEmsLoading(false));
  }, [modalOpen, modalScope]);

  const handlePickEmsTag = (id: number) => {
    const tag = emsTags.find((t) => t.id === id);
    if (!tag) return;
    form.setFieldsValue({
      tagID: tag.tagIDEMS,
      maKey: tag.tagName,
      ...(tag.ca ? { ca: tag.ca } : {}),
    });
  };

  const fetchData = useCallback(async (scope?: string, ca?: number) => {
    setLoading(true);
    try {
      const res = await tkvvMappingApi.getList({ scope, ca });
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách Mapping");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(scopeFilter, caFilter);
  }, [fetchData, scopeFilter, caFilter]);

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
      fetchData(scopeFilter, caFilter);
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
      fetchData(scopeFilter, caFilter);
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa mapping");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <Space>
          <Select
            allowClear
            placeholder="Lọc theo xưởng"
            style={{ width: 220 }}
            options={SCOPE_OPTIONS}
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v)}
          />
          <Select
            allowClear
            placeholder="Lọc theo ca"
            style={{ width: 160 }}
            options={CA_OPTIONS}
            value={caFilter}
            onChange={(v) => setCaFilter(v)}
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
        columns={[
          { title: "Xưởng", dataIndex: "scope", width: 140, render: scopeLabel },
          { title: "Ca", dataIndex: "ca", width: 110, align: "center", render: caLabel },
          { title: "TagID", dataIndex: "tagID", width: 160 },
          { title: "MaKey", dataIndex: "maKey" },
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
          <Form.Item label="Chọn từ danh sách Tag EMS (gợi ý)" extra="Chọn xưởng trước để tải danh sách. Chọn 1 Tag sẽ tự điền TagIDEMS/TagName/Ca bên dưới — vẫn có thể tự sửa lại.">
            <Select
              allowClear
              showSearch
              loading={emsLoading}
              disabled={!modalScope}
              placeholder={modalScope ? "Tìm theo tên cân / TagName..." : "Chọn Xưởng trước"}
              notFoundContent={emsLoading ? "Đang tải..." : "Không có Tag nào cho xưởng này"}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={emsTags
                .filter((t) => t.ca !== null)
                .map((t) => ({
                  value: t.id,
                  label: `${t.tenCan ?? t.tagName} — ${t.tagName} (${t.ca === 1 ? "Ngày" : "Đêm"}${t.loai ? ` · ${t.loai}` : ""})`,
                }))}
              onChange={(id) => handlePickEmsTag(id)}
            />
          </Form.Item>
          <Form.Item
            name="ca"
            label="Ca"
            rules={[{ required: true, message: "Bắt buộc" }]}
            extra="Ca ngày và ca đêm dùng 2 Tag PLC khác nhau — chọn đúng ca của Tag này."
          >
            <Select options={CA_OPTIONS} placeholder="Chọn ca" />
          </Form.Item>
          <Form.Item
            name="tagID"
            label="TagIDEMS (PLC)"
            rules={[{ required: true, message: "Bắt buộc" }]}
            extra="Lấy từ cột TagIDEMS trong EMS_DATA_CAN — 1 Tag báo tổng khối lượng, không phân theo Loại."
          >
            <Input placeholder="VD: 1012311" />
          </Form.Item>
          <Form.Item name="maKey" label="TagName hiển thị" rules={[{ required: true, message: "Bắt buộc" }]}>
            <Input placeholder="VD: TK_Sieve_AI037" />
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
            label: "Mapping Tag PLC ↔ Xưởng",
            children: <MappingTab />,
          },
        ]}
      />
    </Card>
  );
};

export default QuanLyNVLTKVV;
