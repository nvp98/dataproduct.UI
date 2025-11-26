import HRC2_BB_NauLuyen_BOF from "../../../utils/BM_config/HRC2_BB_NauLuyen_BOF.json";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
// import PdfMakeExample from "../../components/PdfMakeExample";
// import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import {
  DeleteTwoTone,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PhieuApi } from "../../../services/PhieuApi";
// Dữ liệu mẫu

const TieuHaoNauLuyen_BOF = ({ type }: { type?: string }) => {
  const config = HRC2_BB_NauLuyen_BOF;
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

  const fetchData = async (page = 1, pageSize = 10, filters = {}) => {
    setLoading(true);
    try {
      if (type === "viecdentoi") {
        const res = await PhieuApi.getData({
          MaBM: config.code,
          // NguoiDuyetID: userObj.id,
          isCheckDuyet: 1,
          page,
          pageSize,
          ...filters,
        });
        setData(res as any);
      } else {
        const res = await PhieuApi.getData({
          MaBM: config.code,
          // NguoiTaoID: userObj.id,
          page,
          pageSize,
          ...filters,
        });
        setData(res as any);
      }

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
  const statusConfig: Record<string, { color: string; text: string }> = {
    0: { color: "purple", text: "Đang lưu" },
    1: { color: "pink", text: "Đã gửi" },
    2: { color: "blue", text: "Hoàn thành" },
    3: { color: "tomato", text: "Đã thu hồi" },
    4: { color: "yellow", text: "Không xác nhận" },
    5: { color: "green", text: "Chốt" },
    6: { color: "gray", text: "Đang phê duyệt" },
  };

  // Xử lý khi xóa bộ lọc
  const handleClearFilter = () => {
    setDateRange(null);
    // fetchData(1, pagination.pageSize, {
    //   usercode: userObj?.maNV || "",
    // });
  };

  const handleDelete = (key: string) => {
    setLoading(true);
    setTimeout(() => {
      setData((prev) => prev.filter((item) => item.key !== key));
      setLoading(false);
      message.success("Đã xóa ticket!");
    }, 500);
  };
  // const handleEdit = (record: any) => {
  //   console.log("Edit record:", record);
  //   setEditModal({ open: true, record });
  //   editForm.setFieldsValue(record);
  // };

  const handleEditFinish = (values: any) => {
    setData((prev) =>
      prev.map((item) =>
        item.key === editModal.record.key ? { ...item, ...values } : item
      )
    );
    setEditModal({ open: false, record: undefined });
    console.log("Edited values:", values);
    message.success("Đã cập nhật ticket!");
  };

  const columns = [
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: any) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              return navigate("/chitiettieuhaonauluyen_bof", {
                state: {
                  idphieu: record.idphieu,
                  pheduyet: record?.pheDuyet?.[0] ?? null,
                },
              });
            } else {
              return navigate("/taophieutieuhaonauluyen_bof", {
                state: { idphieu: record.idphieu },
              });
            }
          }}
        >
          {text}
        </b>
      ),
      width: 200,
    },
    {
      title: "Quy trình",
      dataIndex: "maBm",
      key: "maBm",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Xưởng sản xuất",
      dataIndex: "xuongId",
      key: "xuongId",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Ngày lập",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 140,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTaoId",
      key: "nguoiTaoId",
      // width: 220,
      ellipsis: true,
    },
    {
      title: "Ngày tạo",
      dataIndex: "ngayTao",
      key: "ngayTao",
      width: 140,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 110,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    // {
    //   title: "Người hỗ trợ",
    //   dataIndex: "userAssigneeName",
    //   key: "userAssigneeName",
    //   width: 150,
    //   render: (assignee: string) =>
    //     assignee || <span style={{ color: "#aaa" }}>-</span>,
    // },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 150,
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
            onConfirm={() => handleDelete(record.key)}
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
              navigate("/chitiettieuhaonauluyen_bof", {
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
      <Card style={{ marginBottom: 16 }} title={config.title}>
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
          {!type && (
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/taophieutieuhaonauluyen_bof")}
              >
                Tạo phiếu mới
              </Button>
            </Col>
          )}
        </Row>
      </Card>
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          // pagination={{
          //   total: data.length,
          //   pageSize: pagination.pageSize,
          //   showSizeChanger: true,
          //   showQuickJumper: true,
          //   showTotal: (total, range) =>
          //     `${range[0]}-${range[1]} của ${total} ticket`,
          // }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            // onChange: (page, pageSize) => fetchData(page, pageSize, filters), // phân trang
          }}
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
        <Form layout="vertical" form={editForm} onFinish={handleEditFinish}>
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

export default TieuHaoNauLuyen_BOF;
