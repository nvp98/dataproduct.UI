/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber,
  Modal, Popconfirm, Row, Select, Space, Switch, Table, Tag, Tabs, Typography, message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  lgTSLSiLoApi, lgTSLNvlApi, lgTSLMappingApi,
  type LGTSLSiLoDto, type LGTSLNvlDto, type LGTSLMappingDto,
  type CreateLGTSLSiLoDto, type UpdateLGTSLSiLoDto, type CreateLGTSLNvlDto, type CreateLGTSLMappingDto,
} from "../../../services/LGTSLApi";
import { PhieuApi } from "../../../services/PhieuApi";

const { Title } = Typography;
const { Option } = Select;

interface LoCaoItem { id: number; tenLoCao: string; }

const CA_OPTIONS = [
  { label: "Ca 1 (07:30–19:30)", value: 1 },
  { label: "Ca 2 (19:30–07:30)", value: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Danh mục Silo (LG_TSL_SiLo)
// ─────────────────────────────────────────────────────────────────────────────
interface SiLoTabProps {
  loCaoOptions: { label: string; value: number }[];
  filterLoCao: number | null;
  nvlOptions: LGTSLNvlDto[];
  onDataChange: () => void;
}

const SiLoTab = ({ loCaoOptions, filterLoCao, nvlOptions, onDataChange }: SiLoTabProps) => {
  const [data, setData] = useState<LGTSLSiLoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGTSLSiLoDto | null>(null);
  const [form] = Form.useForm();
  const selectedLoCao = Form.useWatch("idLoCao", form);

  const filteredNvlOpts = nvlOptions.filter(
    (n) => !selectedLoCao || n.idLoCao === selectedLoCao,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterLoCao) params.idLoCao = filterLoCao;
      const res = await lgTSLSiLoApi.getList(params);
      setData(Array.isArray(res) ? res : []);
    } catch { message.error("Lỗi khi tải danh sách Silo"); }
    finally { setLoading(false); }
  }, [filterLoCao]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (filterLoCao) form.setFieldValue("idLoCao", filterLoCao);
    setEditingRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: LGTSLSiLoDto) => {
    form.setFieldsValue({
      idLoCao: row.idLoCao,
      tenSiLo: row.tenSiLo,
      thuTu: row.thuTu,
      thuTuCoDinh: row.thuTuCoDinh,
      isDelete: row.isDelete ?? false,
    });
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await lgTSLSiLoApi.delete(id); message.success("Đã xóa"); fetchData(); onDataChange(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const baseDto: CreateLGTSLSiLoDto = {
        idLoCao: values.idLoCao,
        tenSiLo: values.tenSiLo,
        thuTu: values.thuTu ?? null,
        thuTuCoDinh: values.thuTuCoDinh ?? null,
      };
      setModalLoading(true);
      if (editingRow) {
        const updateDto: UpdateLGTSLSiLoDto = { ...baseDto, isDelete: values.isDelete ?? false };
        await lgTSLSiLoApi.update(editingRow.id, updateDto);
        message.success("Cập nhật thành công");
      } else { await lgTSLSiLoApi.create(baseDto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData(); onDataChange();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGTSLSiLoDto> = [
    { title: "STT", key: "stt", width: 55, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 80, align: "center" },
    { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo" },
    { title: "Thứ tự", dataIndex: "thuTu", key: "thuTu", width: 80, align: "center", render: (v) => v ?? "—" },
    { title: "Thứ tự cố định", dataIndex: "thuTuCoDinh", key: "thuTuCoDinh", width: 120, align: "center", render: (v) => v ?? "—" },
    {
      title: "Thao tác", key: "action", width: 100, align: "center",
      render: (_v, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(row.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm Silo</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        size="small" bordered pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      <Modal title={editingRow ? "Cập nhật Silo" : "Thêm Silo mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="idLoCao" label="Lò cao" rules={[{ required: true, message: "Chọn lò cao" }]}>
                <Select placeholder="Chọn lò cao">
                  {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="thuTu" label="Thứ tự">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="tenSiLo" label="Tên Silo" rules={[{ required: true, message: "Nhập tên Silo" }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="thuTuCoDinh"
                label="Thứ tự cố định"
                rules={[
                  { required: true, message: "Nhập thứ tự cố định" }
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>
          {editingRow && (
            <Form.Item name="isDelete" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Đã xóa" unCheckedChildren="Hoạt động" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Mapping Silo ↔ NVL (LG_TSL_SiLo_Mapping)
// ─────────────────────────────────────────────────────────────────────────────
interface MappingTabProps {
  ngay: string | null;
  ca: number | null;
  idLoCao: number | null;
  loCaoOptions: { label: string; value: number }[];
}

const MappingTab = ({ ngay, ca, idLoCao, loCaoOptions: loCaoOptionsProp }: MappingTabProps) => {
  const [data, setData] = useState<LGTSLMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGTSLMappingDto | null>(null);
  const [form] = Form.useForm();
  const selectedLoCao = Form.useWatch("idLoCao", form);

  // Lò cao options: dùng prop từ parent, tự load nếu prop rỗng
  const [ownLoCaoOptions, setOwnLoCaoOptions] = useState<{ label: string; value: number }[]>([]);
  const loCaoOptions = loCaoOptionsProp.length > 0 ? loCaoOptionsProp : ownLoCaoOptions;

  // Silo và NVL cho modal: load động khi chọn lò cao
  const [modalSiloOpts, setModalSiloOpts] = useState<LGTSLSiLoDto[]>([]);
  const [modalNvlOpts, setModalNvlOpts] = useState<LGTSLNvlDto[]>([]);
  const [modalSiloLoading, setModalSiloLoading] = useState(false);
  const [modalNvlLoading, setModalNvlLoading] = useState(false);

  useEffect(() => {
    if (loCaoOptionsProp.length > 0) return;
    const { PhieuApi } = require("../../../services/PhieuApi");
    PhieuApi.getDsLoCao()
      .then((res: any) => {
        const list: LoCaoItem[] = Array.isArray(res) ? res : (res?.data ?? []);
        setOwnLoCaoOptions(
          list.map((item: LoCaoItem) => ({ label: item.tenLoCao, value: item.id }))
            .filter((o: any) => Number.isFinite(o.value)),
        );
      })
      .catch(() => {});
  }, [loCaoOptionsProp.length]);

  useEffect(() => {
    if (!selectedLoCao || !modalOpen) return;
    setModalSiloLoading(true);
    lgTSLSiLoApi.getList({ idLoCao: Number(selectedLoCao) })
      .then((res) => setModalSiloOpts(Array.isArray(res) ? res : []))
      .catch(() => setModalSiloOpts([]))
      .finally(() => setModalSiloLoading(false));
    setModalNvlLoading(true);
    lgTSLNvlApi.getList({ idLoCao: Number(selectedLoCao) })
      .then((res) => setModalNvlOpts(Array.isArray(res) ? res : []))
      .catch(() => setModalNvlOpts([]))
      .finally(() => setModalNvlLoading(false));
  }, [selectedLoCao, modalOpen]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (idLoCao) params.idLoCao = idLoCao;
      if (ngay) params.ngay = ngay;
      if (ca) params.ca = ca;
      const res = await lgTSLMappingApi.getList(params);
      setData(Array.isArray(res) ? res : []);
    } catch { message.error("Lỗi khi tải danh sách Mapping"); }
    finally { setLoading(false); }
  }, [ngay, ca, idLoCao]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (ngay) form.setFieldValue("ngay", dayjs(ngay));
    if (ca) form.setFieldValue("ca", ca);
    if (idLoCao) form.setFieldValue("idLoCao", idLoCao);
    setEditingRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: LGTSLMappingDto) => {
    form.setFieldsValue({
      ngay: row.ngay ? dayjs(row.ngay) : null,
      ca: row.ca,
      idLoCao: row.idLoCao,
      idSiLo: row.idSiLo,
      idNVL: row.idNVL,
      ghiChu: row.ghiChu,
    });
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await lgTSLMappingApi.delete(id); message.success("Đã xóa"); fetchData(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGTSLMappingDto = {
        ngay: values.ngay ? values.ngay.format("YYYY-MM-DD") : "",
        ca: values.ca,
        idLoCao: values.idLoCao,
        idSiLo: values.idSiLo,
        idNVL: values.idNVL,
        ghiChu: values.ghiChu ?? null,
      };
      setModalLoading(true);
      if (editingRow) { await lgTSLMappingApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgTSLMappingApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGTSLMappingDto> = [
    { title: "STT", key: "stt", width: 50, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Ngày", dataIndex: "ngay", key: "ngay", width: 110, render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
    { title: "Ca", dataIndex: "ca", key: "ca", width: 90, render: (v) => v === 1 ? "Ca 1" : v === 2 ? "Ca 2" : "—" },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 75, align: "center" },
    { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo", render: (v) => v ?? "—" },
    { title: "Tên NVL", dataIndex: "tenNVL", key: "tenNVL", render: (v) => v ?? "—" },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v) => v ?? "—" },
    {
      title: "Ngày tạo", dataIndex: "ngayTao", key: "ngayTao", width: 120,
      render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "—",
    },
    {
      title: "Thao tác", key: "action", width: 100, align: "center",
      render: (_v, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(row.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm Mapping</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        size="small" bordered scroll={{ x: 900 }}
        pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      <Modal title={editingRow ? "Cập nhật Mapping" : "Thêm Mapping mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ngay" label="Ngày" rules={[{ required: true, message: "Chọn ngày" }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ca" label="Ca" rules={[{ required: true, message: "Chọn ca" }]}>
                <Select placeholder="Chọn ca">
                  {CA_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="idLoCao" label="Lò cao" rules={[{ required: true, message: "Chọn lò cao" }]}>
            <Select placeholder="Chọn lò cao" onChange={() => {
              form.setFieldValue("idSiLo", null);
              form.setFieldValue("idNVL", null);
            }}>
              {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="idSiLo" label="Tên Silo" rules={[{ required: true, message: "Chọn Silo" }]}>
            <Select placeholder={selectedLoCao ? "Chọn Silo" : "Chọn lò cao trước"}
              disabled={!selectedLoCao} loading={modalSiloLoading} showSearch optionFilterProp="children">
              {modalSiloOpts.map((s) => (
                <Option key={s.id} value={s.thuTuCoDinh ?? s.id}>{s.tenSiLo}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="idNVL" label="Nguyên vật liệu" rules={[{ required: true, message: "Chọn NVL" }]}>
            <Select placeholder={selectedLoCao ? "Chọn NVL" : "Chọn lò cao trước"}
              disabled={!selectedLoCao} loading={modalNvlLoading} showSearch optionFilterProp="children">
              {modalNvlOpts.map((n) => (
                <Option key={n.id} value={n.id}>{n.tenHienThi ?? n.tenNVL}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: NVL (LG_TSL_NVL)
// ─────────────────────────────────────────────────────────────────────────────
interface NvlTabProps {
  idLoCao: number | null;
  loCaoOptions: { label: string; value: number }[];
  onDataChange: () => void;
}

const NvlTab = ({ idLoCao, loCaoOptions, onDataChange }: NvlTabProps) => {
  const [data, setData] = useState<LGTSLNvlDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGTSLNvlDto | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (idLoCao) params.idLoCao = idLoCao;
      const res = await lgTSLNvlApi.getList(params);
      setData(Array.isArray(res) ? res : []);
    } catch { message.error("Lỗi khi tải danh sách NVL"); }
    finally { setLoading(false); }
  }, [idLoCao]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (idLoCao) form.setFieldValue("idLoCao", idLoCao);
    setEditingRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: LGTSLNvlDto) => {
    form.setFieldsValue({
      tenNVL: row.tenNVL,
      tenNVLTk: row.tenNVLTk,
      ghiChu: row.ghiChu,
      idLoCao: row.idLoCao,
      xacNhan: row.xacNhan,
    });
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleToggleXacNhan = async (id: number, checked: boolean) => {
    try {
      setLoadingId(id);
      await lgTSLNvlApi.updateXacNhan({ id, xacNhan: checked });
      setData((prev) => prev.map((x) => x.id === id ? { ...x, xacNhan: checked } : x));
      message.success("Cập nhật xác nhận thành công");
    } catch { message.error("Cập nhật thất bại"); }
    finally { setLoadingId(null); }
  };

  const handleDelete = async (id: number) => {
    try { await lgTSLNvlApi.delete(id); message.success("Đã xóa"); fetchData(); onDataChange(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGTSLNvlDto = {
        tenNVL: values.tenNVL,
        tenNVLTk: values.tenNVLTk ?? null,
        ghiChu: values.ghiChu ?? null,
        idLoCao: values.idLoCao,
        xacNhan: values.xacNhan ?? false,
      };
      setModalLoading(true);
      if (editingRow) { await lgTSLNvlApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgTSLNvlApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData(); onDataChange();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGTSLNvlDto> = [
    { title: "STT", key: "stt", width: 55, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 80, align: "center" },
    { title: "Tên NVL", dataIndex: "tenNVL", key: "tenNVL" },
    { title: "Tên NVL (P.KH)", dataIndex: "tenNVLTk", key: "tenNVLTk", ellipsis: true, render: (v) => v ?? "—" },
    {
      title: "Xác nhận", dataIndex: "xacNhan", key: "xacNhan", width: 100, align: "center",
      render: (value, row) => (
        <Switch
          checked={!!value}
          loading={loadingId === row.id}
          onChange={(checked) => handleToggleXacNhan(row.id, checked)}
        />
      ),
    },
    {
      title: "Ngày xác nhận", dataIndex: "ngayXacNhan", key: "ngayXacNhan", width: 130,
      render: (v) => v ? <Tag color="green">{dayjs(v).format("DD/MM/YYYY")}</Tag> : <span style={{ color: "#bbb" }}>—</span>,
    },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v) => v ?? "—" },
    { title: "Ngày tạo", dataIndex: "ngayTao", key: "ngayTao", width: 120, render: (v) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
    {
      title: "Thao tác", key: "action", width: 100, align: "center",
      render: (_v, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(row.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm NVL</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        size="small" bordered scroll={{ x: 900 }}
        pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      <Modal title={editingRow ? "Cập nhật NVL" : "Thêm NVL mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tenNVL" label="Tên NVL" rules={[{ required: true, message: "Nhập tên NVL" }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tenNVLTk" label="Tên NVL (P.KH)">
                <Input maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="idLoCao" label="Lò cao" rules={[{ required: true, message: "Chọn lò cao" }]}>
                <Select placeholder="Chọn lò cao">
                  {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="xacNhan" label="Xác nhận" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const QuanLyTonSiLoNVL = () => {
  const [loCaoOptions, setLoCaoOptions] = useState<{ label: string; value: number }[]>([]);
  const [filterNgay, setFilterNgay] = useState<string | null>(dayjs().format("YYYY-MM-DD"));
  const [filterCa, setFilterCa] = useState<number | null>(null);
  const [filterLoCao, setFilterLoCao] = useState<number | null>(null);
  const [nvlOptions, setNvlOptions] = useState<LGTSLNvlDto[]>([]);

  const loadNvlOptions = useCallback(() => {
    const params: any = {};
    if (filterLoCao) params.idLoCao = filterLoCao;
    lgTSLNvlApi.getList(params)
      .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNvlOptions([]));
  }, [filterLoCao]);

  useEffect(() => {
    PhieuApi.getDsLoCao()
      .then((res: any) => {
        const list: LoCaoItem[] = Array.isArray(res) ? res : (res?.data ?? []);
        setLoCaoOptions(
          list.map((item) => ({ label: item.tenLoCao, value: item.id }))
            .filter((o) => Number.isFinite(o.value)),
        );
      })
      .catch(() => setLoCaoOptions([]));
  }, []);

  useEffect(() => { loadNvlOptions(); }, [loadNvlOptions]);

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        Quản lý Tồn Silo &amp; Nguyên vật liệu (LG)
      </Title>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Lọc theo ngày"
            value={filterNgay ? dayjs(filterNgay) : null}
            onChange={(d) => setFilterNgay(d ? d.format("YYYY-MM-DD") : null)} allowClear />
        </Col>
        <Col xs={24} sm={7} md={5}>
          <Select style={{ width: "100%" }} placeholder="Lọc theo ca" allowClear
            value={filterCa} onChange={(v) => setFilterCa(v ?? null)}>
            {CA_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={7} md={5}>
          <Select style={{ width: "100%" }} placeholder="Lọc theo lò cao" allowClear
            value={filterLoCao} onChange={(v) => setFilterLoCao(v ?? null)}>
            {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
          </Select>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="silo"
        items={[
          {
            key: "silo",
            label: "Danh mục Silo",
            children: (
              <SiLoTab
                loCaoOptions={loCaoOptions}
                filterLoCao={filterLoCao}
                nvlOptions={nvlOptions}
                onDataChange={() => {}}
              />
            ),
          },
          {
            key: "mapping",
            label: "Mapping Silo ↔ NVL",
            children: (
              <MappingTab
                ngay={filterNgay}
                ca={filterCa}
                idLoCao={filterLoCao}
                loCaoOptions={loCaoOptions}
              />
            ),
          },
          {
            key: "nvl",
            label: "Nguyên vật liệu",
            children: (
              <NvlTab
                idLoCao={filterLoCao}
                loCaoOptions={loCaoOptions}
                onDataChange={loadNvlOptions}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default QuanLyTonSiLoNVL;
