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
import { useCallback, useEffect, useMemo, useState } from "react";
import { MacThepServiceApi, NhaMayEnum } from "../../services/MacThepServiceApi";
import type { MacThep, MacThepMayDucInfo, MacThepPayload, NhomPhanLoaiMacThep } from "../../services/MacThepServiceApi";
import { MayDucServiceApi } from "../../services/MayDucServiceApi";
import type { ColumnType } from "antd/es/table";
import { CommonAutocomplete, type AutocompleteSearchParams } from "../../components/CommonAutocomplete";

type FilterState = {
  searchKey?: string;
  isLock?: boolean;
  idMayDucs?: number[] | null;
  isXacNhan?: boolean | null;
};

const QuanLyMacThep = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [data, setData] = useState<MacThep[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<FilterState>({});
  const [editingRecord, setEditingRecord] = useState<MacThep | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [modalNhaMay, setModalNhaMay] = useState<number | undefined>(undefined);
  const [searchNhaMay, setSearchNhaMay] = useState<number | undefined>(undefined);
  const [modalMayDucOptions, setModalMayDucOptions] = useState<{ value: number; label: string }[]>([]);
  const [searchMayDucOptions, setSearchMayDucOptions] = useState<{ value: number; label: string }[]>([]);
  // const [phanLoaiNhomOptions, setPhanLoaiNhomOptions] = useState<{ value: string }[]>([]);
  // const [phanLoaiNhomLoading, setPhanLoaiNhomLoading] = useState(false);
  // const phanLoaiNhomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadModalMayDucOptions = async (nhaMay?: number, preselected: { value: number; label: string }[] = []) => {
    if (!nhaMay) { setModalMayDucOptions([]); return; }
    const res = await MayDucServiceApi.search({ nhaMay, isLock: false, page: 1, pageSize: 200 });
    const loaded = res.data.map((m) => ({ value: m.id, label: m.tenMayDuc }));
    const loadedIds = new Set(loaded.map((o) => o.value));
    const missing = preselected.filter((p) => !loadedIds.has(p.value));
    setModalMayDucOptions([...missing, ...loaded]);
  };

  const loadSearchMayDucOptions = async (nhaMay?: number) => {
    if (!nhaMay) { setSearchMayDucOptions([]); return; }
    const res = await MayDucServiceApi.search({ nhaMay, isLock: false, page: 1, pageSize: 200 });
    setSearchMayDucOptions(res.data.map((m) => ({ value: m.id, label: m.tenMayDuc })));
  };

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
      idMayDucs: (values.idMayDucs as number[] | null) ?? undefined,
      isXacNhan: typeof values.isXacNhan === "boolean" ? values.isXacNhan : undefined,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchNhaMay(undefined);
    setSearchMayDucOptions([]);
    fetchData(1, pagination.pageSize, undefined, {});
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    modalForm.setFieldsValue({ isLock: false });
    setModalNhaMay(undefined);
    setModalMayDucOptions([]);
    setModalVisible(true);
  };

  const openEditModal = (record: MacThep) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenMacThep: record.tenMacThep,
      nhaMay: record.nhaMay as NhaMayEnum,
      isLock: record.isLock ?? false,
      idMayDucs: record.mayDucs?.map((m) => m.idMayDuc) ?? [],
      idPhanLoaiMacThep: record.id_NhomPhanLoaiMacThep ?? null
    });
    setModalNhaMay(record.nhaMay);
    const preselected = (record.mayDucs ?? []).map((m) => ({
      value: m.idMayDuc,
      label: m.tenMayDuc,
    }));
    setModalMayDucOptions(preselected);
    void loadModalMayDucOptions(record.nhaMay, preselected);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    modalForm.resetFields();
    setEditingRecord(null);
    setModalMayDucOptions([]);
  };

  const searchPhanLoaiNhom = useCallback(
    async (params: AutocompleteSearchParams) => {
      const res = await MacThepServiceApi.getPhanLoaiNhomOptions({
        searchKey: params.searchKey,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,});
      return { data: res.data, totalRecords: res.totalRecords };
    },
    []
  );

  const handleCreateNhomPhanLoaiMacThep = useCallback(
    async (searchText: string): Promise<NhomPhanLoaiMacThep | null> => {
      try {
        const created = await MacThepServiceApi.createNhomPhanLoaiMacThep({
          tenNhom: searchText
        });
        message.success(`Đã tạo nhóm phân loại mác thép "${created.tenNhom}"`);
        return created;
      } catch (e) {
        console.error(e);
        message.error("Không tạo được mác thép");
        return null;
      }
    },
    []
  );

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields();
      const payload: MacThepPayload = {
        tenMacThep: values.tenMacThep.trim(),
        nhaMay: values.nhaMay as NhaMayEnum,
        isLock: values.isLock as boolean,
        idMayDucs: (values.idMayDucs as number[] | null) ?? null,
        id_NhomPhanLoaiMacThep: values.idPhanLoaiMacThep as number ?? null
      };
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
      message.error(error ? (error as Error).message : "Không thể lưu Mác thép");
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleXacNhan = async (record: MacThep) => {
    setTogglingId(record.id);
    const prev = record.isXacNhan;
    setData((d) => d.map((r) => (r.id === record.id ? { ...r, isXacNhan: !prev } : r)));
    try {
      const res = await MacThepServiceApi.toggleXacNhan(record.id);
      setData((d) => d.map((r) => (r.id === record.id ? { ...r, isXacNhan: res.isXacNhan } : r)));
    } catch {
      setData((d) => d.map((r) => (r.id === record.id ? { ...r, isXacNhan: prev } : r)));
      message.error("Không thể cập nhật xác nhận");
    } finally {
      setTogglingId(null);
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
        render: (a: string) => a,
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
        title: "Máy đúc",
        dataIndex: "mayDucs",
        key: "mayDucs",
        width: 500,
        render: (v: MacThepMayDucInfo[] | null) =>
          v?.length ? v.map((m) => <Tag key={m.idMayDuc}>{m.tenMayDuc}</Tag>) : "-",
      },
      {
        title: "Phân loại nhóm",
        dataIndex: "tenNhom",
        key: "tenNhom",
        width: 200,
        render: (v: string) =>
          v,
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
        title: "Xác nhận",
        dataIndex: "isXacNhan",
        key: "isXacNhan",
        width: 120,
        render: (v: boolean | null, record: MacThep) => (
          <Switch
            checked={v === true}
            loading={togglingId === record.id}
            onChange={() => void handleToggleXacNhan(record)}
            checkedChildren="Đã XN"
            unCheckedChildren="Chưa XN"
          />
        ),
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
        <Form
          form={searchForm}
          layout="vertical"
          onValuesChange={(changed: Record<string, unknown>) => {
            if ("nhaMay" in changed) {
              const nm = changed.nhaMay as number | undefined;
              setSearchNhaMay(nm);
              searchForm.setFieldValue("idMayDucs", []);
              void loadSearchMayDucOptions(nm);
            }
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Nhà máy" name="nhaMay">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={NhaMayEnum.HRC1}>HRC1</Select.Option>
                  <Select.Option value={NhaMayEnum.HRC2}>HRC2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item label="Máy đúc" name="idMayDucs">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder={searchNhaMay ? "Chọn máy đúc..." : "Chọn nhà máy trước"}
                  disabled={!searchNhaMay}
                  options={searchMayDucOptions}
                  optionFilterProp="label"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
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
            <Col xs={24} md={4}>
              <Form.Item label="Xác nhận" name="isXacNhan">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={true}>Đã xác nhận</Select.Option>
                  <Select.Option value={false}>Chưa xác nhận</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={3} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
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
        <Form
          layout="vertical"
          form={modalForm}
          onValuesChange={(changed: Record<string, unknown>) => {
            if ("nhaMay" in changed) {
              const nm = changed.nhaMay as number | undefined;
              setModalNhaMay(nm);
              modalForm.setFieldValue("idMayDucs", []);
              void loadModalMayDucOptions(nm);
            }
          }}
        >
          <Form.Item name="nhaMay" label="Nhà máy" rules={[{ required: true, message: "Vui lòng chọn nhà máy" }]}>
            <Select allowClear placeholder="Tất cả">
              <Select.Option value={NhaMayEnum.HRC1}>HRC1</Select.Option>
              <Select.Option value={NhaMayEnum.HRC2}>HRC2</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="idMayDucs" label="Máy đúc" rules={[{ required: true, message: "Vui lòng chọn máy đúc" }]}>
            <Select
              mode="multiple"
              allowClear
              placeholder={modalNhaMay ? "Chọn máy đúc..." : "Chọn nhà máy trước"}
              disabled={!modalNhaMay}
              options={modalMayDucOptions}
              optionFilterProp="label"
              style={{ width: "100%" }}
            />
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
          <Form.Item
            name="idPhanLoaiMacThep"
            label="Nhóm Phân Loại Mác Thép"
            rules={[
              { required: true, message: "Vui lòng nhập tên mác thép" }
            ]}
          >
            <CommonAutocomplete<NhomPhanLoaiMacThep>
              searchApi={searchPhanLoaiNhom}
              mapOption={(item) => ({ value: item.id, label: item.tenNhom })}
              fallbackLabelBuilder={(id) => editingRecord?.tenNhom ?? `Nhóm #${id}`}
              placeholder="Chọn Nhóm mác thép..."
              style={{ width: "100%" }}
              size="small"
              fetchOnMount
              allowCreate
              onCreate={handleCreateNhomPhanLoaiMacThep}
            />
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
