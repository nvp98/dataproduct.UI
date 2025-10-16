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
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
} from "antd";
// import PdfMakeExample from "../../components/PdfMakeExample";
import { DeleteTwoTone, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { phoiGiaoNhanApi } from "../../../services/BKPhoiThepApi";
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
  // const editEditorRef = useRef<any>(null); // Ref for TinyMCE editor

  // Thêm state cho bộ lọc ngày
  const [dateRange, setDateRange] = useState<any>(null);

  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await phoiGiaoNhanApi.getData({});
      setData(res as any);

      // setPagination({
      //   current: page,
      //   pageSize: pageSize,
      //   total: res.totalRecords,
      // });
      // setFilters(filters); // lưu filter hiện tại
    } catch (err) {
      console.error("Error fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // fetchData(pagination.current, pagination.pageSize, {
    //   usercode: userObj?.maNV || "",
    // });
    fetchData();
    // setData(mockData);
    // setPagination({
    //   current: 1,
    //   pageSize: 10,
    //   total: mockData.length,
    // });
  }, []);

  // Xử lý khi nhấn nút Lọc
  const handleFilter = () => {
    const filterObj: any = {
      usercode: userObj?.maNV || "",
    };
    if (dateRange && dateRange.length === 2) {
      filterObj.fromDate = dateRange[0].format("YYYY-MM-DD");
      filterObj.toDate = dateRange[1].format("YYYY-MM-DD");
    }
    // fetchData(1, pagination.pageSize, filterObj);
  };
  // const statusConfig: Record<string, { color: string; text: string }> = {
  //   0: { color: "purple", text: "Chờ xử lý" },
  //   1: { color: "pink", text: "Đang xử lý" },
  //   2: { color: "green", text: "Hoàn tất" },
  // };

  // Xử lý khi xóa bộ lọc
  const handleClearFilter = () => {
    setDateRange(null);
    // fetchData(1, pagination.pageSize, {
    //   usercode: userObj?.maNV || "",
    // });
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

  return (
    <div>
      <Card style={{ marginBottom: 16 }} title="SẢN LƯỢNG PHÔI THÉP">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input placeholder="Số phiếu..." allowClear />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              value={dateRange}
              onChange={setDateRange}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleFilter}
            >
              Lọc
            </Button>
          </Col>
          <Col>
            <Button onClick={handleClearFilter}>Xóa bộ lọc</Button>
          </Col>
        </Row>
      </Card>
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
