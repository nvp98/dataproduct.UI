/* eslint-disable @typescript-eslint/no-explicit-any */
import CTD_BB_SanLuong_KCS from "../../../utils/BM_config/CTD_BB_SanLuong_KCS.json";
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

const BienBanSanLuongKCS = ({ type }: { type?: string }) => {
  const config = CTD_BB_SanLuong_KCS as any;
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
      usercode: userObj?.maNV || "",
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
            if (type === "viecdentoi") {
              return navigate(`/chitietsanluongkcs/${record.idphieu}`);
            }
            if (record.tinhTrang === 0) {
              return navigate(`/taophieusanluongkcs/${record.idphieu}`);
            }
            return navigate(`/chitietsanluongkcs/${record.idphieu}`);
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
      width: 100,
      render: (value: number) =>
        value === 1 ? "Ca Ngày" : value === 2 ? "Ca Đêm" : "-",
    },
    {
      title: "Xưởng cán",
      dataIndex: "mayDuc",
      key: "xuong",
      width: 110,
      render: (value: number) => (value ? `Xưởng cán ${value}` : "-"),
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 150,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 130,
      render: (status: number) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    // Cột động phê duyệt từng cấp
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
          const approvalItem = (pheDuyet as any[]).find(
            (pd: any) => pd.capDuyet === sig.capDuyet,
          );
          if (!approvalItem) return <Tag color="default">Chưa gán</Tag>;
          const status: number = approvalItem.tinhTrang ?? 0;
          const statusText =
            approvalStatusConfig[status]?.text || `Trạng thái ${status}`;
          const fullText = `${statusText}-${approvalItem.hoVaTen || "N/A"}`;
          return (
            <Tooltip title={fullText}>
              <Tag color={approvalStatusConfig[status]?.color || "default"}>
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: 150,
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
    {
      title: "Thao tác",
      key: "action",
      width: 90,
      render: (_: unknown, record: TableRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined twoToneColor="#1890ff" />}
            onClick={() => navigate(`/chitietsanluongkcs/${record.idphieu}`)}
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
    {
      key: "xuong",
      label: "Xưởng cán",
      type: "select",
      placeholder: "Chọn xưởng",
      options: [
        { label: "Xưởng cán 1", value: 1 },
        { label: "Xưởng cán 2", value: 2 },
        { label: "Xưởng cán 3", value: 3 },
      ],
    },
  ];

  const handleExportExcel = async () => {
    try {
      const fromDate = currentFilter?.ngaySXFrom;
      const toDate = currentFilter?.ngaySXTo;
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
      a.download = `BienBanSanLuongKCS_${fromDate || ""}_${toDate || ""}.xlsx`;
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
            <Button onClick={handleExportExcel}>Xuất Excel</Button>
            {type !== "viecdentoi" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/taophieusanluongkcs")}
              >
                Tạo phiếu mới
              </Button>
            )}
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
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default BienBanSanLuongKCS;
