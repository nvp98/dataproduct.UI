import { Button, message, Tooltip } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { MayDucServiceApi } from "../../../services/MayDucServiceApi";
import type { NhaMayEnum } from "../../../models/SiloModel";
import { HRC1Api } from "../../../services/HRC1_BBGNApi";
import { Tag } from "antd";

const MABM_DETAIL_ROUTE: Record<string, string> = {
  HRC1_BB_Lothoi: "/taotieuhaolothoi",
  HRC1_TinhLuyen: "/taophieugiaonhantheplong_hrc1",
  HRC1_BBGN_ThepLong: "/chitietgiaonhantheplong_hrc1",
  HRC1_BB_TieuHao_BOF: "/hrc1_chitiettieuhaolothoi_bof",
};

const MABM_LIST: string[] = [
  // BM_CONFIG.HRC1.HRC1_BB_Lothoi,
  // BM_CONFIG.HRC1.HRC1_TinhLuyen,
  BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
  BM_CONFIG.HRC1.HRC1_BB_TieuHao_BOF,
];

const LOAI_BM_TO_MABM: Record<string, string> = {
  LoThoi: BM_CONFIG.HRC1.HRC1_BB_Lothoi,
  TinhLuyen: BM_CONFIG.HRC1.HRC1_TinhLuyen,
  BBGN_ThepLong: BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
  BB_TieuHao_BOF: BM_CONFIG.HRC1.HRC1_BB_TieuHao_BOF,
};

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface ThongKePhieuHRC1Props {
  type?: string;
}

