import HRC2_BB_NauLuyen_RH from "../../../utils/BM_config/HRC2_BB_NauLuyen_RH.json";
import {
  Button,
  Card,
  Space,
  Table,
  Tag,
} from "antd";
// import PdfMakeExample from "../../components/PdfMakeExample";
// import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import {
  EyeOutlined,
} from "@ant-design/icons";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
// Dữ liệu mẫu

const TieuHaoNauLuyen_LF = ({ type }: { type?: string }) => {
  const config = HRC2_BB_NauLuyen_RH;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};

  const fixedFilters = useMemo(
    () => ({ usercode: userObj?.maNV || "" }),
    [userObj?.maNV]
  );

  const {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
  } = usePhieuSearchList({
    maBm: config.code as string,
    fixedFilters,
  });

  const statusConfig: Record<string, { color: string; text: string }> = {
    0: { color: "purple", text: "Đang lưu" },
    1: { color: "pink", text: "Đã gửi" },
    2: { color: "blue", text: "Hoàn thành" },
    3: { color: "tomato", text: "Đã thu hồi" },
    4: { color: "yellow", text: "Không xác nhận" },
    5: { color: "green", text: "Chốt" },
    6: { color: "gray", text: "Đang phê duyệt" },
  };

  type TableRecord = SearchPhieuResponseModel & {
    pheDuyet?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const columns = [
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              return navigate("/chitiettieuhaonauluyen_rh", {
                state: {
                  idphieu: record.idphieu,
                  pheduyet: record?.pheDuyet?.[0] ?? null,
                },
              });
            } else {
              return navigate("/taophieutieuhaonauluyen_rh", {
                state: { idphieu: record.idphieu },
              });
            }
          }}
        >
          {text}
        </b>
      ),
      width: 250,
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
      width: 150,
      ellipsis: true,
      render: (value: number) => {
        return value === 1 ? "Ca Ngày" : "Ca Đêm";
      },
    },
    {
      title: "Lò",
      dataIndex: "scope",
      key: "scope",
      width: 220,
      ellipsis: true,
      render: (value: number) => {
        return value === 1 ? "Lò thổi 1" : "Lò thổi 2";
      },
    },
    {
      title: "Ngày lập",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 190,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTaoId",
      key: "nguoiTaoId",
      width: 270,
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 150,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      render: (_: unknown, record: TableRecord) => (
        <Space>
          
          <Button
            type="text"
            icon={<EyeOutlined twoToneColor="#1890ff" />}
            onClick={() =>
              navigate("/chitiettieuhaonauluyen_rh", {
                state: { idphieu: record.idphieu },
              })
            }
          />
        </Space>
      ),
    },
  ];

  // Config cho các filter fields theo model phiếu
  const filterFieldsConfig: FilterFieldConfig[] = [
    {
      key: "soPhieu",
      label: "Số phiếu",
      type: "text",
      placeholder: "Số phiếu...",
    },
    {
      key: "ngaySX",
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
      key: "scope",
      label: "Lò",
      type: "select",
      placeholder: "Chọn lò",
      options: [
        { label: "Lò thổi 1", value: 1 },
        { label: "Lò thổi 2", value: 2 },
      ],
    },
    // {
    //   key: "tinhTrang",
    //   label: "Trạng thái",
    //   type: "select",
    //   placeholder: "Chọn trạng thái",
    //   options: [
    //     { label: "Đang lưu", value: 0 },
    //     { label: "Đã gửi", value: 1 },
    //     { label: "Hoàn thành", value: 2 },
    //     { label: "Đã thu hồi", value: 3 },
    //     { label: "Không xác nhận", value: 4 },
    //     { label: "Chốt", value: 5 },
    //     { label: "Đang phê duyệt", value: 6 },
    //   ],
    // },
  ];

  return (
    <div>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
      />
      <Card>
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
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
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: onPageChange,
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
      {/* <Modal
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
      </Modal> */}
    </div>
  );
};

export default TieuHaoNauLuyen_LF;
