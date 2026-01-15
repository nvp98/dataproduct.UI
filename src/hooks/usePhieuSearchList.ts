import { useCallback, useEffect, useState } from "react";
import { PhieuApi } from "../services/PhieuApi";
import type { SearchPhieuRequest, SearchPhieuResponseModel } from "../models/Phieu";
import type { PhieuFilterValues } from "../components/PhieuFilterCard";

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
  maBm: string;
  initialPageSize?: number;
  fixedFilters?: Partial<SearchPhieuRequest>;
  autoLoad?: boolean;
  transformFilters?: (filters: PhieuFilterValues) => Partial<SearchPhieuRequest>;
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
  initialPageSize = 10,
  fixedFilters = {},
  autoLoad = true,
  transformFilters = defaultTransform,
}: UsePhieuSearchListOptions) => {
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
      maBm,
      tuNgay: null,
      denNgay: null,
      ca: null,
      scope: null,
      mayDuc: null,
      searchText: null,
      ...fixedFilters,
      ...overrides,
    }),
    [fixedFilters, maBm]
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

      setData(responseData);
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
  }, []);

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
    refetch: () => {
      if (currentFilter) {
        fetchData(currentFilter);
      } else {
        handleClearFilter();
      }
    },
  };
};

