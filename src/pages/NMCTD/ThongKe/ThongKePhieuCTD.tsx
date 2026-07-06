import { Button, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FilterFieldConfig } from "../../../components/PhieuFilterCard";
import ThongKePhieuCommon, {
  type ChotResult,
  type ExtraActionsCtx,
  type TableRecord,
} from "../../../components/ThongKePhieuCommon";
import { DEFAULT_TINH_TRANG_OPTIONS } from "../../../utils/ConfigDefault/thongKePhieuDefaults";
import type { SearchPhieuRequest } from "../../../models/Phieu";
import type { PhieuFilterValues } from "../../../components/PhieuFilterCard";
import { PhieuApi } from "../../../services/PhieuApi";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

const MABM_LIST: string[] = [
  BM_CONFIG.CTD.CTD_BB_Phoinong,
  BM_CONFIG.CTD.CTD_BB_GiaoNhanPhoi,
  BM_CONFIG.CTD.CTD_BB_PhoiNapnguoi,
  BM_CONFIG.CTD.CTD_STD_Sanxuat,
  BM_CONFIG.CTD.CTD_KPH_Sanxuat,
  BM_CONFIG.CTD.CTD_BB_SanLuong_KCS,
];

const LOAI_BM_TO_MABM: Record<string, string> = {
  PhoiNong: BM_CONFIG.CTD.CTD_BB_Phoinong,
  PhoiNguoi: BM_CONFIG.CTD.CTD_BB_Phoinguoi,
  GiaoNhanPhoi: BM_CONFIG.CTD.CTD_BB_GiaoNhanPhoi,
  SoTheoDoiSX: BM_CONFIG.CTD.CTD_STD_Sanxuat,
  PhieuKPH: BM_CONFIG.CTD.CTD_KPH_Sanxuat,
  SanLuongKCS: BM_CONFIG.CTD.CTD_BB_SanLuong_KCS,
  PhoiNapNguoi: BM_CONFIG.CTD.CTD_BB_PhoiNapnguoi,
};

// Một số trang CTD dùng useParams (cần id trong URL), một số dùng useLocation (đọc state).
// Để xử lý cả hai: luôn embed id vào path VÀ truyền state — useParams đọc path, useLocation đọc state.
const getDetailPath = (maBm: string, idphieu: string): string => {
  switch (maBm) {
    case BM_CONFIG.CTD.CTD_BB_Phoinong:
      // TaoPhieuPhoiNong render đầy đủ form; ChiTietPhieuPhoiNong chỉ có view đơn giản
      return `/chitietphieuphoinong/${idphieu}`;
    case BM_CONFIG.CTD.CTD_BB_Phoinguoi:
      // route không có :id param, component đọc state
      return `/chitietphieuphoinguoi`;
    case BM_CONFIG.CTD.CTD_BB_GiaoNhanPhoi:
      return `/chitietbienbangiaoNhanphoi/${idphieu}`;
    case BM_CONFIG.CTD.CTD_BB_GiaoNhanPhoiNhapKho:
      return `/chitietbienbanphoinapkho/${idphieu}`;
    case BM_CONFIG.CTD.CTD_BB_Sanluongphoi:
      return `/chitietbienbansanluongphoi/${idphieu}`;
    case BM_CONFIG.CTD.CTD_BB_PhoiNapnguoi:
      return `/chitietbienbanphoinapnguoi/${idphieu}`;
    case BM_CONFIG.CTD.CTD_STD_Sanxuat:
      return `/chitietsotheodoisanxuat/${idphieu}`;
    case BM_CONFIG.CTD.CTD_KPH_Sanxuat:
      return `/chitietphieuxulykph/${idphieu}`;
    case BM_CONFIG.CTD.CTD_BB_SanLuong_KCS:
      return `/chitietsanluongkcs/${idphieu}`;
    default:
      return `/`;
  }
};

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface ThongKePhieuCTDProps {
  type?: string;
}

