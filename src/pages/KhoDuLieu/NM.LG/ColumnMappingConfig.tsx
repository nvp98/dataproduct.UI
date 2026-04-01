import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  columnMappingApi,
  columnMappingNhomApi,
} from "../../../services/ColumnMappingApi";
import type {
  ColumnMappingItem,
  ColumnMappingPayload,
  NhomItem,
  NhomPayload,
} from "../../../models/ColumnMappingModel";

// ── constants ─────────────────────────────────────────────────────────────────

const LO_CAO_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  label: `Lò Cao ${n}`,
  value: n,
}));

const FORMAT_OPTIONS = [
  { label: "Không format", value: "" },
  { label: "0,0  — Số nguyên", value: "0,0" },
  { label: "0,0.00  — 2 thập phân", value: "0,0.00" },
  { label: "0,0.000  — 3 thập phân", value: "0,0.000" },
];

type ErrLike = { message?: unknown; Message?: unknown };
const getErrMsg = (err: unknown): string => {
  if (typeof err === "string") return err;
  const e = err as ErrLike;
  if (typeof e?.message === "string") return e.message;
  if (typeof e?.Message === "string") return e.Message;
  return "Có lỗi xảy ra";
};

// ── component ─────────────────────────────────────────────────────────────────

export default function ColumnMappingConfig() {
  // filter
  const [filterForm] = Form.useForm();
  const [filterLoCao, setFilterLoCao] = useState<number | null>(null);

  // nhóm
  const [nhomList, setNhomList] = useState<NhomItem[]>([]);
  const [nhomLoading, setNhomLoading] = useState(false);
  const [selectedNhomId, setSelectedNhomId] = useState<number | null>(null);
  const [nhomModalOpen, setNhomModalOpen] = useState(false);
  const [nhomModalLoading, setNhomModalLoading] = useState(false);
  const [editingNhom, setEditingNhom] = useState<NhomItem | null>(null);
  const [nhomForm] = Form.useForm();
  const [nhomIsLeaf, setNhomIsLeaf] = useState(false);
  const [togglingNhomId, setTogglingNhomId] = useState<number | null>(null);

  // cột con
  const [colList, setColList] = useState<ColumnMappingItem[]>([]);
  const [colLoading, setColLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [colModalOpen, setColModalOpen] = useState(false);
  const [colModalLoading, setColModalLoading] = useState(false);
  const [editingCol, setEditingCol] = useState<ColumnMappingItem | null>(null);
  const [colForm] = Form.useForm();

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchNhom = useCallback(async (loCao?: number | null) => {
    setNhomLoading(true);
    try {
      const res = await columnMappingNhomApi.getAll(loCao);
      setNhomList(Array.isArray(res) ? res : []);
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setNhomLoading(false);
    }
  }, []);

  const fetchCols = useCallback(async (loCao?: number | null) => {
    setColLoading(true);
    try {
      const res = await columnMappingApi.getAll(loCao);
      setColList(Array.isArray(res) ? res : []);
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setColLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNhom(null);
    fetchCols(null);
  }, [fetchNhom, fetchCols]);

  // ── filter ─────────────────────────────────────────────────────────────────

  const applyFilter = (loCao: number | null) => {
    setFilterLoCao(loCao);
    setSelectedNhomId(null);
    fetchNhom(loCao);
    fetchCols(loCao);
  };

  // ── nhóm options cho select ────────────────────────────────────────────────

  const nhomOptions = useMemo(
    () =>
      nhomList.map((n) => ({
        label: `LC${n.loCao} — ${n.tenNhom}`,
        value: n.id,
      })),
    [nhomList]
  );

  // ── CRUD nhóm ──────────────────────────────────────────────────────────────

  const openAddNhom = () => {
    setEditingNhom(null);
    setNhomIsLeaf(false);
    nhomForm.resetFields();
    nhomForm.setFieldsValue({
      loCao: filterLoCao ?? undefined,
      thuTu: nhomList.length + 1,
      isLeaf: false,
      isVisible: true,
    });
    setNhomModalOpen(true);
  };

  const openEditNhom = (record: NhomItem) => {
    setEditingNhom(record);
    const isLeaf = !!record.dataIndex;
    setNhomIsLeaf(isLeaf);
    nhomForm.setFieldsValue({
      ...record,
      isLeaf,
      format: record.format ?? "",
    });
    setNhomModalOpen(true);
  };

  const saveNhom = async () => {
    let vals: Record<string, unknown>;
    try { vals = await nhomForm.validateFields(); } catch { return; }

    setNhomModalLoading(true);
    try {
      const isLeaf = vals.isLeaf as boolean;
      const payload: NhomPayload = {
        loCao: vals.loCao as number,
        tenNhom: (vals.tenNhom as string).trim(),
        thuTu: (vals.thuTu as number) ?? 1,
        isVisible: (vals.isVisible as boolean) ?? true,
        sourceField: isLeaf ? ((vals.sourceField as string)?.trim() || null) : null,
        dataIndex: isLeaf ? ((vals.dataIndex as string)?.trim() || null) : null,
        format: isLeaf ? ((vals.format as string) || null) : null,
      };
      if (editingNhom) {
        await columnMappingNhomApi.update({ ...payload, id: editingNhom.id });
        message.success("Cập nhật nhóm thành công");
      } else {
        await columnMappingNhomApi.create(payload);
        message.success("Tạo nhóm thành công");
      }
      setNhomModalOpen(false);
      setEditingNhom(null);
      nhomForm.resetFields();
      fetchNhom(filterLoCao);
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setNhomModalLoading(false);
    }
  };

  const toggleNhomVisible = async (record: NhomItem) => {
    setTogglingNhomId(record.id);
    try {
      await columnMappingNhomApi.toggleVisible(record.id);
      setNhomList((prev) =>
        prev.map((n) => (n.id === record.id ? { ...n, isVisible: !n.isVisible } : n))
      );
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setTogglingNhomId(null);
    }
  };

  const deleteNhom = async (record: NhomItem) => {
    try {
      await columnMappingNhomApi.delete(record.id);
      message.success(`Đã xóa nhóm "${record.tenNhom}" và toàn bộ cột con`);
      if (selectedNhomId === record.id) setSelectedNhomId(null);
      fetchNhom(filterLoCao);
      fetchCols(filterLoCao);
    } catch (err) {
      message.error(getErrMsg(err));
    }
  };

  // ── CRUD cột con ───────────────────────────────────────────────────────────

  const openAddCol = () => {
    setEditingCol(null);
    colForm.resetFields();
    const defaultNhomId = selectedNhomId ?? (nhomList[0]?.id ?? undefined);
    const siblingCount = colList.filter((c) => c.nhomId === defaultNhomId).length;
    colForm.setFieldsValue({
      nhomId: defaultNhomId,
      thuTu: siblingCount + 1,
      isVisible: true,
    });
    setColModalOpen(true);
  };

  const openEditCol = (record: ColumnMappingItem) => {
    setEditingCol(record);
    colForm.setFieldsValue({
      nhomId: record.nhomId,
      tenCot: record.tenCot,
      dataIndex: record.dataIndex,
      sourceField: record.sourceField,
      thuTu: record.thuTu,
      isVisible: record.isVisible,
      format: record.format ?? "",
    });
    setColModalOpen(true);
  };

  const saveCol = async () => {
    let vals: Record<string, unknown>;
    try { vals = await colForm.validateFields(); } catch { return; }

    setColModalLoading(true);
    try {
      const payload: ColumnMappingPayload = {
        nhomId: vals.nhomId as number,
        tenCot: (vals.tenCot as string).trim(),
        dataIndex: (vals.dataIndex as string).trim(),
        sourceField: (vals.sourceField as string).trim(),
        thuTu: (vals.thuTu as number) ?? 1,
        isVisible: (vals.isVisible as boolean) ?? true,
        format: (vals.format as string) || null,
      };
      if (editingCol) {
        await columnMappingApi.update({ ...payload, id: editingCol.id });
        message.success("Cập nhật cột thành công");
      } else {
        await columnMappingApi.create(payload);
        message.success("Tạo cột thành công");
      }
      setColModalOpen(false);
      setEditingCol(null);
      colForm.resetFields();
      fetchCols(filterLoCao);
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setColModalLoading(false);
    }
  };

  const toggleVisible = async (record: ColumnMappingItem) => {
    setTogglingId(record.id);
    try {
      await columnMappingApi.toggleVisible(record.id);
      setColList((prev) =>
        prev.map((c) => (c.id === record.id ? { ...c, isVisible: !c.isVisible } : c))
      );
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setTogglingId(null);
    }
  };

  const deleteCol = async (record: ColumnMappingItem) => {
    try {
      await columnMappingApi.delete(record.id);
      message.success(`Đã xóa cột "${record.tenCot}"`);
      setColList((prev) => prev.filter((c) => c.id !== record.id));
    } catch (err) {
      message.error(getErrMsg(err));
    }
  };

  // ── dữ liệu cột sau filter nhóm ───────────────────────────────────────────

  const displayCols = useMemo(
    () =>
      selectedNhomId != null
        ? colList.filter((c) => c.nhomId === selectedNhomId)
        : colList,
    [colList, selectedNhomId]
  );

  // ── table columns: nhóm ───────────────────────────────────────────────────

  const nhomTableCols = useMemo(
    () => [
      {
        title: "LC",
        dataIndex: "loCao",
        key: "loCao",
        width: 50,
        render: (v: number) => <Tag color="blue">{v}</Tag>,
      },
      {
        title: "Tên nhóm",
        dataIndex: "tenNhom",
        key: "tenNhom",
        render: (v: string, record: NhomItem) => (
          <Space direction="vertical" size={0}>
            <Typography.Link
              onClick={() =>
                setSelectedNhomId((prev) => (prev === record.id ? null : record.id))
              }
              style={{ fontWeight: selectedNhomId === record.id ? 600 : undefined }}
            >
              {v}
            </Typography.Link>
            {record.dataIndex && (
              <code style={{ fontSize: 10, color: "#888" }}>{record.dataIndex}</code>
            )}
          </Space>
        ),
      },
      {
        title: "#",
        dataIndex: "thuTu",
        key: "thuTu",
        width: 40,
        align: "center" as const,
      },
      {
        title: "Cột",
        key: "count",
        width: 55,
        align: "center" as const,
        render: (_: unknown, record: NhomItem) =>
          record.dataIndex ? (
            <Tag color="cyan">Leaf</Tag>
          ) : (
            <Tag>{colList.filter((c) => c.nhomId === record.id).length}</Tag>
          ),
      },
      {
        title: "Hiện",
        key: "visible",
        width: 55,
        align: "center" as const,
        render: (_: unknown, record: NhomItem) => (
          <Tooltip title={record.isVisible ? "Ẩn nhóm" : "Hiện nhóm"}>
            <Button
              size="small"
              type="link"
              icon={record.isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              loading={togglingNhomId === record.id}
              onClick={() => toggleNhomVisible(record)}
            />
          </Tooltip>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 70,
        render: (_: unknown, record: NhomItem) => (
          <Space size={0}>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditNhom(record)}
            />
            <Popconfirm
              title={
                <span>
                  Xóa nhóm <b>"{record.tenNhom}"</b>?<br />
                  <Typography.Text type="danger" style={{ fontSize: 11 }}>
                    Toàn bộ cột con cũng bị xóa!
                  </Typography.Text>
                </span>
              }
              onConfirm={() => deleteNhom(record)}
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
            >
              <Button size="small" type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colList, selectedNhomId, togglingNhomId]
  );

  // ── table columns: cột con ────────────────────────────────────────────────

  const colTableCols = useMemo(
    () => [
      {
        title: "Nhóm",
        key: "nhom",
        width: 130,
        ellipsis: true,
        render: (_: unknown, r: ColumnMappingItem) => (
          <Tag color="purple">{r.nhom?.tenNhom ?? `#${r.nhomId}`}</Tag>
        ),
        sorter: (a: ColumnMappingItem, b: ColumnMappingItem) =>
          (a.nhom?.tenNhom ?? "").localeCompare(b.nhom?.tenNhom ?? ""),
      },
      {
        title: "Tên cột",
        dataIndex: "tenCot",
        key: "tenCot",
        width: 130,
        ellipsis: true,
      },
      {
        title: "DataIndex",
        dataIndex: "dataIndex",
        key: "dataIndex",
        width: 160,
        render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code>,
      },
      {
        title: "Source Field",
        dataIndex: "sourceField",
        key: "sourceField",
        width: 140,
        render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code>,
      },
      {
        title: "#",
        dataIndex: "thuTu",
        key: "thuTu",
        width: 45,
        align: "center" as const,
        sorter: (a: ColumnMappingItem, b: ColumnMappingItem) => a.thuTu - b.thuTu,
      },
      {
        title: "Format",
        dataIndex: "format",
        key: "format",
        width: 100,
        render: (v: string | null) =>
          v ? <Tag>{v}</Tag> : <span style={{ color: "#ccc" }}>—</span>,
      },
      {
        title: "Hiển thị",
        dataIndex: "isVisible",
        key: "isVisible",
        width: 80,
        align: "center" as const,
        render: (v: boolean) =>
          v ? <Tag color="green">Hiện</Tag> : <Tag>Ẩn</Tag>,
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 130,
        render: (_: unknown, record: ColumnMappingItem) => (
          <Space size={0}>
            <Tooltip title={record.isVisible ? "Ẩn cột" : "Hiện cột"}>
              <Button
                size="small"
                type="link"
                icon={
                  record.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                loading={togglingId === record.id}
                onClick={() => toggleVisible(record)}
              />
            </Tooltip>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditCol(record)}
            />
            <Popconfirm
              title={`Xóa cột "${record.tenCot}"?`}
              onConfirm={() => deleteCol(record)}
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
            >
              <Button
                size="small"
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [togglingId]
  );

  // ── render ────────────────────────────────────────────────────────────────

  const selectedNhomName =
    nhomList.find((n) => n.id === selectedNhomId)?.tenNhom ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Filter bar */}
      <Card size="small">
        <Form form={filterForm} layout="inline">
          <Form.Item name="loCao" label="Lò Cao">
            <Select
              allowClear
              placeholder="Tất cả"
              options={LO_CAO_OPTIONS}
              style={{ width: 140 }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                onClick={() =>
                  applyFilter(filterForm.getFieldValue("loCao") ?? null)
                }
              >
                Lọc
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  filterForm.resetFields();
                  applyFilter(null);
                }}
              >
                Xóa lọc
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={12} align="top">

        {/* ── Panel nhóm ── */}
        <Col xs={24} lg={7}>
          <Card
            title="Nhóm (cột cha)"
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddNhom}
              >
                Thêm
              </Button>
            }
          >
            <Table
              columns={nhomTableCols}
              dataSource={nhomList}
              rowKey="id"
              loading={nhomLoading}
              size="small"
              pagination={false}
              rowClassName={(r) =>
                r.id === selectedNhomId ? "ant-table-row-selected" : ""
              }
            />
          </Card>
        </Col>

        {/* ── Panel cột con ── */}
        <Col xs={24} lg={17}>
          <Card
            title={
              selectedNhomName ? (
                <Space>
                  <span>Cột của nhóm:</span>
                  <Tag color="purple">{selectedNhomName}</Tag>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => setSelectedNhomId(null)}
                  >
                    Xem tất cả
                  </Button>
                </Space>
              ) : (
                "Danh sách cột"
              )
            }
            size="small"
            extra={
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddCol}
                disabled={nhomList.length === 0}
              >
                Thêm cột
              </Button>
            }
          >
            <Table
              columns={colTableCols}
              dataSource={displayCols}
              rowKey="id"
              loading={colLoading}
              size="small"
              scroll={{ x: 900 }}
              pagination={{
                pageSize: 15,
                showSizeChanger: false,
                showTotal: (t) => `${t} cột`,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Modal nhóm ── */}
      <Modal
        title={editingNhom ? "Cập nhật nhóm" : "Thêm nhóm mới"}
        open={nhomModalOpen}
        onCancel={() => { setNhomModalOpen(false); setEditingNhom(null); nhomForm.resetFields(); }}
        onOk={saveNhom}
        confirmLoading={nhomModalLoading}
        destroyOnClose
        width={440}
      >
        <Form form={nhomForm} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="loCao"
                label="Lò Cao"
                rules={[{ required: true, message: "Bắt buộc" }]}
              >
                <Select options={LO_CAO_OPTIONS} placeholder="Chọn lò cao" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="thuTu"
                label="Thứ tự"
                rules={[{ required: true, message: "Bắt buộc" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tenNhom"
            label="Tên nhóm"
            rules={[{ required: true, message: "Bắt buộc" }]}
            tooltip="Tiêu đề nhóm (cột cha), VD: Quặng thiêu kết"
          >
            <Input placeholder="VD: Quặng thiêu kết" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="isLeaf" label="Loại nhóm">
                <Radio.Group
                  onChange={(e) => setNhomIsLeaf(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value={false}>Nhóm (có cột con)</Radio.Button>
                  <Radio.Button value={true}>Cột độc lập</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="isVisible" label="Hiển thị" valuePropName="checked">
                <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
              </Form.Item>
            </Col>
          </Row>

          {nhomIsLeaf && (
            <>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="dataIndex"
                    label="DataIndex"
                    rules={[{ required: true, message: "Bắt buộc" }]}
                    tooltip="Key trong Ant Design Table, VD: soMe"
                  >
                    <Input placeholder="VD: soMe" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sourceField"
                    label="Source Field"
                    rules={[{ required: true, message: "Bắt buộc" }]}
                    tooltip="Tên trường trong dữ liệu nguồn, VD: SoMe"
                  >
                    <Input placeholder="VD: SoMe" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="format" label="Format">
                <Select
                  allowClear
                  placeholder="Không format"
                  options={FORMAT_OPTIONS}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* ── Modal cột con ── */}
      <Modal
        title={editingCol ? "Cập nhật cột" : "Thêm cột mới"}
        open={colModalOpen}
        onCancel={() => { setColModalOpen(false); setEditingCol(null); colForm.resetFields(); }}
        onOk={saveCol}
        confirmLoading={colModalLoading}
        destroyOnClose
        width={500}
      >
        <Form form={colForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="nhomId"
            label="Nhóm"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Select
              options={nhomOptions}
              placeholder="Chọn nhóm"
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="tenCot"
                label="Tên cột"
                rules={[{ required: true, message: "Bắt buộc" }]}
                tooltip="Tiêu đề cột con, VD: Máy"
              >
                <Input placeholder="VD: Máy" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="thuTu"
                label="Thứ tự"
                rules={[{ required: true, message: "Bắt buộc" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="dataIndex"
                label="DataIndex"
                rules={[{ required: true, message: "Bắt buộc" }]}
                tooltip="Key trong Ant Design Table, unique theo nhóm"
              >
                <Input placeholder="VD: quangThieuKet_may" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sourceField"
                label="Source Field"
                rules={[{ required: true, message: "Bắt buộc" }]}
                tooltip="Tên trường trong dữ liệu nguồn"
              >
                <Input placeholder="VD: QuangThieuKet_May" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="format" label="Format">
                <Select
                  allowClear
                  placeholder="Không format"
                  options={FORMAT_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="isVisible" label="Hiển thị" valuePropName="checked">
                <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
