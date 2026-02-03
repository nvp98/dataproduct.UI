import { Button, Card, Space, Table, Tag } from "antd";
// import PdfMakeExample from "../../components/PdfMakeExample";
import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import { EyeOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
// import { PhieuApi } from "../../../services/PhieuApi";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
// Dữ liệu mẫu

const BienBanPhoiNong = ({ type }: { type?: string }) => {
  const config = CTD_BB_Phoinong;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};

  const fixedFilters = useMemo(
    () => ({ usercode: userObj?.maNV || "" }),
    [userObj?.maNV],
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
      width: 180,
      ellipsis: true,
      render: (text: string, record: any) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              // return navigate(`/chitietphieuphoinong/${record.idphieu}`, {
              //   state: {
              //     idphieu: record.idphieu,
              //     pheduyet: record?.pheDuyet?.[0] ?? null,
              //     thongtinphieu: record,
              //   },
              // });
              return navigate("/taophieuphoinong", {
                state: {
                  idphieu: record.idphieu,
                  thongtinphieu: record,
                  type: "viecdentoi",
                  userInfo: userInfoObj,
                },
              });
            } else {
              return navigate("/taophieuphoinong", {
                state: {
                  idphieu: record.idphieu,
                  thongtinphieu: record,
                  type: "tao",
                  userInfo: userInfoObj,
                },
              });
            }
          }}
        >
          {type === "viecdentoi"
            ? text
            : text.split("-").slice(0, -1).join("-") || text}
        </b>
      ),
    },
    {
      title: "Mã BM",
      dataIndex: "maBm",
      key: "maBm",
      ellipsis: true,
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 100,
      ellipsis: true,
      render: (value: number) =>
        value === 1 ? "Ca ngày" : value === 2 ? "Ca đêm" : "-",
    },
    // {
    //   title: "Xưởng sản xuất",
    //   dataIndex: "xuongId",
    //   key: "xuongId",
    //   width: 220,
    //   ellipsis: true,
    // },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 180,
      ellipsis: true,
      render: (value: string, record: any) => {
        if (!value) return "-";
        const ca = record.ca || "";
        const kip = record.kip || "";
        const ngaySX = dayjs(value).format("DD/MM/YYYY");
        return ca ? `${ca}${kip} - ${ngaySX}` : `${ca} - ${ngaySX}`;
      },
    },
    // {
    //   title: "Người tạo",
    //   dataIndex: "nguoiTaoId",
    //   key: "nguoiTaoId",
    //   // width: 220,
    //   ellipsis: true,
    // },
    {
      title: "Ngày tạo",
      dataIndex: "ngayTao",
      key: "ngayTao",
      width: 150,
      ellipsis: true,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
      sorter: (a: any, b: any) => {
        const va = dayjs(a?.ngayTao).valueOf();
        const vb = dayjs(b?.ngayTao).valueOf();
        return va - vb;
      },
      defaultSortOrder: "descend" as const,
    },
    // {
    //   title: "Trạng thái",
    //   dataIndex: "tinhTrang",
    //   key: "tinhTrang",
    //   width: 110,
    //   render: (status: string) => (
    //     <Tag color={statusConfig[status]?.color || "default"}>
    //       {statusConfig[status]?.text || status}
    //     </Tag>
    //   ),
    // },
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
      ellipsis: true,
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

  const uniqueData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    // sort trước: mới → cũ
    const sorted = [...data].sort((a: any, b: any) => {
      const tb = dayjs(b.ngaySX).valueOf();
      const ta = dayjs(a.ngaySX).valueOf();
      return tb - ta;
    });

    // lọc trùng NgaySX + ca
    const map = new Map<string, any>();
    if (type !== "viecdentoi") {
      sorted.forEach((item: any) => {
        const key = `${item.ngaySX}_${item.ca}`;
        if (!map.has(key)) {
          map.set(key, item); // giữ bản ghi đầu tiên (mới nhất)
        }
      });

      return Array.from(map.values());
    } else {
      return sorted;
    }
  }, [data]);

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
          dataSource={uniqueData as TableRecord[]}
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
          scroll={{ x: "max-content" }}
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

export default BienBanPhoiNong;
