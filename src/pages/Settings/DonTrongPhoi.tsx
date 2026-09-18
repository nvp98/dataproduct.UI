import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import {
  DonTrongPhoiServiceApi,
} from "../../services/DonTrongPhoiServiceApi";
import type { DonTrongPhoi, DonTrongPhoiPayload } from "../../services/DonTrongPhoiServiceApi";
import type { ColumnType } from "antd/es/table";

type FilterState = {
  searchKey?: string;
  mac?: string;
  kichThuoc?: string;
};

const QuanLyDonTrongPhoi = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<DonTrongPhoi[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<DonTrongPhoi | null>(null);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    appliedFilters: FilterState = filters
  ) => {
    setLoading(true);
    try {
      const res = await DonTrongPhoiServiceApi.search({ ...appliedFilters, page, pageSize });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setFilters(appliedFilters);
    } catch {
      message.error("Không thể tải danh sách Đơn trọng phôi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    fetchData(1, pagination.pageSize, {
      searchKey: values.searchKey?.trim() || undefined,
      mac: values.mac?.trim() || undefined,
      kichThuoc: values.kichThuoc?.trim() || undefined,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize, {});
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: DonTrongPhoi) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      macPhoi: record.macPhoi,
      donTrong: record.donTrong,
      mac: record.mac ?? undefined,
      kichThuoc: record.kichThuoc ?? undefined,
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
      const payload: DonTrongPhoiPayload = {
        macPhoi: values.macPhoi.trim(),
        donTrong: values.donTrong as number,
        mac: values.mac?.trim() || null,
        kichThuoc: values.kichThuoc?.trim() || null,
      };
      setModalLoading(true);
      if (editingRecord) {
        await DonTrongPhoiServiceApi.update(editingRecord.id, payload);
        message.success("Cập nhật Đơn trọng phôi thành công");
      } else {
        await DonTrongPhoiServiceApi.create(payload);
        message.success("Tạo mới Đơn trọng phôi thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error("Không thể lưu Đơn trọng phôi");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DonTrongPhoiServiceApi.delete(id);
      message.success("Đã xóa Đơn trọng phôi");
      const nextPage =
        data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa Đơn trọng phôi");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Mác phôi",
        dataIndex: "macPhoi",
        key: "macPhoi",
        sorter: (a: DonTrongPhoi, b: DonTrongPhoi) => a.macPhoi.localeCompare(b.macPhoi),
      },
      {
        title: "Mác",
        dataIndex: "mac",
        key: "mac",
        width: 150,
        render: (v: string | null) => v ?? "-",
      },
      {
        title: "Kích thước",
        dataIndex: "kichThuoc",
        key: "kichThuoc",
        width: 150,
        render: (v: string | null) => v ?? "-",
      },
      {
        title: "Đơn trọng (kg)",
        dataIndex: "donTrong",
        key: "donTrong",
        width: 150,
        render: (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 3 }),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        render: (_: unknown, record: DonTrongPhoi) => (
          <Space>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa bản ghi này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  return (
    <div>
      <Card
        title="Quản lý Đơn trọng phôi"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm mới
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label="Mác phôi" name="searchKey">
                <Input placeholder="Tìm theo mác phôi..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Mác" name="mac">
                <Input placeholder="Tìm theo mác thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Kích thước" name="kichThuoc">
                <Input placeholder="Tìm theo kích thước..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={6} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Lọc
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Xóa lọc
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns as unknown as ColumnType<DonTrongPhoi>[]}
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

      <Modal
        title={editingRecord ? "Cập nhật Đơn trọng phôi" : "Thêm Đơn trọng phôi"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item
            name="macPhoi"
            label="Mác phôi"
            rules={[
              { required: true, message: "Vui lòng nhập mác phôi" },
              { max: 100, message: "Tối đa 100 ký tự" },
              { whitespace: true, message: "Không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập mác phôi" />
          </Form.Item>
          <Form.Item
            name="mac"
            label="Mác"
            rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
          >
            <Input placeholder="Nhập mác thép" />
          </Form.Item>
          <Form.Item
            name="kichThuoc"
            label="Kích thước"
            rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
          >
            <Input placeholder="Ví dụ: 150x150, 160x160..." />
          </Form.Item>
          <Form.Item
            name="donTrong"
            label="Đơn trọng (kg)"
            rules={[
              { required: true, message: "Vui lòng nhập đơn trọng" },
              { type: "number", min: 0, message: "Đơn trọng phải >= 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Nhập đơn trọng"
              min={0}
              precision={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyDonTrongPhoi;
