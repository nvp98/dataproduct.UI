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
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import {
  TKVV_SCOPES,
  TKVV_CA_OPTIONS,
  getTKVVScopeByCode,
} from "../../../utils/constants/TKVV_constant";
import {
  tkvvNvlApi,
  tkvvEmsTagApi,
  tkvvSiloApi,
  tkvvNvlSiloMappingApi,
  tkvvSiloTagMappingApi,
  type TKVVNguyenVatLieuDto,
  type EMSMappingTagDto,
  type TKVVSiloDto,
  type TKVVNvlSiloMappingDto,
  type TKVVSiloTagMappingDto,
} from "../../../services/TKVVApi";

const { Title } = Typography;

const MA_BM_OPTIONS = [
  {
    label: "BB Sản lượng (TKVV_BB_SanLuong)",
    value: BM_CONFIG.TKVV.TKVV_BB_SanLuong,
  },
  {
    label: "BC Sản lượng Chi phí (TKVV_BC_SanLuongChiPhi)",
    value: BM_CONFIG.TKVV.TKVV_BC_SanLuongChiPhi,
  },
];

// Dùng cho NVL, DanhMucCan, page filter — lưu DB dạng code "TK1"
const SCOPE_STRING_OPTIONS = TKVV_SCOPES.map((s) => ({
  label: s.label,
  value: s.code,
}));

// Dùng riêng cho Silo — lưu DB dạng số "1", "2"…
const SILO_SCOPE_OPTIONS = TKVV_SCOPES.map((s) => ({
  label: s.label,
  value: s.scope.toString(),
}));

