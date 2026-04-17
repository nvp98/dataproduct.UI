import { useCallback, useEffect, useMemo, useState } from "react";
import { PhieuApi } from "../services/PhieuApi";
import type { SearchPhieuByUserRequest, SearchPhieuResponseModel } from "../models/Phieu";
import type { PhieuFilterValues } from "../components/PhieuFilterCard";
import { getThongTinUser } from "../utils/constants/GetThongTinLocalStore";

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

  // PKH: bỏ userId để backend trả hết (không lọc quyền), xem tất cả phiếu
  // [API cũ] delete rest.nguoiTaoId / rest.nguoiDuyetId
  // [API mới] delete rest.userId - backend không lọc khi không có userId
  const effectiveFixedFilters = useMemo(() => {
    if (isPKH) {
      const rest = { ...(fixedFilters as Record<string, unknown>) };
      // [API cũ - đã thay bằng userId]
      // delete rest.usercode;
      // delete rest.nguoiTaoId;
      // delete rest.nguoiDuyetId;
      delete rest.userId; // [API mới] PKH không truyền userId → backend trả hết
      return rest;
    }
    return fixedFilters;
  }, [isPKH, fixedFilters]);

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
    refetch: () => {
      if (currentFilter) {
        fetchData(currentFilter);
      } else {
        handleClearFilter();
      }
    },
  };
};

