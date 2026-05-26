import { useCallback, useEffect, useMemo, useState } from "react";
import { PhieuApi } from "../services/PhieuApi";
import type { SearchPhieuByUserRequest, SearchPhieuResponseModel } from "../models/Phieu";
import type { PhieuFilterValues } from "../components/PhieuFilterCard";
import { getThongTinUser } from "../utils/constants/GetThongTinLocalStore";
import { BmQuyenXlApi, type BmQuyenXlModel } from "../services/BmQuyenXlApi";
import { bmQuyenConfig } from "../utils/configs/bmQuyenConfig";

interface PagedResponse<T> {
  data?: T[];
  Data?: T[];
  totalRecords?: number;
  TotalRecords?: number;
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
  totalPages?: number;
  TotalPages?: number;
}

export interface UsePhieuSearchListOptions {
  maBm?: string;
  maBmList?: string[];
  initialPageSize?: number;
  fixedFilters?: Partial<SearchPhieuByUserRequest>;
  autoLoad?: boolean;
  transformFilters?: (filters: PhieuFilterValues) => Partial<SearchPhieuByUserRequest>;
}

const normalizeNumber = (value: string | number | undefined): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const defaultTransform = (filters: PhieuFilterValues): Partial<SearchPhieuByUserRequest> => ({
  tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
  denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
  ca: normalizeNumber(filters.ca),
  scope: normalizeNumber(filters.scope),
  mayDuc: normalizeNumber(filters.mayDuc),
  searchText: (filters.soPhieu || filters.searchText || null) as string | null,
});

