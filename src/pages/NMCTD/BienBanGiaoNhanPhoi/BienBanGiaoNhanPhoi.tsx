import CTD_BB_GiaoNhanPhoi from "../../../utils/BM_config/CTD_BB_GiaoNhanPhoi.json";
import { Button, Card, Space, Table, Tag } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { PhieuApi } from "../../../services/PhieuApi";
import useRowSelection from "../../../hooks/useRowSelection";
import useCheckPhieu from "../../../hooks/useCheckPhieu";

const BienBanGiaoNhanPhoi = ({ type }: { type?: string }) => {
  const config = CTD_BB_GiaoNhanPhoi;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const thongtinuser = getThongTinUser();
  const [currentFilter, setCurrentFilter] = useState<any>({});
  const [draftFilter, setDraftFilter] = useState<Record<string, unknown>>({});

  const handleFilterWithCapture = (filters: any) => {
    console.log("Filters nhận được từ PhieuFilterCard:", filters);
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
    refetch,
  } = usePhieuSearchList({
    maBm: config.code as string,
    fixedFilters,
    isViecdentoi: type === "viecdentoi",
  });

  const { selectedRowKeys, setSelectedRowKeys, checkboxColumn } =
    useRowSelection(data as any[]);
  const { checkLoading, handleCheckPhieu } = useCheckPhieu(
    selectedRowKeys,
    () => setSelectedRowKeys([]),
    refetch,
  );

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

  const columns: Array<any> = [
    checkboxColumn,
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      flex: 1.2,
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              return navigate(`/chitietbienbangiaoNhanphoi/${record.idphieu}`);
            }

            if (record.tinhTrang === 0) {
              return navigate(`/taophieubienbangiaoNhanphoi/${record.idphieu}`);
            }

            return navigate(`/chitietbienbangiaoNhanphoi/${record.idphieu}`);
          }}
        >
          {text}
        </b>
      ),
    },
    {
      title: "Quy trình",
      dataIndex: "maBm",
      key: "maBm",
      flex: 1,
      ellipsis: true,
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      flex: 0.6,
      render: (ca: number) => (ca === 1 ? "Ngày" : ca === 2 ? "Đêm" : ""),
    },
    {
      title: "Ngày",
      dataIndex: "ngaySX",
      key: "ngaySX",
      flex: 0.8,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Xưởng cán",
      dataIndex: "scope",
      key: "scope",
      flex: 0.8,
      render: (scope: string) => "Xưởng cán " + scope || "",
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTao",
      key: "nguoiTao",
      flex: 0.9,
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      flex: 0.7,
      render: (tinhTrang: number) => {
        const status = statusConfig[String(tinhTrang)] || statusConfig["0"];
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "ngayTao",
      key: "ngayTao",
      flex: 0.8,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : ""),
    },
    {
      title: "Hành động",
      key: "action",
      flex: 0.6,
      render: (_: any, record: TableRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              if (record.tinhTrang === 0) {
                navigate(`/taophieubienbangiaoNhanphoi/${record.idphieu}`);
              } else {
                navigate(`/chitietbienbangiaoNhanphoi/${record.idphieu}`);
              }
            }}
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  const filterFields: FilterFieldConfig[] = [
    { label: "Số phiếu", key: "soPhieu", type: "text" },
    {
      label: "Ca",
      key: "ca",
      type: "select",
      options: [
        { label: "Ca Ngày", value: 1 },
        { label: "Ca Đêm", value: 2 },
      ],
    },
    {
      label: "Ngày",
      key: "tuNgay",
      type: "dateRange",
    },
    {
      label: "Trạng thái",
      key: "tinhTrang",
      type: "select",
      options: [
        { label: "Đang lưu", value: 0 },
        { label: "Đã gửi", value: 1 },
        { label: "Hoàn thành", value: 2 },
        { label: "Đã thu hồi", value: 3 },
        { label: "Không xác nhận", value: 4 },
        { label: "Chốt", value: 5 },
        { label: "Đang phê duyệt", value: 6 },
      ],
    },
  ];

  const handleExportExcel = async () => {
    try {
      const selectedNgaySX = draftFilter?.tuNgay as
        | [Dayjs | null, Dayjs | null]
        | null
        | undefined;

      const fromDate =
        currentFilter?.tuNgayFrom ||
        (Array.isArray(selectedNgaySX) && selectedNgaySX[0]
          ? selectedNgaySX[0].format("YYYY-MM-DD")
          : undefined);

      const toDate =
        currentFilter?.tuNgayTo ||
        (Array.isArray(selectedNgaySX) && selectedNgaySX[1]
          ? selectedNgaySX[1].format("YYYY-MM-DD")
          : undefined);
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
      a.download = `TongHopGiaoNhanPhoi_${fromDate || ""}_${toDate || ""}.xlsx`;

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
        onFilterFieldChange={(key, value) => {
          setDraftFilter((prev) => ({ ...prev, [key]: value }));
        }}
        onClearFilter={() => {
          setCurrentFilter({});
          setDraftFilter({});
          handleClearFilter();
        }}
        filterFields={filterFields}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        selectedRowCount={selectedRowKeys.length}
        checkLoading={checkLoading}
        onCheckPhieu={handleCheckPhieu}
      />
      <Card
        extra={
          <Space>
            <Button onClick={handleExportExcel}>Xuất Excel</Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/taophieubienbangiaoNhanphoi")}
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
          rowClassName={(record: any) =>
            record.isCheck === 1 ? "row-checked" : ""
          }
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

export default BienBanGiaoNhanPhoi;
