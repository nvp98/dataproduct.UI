import HRC2_BBGN_PhoiTam from "../../../utils/BM_config/HRC2_BBGN_PhoiTam.json";
import { Button, Card, Space, Table, Tabs, Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";
import BkHrc2SlabTable from "./BkHrc2SlabTable";

const config = HRC2_BBGN_PhoiTam;

type TableRecord = SearchPhieuResponseModel & {
  pheDuyet?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

/** Danh sách phiếu BBSL — dùng chung cho cả 3 zone */
const PhieuListView = ({ type }: { type?: "taoMoi" | "viecdentoi" | "xemphieu" }) => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};
  const isAdmin = userObj?.role?.includes("admin") || false;

  const currentUserId: number | null =
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userInfoObj?.idTaiKhoan ??
    userInfoObj?.IdTaiKhoan ??
    userObj?.iD_TaiKhoan ??
    userObj?.ID_TaiKhoan ??
    null;

  const fixedFilters = useMemo(
    () => ({
      userId: currentUserId,
      loaiVung: type === "xemphieu" ? 3 : type === "viecdentoi" ? 2 : 1,
    }),
    [currentUserId, type]
  );

  const {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
  } = usePhieuSearchListHRC({ maBm: config.code as string, fixedFilters });

  const statusConfig = PHIEU_STATUS_CONFIG;

  const columns = [
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() =>
            navigate("/chitietbbgnphoitam", {
              state: { idphieu: record.idphieu, pheduyet: record?.pheDuyet?.[0] ?? null },
            })
          }
        >
          {text}
        </b>
      ),
      width: 250,
    },
    {
      title: "Ngày SX",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 140,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 110,
      render: (value: number) => (value === 1 ? "Ca Ngày" : "Ca Đêm"),
    },
    {
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
      width: 90,
      ellipsis: true,
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTaoId",
      key: "nguoiTaoId",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 130,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: unknown, record: TableRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate("/chitietbbgnphoitam", { state: { idphieu: record.idphieu } })
            }
          />
        </Space>
      ),
    },
  ];

  const filterFieldsConfig = useMemo(
    (): FilterFieldConfig[] => [
      { key: "soPhieu", label: "Số phiếu", type: "text", placeholder: "Số phiếu..." },
      { key: "ngaySX", label: "Ngày sản xuất", type: "dateRange", placeholder: "Khoảng ngày" },
      {
        key: "ca",
        label: "Ca",
        type: "select",
        options: [
          { label: "Ca ngày (1)", value: 1 },
          { label: "Ca đêm (2)", value: 2 },
        ],
      },
    ],
    []
  );

  return (
    <div>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        showCreateButton={isAdmin}
        onCreateClick={() => navigate("/form-bbgnphoitam")}
        createButtonText="Tạo phiếu mới"
      />
      <Card>
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
              <Table.Summary.Cell index={0} colSpan={7} align="right">
                <span style={{ fontWeight: 500 }}>Tổng: {pagination.total} Phiếu</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

/** Entry point — phân nhánh theo type */
const BienBanGiaoNhanPhoiTam = ({ type }: { type?: string }) => {
  // viecdentoi / xemphieu: chỉ hiện danh sách phiếu
  if (type == "viecdentoi" || type === "xemphieu") {
    return <PhieuListView type={type} />;
  }

  // /bbgnphoitam: 2 tab
  return (
    <Tabs
      defaultActiveKey="slab"
      type="card"
      style={{ padding: "0 8px" }}
      items={[
        {
          key: "slab",
          label: "Tổng hợp phôi tấm",
          children: <BkHrc2SlabTable />,
        },
        {
          key: "phieu",
          label: "Danh sách phiếu BBSL",
          children: <PhieuListView type="taoMoi" />,
        },
      ]}
    />
  );
};

export default BienBanGiaoNhanPhoiTam;
