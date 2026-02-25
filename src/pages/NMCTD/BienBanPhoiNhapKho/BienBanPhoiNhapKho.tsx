import CTD_BB_GiaoNhanPhoiNhapKho from "../../../utils/BM_config/CTD_BB_GiaoNhanPhoiNhapKho.json";
import {
  Button,
  Card,
  Space,
  Table,
  Tag,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";

const BienBanPhoiNhapKho = ({ type }: { type?: string }) => {
  const config = CTD_BB_GiaoNhanPhoiNhapKho;
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
            // Nếu là việc đến tôi, luôn mở trang chi tiết
            if (type === "viecdentoi") {
              return navigate(`/chitietbienbanphoinapkho/${record.idphieu}`);
            }
            
            // Nếu phiếu đang ở trạng thái Đang lưu (0), mở trang chỉnh sửa
            if (record.tinhTrang === 0) {
              return navigate(`/taophieubienbanphoinapkho/${record.idphieu}`);
            }
            
            // Các trạng thái khác, mở trang chi tiết
            return navigate(`/chitietbienbanphoinapkho/${record.idphieu}`);
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
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 190,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Máy đúc",
      dataIndex: "mayDuc",
      key: "mayDuc",
      width: 150,
      ellipsis: true,
      render: (value: number) => `Đúc ${value}`,
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
              navigate(`/chitietbienbanphoinapkho/${record.idphieu}`)
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
      key: "kip",
      label: "Kíp",
      type: "select",
      placeholder: "Chọn kíp",
      options: [
        { label: "Kíp A", value: "A" },
        { label: "Kíp B", value: "B" },
        { label: "Kíp C", value: "C" },
      ],
    },
    {
      key: "mayDuc",
      label: "Máy đúc",
      type: "select",
      placeholder: "Chọn máy đúc",
      options: [
        { label: "Đúc 01", value: 1 },
        { label: "Đúc 02", value: 2 },
        { label: "Đúc 03", value: 3 },
      ],
    },
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
      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/taophieubienbanphoinapkho")}
          >
            Tạo phiếu mới
          </Button>
        }
      >
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
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
              <Table.Summary.Cell index={0} colSpan={8} align="right">
                <span style={{ fontWeight: 500 }}>
                  Tổng: {pagination.total} Phiếu
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default BienBanPhoiNhapKho;
