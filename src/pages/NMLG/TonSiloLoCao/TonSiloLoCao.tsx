import LG_BB_TonSiLo from "../../../utils/BM_config/LG_BB_TonSiLo.json";
import { Button, Card, Space, Table, Tag } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";

const TonSiloLoCao = ({ type }: { type?: string }) => {
  const config = LG_BB_TonSiLo;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};

  const fixedFilters = useMemo(
    () => ({ usercode: userObj?.maNV || "" }),
    [userObj?.maNV]
  );

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange } =
    usePhieuSearchList({
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
              return navigate(`/chitiettonsilolocao/${record.idphieu}`);
            }

            if (record.tinhTrang === 0 || record.tinhTrang === 3 || record.tinhTrang === 7) {
              return navigate(`/taophieutonsilolocao/${record.idphieu}`);
            }

            return navigate(`/chitiettonsilolocao/${record.idphieu}`);
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
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
      width: 120,
      ellipsis: true,
    },
     {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 120,
      ellipsis: true,
    },
    
     {
      title: "Lò cao",
      dataIndex: "ca",
      key: "ca",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 190,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTaoId",
      key: "nguoiTaoId",
      width: 200,
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
            onClick={() => navigate(`/chitietbienbantonsilolocao/${record.idphieu}`)}
          />
        </Space>
      ),
    },
  ];

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
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/taophieubienbantonsilolocao")}
            >
              Tạo phiếu mới
            </Button>
          </Space>
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
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: onPageChange,
          }}
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={9} align="right">
                <span style={{ fontWeight: 500 }}>Tổng: {pagination.total} Phiếu</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default TonSiloLoCao;
