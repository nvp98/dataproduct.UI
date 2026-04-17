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
  Tag,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { MacThepServiceApi, NhaMayEnum } from "../../services/MacThepServiceApi";
import type { MacThep, MacThepPayload } from "../../services/MacThepServiceApi";
import type { ColumnType } from "antd/es/table";

type FilterState = {
  searchKey?: string;
  isLock?: boolean;
};

const QuanLyMacThep = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<MacThep[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<MacThep | null>(null);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    nhaMay = searchForm.getFieldsValue().nhaMay as NhaMayEnum,
    appliedFilters: FilterState = filters
  ) => {
    setLoading(true);
    try {
      const res = await MacThepServiceApi.search({ ...appliedFilters, nhaMay, page, pageSize });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setFilters(appliedFilters);
    } catch {
      message.error("Không thể tải danh sách Mác thép");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    fetchData(1, pagination.pageSize, values.nhaMay as NhaMayEnum, {
      searchKey: values.searchKey?.trim() || undefined,
      isLock: typeof values.isLock === "boolean" ? values.isLock : undefined,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize, undefined, {});
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    modalForm.setFieldsValue({ isLock: false });
    setModalVisible(true);
  };

  const openEditModal = (record: MacThep) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenMacThep: record.tenMacThep,
      isLock: record.isLock ?? false,
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
      const payload: MacThepPayload = {
        tenMacThep: values.tenMacThep.trim(),
        nhaMay: values.nhaMay as NhaMayEnum,
        isLock: values.isLock as boolean,
      } as MacThepPayload;
      setModalLoading(true);
      if (editingRecord) {
        await MacThepServiceApi.update(editingRecord.id, payload);
        message.success("Cập nhật Mác thép thành công");
      } else {
        await MacThepServiceApi.create(payload);
        message.success("Tạo mới Mác thép thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error("Không thể lưu Mác thép");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await MacThepServiceApi.delete(id);
      message.success("Đã xóa Mác thép");
      const nextPage =
        data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa Mác thép");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Tên Mác thép",
        dataIndex: "tenMacThep",
        key: "tenMacThep",
        sorter: (a: MacThep, b: MacThep) => a.tenMacThep.localeCompare(b.tenMacThep),
      },
      {
        title: "Nhà máy",
        dataIndex: "nhaMay",
        key: "nhaMay",
        width: 130,
        render: (v: number) => {
          if (v === NhaMayEnum.HRC1) return <Tag color="blue">HRC1</Tag>;
          if (v === NhaMayEnum.HRC2) return <Tag color="green">HRC2</Tag>;
          return v ?? "-";
        },
        filters: [
          { text: "HRC1", value: NhaMayEnum.HRC1 },
          { text: "HRC2", value: NhaMayEnum.HRC2 },
        ],
        onFilter: (value: number, record: MacThep) => record.nhaMay === value,
      },
      {
        title: "Trạng thái",
        dataIndex: "isLock",
        key: "isLock",
        width: 130,
        render: (v: boolean | null) =>
          v ? <Tag color="red">Đã khóa</Tag> : <Tag color="green">Đang dùng</Tag>,
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        render: (_: unknown, record: MacThep) => (
          <Space>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa Mác thép này?"
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
        title="Quản lý Mác thép"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm Mác thép
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label="Nhà máy" name="nhaMay">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={NhaMayEnum.HRC1}>HRC1</Select.Option>
                  <Select.Option value={NhaMayEnum.HRC2}>HRC2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="Tên mác thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Trạng thái" name="isLock">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={false}>Đang dùng</Select.Option>
                  <Select.Option value={true}>Đã khóa</Select.Option>
                </Select>
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
          columns={columns as unknown as ColumnType<MacThep>[]}
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
        title={editingRecord ? "Cập nhật Mác thép" : "Thêm Mác thép"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item name="nhaMay" label="Nhà máy" rules={[{ required: true, message: "Vui lòng chọn nhà máy" }]}>
            <Select allowClear placeholder="Tất cả">
              <Select.Option value={NhaMayEnum.HRC1}>HRC1</Select.Option>
              <Select.Option value={NhaMayEnum.HRC2}>HRC2</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="tenMacThep"
            label="Tên Mác thép"
            rules={[
              { required: true, message: "Vui lòng nhập tên mác thép" },
              { max: 100, message: "Tối đa 100 ký tự" },
              { whitespace: true, message: "Không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập tên mác thép" />
          </Form.Item>
          <Form.Item name="isLock" label="Trạng thái khóa" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="Đã khóa" unCheckedChildren="Đang dùng" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyMacThep;