const ThongKePhieuCTD = ({ type }: ThongKePhieuCTDProps) => {
  const navigate = useNavigate();
  const [checkLoading, setCheckLoading] = useState(false);

  const transformFilters = useCallback(
    (filters: PhieuFilterValues): Partial<SearchPhieuRequest> => {
      const loaiBMList =
        (filters.loaiBM as (string | number)[] | undefined) ?? [];
      const maBmList =
        loaiBMList.length > 0
          ? loaiBMList.map((k) => LOAI_BM_TO_MABM[String(k)]).filter(Boolean)
          : null;
      return {
        tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as
          | string
          | null,
        denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
        ca: normalizeNum(filters.ca),
        searchText: (filters.soPhieu || null) as string | null,
        tinhTrang: normalizeNum(filters.tinhTrang),
        ...(maBmList ? { maBmList, maBm: null } : {}),
      };
    },
    [],
  );

  const filterFieldsConfig = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "loaiBM",
        label: "Loại biểu mẫu",
        type: "multiselect",
        options: [
          { label: "Biên bản phôi nóng", value: "PhoiNong" },
          // { label: "Biên bản phôi nguội", value: "PhoiNguoi" },
          { label: "Biên bản giao nhận phôi", value: "GiaoNhanPhoi" },
          // { label: "Biên bản phôi nhập kho", value: "PhoiNhapKho" },
          // { label: "Biên bản sản lượng phôi", value: "SanLuongPhoi" },
          { label: "Biên bản phôi nạp nguội", value: "PhoiNapNguoi" },
          { label: "Sổ theo dõi sản xuất", value: "SoTheoDoiSX" },
          { label: "Phiếu xử lý KPH", value: "PhieuKPH" },
          { label: "Biên bản xác nhận sản lượng", value: "SanLuongKCS" },
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
      {
        key: "tinhTrang",
        label: "Tình trạng",
        type: "select",
        options: DEFAULT_TINH_TRANG_OPTIONS,
      },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        title: <b>Số Phiếu</b>,
        dataIndex: "soPhieu",
        key: "soPhieu",
        width: 300,
        render: (text: string, record: TableRecord) => (
          <b
            style={{ color: "#1976d2", cursor: "pointer" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const maBm = record.maBm as string;
              const path = getDetailPath(maBm, record.idphieu);
              if (path === "/") return;
              if (maBm === BM_CONFIG.CTD.CTD_BB_Phoinong) {
                const userInfo = JSON.parse(
                  localStorage.getItem("userinfo") || "null",
                );
                navigate(path, {
                  state: {
                    idphieu: record.idphieu,
                    thongtinphieu: record,
                    type: type === "viecdentoi" ? "viecdentoi" : "tao",
                    userInfo,
                  },
                });
              } else if (type === "viecdentoi") {
                navigate(path, {
                  state: {
                    idphieu: record.idphieu,
                    pheduyet: record?.pheDuyet?.[0] ?? null,
                  },
                });
              } else {
                navigate(path, { state: { idphieu: record.idphieu } });
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
        width: 150,
        render: (value: number) =>
          value === 1 ? "(1) Ca Ngày" : value === 2 ? "(2) Ca Đêm" : "-",
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
        width: 180,
        render: (status: number) => (
          <Tag color={PHIEU_STATUS_CONFIG[status]?.color || "default"}>
            {PHIEU_STATUS_CONFIG[status]?.text || status}
          </Tag>
        ),
      },
    ],
    [navigate, type],
  );

  const handleChotBatch = useCallback(
    async (ids: string[]): Promise<ChotResult> => {
      await PhieuApi.chotNhieuPhieu(ids, TrangThaiPhieuConst.DaChot);
      return { successCount: ids.length, failures: [] };
    },
    [],
  );

  const handleHuyChotBatch = useCallback(
    async (ids: string[]): Promise<ChotResult> => {
      await PhieuApi.chotNhieuPhieu(ids, TrangThaiPhieuConst.HoanThanh);
      return { successCount: ids.length, failures: [] };
    },
    [],
  );

  const handleCheckPhieu = useCallback(
    async (isCheck: number, ctx: ExtraActionsCtx) => {
      if (ctx.selectedKeys.length === 0) return;
      try {
        setCheckLoading(true);
        await PhieuApi.checkNhieuPhieu(ctx.selectedKeys, isCheck);
        ctx.refetch();
      } finally {
        setCheckLoading(false);
      }
    },
    [],
  );

  const renderExtraActions = useCallback(
    (ctx: ExtraActionsCtx) => (
      <>
        <Button
          icon={<CheckCircleOutlined />}
          disabled={ctx.selectedKeys.length === 0}
          loading={checkLoading}
          onClick={() => handleCheckPhieu(1, ctx)}
        >
          Check ({ctx.selectedKeys.length})
        </Button>
        <Button
          icon={<CloseCircleOutlined />}
          danger
          disabled={ctx.selectedKeys.length === 0}
          loading={checkLoading}
          onClick={() => handleCheckPhieu(0, ctx)}
        >
          Bỏ check ({ctx.selectedKeys.length})
        </Button>
      </>
    ),
    [checkLoading, handleCheckPhieu],
  );

  return (
    <ThongKePhieuCommon
      maBmList={MABM_LIST}
      title="Tổng hợp phiếu CTD"
      type={type}
      columns={columns}
      filterFields={filterFieldsConfig}
      transformFilters={transformFilters}
      onChotPhieu={handleChotBatch}
      onHuyChotPhieu={handleHuyChotBatch}
      renderExtraActions={renderExtraActions}
      rowClickToggleSelect
    />
  );
};

export default ThongKePhieuCTD;
