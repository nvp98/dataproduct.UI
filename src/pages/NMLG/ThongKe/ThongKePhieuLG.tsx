import { Button, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LG_BB_NapLieuLoCao from "../../../utils/BM_config/LG_BB_NapLieuLoCao.json";
import LG_BB_TonSiLo from "../../../utils/BM_config/LG_BB_TonSiLo.json";
import LG_BB_PhunThanLoCao from "../../../utils/BM_config/LG_BB_PhunThanLoCao.json";
import type { FilterFieldConfig } from "../../../components/PhieuFilterCard";
import ThongKePhieuCommon, {
  type ExtraActionsCtx,
  type TableRecord,
} from "../../../components/ThongKePhieuCommon";
import { DEFAULT_TINH_TRANG_OPTIONS } from "../../../utils/ConfigDefault/thongKePhieuDefaults";
import type { SearchPhieuRequest } from "../../../models/Phieu";
import type { PhieuFilterValues } from "../../../components/PhieuFilterCard";
import { PhieuApi } from "../../../services/PhieuApi";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";

const MABM_NAPLIEU = LG_BB_NapLieuLoCao.code as string;
const MABM_TONSILO = LG_BB_TonSiLo.code as string;
const MABM_NKVH = LG_BB_PhunThanLoCao.code as string;

const MABM_LIST: string[] = [MABM_NAPLIEU, MABM_TONSILO, MABM_NKVH];

const LOAI_BM_TO_MABM: Record<string, string> = {
  NapLieuLoCao: MABM_NAPLIEU,
  TonSiLoLoCao: MABM_TONSILO,
  NKVHPhunThan: MABM_NKVH,
};

// maBm -> route chi tiết / tạo phiếu (giữ đúng route riêng của từng biểu mẫu NMLG hiện có).
const DETAIL_ROUTE: Record<string, string> = {
  [MABM_NAPLIEU]: "chitietbienbannaplieulocao",
  [MABM_TONSILO]: "chitiettonsilolocao",
  [MABM_NKVH]: "chitietnkvhthanphunlocao",
};

const CREATE_ROUTE: Record<string, string> = {
  [MABM_NAPLIEU]: "taophieubienbannaplieulocao",
  [MABM_TONSILO]: "taophieutonsilolocao",
  [MABM_NKVH]: "taophieunkvhthanphunlocao",
};

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface ThongKePhieuLGProps {
  type?: string;
}

const ThongKePhieuLG = ({ type }: ThongKePhieuLGProps) => {
  const navigate = useNavigate();
  const [checkLoading, setCheckLoading] = useState(false);

  const transformFilters = useCallback(
    (filters: PhieuFilterValues): Partial<SearchPhieuRequest> => {
      const loaiBMList = (filters.loaiBM as (string | number)[] | undefined) ?? [];
      const maBmList =
        loaiBMList.length > 0
          ? loaiBMList.map((k) => LOAI_BM_TO_MABM[String(k)]).filter(Boolean)
          : null;
      return {
        tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
        denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
        ca: normalizeNum(filters.ca),
        kip: (filters.kip as string | null | undefined) || null,
        scope: normalizeNum(filters.scope),
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
          { label: "Sổ theo dõi nạp liệu lò cao", value: "NapLieuLoCao" },
          { label: "Sổ giao nhận tồn silo lò cao", value: "TonSiLoLoCao" },
          { label: "Nhật ký vận hành phun than lò cao", value: "NKVHPhunThan" },
        ],
      },
      {
        key: "ngaySX",
        label: "Ngày sản xuất",
        type: "dateRange",
        placeholder: "Khoảng ngày",
      },
      {
        key: "scope",
        label: "Lò cao",
        type: "select",
        placeholder: "Chọn lò cao",
        options: [1, 2, 3, 4, 5, 6].map((v) => ({ label: `Lò Cao ${v}`, value: v })),
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
      {
        key: "ca",
        label: "Ca",
        type: "select",
        placeholder: "Chọn ca",
        options: [
          { label: "Ca 1", value: 1 },
          { label: "Ca 2", value: 2 },
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
        width: 280,
        render: (text: string, record: TableRecord) => (
          <b
            style={{ color: "#1976d2", cursor: "pointer" }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const maBm = record.maBm as string;
              const detailRoute = DETAIL_ROUTE[maBm];
              const createRoute = CREATE_ROUTE[maBm];
              if (!detailRoute) return;
              if (type === "viecdentoi" || type === "xemphieu") {
                return navigate(`/${detailRoute}/${record.idphieu}`);
              }
              if (record.tinhTrang === 0 || record.tinhTrang === 3 || record.tinhTrang === 7) {
                return navigate(`/${createRoute}/${record.idphieu}`);
              }
              return navigate(`/${detailRoute}/${record.idphieu}`);
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
        width: 220,
        ellipsis: true,
      },
      {
        title: "Lò cao",
        dataIndex: "scope",
        key: "scope",
        width: 120,
        render: (value: number | string) => (value ? `Lò Cao ${value}` : "-"),
      },
      {
        title: "Kíp",
        dataIndex: "kip",
        key: "kip",
        width: 100,
        render: (value: string) => value || "-",
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
        title: "Ngày sản xuất",
        dataIndex: "ngaySX",
        key: "ngaySX",
        width: 190,
        render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
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

  const handleCheckPhieu = useCallback(async (isCheck: number, ctx: ExtraActionsCtx) => {
    if (ctx.selectedKeys.length === 0) return;
    try {
      setCheckLoading(true);
      await PhieuApi.checkNhieuPhieu(ctx.selectedKeys, isCheck);
      ctx.refetch();
    } finally {
      setCheckLoading(false);
    }
  }, []);

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
      title="Tổng hợp phiếu NM.LG"
      type={type}
      columns={columns}
      filterFields={filterFieldsConfig}
      transformFilters={transformFilters}
      renderExtraActions={renderExtraActions}
    />
  );
};

export default ThongKePhieuLG;
