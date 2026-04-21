import HRC2_BB_NauLuyen_BOF from "../../../utils/BM_config/HRC2_BB_NauLuyen_BOF.json";
import { Button, Card, Space, Table, Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";

const TieuHaoNauLuyen_BOF = ({ type }: { type?: string }) => {
  const config = HRC2_BB_NauLuyen_BOF;
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

  // [API cũ] phân biệt "việc tôi tạo" vs "việc đến tôi" bằng 2 param riêng
  // const fixedFilters = useMemo(() => {
  //   const base: Record<string, string | number | null | undefined> = {
  //     usercode: userObj?.maNV || "",
  //   };
  //   if (type === "viecdentoi") {
  //     base.nguoiDuyetId = currentUserId;
  //   } else {
  //     base.nguoiTaoId = currentUserId;
  //   }
  //   return base;
  // }, [currentUserId, type, userObj?.maNV]);

  // [API mới] dùng userId + loaiVung — backend tách vùng 1 (bắt đầu) / vùng 2 (đến tôi)
  const fixedFilters = useMemo(() => {
    return {
      userId: currentUserId,
      loaiVung: type === "viecdentoi" ? 2 : 1,
    };
  }, [currentUserId, type]);

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
  });

  const statusConfig = PHIEU_STATUS_CONFIG;

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
      title: "Lò thổi",
      dataIndex: "scope",
      key: "scope",
      width: 220,
      ellipsis: true,
      render: (value: number) => {
        return value === 6 ? "Lò thổi 6" : "Lò thổi 7";
      },
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
      width: 130,
      ellipsis: true,
      render: (value: number) => {
        return value === 1 ? "Ca Ngày" : "Ca Đêm";
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
      width: 150,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
   
    // {
    //   title: "Ghi chú",
    //   dataIndex: "note",
    //   key: "note",
    //   width: 150,
    // },

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
              navigate("/chitiettieuhaonauluyen_bof", {
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
      options: [
        { label: "Ca ngày (1)", value: 1 },
        { label: "Ca đêm (2)", value: 2 },
      ],
    },
    {
      key: "scope",
      label: "Lò thổi",
      type: "select",
      options: [
        { label: "Lò thổi 6", value: 6 },
        { label: "Lò thổi 7", value: 7 },
      ],
    },
    // {
    //   key: "tinhTrang",
    //   label: "Trạng thái",
    //   type: "select",
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
        showCreateButton={false}
        onCreateClick={() => {
          navigate("/taophieutieuhaonauluyen_bof");
        }}
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

export default TieuHaoNauLuyen_BOF;
