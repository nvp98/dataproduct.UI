import { Button, Card, Checkbox, message, Modal, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { PhieuApi } from "../../../services/PhieuApi";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import type { PhieuFilterValues } from "../../../components/PhieuFilterCard";
import type { SearchPhieuRequest } from "../../../models/Phieu";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";

// Map maBm -> route chi tiết
const MABM_DETAIL_ROUTE: Record<string, string> = {
  HRC2_BB_NauLuyen_BOF: "/chitiettieuhaonauluyen_bof",
  HRC2_BB_NauLuyen_LF: "/chitiettieuhaonauluyen_lf",
  HRC2_BB_NauLuyen_RH: "/chitiettieuhaonauluyen_rh",
  HRC2_STD_NXT: "/tao-std",
  HRC2_BB_GN_ThepLong: "/chitietgiaonhantheplong",
};

const MABM_LIST: string[] = [
  BM_CONFIG.HRC2.HRC2_BB_NauLuyen_BOF,
  BM_CONFIG.HRC2.HRC2_BB_NauLuyen_LF,
  BM_CONFIG.HRC2.HRC2_BB_NauLuyen_RH,
  // BM_CONFIG.HRC2.HRC2_STD_NXT,
  // BM_CONFIG.HRC2.HRC2_BB_GN_ThepLong,
];

const LOAI_BM_TO_MABM: Record<string, string> = {
  BOF: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_BOF,
  LF: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_LF,
  RH: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_RH,
};

const SCOPE_OPTIONS: Record<string, { label: string; value: number }[]> = {
  BOF: [{ label: "Lò 6", value: 6 }, { label: "Lò 7", value: 7 }],
  RH: [{ label: "RH1", value: 1 }, { label: "RH2", value: 2 }],
};

const TINH_TRANG_OPTIONS = [
  { label: "Đang lưu", value: TrangThaiPhieuConst.DangLuu },
  { label: "Đã gửi", value: TrangThaiPhieuConst.DaGui },
  { label: "Hoàn thành", value: TrangThaiPhieuConst.HoanThanh },
  { label: "Đã thu hồi", value: TrangThaiPhieuConst.DaThuHoi },
  // { label: "Không xác nhận", value: TrangThaiPhieuConst.KhongXacNhan },
  { label: "Đã chốt", value: TrangThaiPhieuConst.DaChot },
  { label: "Đang phê duyệt", value: TrangThaiPhieuConst.DangPheDuyet },
  { label: "Hiệu chỉnh", value: TrangThaiPhieuConst.HieuChinh },
];

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface ThongKePhieuHRC2Props {
  type?: string; // "viecdentoi" | undefined
}

type TableRecord = SearchPhieuResponseModel & {
  pheDuyet?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const ThongKePhieuHRC2 = ({ type }: ThongKePhieuHRC2Props) => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};

  const currentUserId: number | null =
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userObj?.iD_TaiKhoan ??
    userObj?.ID_TaiKhoan ??
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

  // Vùng 3 (Thống kê): PKH / admin — toàn bộ phiếu; người khác: vùng 1 + userId
  const fixedFilters = useMemo(() => {
    const u = getThongTinUser();
    const canThongKe =
      u.tenNgan === "P.KH" || u.iD_PhongBan === 70 || isAdminUser(u);
    if (canThongKe) {
      return { userId: currentUserId, loaiVung: 3, isThongKeUser: true };
    }
    return { userId: currentUserId, loaiVung: 1 };
  }, [currentUserId]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [chotLoading, setChotLoading] = useState(false);
  const [selectedLoaiBM, setSelectedLoaiBM] = useState<string | null>(null);

  const transformFilters = useCallback((filters: PhieuFilterValues): Partial<SearchPhieuRequest> => {
    const loaiBM = filters.loaiBM as string | undefined;
    return {
      tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
      denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
      ca: normalizeNum(filters.ca),
      scope: loaiBM === "LF" ? 6 : normalizeNum(filters.scope),
      searchText: (filters.soPhieu || null) as string | null,
      tinhTrang: normalizeNum(filters.tinhTrang),
      ...(loaiBM ? { maBm: LOAI_BM_TO_MABM[loaiBM], maBmList: null } : {}),
    };
  }, []);

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange, refetch } =
    usePhieuSearchListHRC({
      maBmList: MABM_LIST,
      fixedFilters,
      transformFilters,
    });

  const statusConfig = PHIEU_STATUS_CONFIG;

  const isAllSelected =
    data.length > 0 && data.every((r) => selectedKeys.has(r.idphieu));
  const isIndeterminate =
    !isAllSelected && data.some((r) => selectedKeys.has(r.idphieu));

  const toggleSelect = useCallback((id: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedKeys(new Set((data as TableRecord[]).map((r) => r.idphieu)));
      } else {
        setSelectedKeys(new Set());
      }
    },
    [data]
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setSelectedKeys(new Set());
      onPageChange(page, pageSize);
    },
    [onPageChange]
  );

  const handleChotPhieu = useCallback(() => {
    if (selectedKeys.size === 0) return;
    Modal.confirm({
      title: "Xác nhận chốt phiếu",
      content: `Bạn có chắc muốn chốt ${selectedKeys.size} phiếu đã chọn?`,
      okText: "Chốt",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setChotLoading(true);
          await PhieuApi.chotNhieuPhieu([...selectedKeys], TrangThaiPhieuConst.DaChot);
          message.success(`Chốt ${selectedKeys.size} phiếu thành công`);
          setSelectedKeys(new Set());
          refetch();
        } catch {
          message.error("Chốt phiếu thất bại. Vui lòng thử lại.");
        } finally {
          setChotLoading(false);
        }
      },
    });
  }, [selectedKeys, refetch]);

  const handleHuyChotPhieu = useCallback(() => {
    if (selectedKeys.size === 0) return;
    Modal.confirm({
      title: "Xác nhận hủy chốt phiếu",
      content: `Bạn có chắc muốn hủy chốt ${selectedKeys.size} phiếu đã chọn?`,
      okText: "Hủy chốt",
      okType: "primary",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          setChotLoading(true);
          await PhieuApi.chotNhieuPhieu([...selectedKeys], TrangThaiPhieuConst.HoanThanh);
          message.success(`Hủy chốt ${selectedKeys.size} phiếu thành công`);
          setSelectedKeys(new Set());
          refetch();
        } catch {
          message.error("Hủy chốt phiếu thất bại. Vui lòng thử lại.");
        } finally {
          setChotLoading(false);
        }
      },
    });
  }, [selectedKeys, refetch]);

  const columns = [
    {
      title: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      dataIndex: "select",
      key: "select",
      width: 50,
      fixed: "left" as const,
      render: (_: unknown, record: TableRecord) => {
        return (
          <Checkbox
            checked={selectedKeys.has(record.idphieu)}
            onChange={() => toggleSelect(record.idphieu)}
          />
        );
      },
    },
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 300,
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            const route = MABM_DETAIL_ROUTE[record.maBm as string];
            if (!route) return;
            if (type === "viecdentoi") {
              navigate(route, {
                state: {
                  idphieu: record.idphieu,
                  pheduyet: record?.pheDuyet?.[0] ?? null,
                },
              });
            } else {
              navigate(route, { state: { idphieu: record.idphieu } });
            }
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
      width: 250,
      ellipsis: true,
    },
    {
      title: "Ngày lập phiếu",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 200,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 200,
      render: (value: number) => (value === 1 ? "(1) Ca Ngày" : value === 2 ? "(2) Ca Đêm" : "-"),
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
      width: 200,
      render: (status: number) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    // {
    //   title: "Thao tác",
    //   key: "action",
    //   width: 80,
    //   render: (_: unknown, record: TableRecord) => {
    //     const route = MABM_DETAIL_ROUTE[record.maBm as string];
    //     return (
    //       <Space>
    //         <Button
    //           type="text"
    //           icon={<EyeOutlined />}
    //           disabled={!route}
    //           onClick={() =>
    //             route && navigate(route, { state: { idphieu: record.idphieu } })
    //           }
    //         />
    //       </Space>
    //     );
    //   },
    // },
  ];

  const filterFieldsConfig = useMemo<FilterFieldConfig[]>(() => {
    const fields: FilterFieldConfig[] = [
      {
        key: "loaiBM",
        label: "Loại biểu mẫu",
        type: "select",
        options: [
          { label: "Lò thổi BOF", value: "BOF" },
          { label: "Tinh luyện LF", value: "LF" },
          { label: "Tinh luyện RH", value: "RH" },
        ],
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
        key: "soPhieu",
        label: "Số phiếu",
        type: "text",
        placeholder: "Số phiếu...",
      },
    ];

    // Lò thổi luôn hiển thị; LF chỉ có 1 option (Lò 6) để tự động chọn
    const scopeOptions =
      selectedLoaiBM === "LF"
        ? [{ label: "Lò 6", value: 6 }]
        : selectedLoaiBM === "BOF" || selectedLoaiBM === "RH"
          ? SCOPE_OPTIONS[selectedLoaiBM]
          : [
              { label: "Lò 6", value: 6 },
              { label: "Lò 7", value: 7 },
              { label: "RH1", value: 1 },
              { label: "RH2", value: 2 },
            ];
    fields.push({
      key: "scope",
      label: "Lò thổi",
      type: "select",
      options: scopeOptions,
    });

    fields.push({
      key: "tinhTrang",
      label: "Tình trạng",
      type: "select",
      options: TINH_TRANG_OPTIONS,
    });

    return fields;
  }, [selectedLoaiBM]);

  return (
    <div>
      <PhieuFilterCard
        title="Tổng hợp phiếu HRC2"
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        showCreateButton={false}
        onCreateClick={() => {}}
        createButtonText=""
        onFilterFieldChange={(key, value) => {
          if (key === "loaiBM") setSelectedLoaiBM(value || null);
        }}
      />
      <Card>
        <div style={{ marginBottom: 12, display: "flex", gap: 12, justifyContent: "flex-start" }}>
          <Button
            type="primary"
            disabled={selectedKeys.size === 0}
            loading={chotLoading}
            onClick={handleChotPhieu}
          >
            Chốt phiếu ({selectedKeys.size})
          </Button>
          <Button
            type="primary"
            danger
            disabled={selectedKeys.size === 0}
            loading={chotLoading}
            onClick={handleHuyChotPhieu}
          >
            Hủy chốt ({selectedKeys.size})
          </Button>
        </div>
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
          rowKey="idphieu"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
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

export default ThongKePhieuHRC2;
