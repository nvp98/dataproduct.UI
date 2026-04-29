/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber,
  Modal, Popconfirm, Row, Select, Space, Table, Tag, Tabs, Typography, message,
  Switch,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import {
  lgnlSiLoMasterApi, lgnlMappingApi, lgnlNvlApi, lgnlTsMappingApi, lgnlNhomNvlApi,
  type LGNLSiLoMasterDto, type LGNLMappingDto, type LGNLNvlDto,
  type LGNLTsMappingDto, type LGNLNhomNvlDto,
  type CreateLGNLSiLoMasterDto, type CreateLGNLMappingDto, type CreateLGNLNvlDto,
  type CreateLGNLNhomNvlDto, type LGNLChangeSiLoNVLDto,
} from "../../../services/LGNLApi";
import { PhieuApi } from "../../../services/PhieuApi";

const { Title } = Typography;
const { Option } = Select;

interface LoCaoItem { id: number; tenLoCao: string; }

const CA_OPTIONS = [
  { label: "Ca 1 (07:30–19:30)", value: 1 },
  { label: "Ca 2 (19:30–07:30)", value: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Danh mục Silo (LG_NL_SiLo)
// ─────────────────────────────────────────────────────────────────────────────
interface SiLoMasterTabProps {
  loCaoOptions: { label: string; value: number }[];
  filterLoCao: number | null;
  tsOptions: LGNLTsMappingDto[];
  onDataChange: () => void;
}

const SiLoMasterTab = ({ loCaoOptions, filterLoCao, tsOptions, onDataChange }: SiLoMasterTabProps) => {
  const [data, setData] = useState<LGNLSiLoMasterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGNLSiLoMasterDto | null>(null);
  const [form] = Form.useForm();


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterLoCao) params.idLoCao = filterLoCao;
      const res = await lgnlSiLoMasterApi.getList(params);
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

  const openEdit = (row: LGNLSiLoMasterDto) => {
    form.setFieldsValue({ idLoCao: row.idLoCao, tenSiLo: row.tenSiLo, thuTu: row.thuTu, tagKey: row.tagKey });
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await lgnlSiLoMasterApi.delete(id); message.success("Đã xóa"); fetchData(); onDataChange(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGNLSiLoMasterDto = {
        idLoCao: values.idLoCao, tenSiLo: values.tenSiLo,
        thuTu: values.thuTu ?? null, tagKey: values.tagKey ?? null,
      };
      setModalLoading(true);
      if (editingRow) { await lgnlSiLoMasterApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgnlSiLoMasterApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData(); onDataChange();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGNLSiLoMasterDto> = [
    { title: "STT", key: "stt", width: 55, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 80, align: "center" },
    { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo" },
    { title: "TagKey", dataIndex: "tagKey", key: "tagKey", width: 130, render: (v) => v ?? "—" },
    { title: "Thứ tự", dataIndex: "thuTu", key: "thuTu", width: 80, align: "center" },
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
          <Form.Item name="tenSiLo" label="Tên Silo" rules={[{ required: true, message: "Nhập tên Silo" }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="tagKey" label="TagKey">
            <Select placeholder="Chọn TagKey" allowClear showSearch optionFilterProp="children">
              {tsOptions.map((t) => (
                <Option key={t.tagKey ?? t.id} value={t.tagKey ?? ""}>
                  {t.tagKey} <span style={{ color: "#999", marginLeft: 8 }}></span>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Mapping Silo ↔ NVL (LG_NL_Mapping)
// ─────────────────────────────────────────────────────────────────────────────
interface MappingTabProps {
  ngay: string | null;
  idCa: number | null;
  idLoCao: number | null;
  loCaoOptions: { label: string; value: number }[];
  siloOptions: LGNLSiLoMasterDto[];
  nvlOptions: LGNLNvlDto[];
}

const MappingTab = ({ ngay, idCa, idLoCao, loCaoOptions, siloOptions, nvlOptions }: MappingTabProps) => {
  const [data, setData] = useState<LGNLMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  // 'active' = cấu hình đang hiệu lực (NgayHetHL=null), 'history' = lịch sử theo ngày/ca
  const [viewMode, setViewMode] = useState<"active" | "history">("active");

  // Modal thêm / sửa mapping
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGNLMappingDto | null>(null);
  const [form] = Form.useForm();
  const selectedLoCao = Form.useWatch("idLoCao", form);

  const [modalNvlOptions, setModalNvlOptions] = useState<LGNLNvlDto[]>([]);
  const [modalNvlLoading, setModalNvlLoading] = useState(false);

  // Modal đổi NVL giữa ca
  const [doiNVLOpen, setDoiNVLOpen] = useState(false);
  const [doiNVLLoading, setDoiNVLLoading] = useState(false);
  const [doiNVLRow, setDoiNVLRow] = useState<LGNLMappingDto | null>(null);
  const [doiNVLForm] = Form.useForm();

  const filteredSiloOpts = siloOptions.filter(
    (s) => !selectedLoCao || s.idLoCao === selectedLoCao
  );

  useEffect(() => {
    if (!selectedLoCao || !modalOpen) return;
    setModalNvlLoading(true);
    lgnlNvlApi.getList({ idLoCao: selectedLoCao })
      .then((res) => setModalNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setModalNvlOptions([]))
      .finally(() => setModalNvlLoading(false));
  }, [selectedLoCao, modalOpen]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (idLoCao) params.idLoCao = idLoCao;
      if (viewMode === "history") {
        // Lịch sử: lọc đúng ngày/ca được chọn
        if (ngay) params.ngay = ngay;
        if (idCa) params.idCa = idCa;
      }
      const res = await lgnlMappingApi.getList(params);
      const all: LGNLMappingDto[] = Array.isArray(res) ? res : [];
      // Chế độ "Cấu hình hiệu lực": chỉ giữ lại rows chưa đóng (NgayHetHL=null)
      setData(viewMode === "active" ? all.filter((r) => !r.ngayHetHL) : all);
    } catch { message.error("Lỗi khi tải danh sách Mapping"); }
    finally { setLoading(false); }
  }, [ngay, idCa, idLoCao, viewMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (ngay) form.setFieldValue("ngay", dayjs(ngay));
    if (idCa) form.setFieldValue("idCa", idCa);
    if (idLoCao) form.setFieldValue("idLoCao", idLoCao);
    setEditingRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: LGNLMappingDto) => {
    form.setFieldsValue({
      ngay: row.ngay ? dayjs(row.ngay) : null,
      idCa: row.idCa, idLoCao: row.idLoCao,
      idSiLo: row.idSiLo, idNVL: row.idNVL, ghiChu: row.ghiChu,
    });
    setEditingRow(row);
    setModalOpen(true);
  };

  const openDoiNVL = (row: LGNLMappingDto) => {
    doiNVLForm.resetFields();
    // Gợi ý thời điểm = thời điểm hiện tại trong ca
    doiNVLForm.setFieldsValue({ thoiDiem: dayjs(), ghiChu: null });
    setDoiNVLRow(row);
    setDoiNVLOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await lgnlMappingApi.delete(id); message.success("Đã xóa"); fetchData(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGNLMappingDto = {
        ngay: values.ngay ? values.ngay.format("YYYY-MM-DD") : "",
        idCa: values.idCa, idLoCao: values.idLoCao,
        idSiLo: values.idSiLo ?? null,
        idNVL: values.idNVL ?? null,
        ghiChu: values.ghiChu ?? null,
      };
      setModalLoading(true);
      if (editingRow) { await lgnlMappingApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgnlMappingApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const handleDoiNVL = async () => {
    if (!doiNVLRow) return;
    try {
      const values = await doiNVLForm.validateFields();
      const dto: LGNLChangeSiLoNVLDto = {
        idLoCao: doiNVLRow.idLoCao!,
        ngay: doiNVLRow.ngay!,
        idCa: doiNVLRow.idCa!,
        idSiLo: doiNVLRow.idSiLo!,
        idNVLMoi: values.idNVLMoi,
        thoiDiem: (values.thoiDiem as dayjs.Dayjs).format("YYYY-MM-DDTHH:mm:ss"),
        ghiChu: values.ghiChu ?? null,
      };
      setDoiNVLLoading(true);
      await lgnlMappingApi.doiNVL(dto);
      message.success("Đổi NVL giữa ca thành công");
      setDoiNVLOpen(false);
      fetchData();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi đổi NVL"); }
    finally { setDoiNVLLoading(false); }
  };

  const columns: ColumnsType<LGNLMappingDto> = [
    { title: "STT", key: "stt", width: 50, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Ngày", dataIndex: "ngay", key: "ngay", width: 105 , render: (value) => dayjs(value).format("YYYY-MM-DD")},
    { title: "Ca", dataIndex: "idCa", key: "idCa", width: 80, render: (v) => v === 1 ? "Ca 1" : v === 2 ? "Ca 2" : "—" },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 75, align: "center" },
    { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo", render: (v) => v ?? "—" },
    {
      title: "Tên NVL", dataIndex: "tenNVL", key: "tenNVL_NM",
      render: (v, row) => (
        <Space size={4}>
          {v ?? "—"}
          {row.thoiDiemBD && (
            <Tag color="orange" style={{ fontSize: 11 }}>Đổi giữa ca</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Thời điểm đổi NVL", dataIndex: "thoiDiemBD", key: "thoiDiemBD", width: 150, align: "center",
      render: (v) => v
        ? <Tag color="orange">{dayjs(v).format("DD/MM/YYYY HH:mm")}</Tag>
        : <span style={{ color: "#bbb" }}>—</span>,
    },
    {
      title: "Hiệu lực", key: "hieuLuc", width: 100, align: "center",
      render: (_v, row) => row.ngayHetHL
        ? <Tag color="default">Kết thúc {row.ngayHetHL}</Tag>
        : <Tag color="green">Đang dùng</Tag>,
    },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu" },
    {
      title: "Thao tác", key: "action", width: 130, align: "center",
      render: (_v, row) => (
        <Space>
          {/* Chỉ cho đổi NVL với row đang active và là config đầu ca (thoiDiemBD null) */}
          {!row.ngayHetHL && !row.thoiDiemBD && (
            <Button
              size="small"
              icon={<SwapOutlined />}
              title="Đổi NVL giữa ca"
              onClick={() => openDoiNVL(row)}
            />
          )}
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
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        {/* Toggle chế độ xem */}
        <Space>
          <Button
            type={viewMode === "active" ? "primary" : "default"}
            onClick={() => setViewMode("active")}
          >
            Cấu hình hiệu lực
          </Button>
          <Button
            type={viewMode === "history" ? "primary" : "default"}
            onClick={() => setViewMode("history")}
          >
            Lịch sử theo ngày/ca
          </Button>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm Mapping</Button>
        </Space>
      </div>

      {viewMode === "active" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 10 }}
          message={
            idLoCao
              ? `Đang hiển thị tất cả cấu hình còn hiệu lực của Lò cao ${idLoCao}. Đây là config sẽ được dùng cho các ngày/ca chưa có cấu hình riêng.`
              : "Chọn Lò cao để xem cấu hình đang hiệu lực. Các ngày/ca không có cấu hình riêng sẽ tự động dùng config gần nhất còn hiệu lực."
          }
        />
      )}
      {viewMode === "history" && data.length === 0 && ngay && idCa && idLoCao && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10 }}
          message={`Không có cấu hình riêng cho Ca ${idCa} ngày ${ngay}. Hệ thống sẽ tự dùng cấu hình gần nhất còn hiệu lực — chuyển sang tab "Cấu hình hiệu lực" để xem.`}
        />
      )}

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        size="small" bordered scroll={{ x: 900 }}
        rowClassName={(row) => row.thoiDiemBD ? "row-doi-nvl" : ""}
        pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      {/* ── Modal thêm / sửa mapping ── */}
      <Modal title={editingRow ? "Cập nhật Mapping" : "Thêm Mapping mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ngay" label="Ngày" rules={[{ required: true, message: "Chọn ngày" }]}>
                <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idCa" label="Ca" rules={[{ required: true, message: "Chọn ca" }]}>
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
              disabled={!selectedLoCao} showSearch optionFilterProp="children">
              {filteredSiloOpts.map((s) => (
                <Option key={s.id} value={s.id}>{s.tenSiLo}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="idNVL" label="Nguyên nhiên vật liệu">
            <Select
              placeholder={selectedLoCao ? "Chọn NVL" : "Chọn lò cao trước"}
              disabled={!selectedLoCao}
              allowClear
              showSearch
              optionFilterProp="children"
              loading={modalNvlLoading}
            >
              {modalNvlOptions.map((n) => (
                <Option key={n.id} value={n.id}>[{n.id}] {n.tenNVL_NM}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal đổi NVL giữa ca ── */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            Đổi NVL giữa ca — Silo: <strong>{doiNVLRow?.tenSiLo}</strong>
          </Space>
        }
        open={doiNVLOpen}
        onOk={handleDoiNVL}
        onCancel={() => setDoiNVLOpen(false)}
        confirmLoading={doiNVLLoading}
        okText="Xác nhận đổi"
        cancelText="Hủy"
        destroyOnClose
        width={480}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <>
              NVL hiện tại: <strong>{doiNVLRow?.tenNVL ?? "—"}</strong>.
              Data trước thời điểm đổi vẫn được tính vào NVL cũ.
            </>
          }
        />
        <Form form={doiNVLForm} layout="vertical">
          <Form.Item
            name="idNVLMoi"
            label="NVL mới"
            rules={[{ required: true, message: "Chọn NVL mới" }]}
          >
            <Select placeholder="Chọn NVL mới" showSearch optionFilterProp="children">
              {nvlOptions
                .filter((n) => n.id !== doiNVLRow?.idNVL)
                .map((n) => (
                  <Option key={n.id} value={n.id}>[{n.id}] {n.tenNVL_NM}</Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="thoiDiem"
            label="Thời điểm bắt đầu dùng NVL mới"
            rules={[{ required: true, message: "Chọn thời điểm" }]}
          >
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder="Chọn ngày giờ"
            />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={500} placeholder="Vd: Hết cát, chuyển sang đá vôi" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Nhóm NVL (LG_NL_NhomNVL)
// ─────────────────────────────────────────────────────────────────────────────
interface NhomNvlTabProps {
  loCaoOptions: { label: string; value: number }[];
  filterLoCao: number | null;
  onDataChange: () => void;
}

const NhomNvlTab = ({ loCaoOptions, filterLoCao, onDataChange }: NhomNvlTabProps) => {
  const [data, setData] = useState<LGNLNhomNvlDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGNLNhomNvlDto | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterLoCao) params.idLoCao = filterLoCao;
      const res = await lgnlNhomNvlApi.getList(params);
      setData(Array.isArray(res) ? res : []);
    } catch { message.error("Lỗi khi tải danh sách Nhóm NVL"); }
    finally { setLoading(false); }
  }, [filterLoCao]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (filterLoCao) form.setFieldValue("idLoCao", filterLoCao);
    setEditingRow(null);
    setModalOpen(true);
  };

  const openEdit = (row: LGNLNhomNvlDto) => {
    form.setFieldsValue({ idLoCao: row.idLoCao, tenNhom: row.tenNhom, thuTu: row.thuTu, ghiChu: row.ghiChu });
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try { await lgnlNhomNvlApi.delete(id); message.success("Đã xóa"); fetchData(); onDataChange(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGNLNhomNvlDto = {
        idLoCao: values.idLoCao,
        tenNhom: values.tenNhom,
        thuTu: values.thuTu ?? null,
        ghiChu: values.ghiChu ?? null,
      };
      setModalLoading(true);
      if (editingRow) { await lgnlNhomNvlApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgnlNhomNvlApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData(); onDataChange();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGNLNhomNvlDto> = [
    { title: "STT", key: "stt", width: 55, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 80, align: "center" },
    { title: "Tên nhóm NVL", dataIndex: "tenNhom", key: "tenNhom" },
    { title: "Thứ tự", dataIndex: "thuTu", key: "thuTu", width: 90, align: "center", render: (v) => v ?? "—" },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v) => v ?? "—" },
    { title: "Ngày tạo", dataIndex: "ngayTao", key: "ngayTao", width: 120, render: (v) => v ? v.slice(0, 10) : "—" },
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm nhóm NVL</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        size="small" bordered pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      <Modal title={editingRow ? "Cập nhật nhóm NVL" : "Thêm nhóm NVL mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="idLoCao" label="Lò cao" rules={[{ required: true, message: "Chọn lò cao" }]}>
                <Select placeholder="Chọn lò cao">
                  {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="thuTu" label="Thứ tự">
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="tenNhom" label="Tên nhóm NVL" rules={[{ required: true, message: "Nhập tên nhóm" }]}>
            <Input maxLength={200} placeholder="Vd: Quặng thiêu kết" />
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
// Tab 4: NVL (LG_NL_NVL)
// ─────────────────────────────────────────────────────────────────────────────
interface NvlTabProps {
  ngay: string | null;
  idCa: number | null;
  idLoCao: number | null;
  loCaoOptions: { label: string; value: number }[];
  nhomOptions: LGNLNhomNvlDto[];
  onDataChange: () => void;
}

const NvlTab = ({ ngay, idCa, idLoCao, loCaoOptions, nhomOptions, onDataChange }: NvlTabProps) => {
  const [data, setData] = useState<LGNLNvlDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<LGNLNvlDto | null>(null);
  const [form] = Form.useForm();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (ngay) params.ngay = ngay;
      if (idCa) params.idCa = idCa;
      if (idLoCao) params.idLoCao = idLoCao;
      const res = await lgnlNvlApi.getList(params);
      setData(Array.isArray(res) ? res : []);
    } catch { message.error("Lỗi khi tải danh sách NVL"); }
    finally { setLoading(false); }
  }, [ngay, idCa, idLoCao]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    if (idLoCao) form.setFieldValue("idLoCao", idLoCao);
    setEditingRow(null); setModalOpen(true);
  };

  const openEdit = (row: LGNLNvlDto) => {
    form.setFieldsValue({
      idLoCao: row.idLoCao,
      tenNVL_NM: row.tenNVL_NM,
      thuTu: row.thuTu,
      ghiChu: row.ghiChu,
      idNhomNVL: row.idNhomNVL, thuTuNhom: row.thuTuNhom,
      tenNVL_TK: row.tenNVL_TK,
      xacNhan: row.xacNhan,
    });
    setEditingRow(row); setModalOpen(true);
  };
  const handleToggleXacNhan = async (id: number, checked: boolean) => {
    try {
      setLoadingId(id);
      await lgnlNvlApi.updateXacNhan({
        id,
        xacNhan: checked
      });

      // cập nhật UI ngay (optimistic update)
      setData(prev =>
        prev.map(x =>
          x.id === id ? { ...x, xacNhan: checked } : x
        )
      );

      message.success("Cập nhật xác nhận thành công");
    } catch (err) {
      message.error("Cập nhật thất bại");
    } finally {
      setLoadingId(null);
    }
  };
  const handleDelete = async (id: number) => {
    try { await lgnlNvlApi.delete(id); message.success("Đã xóa"); fetchData(); onDataChange(); }
    catch { message.error("Lỗi khi xóa"); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateLGNLNvlDto = {
        idLoCao: values.idLoCao,
        idNhomNVL: values.idNhomNVL ?? null,
        tenNVL_NM: values.tenNVL_NM ?? null,
        thuTu: values.thuTu ?? null,
        ghiChu: values.ghiChu ?? null,
        thuTuNhom: values.thuTuNhom ?? null,
        tenNVL_TK: values.tenNVL_TK ?? null,
        xacNhan: values.xacNhan ?? null,
      };
      setModalLoading(true);
      if (editingRow) { await lgnlNvlApi.update(editingRow.id, dto); message.success("Cập nhật thành công"); }
      else { await lgnlNvlApi.create(dto); message.success("Thêm mới thành công"); }
      setModalOpen(false); fetchData(); onDataChange();
    } catch (err: any) { if (err?.errorFields) return; message.error("Lỗi khi lưu"); }
    finally { setModalLoading(false); }
  };

  const columns: ColumnsType<LGNLNvlDto> = [
    { title: "STT", key: "stt", width: 55, align: "center", render: (_v, _r, i) => i + 1 },
    { title: "Lò cao", dataIndex: "idLoCao", key: "idLoCao", width: 80, align: "center" },
    { title: "Tên NVL NM", dataIndex: "tenNVL_NM", key: "tenNVL_NM" },
    { title: "Tên NVL (P.KH)", dataIndex: "tenNVL_TK", key: "tenNVL_TK", ellipsis: true },
    {
      title: "Xác nhận",
      dataIndex: "xacNhan",
      key: "xacNhan",
      width: 100,
      align: "center",
      render: (value, row) => (
        <Switch
        checked={!!value}
        loading={loadingId === row.id}
        onChange={(checked) => handleToggleXacNhan(row.id, checked)}
      />
      ),
    },
    { title: "Nhóm hiển thị", dataIndex: "nhomHienThi", key: "nhomHienThi", render: (v) => v ?? "—" },
    { title: "Thứ tự", dataIndex: "thuTu", key: "thuTu", width: 90, align: "center", render: (v) => v ?? "—" },
    { title: "Thứ tự nhóm", dataIndex: "thuTuNhom", key: "thuTuNhom", width: 100, align: "center", render: (v) => v ?? "—" },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu" },
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
        size="small" bordered scroll={{ x: 1000 }}
        pagination={{ pageSize: 20, showTotal: (t) => `Tổng: ${t}` }} />

      <Modal title={editingRow ? "Cập nhật NVL" : "Thêm NVL mới"} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={modalLoading} okText={editingRow ? "Cập nhật" : "Thêm"} cancelText="Hủy" destroyOnClose width={600}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="tenNVL_NM" label="Tên NVL">
                <Input maxLength={200} />
              </Form.Item>
            </Col>
             <Col span={12}>
              <Form.Item name="tenNVL_TK" label="Tên NVL P.KH">
                <Input maxLength={200} />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="idNhomNVL" label="Nhóm cột cha trên BM"
                tooltip="Để trống nếu NVL này là cột độc lập. Chọn nhóm nếu muốn gộp nhiều NVL dưới 1 cột cha.">
                <Select placeholder="Chọn nhóm (để trống nếu không nhóm)" allowClear showSearch optionFilterProp="children">
                  {nhomOptions.map((n) => (
                    <Option key={n.id} value={n.id}>{n.tenNhom}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="thuTuNhom" label="Thứ tự nhóm trên BM">
                <InputNumber style={{ width: "100%" }} min={1} placeholder="1, 2, 3..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="idLoCao" label="Lò cao" rules={[{ required: true, message: "Chọn lò cao" }]}>
                <Select placeholder="Chọn lò cao">
                  {loCaoOptions.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="xacNhan" label="Xác nhận">
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
const QuanLySiLoNVL = () => {
  const [loCaoOptions, setLoCaoOptions] = useState<{ label: string; value: number }[]>([]);
  const [filterNgay, setFilterNgay] = useState<string | null>(dayjs().format("YYYY-MM-DD"));
  const [filterCa, setFilterCa] = useState<number | null>(null);
  const [filterLoCao, setFilterLoCao] = useState<number | null>(null);
  const [siloOptions, setSiloOptions] = useState<LGNLSiLoMasterDto[]>([]);
  const [nvlOptions, setNvlOptions] = useState<LGNLNvlDto[]>([]);
  const [nhomOptions, setNhomOptions] = useState<LGNLNhomNvlDto[]>([]);
  const [tsOptions, setTsOptions] = useState<LGNLTsMappingDto[]>([]);

  const loadSiloOptions = useCallback(() => {
    lgnlSiLoMasterApi.getList(filterLoCao ? { idLoCao: filterLoCao } : undefined)
      .then((res) => setSiloOptions(Array.isArray(res) ? res : []))
      .catch(() => setSiloOptions([]));
  }, [filterLoCao]);

  const loadNvlOptions = useCallback(() => {
    const params: any = {};
    if (filterLoCao) params.idLoCao = filterLoCao;
    lgnlNvlApi.getList(params)
      .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNvlOptions([]));
  }, [filterLoCao]);

  const loadNhomOptions = useCallback(() => {
    const params: any = {};
    if (filterLoCao) params.idLoCao = filterLoCao;
    lgnlNhomNvlApi.getList(params)
      .then((res) => setNhomOptions(Array.isArray(res) ? res : []))
      .catch(() => setNhomOptions([]));
  }, [filterLoCao]);

  useEffect(() => {
    PhieuApi.getDsLoCao()
      .then((res: any) => {
        const list: LoCaoItem[] = Array.isArray(res) ? res : (res?.data ?? []);
        setLoCaoOptions(list.map((item) => ({ label: item.tenLoCao, value: item.id })).filter((o) => Number.isFinite(o.value)));
      })
      .catch(() => setLoCaoOptions([]));
  }, []);

  useEffect(() => { loadSiloOptions(); }, [loadSiloOptions]);
  useEffect(() => { loadNvlOptions(); }, [loadNvlOptions]);
  useEffect(() => { loadNhomOptions(); }, [loadNhomOptions]);
  useEffect(() => {
    lgnlTsMappingApi.getList()
      .then((res) => setTsOptions(Array.isArray(res) ? res : []))
      .catch(() => setTsOptions([]));
  }, []);

  return (
    <Card>
      <Title level={4} style={{ marginBottom: 16 }}>
        Quản lý Silo &amp; Nguyên nhiên vật liệu (LG)
      </Title>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Lọc theo ngày"
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
        defaultActiveKey="silo-master"
        items={[
          {
            key: "silo-master",
            label: "Danh mục Silo",
            children: (
              <SiLoMasterTab
                loCaoOptions={loCaoOptions}
                filterLoCao={filterLoCao}
                tsOptions={tsOptions}
                onDataChange={loadSiloOptions}
              />
            ),
          },
          {
            key: "mapping",
            label: "Mapping Silo ↔ NVL",
            children: (
              <MappingTab
                ngay={filterNgay}
                idCa={filterCa}
                idLoCao={filterLoCao}
                loCaoOptions={loCaoOptions}
                siloOptions={siloOptions}
                nvlOptions={nvlOptions}
              />
            ),
          },
          {
            key: "nhom-nvl",
            label: "Nhóm NVL",
            children: (
              <NhomNvlTab
                loCaoOptions={loCaoOptions}
                filterLoCao={filterLoCao}
                onDataChange={loadNhomOptions}
              />
            ),
          },
          {
            key: "nvl",
            label: "Nguyên nhiên vật liệu",
            children: (
              <NvlTab
                ngay={filterNgay}
                idCa={filterCa}
                idLoCao={filterLoCao}
                loCaoOptions={loCaoOptions}
                nhomOptions={nhomOptions}
                onDataChange={loadNvlOptions}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default QuanLySiLoNVL;
