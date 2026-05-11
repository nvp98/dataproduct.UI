import NL_BB_TheoDoiBenPhe from "../../../utils/BM_config/NL_BB_TheoDoiBenPhe.json";
import { Button, Card, Space, Table, Tag } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { BmQuyenXlApi } from "../../../services/BmQuyenXlApi";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { PhieuApi } from "../../../services/PhieuApi";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";

const BangTheoDoiBenPhe = ({ type }: { type?: string }) => {
  const config = NL_BB_TheoDoiBenPhe;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = getThongTinUser();
  const [currentFilter, setCurrentFilter] = useState<any>({});
  const [draftFilter, setDraftFilter] = useState<Record<string, unknown>>({});
  const [canCreatePhieu, setCanCreatePhieu] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        const userInfoStr = localStorage.getItem("userinfo");
        const userInfo = getThongTinUser();

        if (isAdminUser(userInfo)) {
          setCanCreatePhieu(true);
          return;
        }

        const raw = userInfo?.iD_TaiKhoan ?? userObj?.iD_TaiKhoan;

        const idTaiKhoan = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(idTaiKhoan) || idTaiKhoan <= 0) {
          setCanCreatePhieu(false);
          return;
        }

        const permissions = await BmQuyenXlApi.getMenuPermissions(idTaiKhoan);
        const processingSet = new Set(permissions?.processingForms ?? []);
        setCanCreatePhieu(processingSet.has(config.code as string));
      } catch {
        setCanCreatePhieu(false);
      }
    };

    loadPermission();
  }, [config.code, userObj]);

  const handleFilterWithCapture = (filters: any) => {
    setCurrentFilter(filters);
    handleFilter(filters);
  };

  const fixedFilters = useMemo(
    () =>
      type === "viecdentoi"
        ? {
            // nguoiDuyetId: userObj?.iD_TaiKhoan,
            // nguoiTaoId: userObj?.iD_TaiKhoan,
          }
        : {
            // nguoiDuyetId: userObj?.iD_TaiKhoan,
            // nguoiTaoId: userObj?.iD_TaiKhoan,
          },
    [userObj?.iD_TaiKhoan, type],
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

  type TableRecord = SearchPhieuResponseModel & {
    pheDuyet?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const columns = [
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 250,
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            // Nếu là việc đến tôi, luôn mở trang chi tiết
            // if (type === "viecdentoi") {
            //   return navigate("/chitietbangtheodoibenphe", {
            //     state: { idphieu: record.idphieu, type: "viecdentoi" },
            //   });
            // }

            // Nếu phiếu đang ở trạng thái Đang lưu (0), mở trang chỉnh sửa
            // if (record.tinhTrang === 0) {
            //   return navigate("/taophieubangtheodoibenphe", {
            //     state: { idphieu: record.idphieu },
            //   });
            // }

            // Các trạng thái khác, mở trang chi tiết
            return navigate("/taophieubangtheodoibenphe", {
              state: { idphieu: record.idphieu },
            });
          }}
        >
          {text}
        </b>
      ),
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 150,
      ellipsis: true,
      render: (v: number) => (v === 1 ? "Ca ngày" : v === 2 ? "Ca đêm" : v),
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
      title: config.signatures[0]?.label || "Cấp duyệt 1",
      dataIndex: "pheDuyet",
      key: "pheDuyet0",
      width: 250,
      render: (_: unknown, record: TableRecord) => {
        const pheDuyetItem = (record.pheDuyet || []).find(
          (item: any) => item.capDuyet === 0,
        );
        if (!pheDuyetItem) return <span>-</span>;

        const tenNguoiDuyet =
          (pheDuyetItem as any).hoVaTen ||
          (pheDuyetItem as any).nguoiDuyet ||
          (pheDuyetItem as any).userName ||
          "N/A";
        const tinhTrang = (pheDuyetItem as any).tinhTrang ?? -1;
        const statusText = tinhTrang === 0 ? "Chưa xử lý" : "Đã xử lý";
        const statusColor = tinhTrang === 0 ? "default" : "green";

        return (
          <Space direction="vertical" size={0}>
            <Tag color={statusColor}>
              {tenNguoiDuyet} - {statusText}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: config.signatures[1]?.label || "Cấp duyệt 2",
      dataIndex: "pheDuyet",
      key: "pheDuyet1",
      width: 250,
      render: (_: unknown, record: TableRecord) => {
        const pheDuyetItem = (record.pheDuyet || []).find(
          (item: any) => item.capDuyet === 1,
        );
        if (!pheDuyetItem) return <span>-</span>;

        const tenNguoiDuyet =
          (pheDuyetItem as any).hoVaTen ||
          (pheDuyetItem as any).nguoiDuyet ||
          (pheDuyetItem as any).userName ||
          "N/A";
        const tinhTrang = (pheDuyetItem as any).tinhTrang ?? -1;
        const statusText = tinhTrang === 0 ? "Chưa xử lý" : "Đã xử lý";
        const statusColor = tinhTrang === 0 ? "default" : "green";

        return (
          <Space direction="vertical" size={0}>
            <Tag color={statusColor}>
              {tenNguoiDuyet} - {statusText}
            </Tag>
          </Space>
        );
      },
    },
    // {
    //   title: "Người tạo",
    //   dataIndex: "nguoiTaoId",
    //   key: "nguoiTaoId",
    //   width: 270,
    //   ellipsis: true,
    // },
    // {
    //   title: "Ngày tạo",
    //   dataIndex: "ngayTao",
    //   key: "ngayTao",
    //   width: 190,
    //   render: (value: string) =>
    //     value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
    // },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 150,
      render: (status: string | number) => (
        <Tag color={PHIEU_STATUS_CONFIG[status]?.color || "default"}>
          {PHIEU_STATUS_CONFIG[status]?.text || status}
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
              navigate("/chitietbangtheodoibenphe", {
                state: {
                  idphieu: record.idphieu,
                  type: type === "viecdentoi" ? "viecdentoi" : undefined,
                },
              })
            }
          />
        </Space>
      ),
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
      a.download = `BangTheoDoiBenPhe_${fromDate || ""}_${toDate || ""}.xlsx`;

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
          setDraftFilter({});
          handleClearFilter();
        }}
        onFilterFieldChange={(key, value) => {
          setDraftFilter((prev) => ({ ...prev, [key]: value }));
        }}
        showCreateButton={false}
        onCreateClick={() => navigate("/taophieubangtheodoibenphe")}
        mergeFilters={
          type === "viecdentoi"
            ? {}
            : { nguoiDuyetId: userObj?.iD_TaiKhoan || "" }
        }
        extraFilters={
          <Space>
            {/* <Button onClick={handleExportExcelPKH}>Xuất Excel PKH</Button> */}
            <Button onClick={handleExportExcel}>Xuất Excel</Button>
          </Space>
        }
      />

      <Card style={{ width: "100%", overflow: "auto" }}>
        <Table<TableRecord>
          rowKey="idphieu"
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
          style={{ width: "100%" }}
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

export default BangTheoDoiBenPhe;
