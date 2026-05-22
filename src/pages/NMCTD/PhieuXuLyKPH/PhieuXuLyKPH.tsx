import CTD_KPH_Sanxuat from "../../../utils/BM_config/CTD_KPH_Sanxuat.json";
import { Button, Card, Space, Table, Tag, Tooltip } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { PhieuApi } from "../../../services/PhieuApi";

const PhieuXuLyKPH = ({ type }: { type?: string }) => {
  const config = CTD_KPH_Sanxuat as any;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const thongtinuser = getThongTinUser();
  const [currentFilter, setCurrentFilter] = useState<any>({});

  const handleFilterWithCapture = (filters: any) => {
    setCurrentFilter(filters);
    handleFilter(filters);
  };

  const fixedFilters = useMemo(
    () => ({
      // usercode: userObj?.maNV || "",
    }),
    [userObj?.maNV, thongtinuser.iD_TaiKhoan],
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
    isViecdentoi: type === "viecdentoi",
  });

  const statusConfig: Record<number, { color: string; text: string }> = {
    0: { color: "purple", text: "Đang lưu" },
    1: { color: "pink", text: "Đã gửi" },
    2: { color: "blue", text: "Hoàn thành" },
    3: { color: "tomato", text: "Đã thu hồi" },
    4: { color: "yellow", text: "Không xác nhận" },
    5: { color: "green", text: "Đã chốt" },
    6: { color: "gray", text: "Đang phê duyệt" },
  };

  const approvalStatusConfig: Record<number, { color: string; text: string }> =
    {
      0: { color: "default", text: "Chưa xác nhận" },
      1: { color: "green", text: "Đã ký" },
      2: { color: "red", text: "Từ chối" },
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
              return navigate(`/chitietphieuxulykph/${record.idphieu}`);
            }

            // Nếu phiếu đang ở trạng thái Đang lưu (0), mở trang chỉnh sửa
            if (record.tinhTrang === 0) {
              return navigate(`/taophieuxulykph/${record.idphieu}`);
            }

            // Các trạng thái khác, mở trang chi tiết
            return navigate(`/chitietphieuxulykph/${record.idphieu}`);
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
      width: 160,
      ellipsis: true,
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 120,
      ellipsis: true,
      render: (value: number) => {
        return value === 1 ? "Ca Ngày" : value === 2 ? "Ca Đêm" : "-";
      },
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 150,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    // {
    //   title: "Người tạo",
    //   dataIndex: "nguoiTaoId",
    //   key: "nguoiTaoId",
    //   width: 220,
    //   ellipsis: true,
    // },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 120,
      render: (status: number) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    // ========== CỘT ĐỘNG: TÌNH TRẠNG PHÊ DUYỆT TỪNG CẤP ==========
    ...config.signatures
      .filter((sig: any) => sig.capDuyet > 0)
      .sort((a: any, b: any) => a.capDuyet - b.capDuyet)
      .map((sig: any) => ({
        title: `${sig.label} (Cấp ${sig.capDuyet})`,
        key: `approval_${sig.capDuyet}`,
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: TableRecord) => {
          const pheDuyet = record.pheDuyet || [];
          const approvalItem = pheDuyet.find(
            (pd: any) => pd.capDuyet === sig.capDuyet,
          );

          if (!approvalItem) {
            return <Tag color="default">Chưa gán</Tag>;
          }

          const status: number | any = approvalItem.tinhTrang ?? 0;
          const statusText =
            approvalStatusConfig[status]?.text || `Trạng thái ${status}`;
          const fullText = `${statusText}-${approvalItem.hoVaTen || "N/A"}`;

          return (
            <Tooltip title={fullText}>
              <Tag color={approvalStatusConfig[status]?.color || "default"}>
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: "150px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fullText}
                </span>
              </Tag>
            </Tooltip>
          );
        },
      })),
    // ========== HẾT CỘT PHÊ DUYỆT ==========
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      render: (_: unknown, record: TableRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined twoToneColor="#1890ff" />}
            onClick={() => navigate(`/chitietphieuxulykph/${record.idphieu}`)}
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
      placeholder: "Chọn ca",
      options: [
        { label: "Ca ngày (1)", value: 1 },
        { label: "Ca đêm (2)", value: 2 },
      ],
    },
  ];

  const handleExportExcel = async () => {
    try {
      const fromDate = currentFilter?.NgaySXFrom;
      const toDate = currentFilter?.NgaySXTo;
      const maBm = config?.code;

      const res = await PhieuApi.exportDynamicExcelTH({
        maBm,
        fromDate,
        toDate,
      });

      const blob = new Blob([res as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `TongHopPhieuXuLyKPH_${fromDate || ""}_${toDate || ""}.xlsx`;

      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Excel lỗi:", error);
    }
  };

  return (
    <div>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilterWithCapture}
        onClearFilter={() => {
          setCurrentFilter({});
          handleClearFilter();
        }}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
      />
      <Card
        extra={
          <Space>
            {/* <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/taophieuxulykph")}
            >
              Tạo Mới
            </Button> */}
            <Button onClick={handleExportExcel}>Xuất Excel</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data as any}
          loading={loading}
          pagination={pagination}
          onChange={(pag: any) =>
            onPageChange(pag.current ?? 1, pag.pageSize ?? 10)
          }
          rowKey="idphieu"
          size="small"
        />
      </Card>
    </div>
  );
};

export default PhieuXuLyKPH;
