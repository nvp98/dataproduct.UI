import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
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
import { MaVatTuApi, type MaVatTuItem } from "../../services/MaVatTuApi";

const { Text } = Typography;

const NHA_MAY_OPTIONS = ["HRC1", "HRC2"];

const CONG_DOAN_OPTIONS = [
  { value: "COCDQ1", label: "Cốc - DQ1" },
  { value: "COCDQ2", label: "Cốc - DQ2" },
  { value: "DOLOMITDQ1", label: "Dolomit - DQ1" },
  { value: "DOLOMITDQ2", label: "Dolomit - DQ2" },
  { value: "THIEUKETDQ1", label: "Thiêu kết - DQ1" },
  { value: "THIEUKETDQ2", label: "Thiêu kết - DQ2" },
  { value: "VIATHEP", label: "Vỉa thép >10mm" },
  { value: "VOINUNGLVDDQ1", label: "Vôi nung LVD - DQ1" },
  { value: "VOINUNGLVDDQ2", label: "Vôi nung LVD - DQ2" },
  { value: "VOINUNGLVQ", label: "Vôi nung LVQ" },
  { value: "VEVIENDQ1", label: "Vê viên - DQ1" },
  { value: "VEVIENDQ2", label: "Vê viên - DQ2" },
  { value: "XIHATLOCAOS95", label: "Xi hạt lò cao nghiền mịn - S95" },
  { value: "METHEPHOPCACH", label: "Mẻ thép hợp cách" },
  { value: "DIENDQ1", label: "Điện - DQ1" },
  { value: "DIENDQ2", label: "Điện - DQ2" },
  { value: "GANGDQ1", label: "Gang - DQ1" },
  { value: "GANGDQ2", label: "Gang - DQ2" },
  { value: "HRCDQ1", label: "HRC - DQ1" },
  { value: "HRCDQ2", label: "HRC - DQ2" },
  { value: "PHOIVUONG", label: "Phôi vuông" },
  { value: "PHOITAMDQ1", label: "Phôi tấm - DQ1" },
  { value: "PHOITAMDQ2", label: "Phôi tấm - DQ2" },
  { value: "THEPDAI", label: "Thép dài" },
];

const CONG_DOAN_LABEL_BY_VALUE = new Map(CONG_DOAN_OPTIONS.map((o) => [o.value.toUpperCase(), o.label]));
const CONG_DOAN_VALUE_BY_LABEL = new Map(CONG_DOAN_OPTIONS.map((o) => [o.label.toUpperCase(), o.value]));

const getCongDoanLabel = (value?: string | null) => {
  if (!value) return "";
  return CONG_DOAN_LABEL_BY_VALUE.get(value.toUpperCase()) ?? value;
};

// Khớp text paste (có thể là mã Work Center hoặc tên công đoạn tiếng Việt) về đúng mã lưu trong CongDoan.
const resolveCongDoanValue = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = trimmed.toUpperCase();
  if (CONG_DOAN_LABEL_BY_VALUE.has(key)) return key;
  return CONG_DOAN_VALUE_BY_LABEL.get(key) ?? trimmed;
};

type PasteRow = { congDoan: string; vatTuCode: string; tenVatTu: string; macThep: string };

const parsePasteText = (text: string): PasteRow[] =>
  text
    .split("\n")
    .map((line) => {
      const cols = line.split("\t");
      return {
        congDoan: resolveCongDoanValue(cols[0] ?? ""),
        vatTuCode: (cols[1] ?? "").trim(),
        tenVatTu: (cols[2] ?? "").trim(),
        macThep: (cols[3] ?? "").trim(),
      };
    })
    .filter((item) => item.vatTuCode !== "");

