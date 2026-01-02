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
  DatePicker,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";
import { headerKeyApi } from "../../../services/HeaderKeyApi";
import type {
 
  HeaderKeyPayload,
  HeaderKeyMappingType,
} from "../../../models/HeaderKeyModel";
import HeaderMappingModal from "../../../components/HeaderMapping";
import type { HeaderMappingRecord } from "../../../components/HeaderMapping";

type FilterState = {
  searchKey?: string;
  LoaiPhieu?: string;
  TrangThai?: string;
  IsUsedNXT?: boolean;
  FromDate?: string;
  ToDate?: string;
  SortThuTu?: string;
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
  const [data, setData] = useState<HeaderKeyMapping[]>([]);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingRecord, setMappingRecord] = useState<HeaderMappingRecord | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<HeaderKeyMapping | null>(null);

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
    const range = values.dateRange as [unknown, unknown] | undefined;
    const fromDate =
      Array.isArray(range) && range[0] ? dayjs(range[0] as string).format("YYYY-MM-DD") : undefined;
    const toDate =
      Array.isArray(range) && range[1] ? dayjs(range[1] as string).format("YYYY-MM-DD") : undefined;

    const appliedFilters: FilterState = {
      searchKey: values.searchKey?.trim() || undefined,,
      LoaiPhieu: values.LoaiPhieu || undefined,
      TrangThai: values.TrangThai || undefined,
      IsUsedNXT: typeof values.IsUsedNXT === "boolean" ? values.IsUsedNXT : undefined,
      FromDate: fromDate,
      ToDate: toDate,
      SortThuTu: values.SortThuTu || undefined,
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
    modalForm.setFieldsValue({ isActive: true, isUsedNXT: false });
    setModalVisible(true);
  };

  const openEditModal = (record: HeaderKeyMapping) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenHienThi: record.tenHienThi,
      loaiPhieu: record.loaiPhieu,
      mota: record.mota,
      isActive: record.isActive,
      keyGuid: record.keyGuid,
      thuTu: record.thuTu,
      isUsedNXT: record.isUsedNXT ?? false,
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
        isUsedNXT: values.isUsedNXT ?? false,
      };
      if (editingRecord?.keyGuid) {
        payload.keyGuid = editingRecord.keyGuid;
      }
      setModalLoading(true);
      if (editingRecord) {
        const headerKeyId = editingRecord.iD_HeaderKey;
        if (!headerKeyId || headerKeyId === 0) {
          message.error("Không tìm thấy ID Header Key để cập nhật");
          return;
        }
       
        await headerKeyApi.update(headerKeyId, payload); // editingRecord.id là ID_HeaderKey
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

  const handleDelete = async (id: number | undefined) => {
    if (!id) {
      message.error("Không tìm thấy ID Header Key để xóa");
      return;
    }
    try {
      await headerKeyApi.delete(id); // id là ID_HeaderKey
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

  const openMappingModal = (record: HeaderKeyMapping) => {
    if (!record?.iD_PhuLieu) {
      message.warning("Dòng này không có Phụ liệu NM để móc nối.");
      return;
    }

    const payload: HeaderMappingRecord = {
      idPhuLieu: record.iD_PhuLieu ?? null,
      tenPhuLieu: record.tenPhuLieu || record.tenNguonDuLieu || "",
      tenNguonDuLieu: record.tenPhuLieu || record.tenNguonDuLieu || "",
      idHeaderKey: record.iD_HeaderKey ?? null,
      mappingId: record.mappingId ?? null,
      headerKeyName: record.tenHienThi ?? null,
    };

    setMappingRecord(payload);
    setMappingOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        title: "Phụ liệu NM",
        dataIndex: "tenPhuLieu",
        key: "tenPhuLieu",
        width: 160,
        sorter: (a: HeaderKeyMapping, b: HeaderKeyMapping) =>
          (a.tenPhuLieu || a.tenNguonDuLieu || "").localeCompare(b.tenPhuLieu || b.tenNguonDuLieu || ""),
        render: (_: unknown, record: HeaderKeyMapping) =>
          record.tenPhuLieu || record.tenNguonDuLieu || "-",
      },
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
        sorter: true, // remote sort via API
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
        width: 120,
        render: (_: unknown, record: HeaderKeyMapping) => {
          const hasPhuLieu = !!record.iD_PhuLieu;
          const hasHeaderKey = !!record.iD_HeaderKey;

          // Ưu tiên trạng thái isActive:
          // - false => Ngưng luôn
          // - true  => kiểm tra móc nối
          if (record.isActive === false) {
            return <Tag color="red">Ngưng</Tag>;
          }

          // isActive = true (hoặc null/undefined coi như true để hiển thị "Chưa móc nối" nếu thiếu liên kết)
          if (record.isActive === true) {
            // Đã móc nối: có cả 2
            if (hasPhuLieu && hasHeaderKey) {
              return <Tag color="green">Đang dùng</Tag>;
            }
            return <Tag color="orange">Chưa móc nối</Tag>;
          }

          // Fallback (trường hợp isActive null/undefined): giữ theo logic "móc nối"
          if (hasPhuLieu && hasHeaderKey) return <Tag color="green">Đang dùng</Tag>;
          return <Tag color="orange">Chưa móc nối</Tag>;
        },
      },
      {
        title: "Dùng cho STD NXT",
        dataIndex: "isUsedNXT",
        key: "isUsedNXT",
        width: 100,
        render: (value: boolean | null | undefined) =>
          value ? <Tag color="blue">Có</Tag> : <Tag>Không</Tag>,
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
        width: 180,
        render: (_: unknown, record: HeaderKeyMapping) => (
          <Space>
            <Button
              size="small"
              type="link"
              onClick={() => openMappingModal(record)}
              disabled={!record.iD_PhuLieu}
            >
              Móc nối
            </Button>
            <Button
              size="small"
              type="link"
              icon={<EditOutlined />}
              disabled={!record.iD_HeaderKey}
              onClick={() => openEditModal(record)}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa Header Key này?"
              onConfirm={() => handleDelete(record.iD_HeaderKey ?? undefined)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                size="small"
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={!record.iD_HeaderKey}
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
                <Input placeholder="Tên phụ liệu NM / Header key..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Trạng thái" name="TrangThai">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value="DangDung">Đang dùng</Select.Option>
                  <Select.Option value="ChuaMocNoi">Chưa móc nối</Select.Option>
                  <Select.Option value="Ngung">Ngưng</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Dùng cho STD NXT" name="IsUsedNXT">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={true}>Có dùng</Select.Option>
                  <Select.Option value={false}>Không dùng</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Loại phiếu" name="LoaiPhieu">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value="KL">KL</Select.Option>
                  <Select.Option value="PG">PG</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Khoảng ngày" name="dateRange">
                <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
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
          onChange={(pager: TablePaginationConfig, _tableFilters, sorter: SorterResult<HeaderKeyMapping> | SorterResult<HeaderKeyMapping>[]) => {
            const nextPage = pager?.current ?? 1;
            const nextPageSize = pager?.pageSize ?? pagination.pageSize;

            const nextFilters: FilterState = { ...filters };
            const s = Array.isArray(sorter) ? sorter[0] : sorter;
            if (s?.field === "thuTu") {
              if (s.order === "ascend") nextFilters.SortThuTu = "asc";
              else if (s.order === "descend") nextFilters.SortThuTu = "desc";
              else delete nextFilters.SortThuTu;
            }
            fetchData(nextPage, nextPageSize, nextFilters);
          }}
          rowKey={(record) => {
            if (record.mappingId) return `MAP_${record.mappingId}`;
            if (record.iD_PhuLieu) return `PL_${record.iD_PhuLieu}`;
            if (record.iD_HeaderKey) return `HK_${record.iD_HeaderKey}`;
            // fallback
            return `ROW_${record.tenPhuLieu || record.tenNguonDuLieu || record.tenHienThi || "UNKNOWN"}`;
          }}
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

      <HeaderMappingModal
        open={mappingOpen}
        record={mappingRecord}
        title="Móc nối Phụ liệu NM ↔ Header Key"
        onCancel={() => {
          setMappingOpen(false);
          setMappingRecord(null);
        }}
        onSuccess={() => {
          setMappingOpen(false);
          setMappingRecord(null);
          fetchData(pagination.current, pagination.pageSize);
        }}
      />

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
          <Form.Item
            name="isUsedNXT"
            label="Dùng cho STD NXT"
            valuePropName="checked"
            tooltip="Đánh dấu Header Key này sẽ được tự động chọn làm mặc định khi lọc dữ liệu STD NXT"
          >
            <Switch checkedChildren="Có" unCheckedChildren="Không" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HeaderMapping;
