// import { useSelector, useDispatch } from "react-redux";
// import type { RootState } from "../../store";
// import EditableTable from '../../components/CustomTable';
// import DynamicForm from "../../components/DynamicForm";
// import type { JSONSchema7 } from "json-schema";
// import DynamicBM from "../../components/DynamicForm";

// import CTD_BB_Phoinguoi from "../../utils/BM_config/CTD_BB_Phoinguoi.json";
// import CTD_BB_Phoinong from "../../utils/BM_config/CTD_BB_Phoinong.json";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from "antd";
// import PdfMakeExample from "../../components/PdfMakeExample";
import { DeleteTwoTone, EyeOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { phoiGiaoNhanApi } from "../../../services/BKPhoiThepApi";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
// Dữ liệu mẫu

const SanLuongPhoi = ({}: { type?: string }) => {
  // const config = CTD_BB_Phoinong;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  // const [filters, setFilters] = useState<any>({});
  const [pagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [editModal, setEditModal] = useState<{ open: boolean; record?: any }>({
    open: false,
    record: undefined,
  });
  const [editForm] = Form.useForm();
  const [filters, setFilters] = useState<any>({});

  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};

  const fetchData = async (filterParams: any = {}) => {
    setLoading(true);
    try {
      const res = await phoiGiaoNhanApi.getData(filterParams);
      setData(res as any);
    } catch (err) {
      console.error("Error fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xử lý khi nhấn nút Lọc
  const handleFilter = (filterValues: any) => {
    console.log("Filter values from PhieuFilterCard:", filterValues);

    // Có thể cần transform filter values nếu backend API mong đợi format khác
    // Ví dụ: nếu backend muốn fromDate/toDate thay vì ngaySxFrom/ngaySxTo
    const apiParams: any = { ...filterValues };

    // Transform date range nếu cần
    if (filterValues.ngaySxFrom && filterValues.ngaySxTo) {
      apiParams.NgaySX = filterValues.ngaySxFrom;
      // apiParams.NgaySX = filterValues.ngaySxTo;
      // Có thể xóa ngaySxFrom/ngaySxTo nếu backend không cần
      // delete apiParams.ngaySxFrom;
      // delete apiParams.ngaySxTo;
    }

    console.log("API params being sent:", apiParams);
    setFilters(apiParams);
    fetchData(apiParams);
  };

  // Xử lý khi xóa bộ lọc
  const handleClearFilter = () => {
    setFilters({});
    fetchData();
  };

  //   const handleDelete = (key: string) => {
  //     setLoading(true);
  //     setTimeout(() => {
  //       setData((prev) => prev.filter((item) => item.key !== key));
  //       setLoading(false);
  //       message.success("Đã xóa ticket!");
  //     }, 500);
  //   };
  // const handleEdit = (record: any) => {
  //   console.log("Edit record:", record);
  //   setEditModal({ open: true, record });
  //   editForm.setFieldsValue(record);
  // };

  //   const handleEditFinish = (values: any) => {
  //     setData((prev) =>
  //       prev.map((item) =>
  //         item.key === editModal.record.key ? { ...item, ...values } : item
  //       )
  //     );
  //     setEditModal({ open: false, record: undefined });
  //     console.log("Edited values:", values);
  //     message.success("Đã cập nhật ticket!");
  //   };

  const columns = [
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySx",
      key: "ngaySx",
      width: 140,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",

      ellipsis: true,
    },
    {
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",

      ellipsis: true,
    },
    {
      title: "Kích thước",
      dataIndex: "kichThuoc",
      key: "kichThuoc",

      ellipsis: true,
    },
    {
      title: "Chiều dài",
      dataIndex: "chieuDai",
      key: "chieuDai",

      ellipsis: true,
    },
    {
      title: "Mẻ",
      dataIndex: "me",
      key: "me",

      ellipsis: true,
    },
    {
      title: "Mác",
      dataIndex: "mac",
      key: "mac",

      ellipsis: true,
    },
    {
      title: "Mẫu thử",
      dataIndex: "mauThu",
      key: "mauThu",

      ellipsis: true,
    },
    {
      title: "Máy đúc",
      dataIndex: "mayDuc",
      key: "mayDuc",

      ellipsis: true,
    },
    {
      title: "Số thanh",
      dataIndex: "soThanh",
      key: "soThanh",

      ellipsis: true,
    },
    {
      title: "Tổng khối lượng",
      dataIndex: "tongKhoiLuog",
      key: "tongKhoiLuog",

      ellipsis: true,
    },
    {
      title: "Loại phôi",
      dataIndex: "loaiPhoi",
      key: "loaiPhoi",
      ellipsis: true,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      render: (_: any, record: any) => (
        <Space>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa ticket này?"
            okText="Xóa"
            cancelText="Hủy"
            // onConfirm={() => handleDelete(record.key)}
          >
            <Button
              type="text"
              icon={<DeleteTwoTone twoToneColor="#ff4d4f" />}
            />
          </Popconfirm>
          <Button
            type="text"
            icon={<EyeOutlined twoToneColor="#1890ff" />}
            onClick={() =>
              navigate("/chitietphieuphoinong", {
                state: { idphieu: record.idphieu },
              })
            }
          />
        </Space>
      ),
    },
  ];

  // Config cho các filter fields
  const filterFieldsConfig: FilterFieldConfig[] = [
    {
      key: "ngaySx",
      label: "Ngày sản xuất",
      type: "dateRange",
      placeholder: "Khoảng ngày",
    },
    {
      key: "ca",
      label: "Ca",
      type: "select",
      placeholder: "Chọn ca",
      options: [
        { label: "Ca ngày (1)", value: 1 },
        { label: "Ca đêm (2)", value: 2 },
      ],
    },
    {
      key: "kip",
      label: "Kíp",
      type: "text",
      placeholder: "Nhập kíp...",
    },
    {
      key: "mac",
      label: "Mác",
      type: "text",
      placeholder: "Nhập mác...",
    },
    {
      key: "mayDuc",
      label: "Máy đúc",
      type: "text",
      placeholder: "Nhập máy đúc...",
    },
    {
      key: "loaiPhoi",
      label: "Loại phôi",
      type: "text",
      placeholder: "Nhập loại phôi...",
    },
  ];

  return (
    <div>
      <PhieuFilterCard
        title="SẢN LƯỢNG PHÔI THÉP"
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
      />
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          //   pagination={{
          //     total: data.length,
          //     pageSize: pagination.pageSize,
          //     showSizeChanger: true,
          //     showQuickJumper: true,
          //     showTotal: (total, range) =>
          //       `${range[0]}-${range[1]} của ${total} ticket`,
          //   }}
          //   pagination={{
          //     current: pagination.current,
          //     pageSize: pagination.pageSize,
          //     total: pagination.total,
          //     // onChange: (page, pageSize) => fetchData(page, pageSize, filters), // phân trang
          //   }}
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={9} align="right">
                <span style={{ fontWeight: 500 }}>
                  Tổng: {pagination.total} Phiếu
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
      <Modal
        title={
          editModal.record
            ? `Chỉnh sửa: ${editModal.record.soPhieu}`
            : "Chỉnh sửa"
        }
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, record: undefined })}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            name="soPhieu"
            label="Số phiếu"
            rules={[{ required: true }]}
          >
            <Input placeholder="Nhập số phiếu" />
          </Form.Item>
          <Form.Item
            name="quyTrinh"
            label="Quy trình"
            rules={[{ required: true }]}
          >
            <Input placeholder="Nhập quy trình" />
          </Form.Item>
          <Form.Item name="kip" label="Kíp" rules={[{ required: true }]}>
            <Input placeholder="Nhập kíp" />
          </Form.Item>
          <Form.Item
            name="xuong"
            label="Xưởng sản xuất"
            rules={[{ required: true }]}
          >
            <Input placeholder="Nhập xưởng" />
          </Form.Item>
          <Form.Item
            name="nguoiTao"
            label="Người tạo"
            rules={[{ required: true }]}
          >
            <Input placeholder="Nhập người tạo" />
          </Form.Item>
          <Form.Item name="ngaytao" label="Ngày tạo">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="ticketStatus"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "0", label: "Chờ xử lý" },
                { value: "1", label: "Đang xử lý" },
                { value: "2", label: "Hoàn tất" },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>
          <Space style={{ display: "flex", justifyContent: "end" }}>
            <Button
              onClick={() => setEditModal({ open: false, record: undefined })}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default SanLuongPhoi;