const QuanLyMaVatTu = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<MaVatTuItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [editingRecord, setEditingRecord] = useState<MaVatTuItem | null>(null);
  const [toggleLoading, setToggleLoading] = useState<Record<number, boolean>>({});

  const [pasteVisible, setPasteVisible] = useState(false);
  const [pasteNhaMay, setPasteNhaMay] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pastePreview, setPastePreview] = useState<PasteRow[]>([]);

  const fetchData = useCallback(async (page = 1, pageSize = 20) => {
    const { nhaMay, searchKey } = searchForm.getFieldsValue();
    setLoading(true);
    try {
      const res = await MaVatTuApi.search({
        nhaMay: nhaMay || undefined,
        searchKey: searchKey?.trim() || undefined,
        page,
        pageSize,
      });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalCount });
    } catch {
      message.error("Không thể tải danh sách mã vật tư");
    } finally {
      setLoading(false);
    }
  }, [searchForm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => fetchData(1, pagination.pageSize);

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize);
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: MaVatTuItem) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      nhaMay: record.nhaMay,
      macThep: record.macThep ?? "",
      vatTuCode: record.vatTuCode,
      tenVatTu: record.tenVatTu ?? "",
      isLock: record.isLock ?? false,
      congDoan: record.congDoan ?? "",
      kichThuoc: record.kichThuoc ?? "",
    });
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
        nhaMay: values.nhaMay as string,
        macThep: (values.macThep as string | undefined)?.trim() || null,
        vatTuCode: (values.vatTuCode as string).trim(),
        tenVatTu: (values.tenVatTu as string | undefined)?.trim() || null,
        isLock: (values.isLock as boolean | undefined) ?? false,
        congDoan: (values.congDoan as string | undefined)?.trim() || null,
        kichThuoc: (values.kichThuoc as string | undefined)?.trim() || null,
      };
      if (editingRecord) {
        await MaVatTuApi.update(editingRecord.id, payload);
        message.success("Cập nhật mã vật tư thành công");
      } else {
        await MaVatTuApi.create(payload);
        message.success("Tạo mới mã vật tư thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "errorFields" in error) return;
      message.error(error ? (error as Error).message : "Không thể lưu");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await MaVatTuApi.delete(id);
      message.success("Đã xóa mã vật tư");
      const nextPage = data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa mã vật tư");
    }
  };

  const handleToggleLock = async (record: MaVatTuItem, checked: boolean) => {
    setToggleLoading((prev) => ({ ...prev, [record.id]: true }));
    try {
      await MaVatTuApi.update(record.id, {
        nhaMay: record.nhaMay,
        macThep: record.macThep ?? null,
        vatTuCode: record.vatTuCode,
        tenVatTu: record.tenVatTu ?? null,
        isLock: checked,
        congDoan: record.congDoan ?? null,
        kichThuoc: record.kichThuoc ?? null,
      });
      setData((prev) => prev.map((r) => r.id === record.id ? { ...r, isLock: checked } : r));
    } catch {
      message.error("Không thể cập nhật trạng thái");
    } finally {
      setToggleLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const openPasteModal = () => {
    setPasteNhaMay(null);
    setPasteText("");
    setPastePreview([]);
    setPasteVisible(true);
  };

  const handlePasteTextChange = (val: string) => {
    setPasteText(val);
    setPastePreview(parsePasteText(val));
  };

  const handlePasteConfirm = async () => {
    if (!pasteNhaMay) { message.warning("Vui lòng chọn nhà máy trước."); return; }
    const items = parsePasteText(pasteText);
    if (items.length === 0) { message.warning("Không có dữ liệu hợp lệ."); return; }
    try {
      setPasteLoading(true);
      const res = await MaVatTuApi.bulkCreate(
        items.map((r) => ({
          nhaMay: pasteNhaMay,
          macThep: r.macThep || null,
          vatTuCode: r.vatTuCode,
          tenVatTu: r.tenVatTu || null,
          congDoan: r.congDoan || null,
        }))
      );
      const parts: string[] = [];
      if (res.created > 0) parts.push(`Tạo mới: ${res.created}`);
      if (res.skipped > 0) parts.push(`Bỏ qua (trùng): ${res.skipped}`);
      message.success(parts.join(" | ") || "Hoàn thành");
      if (res.skipped > 0 && res.skippedItems.length > 0)
        message.warning(`Trùng: ${res.skippedItems.slice(0, 5).join(", ")}${res.skippedItems.length > 5 ? "..." : ""}`);
      setPasteVisible(false);
      fetchData(1, pagination.pageSize);
    } catch {
      message.error("Không thể tạo hàng loạt mã vật tư");
    } finally {
      setPasteLoading(false);
    }
  };

  const columns = [
    { title: "Nhà máy", dataIndex: "nhaMay", key: "nhaMay", width: 90 },
    {
      title: "Công đoạn",
      dataIndex: "congDoan",
      key: "congDoan",
      width: 200,
      render: (v: string | null | undefined) => getCongDoanLabel(v),
    },
    { title: "Mã vật tư", dataIndex: "vatTuCode", key: "vatTuCode", width: 150 },
    { title: "Tên vật tư", dataIndex: "tenVatTu", key: "tenVatTu" },
    { title: "Mác thép", dataIndex: "macThep", key: "macThep", width: 160 },
    { title: "Kích thước", dataIndex: "kichThuoc", key: "kichThuoc", width: 150 },
    {
      title: "Trạng thái",
      dataIndex: "isLock",
      key: "isLock",
      width: 130,
      render: (v: boolean | null | undefined, record: MaVatTuItem) => (
        <Switch
          checked={!v}
          checkedChildren="Hoạt động"
          unCheckedChildren="Khóa"
          loading={!!toggleLoading[record.id]}
          onChange={(checked) => handleToggleLock(record, !checked)}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_: unknown, record: MaVatTuItem) => (
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
        title="Quản lý mã vật tư"
        extra={
          <Space>
            <Button icon={<SnippetsOutlined />} onClick={openPasteModal}>
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
            <Col xs={24} md={5}>
              <Form.Item label="Nhà máy" name="nhaMay">
                <Select
                  placeholder="Tất cả"
                  allowClear
                  options={NHA_MAY_OPTIONS.map((v) => ({ value: v, label: v }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={9}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="Mác thép, mã hoặc tên vật tư..." allowClear />
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
            onChange: (page, pageSize) => fetchData(page, pageSize),
          }}
        />
      </Card>

      {/* Modal tạo / sửa */}
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
            name="nhaMay"
            label="Nhà máy"
            rules={[{ required: true, message: "Vui lòng chọn nhà máy" }]}
          >
            <Select
              placeholder="Chọn nhà máy"
              options={NHA_MAY_OPTIONS.map((v) => ({ value: v, label: v }))}
              disabled={!!editingRecord}
            />
          </Form.Item>
          <Form.Item
            name="macThep"
            label="Mác thép"
            rules={[
              { max: 100, message: "Tối đa 100 ký tự" },
              { whitespace: true, message: "Không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập mác thép" disabled={!!editingRecord} />
          </Form.Item>
          <Form.Item name="congDoan" label="Công đoạn">
            <Select
              placeholder="Chọn công đoạn"
              allowClear
              showSearch
              optionFilterProp="label"
              options={CONG_DOAN_OPTIONS}
              disabled={!!editingRecord}
            />
          </Form.Item>
          <Form.Item
            name="vatTuCode"
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
          <Form.Item
            name="kichThuoc"
            label="Kích thước"
            rules={[{ max: 150, message: "Tối đa 150 ký tự" }]}
          >
            <Input placeholder="Nhập kích thước" />
          </Form.Item>
          <Form.Item
            name="isLock"
            label="Trạng thái"
            valuePropName="checked"
            getValueProps={(v) => ({ checked: !v })}
            getValueFromEvent={(checked: boolean) => !checked}
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal paste hàng loạt */}
      <Modal
        title="Paste nhiều mã vật tư"
        open={pasteVisible}
        onCancel={() => setPasteVisible(false)}
        onOk={handlePasteConfirm}
        confirmLoading={pasteLoading}
        okText={pastePreview.length > 0 ? `Tạo ${pastePreview.length} dòng` : "Tạo"}
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong>Nhà máy:</Text>
            <Select
              style={{ width: 140 }}
              placeholder="Chọn nhà máy"
              value={pasteNhaMay}
              onChange={setPasteNhaMay}
              options={NHA_MAY_OPTIONS.map((v) => ({ value: v, label: v }))}
            />
          </div>
          <Text type="secondary">
            Paste từ Excel — 3 hoặc 4 cột: <strong>Công đoạn</strong> (A, mã Work Center hoặc tên) | <strong>Mã vật tư</strong> (B) | <strong>Tên vật tư</strong> (C) | <strong>Mác thép</strong> (D, tùy chọn).
          </Text>
          <Input.TextArea
            autoFocus
            value={pasteText}
            onChange={(e) => handlePasteTextChange(e.target.value)}
            placeholder={"COCDQ1\tVT001\tThan cốc DQ1\nHRCDQ2\tVT002\tThép cuộn Q235B\tQ235B"}
            rows={8}
            style={{ fontFamily: "monospace" }}
          />
          {pastePreview.length > 0 && (
            <>
              <Text strong>Xem trước ({pastePreview.length} dòng):</Text>
              <Table<PasteRow>
                size="small"
                dataSource={pastePreview.slice(0, 10)}
                rowKey={(r) => `${r.congDoan}|${r.vatTuCode}`}
                pagination={false}
                columns={[
                  { title: "Công đoạn", dataIndex: "congDoan", width: 160, render: (v: string) => getCongDoanLabel(v) },
                  { title: "Mã vật tư", dataIndex: "vatTuCode", width: 130 },
                  { title: "Tên vật tư", dataIndex: "tenVatTu" },
                  { title: "Mác thép", dataIndex: "macThep", width: 120 },
                ]}
                footer={
                  pastePreview.length > 10
                    ? () => <Text type="secondary">... và {pastePreview.length - 10} dòng khác</Text>
                    : undefined
                }
              />
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default QuanLyMaVatTu;