const siloScopeLabel = (v: string | null) =>
  TKVV_SCOPES.find((s) => s.scope.toString() === v)?.label ?? v ?? "";

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
    const s = TKVV_SCOPES.find((x) => x.code === value);
    if (s) form.setFieldValue("tenScope", s.label);
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
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
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
          {
            title: "STT",
            key: "stt",
            width: 55,
            align: "center",
            render: (_: unknown, __: unknown, i: number) => i + 1,
          },
          { title: "Tên NVL", dataIndex: "tenNVL" },
          { title: "ĐVT", dataIndex: "donViTinh", width: 90, align: "center" },
          {
            title: "Scope",
            dataIndex: "scope",
            width: 100,
            align: "center",
            render: (v: string | null) =>
              v ? <Tag color="blue">{v}</Tag> : null,
          },
          { title: "Tên scope", dataIndex: "tenScope", width: 160 },
          { title: "Thứ tự", dataIndex: "thuTu", width: 80, align: "center" },
          {
            title: "Trạng thái",
            dataIndex: "trangThai",
            width: 110,
            align: "center",
            render: (v: boolean) => (
              <Tag color={v ? "green" : "default"}>
                {v ? "Đang dùng" : "Ngừng"}
              </Tag>
            ),
          },
          { title: "Ghi chú", dataIndex: "ghiChu" },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVNguyenVatLieuDto) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title="Xóa NVL này?"
                  onConfirm={() => handleDelete(record.id)}
                >
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
          <Form.Item
            name="tenNVL"
            label="Tên NVL"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input placeholder="VD: Quặng Vê Viên TP" />
          </Form.Item>
          <Form.Item name="donViTinh" label="Đơn vị tính">
            <Input placeholder="VD: Tấn" />
          </Form.Item>
          <Space style={{ width: "100%" }} size="middle">
            <Form.Item
              name="scope"
              label="Scope (mã khu vực)"
              style={{ width: 200 }}
            >
              <Select
                allowClear
                placeholder="Chọn scope"
                options={SCOPE_STRING_OPTIONS}
                onChange={handleScopeChange}
              />
            </Form.Item>
            <Form.Item name="tenScope" label="Tên scope" style={{ flex: 1 }}>
              <Input placeholder="Tự động điền" />
            </Form.Item>
          </Space>
          <Form.Item name="thuTu" label="Thứ tự hiển thị">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          {editing && (
            <Form.Item
              name="trangThai"
              label="Trạng thái"
              valuePropName="checked"
            >
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

// ─── Tab 2: Quản lý Silo ──────────────────────────────────────────────────────

const SiloTab = () => {
  const [data, setData] = useState<TKVVSiloDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVSiloDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSaving, setPasteSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tkvvSiloApi.getList(
        scopeFilter ? { scope: scopeFilter } : undefined,
      );
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách Silo");
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // scope selector dùng giá trị số ("1","2"...) — khớp với TKVV_Silo.Scope trên DB
  const handleScopeChange = (value: string) => {
    const s = TKVV_SCOPES.find((x) => x.scope.toString() === value);
    form.setFieldValue("tenScope", s?.label ?? "");
    form.setFieldValue("maXuong", s?.code ?? "");
  };

  // Resolve scope từ input tự do: "1" / "2" / "TK1" / "VV2" → chuỗi số "1"-"6" hoặc null
  const resolveScope = (raw: string): string | null => {
    const num = Number(raw);
    if (Number.isInteger(num) && num >= 1 && num <= 6) return num.toString();
    const byCode = getTKVVScopeByCode(raw.toUpperCase());
    if (byCode) return byCode.scope.toString();
    return null;
  };

  const parsePasteRows = (text: string) => {
    const lines = text
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) =>
        l
          .replace(/\s*[|;]\s*/g, "\t")
          .replace(/\s*,\s*/g, "\t")
          .split(/\t+/)
          .map((p) => p.trim()),
      );

    const validRows: Array<{
      scope: string;
      maXuong: string;
      maSilo: string | null;
      tenSilo: string;
      tenScope: string;
    }> = [];
    const errorRows: string[] = [];

    for (const [i, parts] of lines.entries()) {
      const lineNo = i + 1;
      if (parts.length < 2) {
        errorRows.push(`Dòng ${lineNo}: cần ít nhất scope và tên Silo`);
        continue;
      }

      const rawScope = parts[0];
      // 2 cột: scope + tenSilo | 3+ cột: scope + maSilo + tenSilo
      const maSilo = parts.length >= 3 ? parts[1] || null : null;
      const tenSilo = parts.length >= 3 ? parts.slice(2).join(" ") : parts[1];

      const scopeStr = resolveScope(rawScope);
      if (!scopeStr) {
        errorRows.push(
          `Dòng ${lineNo}: scope không hợp lệ (${rawScope}) — dùng 1-6 hoặc TK1/VV1…`,
        );
        continue;
      }
      if (!tenSilo) {
        errorRows.push(`Dòng ${lineNo}: tên Silo trống`);
        continue;
      }
      const scopeInfo = TKVV_SCOPES.find(
        (s) => s.scope.toString() === scopeStr,
      );
      validRows.push({
        scope: scopeStr,
        maXuong: scopeInfo?.code ?? "",
        maSilo,
        tenSilo,
        tenScope: scopeInfo?.label ?? "",
      });
    }

    return { validRows, errorRows };
  };

  const handlePasteSubmit = async () => {
    const { validRows, errorRows } = parsePasteRows(pasteText);
    if (validRows.length === 0) {
      message.error(errorRows[0] || "Không có dòng hợp lệ");
      return;
    }
    setPasteSaving(true);
    try {
      let created = 0;
      const failedRows: string[] = [];
      for (const row of validRows) {
        try {
          await tkvvSiloApi.create({
            scope: row.scope,
            tenScope: row.tenScope,
            maXuong: row.maXuong,
            maSilo: row.maSilo,
            tenSilo: row.tenSilo,
          });
          created++;
        } catch (err: any) {
          failedRows.push(
            `${row.maSilo ?? "?"} ${row.tenSilo}: ${err?.message ?? "lỗi"}`,
          );
        }
      }
      await fetchData();
      setPasteOpen(false);
      setPasteText("");
      const parts = [
        `Đã thêm ${created}/${validRows.length} Silo`,
        errorRows.length ? `Bỏ qua ${errorRows.length} dòng lỗi` : null,
        failedRows.length ? `Lưu thất bại ${failedRows.length} dòng` : null,
      ].filter(Boolean);
      if (errorRows.length || failedRows.length) {
        Modal.warning({
          title: "Kết quả dán nhanh Silo",
          content: (
            <div style={{ maxHeight: 320, overflow: "auto" }}>
              <p>{parts.join(". ")}.</p>
              {!!errorRows.length && (
                <div>
                  <b>Dòng bỏ qua:</b>
                  {errorRows.map((r) => (
                    <div key={r}>{r}</div>
                  ))}
                </div>
              )}
              {!!failedRows.length && (
                <div>
                  <b>Lưu thất bại:</b>
                  {failedRows.map((r) => (
                    <div key={r}>{r}</div>
                  ))}
                </div>
              )}
            </div>
          ),
        });
      } else {
        message.success(parts.join(". "));
      }
    } finally {
      setPasteSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: TKVVSiloDto) => {
    setEditing(record);
    form.setFieldsValue({
      scope: record.scope,
      tenScope: record.tenScope,
      maXuong: record.maXuong,
      maSilo: record.maSilo,
      tenSilo: record.tenSilo,
      ghiChu: record.ghiChu,
      trangThai: record.trangThai,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await tkvvSiloApi.update(editing.id, values);
        message.success("Cập nhật Silo thành công");
      } else {
        await tkvvSiloApi.create(values);
        message.success("Thêm Silo thành công");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu Silo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvSiloApi.delete(id);
      message.success("Đã xóa Silo");
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa Silo");
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space>
          <span style={{ fontWeight: 500 }}>Scope:</span>
          <Select
            allowClear
            placeholder="Tất cả scope"
            style={{ width: 220 }}
            options={SILO_SCOPE_OPTIONS}
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>
        <Space>
          <Button
            onClick={() => {
              setPasteText("");
              setPasteOpen(true);
            }}
          >
            Dán nhanh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm Silo
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        scroll={{ x: 900 }}
        columns={[
          {
            title: "Scope",
            dataIndex: "scope",
            width: 60,
            align: "center",
            render: (v: string | null) =>
              v ? <Tag color="blue">{v}</Tag> : null,
          },
          {
            title: "Tên khu vực",
            dataIndex: "scope",
            key: "tenKhuVuc",
            width: 180,
            render: (v: string | null) => siloScopeLabel(v),
          },
          {
            title: "Mã Silo",
            dataIndex: "maSilo",
            width: 110,
            align: "center",
          },
          { title: "Tên Silo", dataIndex: "tenSilo" },
          { title: "Ghi chú", dataIndex: "ghiChu", ellipsis: true },
          {
            title: "TT",
            dataIndex: "trangThai",
            width: 80,
            align: "center",
            render: (v: boolean) => (
              <Tag color={v ? "green" : "default"}>{v ? "Dùng" : "Ngừng"}</Tag>
            ),
          },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVSiloDto) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title="Xóa Silo này?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* Modal thêm/sửa đơn lẻ */}
      <Modal
        title={editing ? "Sửa Silo" : "Thêm Silo"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical">
          <Space style={{ width: "100%" }}>
            <Form.Item name="scope" label="Scope (số)" style={{ width: 200 }}>
              <Select
                allowClear
                placeholder="VD: 1 = TK1"
                options={SILO_SCOPE_OPTIONS}
                onChange={handleScopeChange}
              />
            </Form.Item>
            <Form.Item name="tenScope" label="Tên scope" style={{ flex: 1 }}>
              <Input placeholder="Tự động điền" />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }}>
            <Form.Item name="maSilo" label="Mã Silo" style={{ width: 160 }}>
              <Input placeholder="VD: SILO_01" />
            </Form.Item>
            <Form.Item
              name="tenSilo"
              label="Tên Silo"
              rules={[{ required: true, message: "Bắt buộc" }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="VD: Silo Quặng TK1 - Ca ngày" />
            </Form.Item>
          </Space>
          {editing && (
            <Form.Item
              name="trangThai"
              label="Trạng thái"
              valuePropName="checked"
            >
              <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngừng" />
            </Form.Item>
          )}
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal dán nhanh nhiều Silo */}
      <Modal
        title="Dán nhanh Silo"
        open={pasteOpen}
        onCancel={() => setPasteOpen(false)}
        onOk={handlePasteSubmit}
        okText="Kiểm tra & thêm"
        confirmLoading={pasteSaving}
        destroyOnClose
        width={680}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Typography.Text>
            Mỗi dòng một Silo theo định dạng: <b>scope — mã silo — tên silo</b>.
            Cột mã silo là tùy chọn (nếu chỉ 2 cột: scope + tên silo). Ngăn cách
            bằng tab, dấu phẩy hoặc dấu chấm phẩy.
          </Typography.Text>
          <Typography.Text type="secondary">
            scope: số <b>1–6</b> hoặc mã <b>TK1, TK2, TK3, TK4, VV1, VV2</b>
          </Typography.Text>
          <Input.TextArea
            rows={12}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "Ví dụ:\n1\tSILO_TK1_01\tSilo Thiêu kết 1 - Ca ngày\n2\tSILO_TK2_01\tSilo TK2\nTK3\t\tSilo TK3 không mã"
            }
          />
        </Space>
      </Modal>
    </div>
  );
};

// ─── Tab 3: NVL ↔ Silo theo Ca ───────────────────────────────────────────────

const NvlSiloMappingTab = ({
  allNvl,
  allSilo,
}: {
  allNvl: TKVVNguyenVatLieuDto[];
  allSilo: TKVVSiloDto[];
}) => {
  const [data, setData] = useState<TKVVNvlSiloMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [nvlFilter, setNvlFilter] = useState<number | undefined>();
  const [siloFilter, setSiloFilter] = useState<number | undefined>();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVNvlSiloMappingDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedNvlScope, setSelectedNvlScope] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tkvvNvlSiloMappingApi.getList({
        ...(nvlFilter ? { nvlId: nvlFilter } : {}),
        ...(siloFilter ? { siloId: siloFilter } : {}),
      });
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách NVL-Silo");
    } finally {
      setLoading(false);
    }
  }, [nvlFilter, siloFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // selectedNvlScope lưu dạng số string ("1","2"...) để khớp với Silo.scope
  const filteredSiloOptions = useMemo(
    () =>
      selectedNvlScope
        ? allSilo.filter((s) => s.scope === selectedNvlScope && s.trangThai)
        : allSilo.filter((s) => s.trangThai),
    [allSilo, selectedNvlScope],
  );

  const handleNvlChange = (nvlId: number) => {
    const nvl = allNvl.find((n) => n.id === nvlId);
    // NVL.scope = code "TK1"; Silo.scope = số "1" → cần chuyển đổi
    const siloScope = nvl?.scope
      ? (getTKVVScopeByCode(nvl.scope)?.scope.toString() ?? null)
      : null;
    setSelectedNvlScope(siloScope);
    form.setFieldValue("siloID", undefined);
  };

  const openCreate = () => {
    setEditing(null);
    setSelectedNvlScope(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: TKVVNvlSiloMappingDto) => {
    setEditing(record);
    // scopeNVL là code "TK1" (từ NVL) → chuyển sang số "1" để lọc Silo
    const siloScope = record.scopeNVL
      ? (getTKVVScopeByCode(record.scopeNVL)?.scope.toString() ?? null)
      : null;
    setSelectedNvlScope(siloScope);
    form.setFieldsValue({
      nguyenVatLieuID: record.nguyenVatLieuID,
      siloID: record.siloID,
      ca: record.ca,
      ngaySX: record.ngaySX ? dayjs(record.ngaySX) : null,
      ghiChu: record.ghiChu,
      trangThai: record.trangThai,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto = {
      ...values,
      ngaySX: values.ngaySX ? dayjs(values.ngaySX).format("YYYY-MM-DD") : "",
    };
    setSaving(true);
    try {
      if (editing) {
        await tkvvNvlSiloMappingApi.update(editing.id, dto);
        message.success("Cập nhật NVL-Silo thành công");
      } else {
        await tkvvNvlSiloMappingApi.create(dto);
        message.success("Thêm NVL-Silo thành công");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvNvlSiloMappingApi.delete(id);
      message.success("Đã xóa");
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa");
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space wrap>
          <span style={{ fontWeight: 500 }}>Lọc NVL:</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả NVL"
            style={{ width: 260 }}
            options={allNvl.map((n) => ({
              label: `[${n.scope ?? "?"}] ${n.tenNVL}`,
              value: n.id,
            }))}
            value={nvlFilter}
            onChange={(v) => setNvlFilter(v)}
          />
          <span style={{ fontWeight: 500 }}>Lọc Silo:</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả Silo"
            style={{ width: 220 }}
            options={allSilo.map((s) => ({
              label: `[${s.scope ?? "?"}] ${s.tenSilo}`,
              value: s.id,
            }))}
            value={siloFilter}
            onChange={(v) => setSiloFilter(v)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          disabled={allNvl.length === 0 || allSilo.length === 0}
        >
          Thêm mapping
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        scroll={{ x: 900 }}
        columns={[
          {
            title: "Khu vực",
            dataIndex: "scopeNVL",
            width: 90,
            align: "center",
            render: (v: string | null) =>
              v ? <Tag color="blue">{v}</Tag> : null,
          },
          { title: "Tên NVL", dataIndex: "tenNVL", width: 200, ellipsis: true },
          {
            title: "Silo",
            key: "silo",
            width: 180,
            render: (_: unknown, r: TKVVNvlSiloMappingDto) =>
              r.maSilo ? `${r.maSilo} — ${r.tenSilo}` : (r.tenSilo ?? ""),
          },
          {
            title: "Ca",
            dataIndex: "ca",
            width: 100,
            align: "center",
            render: (v: number) =>
              v === 1 ? (
                <Tag color="orange">Ca ngày</Tag>
              ) : (
                <Tag color="blue">Ca đêm</Tag>
              ),
          },
          {
            title: "Ngày SX",
            dataIndex: "ngaySX",
            width: 110,
            align: "center",
            render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : ""),
          },
          { title: "Ghi chú", dataIndex: "ghiChu", ellipsis: true },
          {
            title: "TT",
            dataIndex: "trangThai",
            width: 80,
            align: "center",
            render: (v: boolean) => (
              <Tag color={v ? "green" : "default"}>{v ? "Dùng" : "Ngừng"}</Tag>
            ),
          },
          {
            title: "Ngày cập nhật",
            dataIndex: "ngayCapNhat",
            width: 140,
            render: (v: string) =>
              v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "",
          },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVNvlSiloMappingDto) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title="Xóa mapping này?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa NVL-Silo" : "Thêm NVL-Silo"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nguyenVatLieuID"
            label="Nguyên vật liệu"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn NVL"
              options={allNvl.map((n) => ({
                label: `[${n.scope ?? "?"}] ${n.tenNVL}`,
                value: n.id,
              }))}
              onChange={handleNvlChange}
            />
          </Form.Item>
          <Form.Item
            name="siloID"
            label={`Silo${selectedNvlScope ? ` (lọc theo scope ${selectedNvlScope})` : ""}`}
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn Silo"
              options={filteredSiloOptions.map((s) => ({
                label: s.maSilo ? `${s.maSilo} — ${s.tenSilo}` : s.tenSilo,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Space style={{ width: "100%" }}>
            <Form.Item
              name="ca"
              label="Ca"
              rules={[{ required: true, message: "Bắt buộc" }]}
              style={{ width: 160 }}
            >
              <Select options={TKVV_CA_OPTIONS} placeholder="Chọn ca" />
            </Form.Item>
            <Form.Item
              name="ngaySX"
              label="Ngày SX"
              rules={[{ required: true, message: "Bắt buộc" }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          {editing && (
            <Form.Item
              name="trangThai"
              label="Trạng thái"
              valuePropName="checked"
            >
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

// ─── Tab 4: Silo ↔ Tag EMS ───────────────────────────────────────────────────

const SiloTagMappingTab = ({ allSilo }: { allSilo: TKVVSiloDto[] }) => {
  const [data, setData] = useState<TKVVSiloTagMappingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [siloFilter, setSiloFilter] = useState<number | undefined>();
  const [maBMFilter, setMaBMFilter] = useState<string | undefined>();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TKVVSiloTagMappingDto | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tkvvSiloTagMappingApi.getList({
        ...(siloFilter ? { siloId: siloFilter } : {}),
        ...(maBMFilter ? { maBM: maBMFilter } : {}),
      });
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error("Lỗi khi tải danh sách Silo-Tag");
    } finally {
      setLoading(false);
    }
  }, [siloFilter, maBMFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: TKVVSiloTagMappingDto) => {
    setEditing(record);
    form.setFieldsValue({
      siloID: record.siloID,
      maBM: record.maBM,
      loaiDuLieu: record.loaiDuLieu,
      tagIDEMS: record.tagIDEMS,
      tagName: record.tagName,
      tagIDEMS_Ngay: record.tagIDEMS_Ngay,
      tagName_Ngay: record.tagName_Ngay,
      tagIDEMS_Dem: record.tagIDEMS_Dem,
      tagName_Dem: record.tagName_Dem,
      ghiChu: record.ghiChu,
      trangThai: record.trangThai,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await tkvvSiloTagMappingApi.update(editing.id, values);
        message.success("Cập nhật Silo-Tag thành công");
      } else {
        await tkvvSiloTagMappingApi.create(values);
        message.success("Thêm Silo-Tag thành công");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tkvvSiloTagMappingApi.delete(id);
      message.success("Đã xóa");
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể xóa");
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space wrap>
          <span style={{ fontWeight: 500 }}>Silo:</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả Silo"
            style={{ width: 240 }}
            options={allSilo.map((s) => ({
              label: `[${s.scope ?? "?"}] ${s.tenSilo}`,
              value: s.id,
            }))}
            value={siloFilter}
            onChange={(v) => setSiloFilter(v)}
          />
          <span style={{ fontWeight: 500 }}>Mã BM:</span>
          <Select
            allowClear
            placeholder="Tất cả BM"
            style={{ width: 280 }}
            options={MA_BM_OPTIONS}
            value={maBMFilter}
            onChange={(v) => setMaBMFilter(v)}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          disabled={allSilo.length === 0}
        >
          Thêm Silo-Tag
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        size="small"
        scroll={{ x: 1100 }}
        columns={[
          {
            title: "Scope",
            dataIndex: "scopeNVL",
            width: 60,
            align: "center",
            render: (v: string | null) =>
              v ? <Tag color="blue">{v}</Tag> : null,
          },
          {
            title: "Khu vực",
            dataIndex: "scopeNVL",
            key: "tenKhuVuc",
            width: 170,
            render: (v: string | null) => siloScopeLabel(v),
          },
          {
            title: "Tên Silo",
            dataIndex: "tenSilo",
            width: 160,
            ellipsis: true,
          },
          { title: "Mã BM", dataIndex: "maBM", width: 120, ellipsis: true },
          { title: "Loại dữ liệu", dataIndex: "loaiDuLieu", width: 120 },
          {
            title: "Tag EMS (chung)",
            dataIndex: "tagIDEMS",
            width: 120,
            align: "center",
          },
          { title: "Tag Name", dataIndex: "tagName", ellipsis: true },
          {
            title: "Tag ID Ngày",
            dataIndex: "tagIDEMS_Ngay",
            width: 110,
            align: "center",
          },
          {
            title: "Tag ID Đêm",
            dataIndex: "tagIDEMS_Dem",
            width: 110,
            align: "center",
          },
          { title: "Ghi chú", dataIndex: "ghiChu", ellipsis: true },
          {
            title: "TT",
            dataIndex: "trangThai",
            width: 80,
            align: "center",
            render: (v: boolean) => (
              <Tag color={v ? "green" : "default"}>{v ? "Dùng" : "Ngừng"}</Tag>
            ),
          },
          {
            title: "Thao tác",
            key: "action",
            width: 90,
            render: (_: unknown, record: TKVVSiloTagMappingDto) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title="Xóa mapping này?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "Sửa Silo-Tag EMS" : "Thêm Silo-Tag EMS"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="siloID"
            label="Silo"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn Silo"
              options={allSilo.map((s) => ({
                label: `[${s.scope ?? "?"}] ${s.tenSilo}`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Space style={{ width: "100%" }}>
            <Form.Item
              name="maBM"
              label="Mã BM"
              rules={[{ required: true, message: "Bắt buộc" }]}
              style={{ flex: 1 }}
            >
              <Select options={MA_BM_OPTIONS} placeholder="Chọn BM" />
            </Form.Item>
            <Form.Item
              name="loaiDuLieu"
              label="Loại dữ liệu"
              rules={[{ required: true, message: "Bắt buộc" }]}
              style={{ width: 160 }}
            >
              <Input placeholder="VD: KhoiLuongAm" />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }}>
            <Form.Item
              name="tagIDEMS"
              label="Tag ID EMS (chung)"
              style={{ width: 200 }}
            >
              <Input placeholder="Dùng khi chỉ có 1 tag" />
            </Form.Item>
            <Form.Item name="tagName" label="Tag Name" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }}>
            <Form.Item
              name="tagIDEMS_Ngay"
              label="Tag ID EMS (Ca ngày)"
              style={{ width: 200 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="tagName_Ngay"
              label="Tag Name (Ca ngày)"
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }}>
            <Form.Item
              name="tagIDEMS_Dem"
              label="Tag ID EMS (Ca đêm)"
              style={{ width: 200 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="tagName_Dem"
              label="Tag Name (Ca đêm)"
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </Space>
          {editing && (
            <Form.Item
              name="trangThai"
              label="Trạng thái"
              valuePropName="checked"
            >
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

// ─── Tab 5: Danh mục Cân (EMS) ───────────────────────────────────────────────

const DanhMucCanTab = ({ defaultXuong }: { defaultXuong?: string }) => {
  const [data, setData] = useState<EMSMappingTagDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [xuongFilter, setXuongFilter] = useState<string | undefined>(
    defaultXuong,
  );

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
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space>
          <span style={{ fontWeight: 500 }}>Xưởng:</span>
          <Select
            allowClear
            placeholder="Tất cả xưởng"
            style={{ width: 220 }}
            options={SCOPE_STRING_OPTIONS}
            value={xuongFilter}
            onChange={(v) => setXuongFilter(v)}
          />
        </Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchData(xuongFilter)}
        >
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
  const [selectedMaBM, setSelectedMaBM] = useState<string>(
    BM_CONFIG.TKVV.TKVV_BB_SanLuong,
  );
  const [scopeFilter, setScopeFilter] = useState<string | undefined>();
  const [nvlData, setNvlData] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [nvlLoading, setNvlLoading] = useState(false);
  const [allNvl, setAllNvl] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [allSilo, setAllSilo] = useState<TKVVSiloDto[]>([]);

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

  const loadAllNvl = useCallback(async () => {
    try {
      const res = await tkvvNvlApi.getList();
      setAllNvl(Array.isArray(res) ? res : []);
    } catch {
      // silent
    }
  }, []);

  const loadAllSilo = useCallback(async () => {
    try {
      const res = await tkvvSiloApi.getList();
      setAllSilo(Array.isArray(res) ? res : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadNvl();
  }, [loadNvl]);

  useEffect(() => {
    loadAllNvl();
    loadAllSilo();
  }, [loadAllNvl, loadAllSilo]);

  return (
    <Card style={{ margin: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        Quản lý NVL &amp; Silo &amp; Mapping (NM.TKVV)
      </Title>

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
          options={SCOPE_STRING_OPTIONS}
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
            key: "silo",
            label: "Quản lý Silo",
            children: <SiloTab />,
          },
          {
            key: "nvl-silo",
            label: "NVL ↔ Silo theo Ca",
            children: <NvlSiloMappingTab allNvl={allNvl} allSilo={allSilo} />,
          },
          {
            key: "silo-tag",
            label: "Silo ↔ Tag EMS",
            children: <SiloTagMappingTab allSilo={allSilo} />,
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
