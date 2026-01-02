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
  Select,
  Space,
  Switch,
  Table,
  Tag,
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
import dayjs from "dayjs";
import { headerKeyApi } from "../../../services/HeaderKeyApi";
import type {
  HeaderKey,
  HeaderKeyPayload,
  HeaderMappingType,
} from "../../../models/HeaderKeyModel";

type FilterState = {
  searchKey?: string;
  LoaiPhieu?: string;
};

type ErrorLike = {
  message?: unknown;
  Message?: unknown;
};

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const errObj = error as ErrorLike;
    if (typeof errObj.message === "string") {
      return errObj.message;
    }
    if (typeof errObj.Message === "string") {
      return errObj.Message;
    }
  }
  return undefined;
};

const HeaderMapping = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<HeaderKey[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<HeaderKey | null>(null);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    appliedFilters: FilterState = filters
  ) => {
    setLoading(true);
    try {
      const res = await headerKeyApi.search({
        ...appliedFilters,
        page,
        pageSize,
      });
      setData(res.data || []);
      setPagination({
        current: res.page,
        pageSize: res.pageSize,
        total: res.totalRecords,
      });
      setFilters(appliedFilters);
    } catch (err) {
      console.error("Failed to load header keys:", err);
      message.error("Không thể tải danh sách Header Key");
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
    const appliedFilters: FilterState = {
      searchKey: values.searchKey?.trim() || undefined,
    };
    fetchData(1, pagination.pageSize, appliedFilters);
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize, {});
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    modalForm.setFieldsValue({ isActive: true });
    setModalVisible(true);
  };

  const openEditModal = (record: HeaderKey) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenHienThi: record.tenHienThi,
      loaiPhieu: record.loaiPhieu,
      mota: record.mota,
      isActive: record.isActive,
      keyGuid: record.keyGuid,
      thuTu: record.thuTu,
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
      const payload: HeaderKeyPayload = {
        tenHienThi: values.tenHienThi.trim(),
        loaiPhieu: values.loaiPhieu?.trim() || null,
        mota: values.mota?.trim() || null,
        isActive: values.isActive ?? true,
        thuTu: values.thuTu ?? null,
      };
      if (editingRecord?.keyGuid) {
        payload.keyGuid = editingRecord.keyGuid;
      }
      setModalLoading(true);
      if (editingRecord) {
        await headerKeyApi.update(editingRecord.id, payload);
        message.success("Cập nhật Header Key thành công");
      } else {
        await headerKeyApi.create(payload);
        message.success("Tạo mới Header Key thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "errorFields" in error
      ) {
        return;
      }
      console.error("Failed to save header key:", error);
      message.error(getErrorMessage(error) || "Không thể lưu Header Key");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await headerKeyApi.delete(id);
      message.success("Đã xóa Header Key");
      const nextPage =
        data.length === 1 && pagination.current > 1
          ? pagination.current - 1
          : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch (err) {
      console.error("Failed to delete header key:", err);
      message.error(getErrorMessage(err) || "Không thể xóa Header Key");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Tên hiển thị",
        dataIndex: "tenHienThi",
        key: "tenHienThi",
        width: 160,
        ellipsis: true,
        render: (value: string) => value || "-",
      },
      {
        title: "Phụ liệu NM",
        dataIndex: "headerMappings",
        key: "headerMappings",
        width: 250,
        render: (value: HeaderMappingType[]) =>
          value.map((item) => item.tenNguonDuLieu).join("; "),
      },
      {
        title: "Thứ tự",
        dataIndex: "thuTu",
        key: "thuTu",
        width: 60,
        render: (value: number) => value || "-",
      },
      {
        title: "Loại phiếu",
        dataIndex: "loaiPhieu",
        key: "loaiPhieu",
        width: 100,
        render: (value: string) => value || "-",
      },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        key: "isActive",
        width: 140,
        render: (value: boolean) =>
          value ? (
            <Tag color="green">Đang dùng</Tag>
          ) : (
            <Tag color="red">Ngưng</Tag>
          ),
      },
      {
        title: "Ngày tạo",
        dataIndex: "ngayTao",
        key: "ngayTao",
        width: 180,
        render: (value: string | undefined) =>
          value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 150,
        render: (_: unknown, record: HeaderKey) => (
          <Space>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa Header Key này?"
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
        title="Quản lý Header Key"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm Header Key
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="Tên hiển thị..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} style={{ display: "flex" }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
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
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} bản ghi`,
            onChange: (page, pageSize) => fetchData(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật Header Key" : "Thêm Header Key"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item
            name="tenHienThi"
            label="Tên hiển thị"
            rules={[
              { required: true, message: "Vui lòng nhập tên hiển thị" },
              { max: 150, message: "Tối đa 150 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tên hiển thị" />
          </Form.Item>
          <Form.Item name="loaiPhieu" label="Loại phiếu">
            <Select placeholder="Chọn loại phụ liệu" allowClear>
              <Select.Option value="KL">Chất hợp kim hóa</Select.Option>
              <Select.Option value="PG">Phụ gia và chất khử oxy</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="mota" label="Mô tả">
            <Input.TextArea
              rows={3}
              placeholder="Ghi chú thêm (không bắt buộc)"
            />
          </Form.Item>
          <Form.Item
            name="thuTu"
            label="Thứ tự"
            tooltip="Số thứ tự để sắp xếp các phụ liệu khi hiển thị"
          >
            <InputNumber
              min={0}
              type="number"
              placeholder="Nhập số thứ tự"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
            initialValue
          >
            <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngưng" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HeaderMapping;
