import HRC1_STD_NXT from "../../../utils/BM_config/HRC1_STD_NXT.json";
import { Button, Card, Space, Table, Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";
/** Trạng thái phân bổ STD (BE chỉ trả 1 | 2) */
const STD_PHAN_BO_STATUS: Record<string, { text: string; color: string }> = {
  "1": { text: "Chưa hoàn thành phân bổ", color: "pink" },
  "2": { text: "Đã hoàn thành phân bổ", color: "success" },
};

const STD_NhapXuatTon_HRC1 = ({ type }: { type?: string }) => {
  const config = HRC1_STD_NXT;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};

  const currentUserId: number | null =
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userInfoObj?.idTaiKhoan ??
    userInfoObj?.IdTaiKhoan ??
    userObj?.iD_TaiKhoan ??
    userObj?.ID_TaiKhoan ??
    userObj?.idTaiKhoan ??
    userObj?.IdTaiKhoan ??
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
  } = usePhieuSearchListHRC({
    maBm: config.code as string,
    fixedFilters,
    persistKey: true,
  });

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
            if (type === "viecdentoi" || type === "xemphieu") {
              return navigate("/chi_tiet_std_hrc1", {
                state: {
                  idphieu: record.idphieu,
                  pheduyet: record?.pheDuyet?.[0] ?? null,
                },
              });
            } else {
              return navigate("/tao_std_hrc1", {
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
      width: 320,
      ellipsis: true,
    },
    {
      title: "Ngày lập phiếu",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 190,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
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
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
      width: 100,
      ellipsis: true,
      render: (value: string) => {
        return value;
      },
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
      width: 250,
      render: (status: number | string | null | undefined) => {
        const key = String(status ?? "");
        const cfg = STD_PHAN_BO_STATUS[key];
        return (
          <Tag color={cfg?.color ?? "default"}>
            {cfg?.text ?? (status !== null && status !== undefined && status !== "" ? String(status) : "-")}
          </Tag>
        );
      },
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
              navigate("/chi_tiet_std_hrc1", {
                state: { idphieu: record.idphieu },
              })
            }
          />
        </Space>
      ),
    },
  ];

  const filterFieldsConfig: FilterFieldConfig[] = [
    {
      key: "soPhieu",
      label: "Tìm kiếm theo số phiếu",
      type: "text",
      placeholder: "Nhập số phiếu...",
    },
    {
      key: "ngaySX",
      label: "Tìm kiếm theo ngày sản xuất",
      type: "dateRange",
      placeholder: "Nhập khoảng ngày",
    },
    {
      key: "ca",
      label: "Tìm kiếm theo ca",
      type: "select",
      options: [
        { label: "Ca ngày (1)", value: 1 },
        { label: "Ca đêm (2)", value: 2 },
      ],
    }
  ];

  return (
    <div>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        storageKey={true}
        showCreateButton={true}
        onCreateClick={() => {
          navigate("/tao_std_hrc1");
        }}
        createButtonText="Tạo sổ mới"
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
    </div>
  );
};

export default STD_NhapXuatTon_HRC1;
