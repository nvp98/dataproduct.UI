import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PhieuApi } from "../services/PhieuApi";
import type { SearchPhieuRequest, SearchPhieuResponseModel } from "../models/Phieu";
import type { PhieuFilterValues } from "../components/PhieuFilterCard";
import { getThongTinUser } from "../utils/constants/GetThongTinLocalStore";
import { isAdminUser } from "../utils/helpers/checkAdminRole";

// Keyed by React Router location.key — restore khi Back, fresh khi navigate forward
const _requestCache = new Map<string, SearchPhieuRequest>();

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
  fixedFilters?: Partial<SearchPhieuRequest>;
  autoLoad?: boolean;
  isViecdentoi?: boolean;
  transformFilters?: (filters: PhieuFilterValues) => Partial<SearchPhieuRequest>;
  /** Giữ lại filter khi Back từ trang chi tiết.
   *  true → tự lấy key từ location.key; string → dùng key tường minh */
  persistKey?: string | true;
}

const normalizeNumber = (value: string | number | undefined): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const defaultTransform = (filters: PhieuFilterValues): Partial<SearchPhieuRequest> => ({
  tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
  denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
  ca: normalizeNumber(filters.ca),
  scope: normalizeNumber(filters.scope),
  mayDuc: normalizeNumber(filters.mayDuc),
  searchText: (filters.soPhieu || filters.searchText || null) as string | null,
});

export const usePhieuSearchList = ({
  maBm,
  maBmList,
  initialPageSize = 10,
  fixedFilters = {},
  autoLoad = true,
  isViecdentoi = false,
  transformFilters = defaultTransform,
  persistKey,
}: UsePhieuSearchListOptions) => {
  const location = useLocation();
  const locationKey = typeof persistKey === "string" ? persistKey : location.key;
  // Kiểm tra user có phải PKH không (tenNgan = "P.KH" hoặc iD_PhongBan = 70)
  const isPKH = useMemo(() => {
    const user = getThongTinUser();
    return user.tenNgan === "P.KH" || user.iD_PhongBan === 70;
  }, []);

  // PKH: bỏ usercode (xem tất cả phiếu), không giới hạn theo tình trạng
  const effectiveFixedFilters = useMemo(() => {
    if (isPKH) {
      const rest = { ...(fixedFilters as Record<string, unknown>) };
      delete rest.usercode;
      delete rest.nguoiTaoId;
      delete rest.nguoiDuyetId;
      return rest;
    }
     const user = getThongTinUser();
    if (isViecdentoi && !isPKH && !isAdminUser(user) ) {
      const rest = { ...(fixedFilters as Record<string, unknown>) };
      rest.nguoiDuyetId =  user.iD_TaiKhoan;
      // rest.nguoiTaoId =  user.iD_TaiKhoan;
      return rest;
    }
    console.log("Applying fixed filters for non-PKH user:", fixedFilters);
    return fixedFilters;
  }, [isPKH, fixedFilters, isViecdentoi]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchPhieuResponseModel[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState<SearchPhieuRequest | null>(null);

  const buildRequest = useCallback(
    (page: number, pageSize: number, overrides?: Partial<SearchPhieuRequest>): SearchPhieuRequest => ({
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
    }),
    [effectiveFixedFilters, maBm, maBmList]
  );

  const fetchData = useCallback(async (request: SearchPhieuRequest) => {
    setLoading(true);
    try {
      const res = await PhieuApi.search(request);
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
      if (persistKey) _requestCache.set(locationKey, request);
      fetchData(request);
    },
    [buildRequest, fetchData, locationKey, pagination.pageSize, persistKey, transformFilters]
  );

  const handleClearFilter = useCallback(() => {
    if (persistKey) _requestCache.delete(locationKey);
    const request = buildRequest(1, pagination.pageSize);
    fetchData(request);
  }, [buildRequest, fetchData, locationKey, pagination.pageSize, persistKey]);

  const onPageChange = useCallback(
    (page: number, pageSize: number) => {
      const base = currentFilter ?? buildRequest(page, pageSize);
      const request = { ...base, page, pageSize };
      if (persistKey) _requestCache.set(locationKey, request);
      fetchData(request);
    },
    [buildRequest, currentFilter, fetchData, locationKey, persistKey]
  );

  useEffect(() => {
    if (autoLoad) {
      if (persistKey) {
        const cached = _requestCache.get(locationKey);
        if (cached) {
          fetchData(cached);
          return;
        }
      }
      const initialRequest = buildRequest(1, initialPageSize);
      fetchData(initialRequest);
    }
  }, [autoLoad, buildRequest, fetchData, initialPageSize, locationKey, persistKey]);

  return {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
    refetch: () => {
      if (currentFilter) {
        fetchData(currentFilter);
      } else {
        handleClearFilter();
      }
    },
  };
};