const ThongKePhieuHRC1 = ({ type }: ThongKePhieuHRC1Props) => {
  const navigate = useNavigate();
  const [selectedLoaiBM, setSelectedLoaiBM] = useState<string[]>([]);
  const [mayDucOptions, setMayDucOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await MayDucServiceApi.search({
          nhaMay: 1 as NhaMayEnum,
          isLock: false,
          page: 1,
          pageSize: 200,
        });
        if (cancelled) return;
        setMayDucOptions((res.data || []).map((x) => ({ label: x.tenMayDuc, value: x.id })));
      } catch (error) {
        console.error("Load máy đúc options failed:", error);
        if (!cancelled) setMayDucOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const transformFilters = useCallback((filters: PhieuFilterValues): Partial<SearchPhieuRequest> => {
    const loaiBMList = (filters.loaiBM as (string | number)[] | undefined) ?? [];
    const maBmList = loaiBMList.length > 0
      ? loaiBMList.map((k) => LOAI_BM_TO_MABM[String(k)]).filter(Boolean)
      : null;
    return {
      tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
      denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
      ca: normalizeNum(filters.ca),
      scope: normalizeNum(filters.scope),
      searchText: (filters.soPhieu || null) as string | null,
      tinhTrang: normalizeNum(filters.tinhTrang),
      ...(maBmList ? { maBmList, maBm: null } : {}),
    };
  }, []);

  const filterFieldsConfig = useMemo<FilterFieldConfig[]>(() => {
    const fields: FilterFieldConfig[] = [
      {
        key: "loaiBM",
        label: "Loại biểu mẫu",
        type: "multiselect",
        options: [
          { label: "Lò thổi", value: "LoThoi" },
          { label: "Tinh luyện", value: "TinhLuyen" },
          { label: "Giao nhận thép lỏng", value: "BBGN_ThepLong" },
          { label: "Tiêu hao lò thổi BOF", value: "BB_TieuHao_BOF" },
        ],
      },
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
    ];

    // Scope options: LoThoi không có scope, BBGN_ThepLong dùng máy đúc
    const scopeOptionsMap: Record<string, { label: string; value: number }[]> = {
      BBGN_ThepLong: mayDucOptions,
    };
    const scopeOptions = selectedLoaiBM.length === 0
      ? mayDucOptions
      : selectedLoaiBM.length === 1
        ? (scopeOptionsMap[selectedLoaiBM[0]] ?? [])
        : (() => {
            const seen = new Set<number>();
            return selectedLoaiBM
              .flatMap((k) => scopeOptionsMap[k] ?? [])
              .filter((o) => {
                if (seen.has(o.value)) return false;
                seen.add(o.value);
                return true;
              });
          })();

    if (scopeOptions.length > 0) {
      fields.push({ key: "scope", label: "Máy đúc", type: "select", options: scopeOptions });
    }

    fields.push({ key: "tinhTrang", label: "Tình trạng", type: "select", options: DEFAULT_TINH_TRANG_OPTIONS });

    return fields;
  }, [mayDucOptions, selectedLoaiBM]);

  const columns = useMemo(() => [
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
            const route = MABM_DETAIL_ROUTE[record.maBm as string];
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
      title: "Khu vực",
      dataIndex: "tenScope",
      key: "tenScope",
      width: 200,
      ellipsis: true,
      render: (value: string | null | undefined, record: { scope?: number | string | null }) => {
        if (value) return value;
        if (record.scope !== null && record.scope !== undefined) return record.scope;
        return null;
      },
    },
    {
      title: "Số mẻ",
      key: "nguoiTaoOrSoMe",
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: TableRecord) => {
        if (record.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong) {
          const count = (record as TableRecord & { soLuongMe?: number | null }).soLuongMe;
          return count != null ? <span>{count} mẻ </span> : "-";
        }
        return record.nguoiTaoId ?? "-";
      },
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
  ], [navigate, type]);

  const handleChotBatch = useCallback(async (ids: string[], dataMap: Map<string, TableRecord>): Promise<ChotResult> => {
    const bbgnIds = ids.filter((id) => dataMap.get(id)?.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong);
    const otherIds = ids.filter((id) => dataMap.get(id)?.maBm !== BM_CONFIG.HRC1.HRC1_BBGN_ThepLong);

    const failures: ChotResult["failures"] = [];
    let successCount = 0;

    if (bbgnIds.length > 0) {
      const result = await HRC1Api.chotPhieuBatch(bbgnIds);
      successCount += result.thanhCong.length;
      failures.push(...result.thatBai);
    }
    if (otherIds.length > 0) {
      await PhieuApi.chotNhieuPhieu(otherIds, TrangThaiPhieuConst.DaChot);
      successCount += otherIds.length;
    }
    return { successCount, failures };
  }, []);

  const handleHuyChotBatch = useCallback(async (ids: string[], dataMap: Map<string, TableRecord>): Promise<ChotResult> => {
    const bbgnIds = ids.filter((id) => dataMap.get(id)?.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong);
    const otherIds = ids.filter((id) => dataMap.get(id)?.maBm !== BM_CONFIG.HRC1.HRC1_BBGN_ThepLong);

    const failures: ChotResult["failures"] = [];
    let successCount = 0;

    if (bbgnIds.length > 0) {
      const result = await HRC1Api.huyChotPhieuBatch(bbgnIds);
      successCount += result.thanhCong.length;
      failures.push(...result.thatBai);
    }
    if (otherIds.length > 0) {
      await PhieuApi.chotNhieuPhieu(otherIds, TrangThaiPhieuConst.HoanThanh);
      successCount += otherIds.length;
    }
    return { successCount, failures };
  }, []);

  const handleExportBulk = useCallback(async (selectedKeys: string[]) => {
    try {
      setExportLoading(true);
      await HRC1Api.exportBulkExcel(selectedKeys);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Xuất Excel thất bại.");
    } finally {
      setExportLoading(false);
    }
  }, []);

  const renderExtraActions = useCallback(({ selectedKeys, selectedMaBm }: ExtraActionsCtx) => (
    <Tooltip title={selectedKeys.length > 0 && !selectedMaBm ? "Chỉ xuất được nhiều phiếu cùng loại biểu mẫu" : undefined}>
      <Button
        disabled={selectedKeys.length === 0 || !selectedMaBm}
        loading={exportLoading}
        onClick={() => handleExportBulk(selectedKeys)}
      >
        Export Excel ({selectedKeys.length})
      </Button>
    </Tooltip>
  ), [exportLoading, handleExportBulk]);

  return (
    <ThongKePhieuCommon
      maBmList={MABM_LIST}
      title="Tổng hợp phiếu HRC1"
      type={type}
      mabmDetailRoute={MABM_DETAIL_ROUTE}
      columns={columns}
      filterFields={filterFieldsConfig}
      transformFilters={transformFilters}
      onFilterFieldChange={(key, value) => {
        if (key === "loaiBM") setSelectedLoaiBM(Array.isArray(value) ? value.map(String) : []);
      }}
      onChotPhieu={handleChotBatch}
      onHuyChotPhieu={handleHuyChotBatch}
      renderExtraActions={renderExtraActions}
      rowClickToggleSelect
    />
  );
};

export default ThongKePhieuHRC1;
