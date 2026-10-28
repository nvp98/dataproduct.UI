import HRC1_BB_Sanluongphoi from "../../../utils/BM_config/HRC1_BB_Sanluongphoi.json";
import {
  Button,
  Card,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import useRowSelection from "../../../hooks/useRowSelection";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { sanLuongPhoiApi } from "../../../services/BMDucCTDApi";
import { BmQuyenXlApi } from "../../../services/BmQuyenXlApi";
import { PhieuApi } from "../../../services/PhieuApi";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";

const BienBanSanLuongPhoi = ({ type }: { type?: string }) => {
  const config = HRC1_BB_Sanluongphoi;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const [currentFilter, setCurrentFilter] = useState<any>({});
  const [canCreatePhieu, setCanCreatePhieu] = useState(false);
  const [canChotPhieu, setCanChotPhieu] = useState(false);
  const [chotLoading, setChotLoading] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        const userInfoStr = localStorage.getItem("userinfo");
        const userInfo = userInfoStr ? JSON.parse(userInfoStr) : userObj;

        if (isAdminUser(userInfo)) {
          setCanCreatePhieu(true);
          setCanChotPhieu(true);
          return;
        }

        const raw =
          userInfo?.iD_TaiKhoan ??
          userInfo?.ID_TaiKhoan ??
          userInfo?.idTaiKhoan ??
          userInfo?.IdTaiKhoan ??
          userObj?.id;

        const idTaiKhoan = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(idTaiKhoan) || idTaiKhoan <= 0) {
          setCanCreatePhieu(false);
          setCanChotPhieu(false);
          return;
        }

        const permissions = await BmQuyenXlApi.getMenuPermissions(idTaiKhoan);
        const processingSet = new Set(permissions?.processingForms ?? []);
        const chotSet = new Set(permissions?.chotPhieuForms ?? []);
        setCanCreatePhieu(processingSet.has(config.code as string));
        setCanChotPhieu(chotSet.has(config.code as string));
      } catch {
        setCanCreatePhieu(false);
        setCanChotPhieu(false);
      }
    };

    loadPermission();
  }, [config.code, userObj]);

  const handleFilterWithCapture = (filters: any) => {
    setCurrentFilter(filters);
    handleFilter(filters);
  };

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
    refetch,
  } = usePhieuSearchList({
    maBm: config.code as string,
    fixedFilters,
    persistKey: true,
  });

  const { selectedRowKeys, setSelectedRowKeys, checkboxColumn } =
    useRowSelection(data as TableRecord[]);

  type TableRecord = SearchPhieuResponseModel & {
    pheDuyet?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const statusConfig: Record<string, { color: string; text: string }> = {
    0: { color: "purple", text: "Đang lưu" },
    1: { color: "pink", text: "Đã gửi" },
    2: { color: "blue", text: "Hoàn thành" },
    3: { color: "tomato", text: "Đã thu hồi" },
    4: { color: "yellow", text: "Không xác nhận" },
    5: { color: "green", text: "Chốt" },
    6: { color: "gray", text: "Đang phê duyệt" },
  };

  const runBatchAction = (status: number, action: "chốt" | "hủy chốt") => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: `Xác nhận ${action} phiếu`,
      content: `Bạn có chắc muốn ${action} ${selectedRowKeys.length} phiếu đã chọn?`,
      okText: action === "chốt" ? "Chốt" : "Hủy chốt",
      okType: action === "chốt" ? "danger" : "primary",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setChotLoading(true);
          await PhieuApi.chotNhieuPhieu(selectedRowKeys, status);
          message.success(
            `${action === "chốt" ? "Chốt" : "Hủy chốt"} ${selectedRowKeys.length} phiếu thành công`,
          );
          setSelectedRowKeys([]);
          refetch();
        } catch {
          message.error(`${action === "chốt" ? "Chốt" : "Hủy chốt"} phiếu thất bại. Vui lòng thử lại.`);
        } finally {
          setChotLoading(false);
        }
      },
    });
  };

  const columns = [
    checkboxColumn,
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              return navigate(`/chitietbienbansanluongphoi/${record.idphieu}`);
            }
            if (record.tinhTrang === 0) {
              return navigate(`/taophieubienbansanluongphoi/${record.idphieu}`);
            }
            return navigate(`/chitietbienbansanluongphoi/${record.idphieu}`);
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
      render: (value: number) => (value === 1 ? "Ca Ngày" : "Ca Đêm"),
    },
    {
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
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
              navigate(`/chitietbienbansanluongphoi/${record.idphieu}`)
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
      placeholder: "Chọn ca",
      options: [
        { label: "Ca ngày (1)", value: 1 },
        { label: "Ca đêm (2)", value: 2 },
      ],
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

  const handleExportExcel = async () => {
    try {
      const fromDate = currentFilter?.ngaySXFrom;
      const toDate = currentFilter?.ngaySXTo;

      const res = await sanLuongPhoiApi.exportExcelSanLuongPhoi({ fromDate, toDate });
      const blob = new Blob([res as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TongHopSanLuongPhoi_${fromDate || ""}_${toDate || ""}.xlsx`;
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
        storageKey={true}
      />
      <Card
        extra={
          <Space>
            <Button onClick={handleExportExcel}>Xuất Excel</Button>
            {type !== "viecdentoi" && canCreatePhieu && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/taophieubienbansanluongphoi")}
              >
                Tạo phiếu mới
              </Button>
            )}
          </Space>
        }
      >
        {canChotPhieu && (
          <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
            <Button
              type="primary"
              disabled={selectedRowKeys.length === 0}
              loading={chotLoading}
              onClick={() => runBatchAction(TrangThaiPhieuConst.DaChot, "chốt")}
            >
              Chốt phiếu ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              danger
              disabled={selectedRowKeys.length === 0}
              loading={chotLoading}
              onClick={() => runBatchAction(TrangThaiPhieuConst.HoanThanh, "hủy chốt")}
            >
              Hủy chốt ({selectedRowKeys.length})
            </Button>
          </div>
        )}
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
            onChange: (page, pageSize) => {
              setSelectedRowKeys([]);
              onPageChange(page, pageSize);
            },
          }}
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell
                index={0}
                colSpan={type !== "viecdentoi" ? 10 : 9}
                align="right"
              >
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

export default BienBanSanLuongPhoi;
