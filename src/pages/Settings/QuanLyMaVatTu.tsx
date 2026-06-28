import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { Hrc1MaVatTuApi, type Hrc1MaVatTuItem } from "../../services/Hrc1MaVatTuApi";

const { Text } = Typography;

type PasteRow = { tenVatTu: string; maVatTu: string };

const parsePasteText = (text: string): PasteRow[] =>
  text
    .split("\n")
    .map((line) => {
      const cols = line.split("\t");
      return { tenVatTu: (cols[0] ?? "").trim(), maVatTu: (cols[1] ?? "").trim() };
    })
    .filter((item) => item.maVatTu !== "");

const QuanLyMaVatTu = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<Hrc1MaVatTuItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [editingRecord, setEditingRecord] = useState<Hrc1MaVatTuItem | null>(null);

  const [toggleLoading, setToggleLoading] = useState<Record<number, boolean>>({});

  const [pasteVisible, setPasteVisible] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pastePreview, setPastePreview] = useState<PasteRow[]>([]);

  const fetchData = useCallback(async (page = 1, pageSize = 20, searchKey?: string) => {
    setLoading(true);
    try {
      const res = await Hrc1MaVatTuApi.search({ searchKey, page, pageSize });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalCount });
    } catch {
      message.error("Không thể tải danh sách mã vật tư");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    const { searchKey } = searchForm.getFieldsValue();
    fetchData(1, pagination.pageSize, searchKey?.trim());
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize);
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: Hrc1MaVatTuItem) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({ maVatTu: record.maVatTu, tenVatTu: record.tenVatTu ?? "", isLock: record.isLock ?? false });
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    modalForm.resetFields();
    setEditingRecord(null);
  };

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields();
      setModalLoading(true);
      const payload = {
        maVatTu: values.maVatTu.trim(),
        tenVatTu: values.tenVatTu?.trim() || null,
        isLock: values.isLock ?? false,
      };
      if (editingRecord) {
        await Hrc1MaVatTuApi.update(editingRecord.id, payload);
        message.success("Cập nhật mã vật tư thành công");
      } else {
        await Hrc1MaVatTuApi.create(payload);
        message.success("Tạo mới mã vật tư thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      message.error(error ? (error as Error).message : "Không thể lưu");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await Hrc1MaVatTuApi.delete(id);
      message.success("Đã xóa mã vật tư");
      const nextPage = data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa mã vật tư");
    }
  };

  const handleToggleLock = async (record: Hrc1MaVatTuItem, checked: boolean) => {
    setToggleLoading((prev) => ({ ...prev, [record.id]: true }));
    try {
      await Hrc1MaVatTuApi.update(record.id, {
        maVatTu: record.maVatTu,
        tenVatTu: record.tenVatTu ?? null,
        isLock: checked,
      });
      setData((prev) => prev.map((r) => r.id === record.id ? { ...r, isLock: checked } : r));
    } catch {
      message.error("Không thể cập nhật trạng thái");
    } finally {
      setToggleLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const handlePasteTextChange = (val: string) => {
    setPasteText(val);
    setPastePreview(parsePasteText(val));
  };

  const handlePasteConfirm = async () => {
    const items = parsePasteText(pasteText);
    if (items.length === 0) { message.warning("Không có dữ liệu hợp lệ."); return; }
    try {
      setPasteLoading(true);
      const res = await Hrc1MaVatTuApi.bulkCreate(items);
      const parts: string[] = [];
      if (res.created > 0) parts.push(`Tạo mới: ${res.created}`);
      if (res.skipped > 0) parts.push(`Bỏ qua (trùng): ${res.skipped}`);
      message.success(parts.join(" | ") || "Hoàn thành");
      if (res.skipped > 0 && res.skippedItems.length > 0)
        message.warning(`Trùng: ${res.skippedItems.slice(0, 5).join(", ")}${res.skippedItems.length > 5 ? "..." : ""}`);
      setPasteVisible(false);
      setPasteText("");
      setPastePreview([]);
      fetchData(1, pagination.pageSize);
    } catch {
      message.error("Không thể tạo hàng loạt mã vật tư");
    } finally {
      setPasteLoading(false);
    }
  };

  const columns = [
    { title: "Tên vật tư", dataIndex: "tenVatTu", key: "tenVatTu", width: 240 },
    { title: "Mã vật tư", dataIndex: "maVatTu", key: "maVatTu", width: 160 },
    {
      title: "Trạng thái",
      dataIndex: "isLock",
      key: "isLock",
      width: 130,
      render: (v: boolean | null | undefined, record: Hrc1MaVatTuItem) => (
        <Switch
          checked={!!v}
          checkedChildren="Khóa"
          unCheckedChildren="Hoạt động"
          loading={!!toggleLoading[record.id]}
          onChange={(checked) => handleToggleLock(record, checked)}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      render: (_: unknown, record: Hrc1MaVatTuItem) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>Sửa</Button>
          <Popconfirm title="Xác nhận xóa mã vật tư này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Quản lý mã vật tư (HRC1)"
        extra={
          <Space>
            <Button icon={<SnippetsOutlined />} onClick={() => { setPasteVisible(true); setPasteText(""); setPastePreview([]); }}>
              Paste nhiều mã
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm mã vật tư
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="Mã hoặc tên vật tư..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={4} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>Xóa lọc</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            onChange: (page, pageSize) => {
              const { searchKey } = searchForm.getFieldsValue();
              fetchData(page, pageSize, searchKey);
            },
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật mã vật tư" : "Thêm mã vật tư"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item
            name="maVatTu"
            label="Mã vật tư"
            rules={[
              { required: true, message: "Vui lòng nhập mã vật tư" },
              { max: 100, message: "Tối đa 100 ký tự" },
              { whitespace: true, message: "Không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập mã vật tư" />
          </Form.Item>
          <Form.Item name="tenVatTu" label="Tên vật tư">
            <Input placeholder="Nhập tên vật tư" />
          </Form.Item>
          <Form.Item name="isLock" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Khóa" unCheckedChildren="Hoạt động" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Paste nhiều mã vật tư"
        open={pasteVisible}
        onCancel={() => { setPasteVisible(false); setPasteText(""); setPastePreview([]); }}
        onOk={handlePasteConfirm}
        confirmLoading={pasteLoading}
        okText={pastePreview.length > 0 ? `Tạo (${pastePreview.length} mã)` : "Tạo"}
        cancelText="Hủy"
        width={560}
        destroyOnClose
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Paste từ Excel — 2 cột: <strong>Tên vật tư</strong> (cột A) và <strong>Mã vật tư</strong> (cột B).
        </Text>
        <Input.TextArea
          autoFocus
          value={pasteText}
          onChange={(e) => handlePasteTextChange(e.target.value)}
          placeholder={"Tên SP A\tSPA01\nTên SP B\tSPA02"}
          rows={8}
          style={{ fontFamily: "monospace", marginBottom: 12 }}
        />
        {pastePreview.length > 0 && (
          <>
            <Text strong>Xem trước ({pastePreview.length} mã):</Text>
            <Table<PasteRow>
              size="small"
              dataSource={pastePreview.slice(0, 10)}
              rowKey="maVatTu"
              pagination={false}
              style={{ marginTop: 6 }}
              columns={[
                { title: "Tên vật tư", dataIndex: "tenVatTu" },
                { title: "Mã vật tư", dataIndex: "maVatTu", width: 140 },
              ]}
              footer={pastePreview.length > 10
                ? () => <Text type="secondary">... và {pastePreview.length - 10} mã khác</Text>
                : undefined}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default QuanLyMaVatTu;
