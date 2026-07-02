import dayjs from "dayjs";
import type { NavigateFunction } from "react-router-dom";
import Tag from "antd/es/tag";
import type { ColumnsType } from "antd/es/table";
import type { FilterFieldConfig, PhieuFilterValues } from "../../components/PhieuFilterCard";
import type { SearchPhieuByUserRequest, SearchPhieuRequest } from "../../models/Phieu";
import { PHIEU_STATUS_CONFIG } from "../constants/TrangThaiPhieuDisplay";
import { TrangThaiPhieuConst } from "../constants/TrangThaiPhieuConstant";
import { getThongTinUser } from "../constants/GetThongTinLocalStore";
import { isAdminUser } from "../helpers/checkAdminRole";
import type { TableRecord } from "../../components/ThongKePhieuCommon";

export const DEFAULT_TINH_TRANG_OPTIONS = [
  { label: "Đang lưu", value: TrangThaiPhieuConst.DangLuu },
  { label: "Đã gửi", value: TrangThaiPhieuConst.DaGui },
  { label: "Hoàn thành", value: TrangThaiPhieuConst.HoanThanh },
  { label: "Đã thu hồi", value: TrangThaiPhieuConst.DaThuHoi },
  { label: "Đã chốt", value: TrangThaiPhieuConst.DaChot },
  { label: "Đang phê duyệt", value: TrangThaiPhieuConst.DangPheDuyet },
  { label: "Hiệu chỉnh", value: TrangThaiPhieuConst.HieuChinh },
];

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

export const defaultTransformFilters = (filters: PhieuFilterValues): Partial<SearchPhieuRequest> => ({
  tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
  denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
  ca: normalizeNum(filters.ca),
  scope: normalizeNum(filters.scope),
  searchText: (filters.soPhieu || null) as string | null,
  tinhTrang: normalizeNum(filters.tinhTrang),
});

export const defaultComputeFixedFilters = (currentUserId: number | null): Partial<SearchPhieuByUserRequest> => {
  const u = getThongTinUser();
  const canThongKe = u.tenNgan === "P.KH" || u.iD_PhongBan === 70 || isAdminUser(u);
  if (canThongKe) return { userId: currentUserId, loaiVung: 4, isThongKeUser: true };
  return { userId: currentUserId, loaiVung: 1 };
};

export const getDefaultFilterFields = (): FilterFieldConfig[] => [
  { key: "ngaySX", label: "Ngày sản xuất", type: "dateRange", placeholder: "Khoảng ngày" },
  {
    key: "ca",
    label: "Ca",
    type: "select",
    options: [
      { label: "Ca ngày (1)", value: 1 },
      { label: "Ca đêm (2)", value: 2 },
    ],
  },
  { key: "soPhieu", label: "Số phiếu", type: "text", placeholder: "Số phiếu..." },
  { key: "tinhTrang", label: "Tình trạng", type: "select", options: DEFAULT_TINH_TRANG_OPTIONS },
];

export interface DefaultColumnsOpts {
  mabmDetailRoute: Record<string, string>;
  type?: string;
  navigate: NavigateFunction;
  rowClickToggleSelect: boolean;
}

export const buildDefaultColumns = ({ mabmDetailRoute, type, navigate, rowClickToggleSelect }: DefaultColumnsOpts): ColumnsType<TableRecord> => [
  {
    title: <b>Số Phiếu</b>,
    dataIndex: "soPhieu",
    key: "soPhieu",
    width: 300,
    render: (text: string, record: TableRecord) => (
      <b
        style={{ color: "#1976d2", cursor: "pointer" }}
        onClick={(e) => {
          if (rowClickToggleSelect) e.stopPropagation();
          const route = mabmDetailRoute[record.maBm as string];
          if (!route) return;
          if (type === "viecdentoi") {
            navigate(route, { state: { idphieu: record.idphieu, pheduyet: record?.pheDuyet?.[0] ?? null } });
          } else {
            navigate(route, { state: { idphieu: record.idphieu } });
          }
        }}
      >
        {text}
      </b>
    ),
  },
  { title: "Quy trình", dataIndex: "maBm", key: "maBm", width: 250, ellipsis: true },
  {
    title: "Ngày lập phiếu",
    dataIndex: "ngaySX",
    key: "ngaySX",
    width: 200,
    render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
  },
  {
    title: "Ca",
    dataIndex: "ca",
    key: "ca",
    width: 200,
    render: (value: number) => (value === 1 ? "(1) Ca Ngày" : value === 2 ? "(2) Ca Đêm" : "-"),
  },
  {
    title: "Trạng thái",
    dataIndex: "tinhTrang",
    key: "tinhTrang",
    width: 200,
    render: (status: number) => (
      <Tag color={PHIEU_STATUS_CONFIG[status]?.color || "default"}>
        {PHIEU_STATUS_CONFIG[status]?.text || status}
      </Tag>
    ),
  },
];