export const usePhieuSearchListHRC = ({
  maBm,
  maBmList,
  initialPageSize = 10,
  fixedFilters = {},
  autoLoad = true,
  transformFilters = defaultTransform,
}: UsePhieuSearchListOptions) => {
  // Kiểm tra user có phải PKH không (tenNgan = "P.KH" hoặc iD_PhongBan = 70)
  const isPKH = useMemo(() => {
    const user = getThongTinUser();
    return user.tenNgan === "P.KH" || user.iD_PhongBan === 70;
  }, []);

  // PKH: bỏ userId để backend không lọc theo quyền cá nhân.
  // ThongKe pages tự set loaiVung=4+isThongKeUser=true nên backend trả hết phiếu.
  // Non-ThongKe pages (loaiVung 1/2/3) không có userId → backend trả rỗng (đúng hành vi).
  const effectiveFixedFilters = useMemo(() => {
    // if (isPKH) {
    //   const rest = { ...(fixedFilters as Record<string, unknown>) };
    //   delete rest.userId;
    //   return rest;
    // }
    return fixedFilters;
  }, [isPKH, fixedFilters]);

  // ── Permission records: fetched once per userId, used to filter scope options ──
  const [userQuyenRecords, setUserQuyenRecords] = useState<BmQuyenXlModel[] | null>(null);

  const effectiveUserId = useMemo(
    () => (effectiveFixedFilters as Record<string, unknown>).userId as number | undefined,
    [effectiveFixedFilters]
  );

  useEffect(() => {
    if (!effectiveUserId || effectiveUserId <= 0) {
      setUserQuyenRecords(null);
      return;
    }
    BmQuyenXlApi.getByTaiKhoan(effectiveUserId)
      .then((res) => {
        const arr: BmQuyenXlModel[] = Array.isArray(res) ? res : ((res as any)?.data ?? []);
        setUserQuyenRecords(arr);
      })
      .catch(() => setUserQuyenRecords(null));
  }, [effectiveUserId]);

  /**
   * Trả về options cho filter scope của một BM, đã lọc theo MaKhuVuc của user.
   * - isThongKeUser / chưa load records → trả tất cả options trong bmQuyenConfig.
   * - MaKhuVuc="ALL" → trả tất cả.
   * - Không có record nào cho BM đó → fallback trả tất cả (graceful).
   */
  const getAllowedScopeOptions = useCallback(
    (maBm: string, customAllOptions?: Array<{ label: string; value: number }>): Array<{ label: string; value: number }> => {
      const bmDef = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
      const allOptions = customAllOptions ?? (bmDef?.scope ?? []).map((s) => ({
        value: Number(s.maKhuVuc),
        label: s.tenKhuVuc,
      }));

      if (allOptions.length === 0) return [];

      const ctx = effectiveFixedFilters as Record<string, unknown>;
      if (ctx.isThongKeUser === true || !userQuyenRecords) return allOptions;

      const loaiVung = Number(ctx.loaiVung ?? 1);
      const relevantQuyens =
        loaiVung === 2 ? new Set([2, 4]) :
        loaiVung === 3 ? new Set([5]) :
        new Set([1, 4]); // default loaiVung=1

      const bmRecords = userQuyenRecords.filter(
        (r) =>
          r.maBm === maBm &&
          r.quyenChucNang != null &&
          relevantQuyens.has(Number(r.quyenChucNang))
      );

      if (bmRecords.length === 0) return allOptions;
      if (bmRecords.some((r) => !r.maKhuVuc || r.maKhuVuc === "ALL")) return allOptions;

      const allowed = new Set(bmRecords.map((r) => r.maKhuVuc));
      return allOptions.filter((opt) => allowed.has(String(opt.value)));
    },
    [userQuyenRecords, effectiveFixedFilters]
  );

  const getAllowedBmOptions = useCallback(
    (bmOptions: Array<{ label: string; value: string }>): Array<{ label: string; value: string }> => {
      const ctx = effectiveFixedFilters as Record<string, unknown>;
      if (ctx.isThongKeUser === true || !userQuyenRecords) return bmOptions;

      const loaiVung = Number(ctx.loaiVung ?? 1);
      const relevantQuyens =
        loaiVung === 2 ? new Set([2, 4]) :
        loaiVung === 3 ? new Set([5]) :
        new Set([1, 4]);

      const accessibleBms = new Set(
        userQuyenRecords
          .filter((r) => r.quyenChucNang != null && relevantQuyens.has(Number(r.quyenChucNang)))
          .map((r) => r.maBm)
          .filter(Boolean)
      );

      if (accessibleBms.size === 0) return bmOptions;
      return bmOptions.filter((opt) => accessibleBms.has(opt.value));
    },
    [userQuyenRecords, effectiveFixedFilters]
  );

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchPhieuResponseModel[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState<SearchPhieuByUserRequest | null>(null);

  const buildRequest = useCallback(
    (page: number, pageSize: number, overrides?: Partial<SearchPhieuByUserRequest>): SearchPhieuByUserRequest => {
      const merged = { ...effectiveFixedFilters, ...overrides } as Record<string, unknown>;
      const rawLv = merged.loaiVung;
      const loaiVung =
        rawLv === null || rawLv === undefined || rawLv === ""
          ? 1
          : Number.isFinite(Number(rawLv))
            ? Number(rawLv)
            : 1;
      return {
        page,
        pageSize,
        maBm: maBmList ? undefined : maBm,
        maBmList: maBmList ?? undefined,
        tuNgay: null,
        denNgay: null,
        ca: null,
        scope: null,
        mayDuc: null,
        searchText: null,
        ...effectiveFixedFilters,
        ...overrides,
        loaiVung,
      };
    },
    [effectiveFixedFilters, maBm, maBmList]
  );

  const fetchData = useCallback(async (request: SearchPhieuByUserRequest) => {
    setLoading(true);
    try {
      const res = await PhieuApi.searchByUser(request);
      const payload = res as PagedResponse<SearchPhieuResponseModel>;
      const responseData = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.Data)
        ? payload.Data
        : [];

      const normalizedData = isPKH
        ? responseData.filter((item: SearchPhieuResponseModel) => {
            const row = item as unknown as Record<string, unknown>;
            const isDelete = row.isDelete === true || row.IsDelete === true || row.isDelete === 1 || row.IsDelete === 1;
            const isLock = row.isLock === true || row.IsLock === true || row.isLock === 1 || row.IsLock === 1;
            return !(isDelete && isLock);
          })
        : responseData;
      setData(normalizedData);
      setCurrentFilter(request);

      const totalRecords = payload?.totalRecords ?? payload?.TotalRecords ?? responseData.length;
      setPagination((prev) => ({
        current: payload?.page ?? payload?.Page ?? request.page ?? prev.current,
        pageSize: payload?.pageSize ?? payload?.PageSize ?? request.pageSize ?? prev.pageSize,
        total: totalRecords ?? prev.total,
      }));
    } catch (error) {
      console.error("usePhieuSearchList.fetchData error:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [isPKH]);

  const handleFilter = useCallback(
    (filters: PhieuFilterValues) => {
      const transformed = transformFilters(filters);
      const request = buildRequest(1, pagination.pageSize, {
        ...transformed,
      });
      fetchData(request);
    },
    [buildRequest, fetchData, pagination.pageSize, transformFilters]
  );

  const handleClearFilter = useCallback(() => {
    const request = buildRequest(1, pagination.pageSize);
    fetchData(request);
  }, [buildRequest, fetchData, pagination.pageSize]);

  const onPageChange = useCallback(
    (page: number, pageSize: number) => {
      const base = currentFilter ?? buildRequest(page, pageSize);
      fetchData({ ...base, page, pageSize });
    },
    [buildRequest, currentFilter, fetchData]
  );

  useEffect(() => {
    if (autoLoad) {
      const initialRequest = buildRequest(1, initialPageSize);
      fetchData(initialRequest);
    }
  }, [autoLoad, buildRequest, fetchData, initialPageSize]);

  return {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
    getAllowedScopeOptions,
    getAllowedBmOptions,
    refetch: () => {
      if (currentFilter) {
        fetchData(currentFilter);
      } else {
        handleClearFilter();
      }
    },
  };
};

