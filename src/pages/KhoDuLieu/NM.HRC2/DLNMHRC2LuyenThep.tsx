import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  message,
} from "antd";
import { DeleteTwoTone, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { dlnmHRC2Api } from "../../../services/DLNMHRC2Api";

// Mapping giữa Loại BM và Scope
const LOAI_BM_SCOPE_MAPPING: Record<string, number[]> = {
  BOF: [6, 7],
  RH: [1, 2],
  LF: [6],
};

// Danh sách các Loại BM
const LOAI_BM_OPTIONS = [
  { label: "BOF", value: "BOF" },
  { label: "RH", value: "RH" },
  { label: "LF", value: "LF" },
];

// Danh sách Ca (thường là 1, 2, 3)
const CA_OPTIONS = [
  { label: "Ca 1", value: 1 },
  { label: "Ca 2", value: 2 },
];

const DLNMHRC2LuyenThep = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchForm] = Form.useForm();

  // Thêm state cho bộ lọc
  const [filters, setFilters] = useState<any>({
    NgaySX: null,
    Ca: null,
    LoaiBM: null,
    Scope: null,
  });

  // State để lưu danh sách Scope options dựa trên Loại BM đã chọn
  const [scopeOptions, setScopeOptions] = useState<{ label: string; value: number }[]>([]);

  // Xử lý khi thay đổi Loại BM
  const handleLoaiBMChange = (value: string | null) => {
    if (value && LOAI_BM_SCOPE_MAPPING[value]) {
      const scopes = LOAI_BM_SCOPE_MAPPING[value];
      setScopeOptions(scopes.map(scope => ({ label: `${value === 'BOF' ? 'Lò' : 'Khu vực'} ${scope}`, value: scope })));
      // Reset Scope khi đổi Loại BM
      searchForm.setFieldsValue({ Scope: null });
      // Cập nhật filters
      setFilters((prev: any) => ({ ...prev, LoaiBM: value, Scope: null }));
    } else {
      setScopeOptions([]);
      searchForm.setFieldsValue({ Scope: null });
      // Cập nhật filters
      setFilters((prev: any) => ({ ...prev, LoaiBM: null, Scope: null }));
    }
  };

  const fetchData = async (page = 1, pageSize = 10, searchFilters: any = {}) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };

      if (searchFilters.NgaySX) {
        params.NgaySX = dayjs(searchFilters.NgaySX).format("YYYY-MM-DD");
      }
      if (searchFilters.Ca) {
        params.Ca = searchFilters.Ca;
      }
      if (searchFilters.LoaiBM) {
        params.LoaiBM = searchFilters.LoaiBM;
      }
      if (searchFilters.Scope) {
        params.Scope = searchFilters.Scope;
      }
      if (searchFilters.searchText) {
        params.searchText = searchFilters.searchText;
      }
      const res: any = await dlnmHRC2Api.search(params);
      
      // Hỗ trợ cả camelCase và PascalCase từ backend
      const responseData = res?.data || res?.Data || [];
      const totalRecords = res?.totalRecords || res?.TotalRecords || 0;
      const currentPage = res?.page || res?.Page || page;
      const currentPageSize = res?.pageSize || res?.PageSize || pageSize;
      
      setData(responseData);
      setPagination({
        current: currentPage,
        pageSize: currentPageSize,
        total: totalRecords,
      });
    } catch (err) {
      console.error("Error fetch data:", err);
      message.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xử lý khi nhấn nút Lọc
  const handleFilter = () => {
    const values = searchForm.getFieldsValue();
    const newFilters = {
      NgaySX: values.NgaySX ? dayjs(values.NgaySX) : null,
      Ca: values.Ca || null,
      LoaiBM: values.LoaiBM || null,
      Scope: values.Scope || null,
      searchText: values.searchText || null,
    };
    setFilters(newFilters);
    fetchData(1, pagination.pageSize, newFilters);
  };

  // Xử lý khi xóa bộ lọc
  const handleClearFilter = () => {
    searchForm.resetFields();
    setScopeOptions([]);
    const clearedFilters = {
      NgaySX: null,
      Ca: null,
      LoaiBM: null,
      Scope: null,
      searchText: null,
    };
    setFilters(clearedFilters);
    fetchData(1, pagination.pageSize, clearedFilters);
  };

  // Xử lý phân trang
  const handleTableChange = (page: number, pageSize: number) => {
    fetchData(page, pageSize, filters);
  };

  const handleDelete = async (_id: number) => {
    try {
      // await dlnmHRC2Api.delete(id);
      message.success("Đã xóa bản ghi!");
      fetchData(pagination.current, pagination.pageSize, filters);
    } catch (err) {
      console.error("Error delete:", err);
      message.error("Lỗi khi xóa bản ghi");
    }
  };

  const columns = [
    {
      title: "Ngày sản xuất",
      dataIndex: "ngay",
      key: "ngay",
      width: 140,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 80,
    },
    {
      title: "Biểu mẫu",
      dataIndex: "bieuMau",
      key: "bieuMau",
      ellipsis: true,
    },
    {
      title: "Khu vực",
      dataIndex: "scope",
      key: "scope",
      width: 80,
    },
    {
      title: "Mẻ thổi",
      dataIndex: "meThoi",
      key: "meThoi",
      ellipsis: true,
    },
    {
      title: "Mác thép",
      dataIndex: "macThep",
      key: "macThep",
      ellipsis: true,
    },
    {
      title: "O2",
      dataIndex: "o2",
      key: "o2",
      width: 100,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "AR_RH",
      dataIndex: "ar_RH",
      key: "ar_RH",
      width: 100,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "N2",
      dataIndex: "n2",
      key: "n2",
      width: 100,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "AR_BOF",
      dataIndex: "ar_BOF",
      key: "ar_BOF",
      width: 100,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "AR_LF",
      dataIndex: "ar_LF",
      key: "ar_LF",
      width: 100,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "KL Gang lỏng",
      dataIndex: "klGangLong",
      key: "klGangLong",
      width: 120,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "KL Thép phế",
      dataIndex: "klThepPhe",
      key: "klThepPhe",
      width: 120,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      fixed: "right" as const,
      render: (_: unknown, record: any) => (
        <Space>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa bản ghi này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
            />
          </Popconfirm>
          <Button
            type="text"
            icon={<EyeOutlined twoToneColor="#1890ff" />}
            onClick={() => {
              const reportNo = record.reporT_NO || record.REPORT_NO;
              navigate("/dlnmhrc2chitiet", {
                state: { reportNo },
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }} title="Dữ liệu luyện thép HRC2">
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: "100%" }}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="NgaySX" label="Ngày SX">
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="Ca" label="Ca">
                <Select
                  placeholder="Chọn ca"
                  allowClear
                  style={{ width: "100%" }}
                  options={CA_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="LoaiBM" label="Loại BM">
                <Select
                  placeholder="Chọn loại biểu mẫu"
                  allowClear
                  style={{ width: "100%" }}
                  options={LOAI_BM_OPTIONS}
                  onChange={handleLoaiBMChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="Scope" label="Khu vực">
                <Select
                  placeholder="Chọn Khu vực"
                  allowClear
                  style={{ width: "100%" }}
                  options={scopeOptions}
                  disabled={scopeOptions.length === 0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="searchText" label="Tìm kiếm">
                <Input placeholder="Nhập từ khóa tìm kiếm..." allowClear type="string" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleFilter}
                >
                  Lọc
                </Button>
              </Form.Item>
            </Col>
            <Col>
              <Form.Item>
                <Button onClick={handleClearFilter}>Xóa bộ lọc</Button>
              </Form.Item>
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
            onChange: handleTableChange,
            onShowSizeChange: handleTableChange,
          }}
          scroll={{ x: 1500 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={columns.length - 1} align="right">
                <span style={{ fontWeight: 500 }}>
                  Tổng: {pagination.total} bản ghi
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default DLNMHRC2LuyenThep;
