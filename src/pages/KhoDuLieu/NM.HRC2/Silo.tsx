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
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, LinkOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { SiloServiceApi } from "../../../services/SiloServiceApi";
import type { Silo, SiloPayload } from "../../../models/SiloModel";
import { NhaMayEnum as NhaMayEnumValues } from "../../../models/SiloModel";
import SiloMappingModal, { type SiloMappingRecord } from "../../../components/SiloMappingModal";

type FilterState = {
  searchKey?: string;
  scope?: number | null; 
  tinhTrang?: boolean;
  BieuMau?: string;
  nhaMay?: number; 
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

const Silo = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<Silo[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<Silo | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingRecord, setMappingRecord] = useState<SiloMappingRecord | null>(null);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    appliedFilters: FilterState = filters
  ) => {
    setLoading(true);
    try {
      const res = await SiloServiceApi.search({
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
      console.error("Failed to load silos:", err);
      message.error("Không thể tải danh sách Silo");
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
      // scope: values.scope ?? undefined,
      tinhTrang: typeof values.tinhTrang === "boolean" ? values.tinhTrang : undefined,
      BieuMau: values.BieuMau || undefined,
      nhaMay: values.nhaMay || undefined,
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
    modalForm.setFieldsValue({ 
      tinhTrang: true,
      // nhaMay: undefined, // ⭐ Default 0, chưa có option nào
    });
    setModalVisible(true);
  };

  const openEditModal = (record: Silo) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenSilo: record.tenSilo,
      theTich: record.theTich,
      bieuMau: record.bieuMau,
      // scope: record.scope ?? null,
      nhaMay: record.nhaMay,
      tinhTrang: record.tinhTrang,
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
      const payload: SiloPayload = {
        tenSilo: values.tenSilo.trim(),
        theTich: values.theTich, // ⭐ Required, không cần fallback
        bieuMau: values.bieuMau?.trim() || "", // ⭐ Required
        // scope: values.scope ?? null, // ⭐ Nullable - Commented out
        scope: null, // ⭐ Always set to null when scope is hidden
        nhaMay: values.nhaMay, // ⭐ Required, không cần fallback
        tinhTrang: values.tinhTrang ?? true,
      };
      setModalLoading(true);
      if (editingRecord) {
        await SiloServiceApi.update(editingRecord.id, payload);
        message.success("Cập nhật Silo thành công");
      } else {
        await SiloServiceApi.create(payload);
        message.success("Tạo mới Silo thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) {
        return;
      }
      console.error("Failed to save silo:", error);
      message.error(getErrorMessage(error) || "Không thể lưu Silo");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await SiloServiceApi.delete(id);
      message.success("Đã xóa Silo");
      const nextPage =
        data.length === 1 && pagination.current > 1
          ? pagination.current - 1
          : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch (err) {
      console.error("Failed to delete silo:", err);
      message.error(getErrorMessage(err) || "Không thể xóa Silo");
    }
  };

  const openMappingModal = (record: Silo) => {
    setMappingRecord({
      siloId: record.id,
      tenSilo: record.tenSilo,
    });
    setMappingModalOpen(true);
  };

  const handleMappingSuccess = () => {
    // Có thể refresh data nếu cần
    // fetchData(pagination.current, pagination.pageSize);
  };

  const columns = useMemo(
    () => [
      {
        title: "Tên Silo",
        dataIndex: "tenSilo",
        key: "tenSilo",
        width: 200,
        sorter: (a: Silo, b: Silo) => (a.tenSilo || "").localeCompare(b.tenSilo || ""),
        render: (value: string) => value || "-",
      },
      {
        title: "Thể tích",
        dataIndex: "theTich",
        key: "theTich",
        width: 120,
        render: (value: number) => (value ? value.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "-"),
      },
      {
        title: "Biểu mẫu",
        dataIndex: "bieuMau",
        key: "bieuMau",
        width: 120,
        render: (value: string) => value || "-",
      },
      // {
      //   title: "Scope",
      //   dataIndex: "scope",
      //   key: "scope",
      //   width: 100,
      //   render: (value: number | null | undefined) => value ?? "-",
      // },
      {
        title: "Nhà máy",
        dataIndex: "nhaMay",
        key: "nhaMay",
        width: 120,
        render: (value: number) => {
          if (value === NhaMayEnumValues.HRC1) return <Tag color="blue">HRC1</Tag>;
          if (value === NhaMayEnumValues.HRC2) return <Tag color="green">HRC2</Tag>;
          return value ?? "-";
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "tinhTrang",
        key: "tinhTrang",
        width: 120,
        render: (value: boolean) =>
          value ? <Tag color="green">Đang dùng</Tag> : <Tag color="red">Ngưng</Tag>,
      },
      {
        title: "Ngày tạo",
        dataIndex: "ngayTao",
        key: "ngayTao",
        width: 160,
        render: (value: string | undefined) =>
          value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 220,
        render: (_: unknown, record: Silo) => (
          <Space>
            <Button
              size="small"
              type="link"
              icon={<LinkOutlined />}
              onClick={() => openMappingModal(record)}
            >
              Móc nối
            </Button>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa Silo này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                size="small"
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
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
        title="Quản lý Silo"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm Silo
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="Tên silo..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Trạng thái" name="tinhTrang">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={true}>Đang dùng</Select.Option>
                  <Select.Option value={false}>Ngưng</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Biểu mẫu" name="BieuMau">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value="BOF">BOF</Select.Option>
                  <Select.Option value="LF">LF</Select.Option>
                  <Select.Option value="RH">RH</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            {/* <Col xs={24} md={4}>
              <Form.Item label="Scope" name="scope">
                <InputNumber
                  min={0}
                  placeholder="Nhập scope (tùy chọn)"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col> */}
            <Col xs={24} md={4}>
              <Form.Item label="Nhà máy" name="nhaMay">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={NhaMayEnumValues.HRC1}>HRC1</Select.Option>
                  <Select.Option value={NhaMayEnumValues.HRC2}>HRC2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8} style={{ display: "flex" }}>
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

      <Modal
        title={editingRecord ? "Cập nhật Silo" : "Thêm Silo"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item
            name="tenSilo"
            label="Tên Silo"
            rules={[
              { required: true, message: "Vui lòng nhập tên silo" },
              { max: 150, message: "Tối đa 150 ký tự" },
              { whitespace: true, message: "Tên silo không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập tên silo" />
          </Form.Item>
          <Form.Item
            name="nhaMay"
            label="Nhà máy"
            rules={[{ required: true, message: "Vui lòng chọn nhà máy" }]}
          >
            <Select placeholder="Chọn nhà máy">
              <Select.Option value={NhaMayEnumValues.HRC1}>HRC1</Select.Option>
              <Select.Option value={NhaMayEnumValues.HRC2}>HRC2</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="theTich"
            label="Thể tích"
            rules={[
              { required: true, message: "Vui lòng nhập thể tích" },
              { type: "number", min: 0.001, message: "Thể tích phải lớn hơn 0" },
            ]}
          >
            <InputNumber
              min={0}
              step={0.001}
              precision={3}
              placeholder="Nhập thể tích"
              style={{ width: "100%" }}
            />
          </Form.Item>
          
          <Form.Item
            name="bieuMau"
            label="Biểu mẫu"
            rules={[{ required: true, message: "Vui lòng chọn biểu mẫu" }]}
          >
            <Select placeholder="Chọn biểu mẫu">
              <Select.Option value="BOF">BOF</Select.Option>
              <Select.Option value="LF">LF</Select.Option>
              <Select.Option value="RH">RH</Select.Option>
            </Select>
          </Form.Item>
          {/* <Form.Item
            name="scope"
            label="Scope"
            tooltip="Scope là tùy chọn, có thể để trống"
          >
            <InputNumber
              min={0}
              placeholder="Nhập scope (tùy chọn)"
              style={{ width: "100%" }}
            />
          </Form.Item> */}
          
          <Form.Item
            name="tinhTrang"
            label="Trạng thái"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngưng" />
          </Form.Item>
        </Form>
      </Modal>

      <SiloMappingModal
        open={mappingModalOpen}
        record={mappingRecord}
        onSuccess={handleMappingSuccess}
        onCancel={() => {
          setMappingModalOpen(false);
          setMappingRecord(null);
        }}
      />
    </div>
  );
};

export default Silo;
