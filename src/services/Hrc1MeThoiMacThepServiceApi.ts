import apiService from "./ApiService";
import type { AutocompleteSearchParams, AutocompleteSearchResult } from "../components/CommonAutocomplete";
import type { HRCTextAutocompleteOption } from "../components/CustomTableHRC";

interface MacThepSearchResponse {
  data: Array<{ id: number; tenMacThep: string }>;
  totalRecords: number;
}

export const hrc1MeThoiMacThepServiceApi = {
  /**
   * POST /api/DLNMHRC1/search-me-thoi — đọc Tbl_MeThoi bên DB Master (mirror
   * BBGN_ThepLongService.SearchMeThoi). BE trả thẳng string[] (MaMeThoi).
   * @param idLoThoi Lò thổi đang chọn trên phiếu (BOF: chính là Scope 1-5) — chỉ tìm đúng lò đó.
   * Bỏ trống (undefined/null) → BE fallback tìm trên toàn bộ lò thổi nhà máy 1.
   */
  searchMeThoi: async (
    params: AutocompleteSearchParams,
    idLoThoi?: number | null
  ): Promise<AutocompleteSearchResult<HRCTextAutocompleteOption>> => {
    const list = (await apiService.post("/api/DLNMHRC1/search-me-thoi", {
      SearchStr: params.searchKey,
      IdLoThoi: idLoThoi ?? null,
    })) as string[];
    const data = (list ?? []).map((meThoi) => ({ value: meThoi, label: meThoi }));
    return { data, totalRecords: data.length };
  },

  /** POST /api/MacThep/search — payload mặc định nhaMay=1, isXacNhan=true theo yêu cầu. */
  searchMacThep: async (
    params: AutocompleteSearchParams
  ): Promise<AutocompleteSearchResult<HRCTextAutocompleteOption>> => {
    const res = (await apiService.post("/api/MacThep/search", {
      SearchKey: params.searchKey,
      NhaMay: 1,
      IsXacNhan: true,
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 30,
    })) as MacThepSearchResponse;
    const data = (res?.data ?? []).map((item) => ({ value: item.tenMacThep, label: item.tenMacThep }));
    return { data, totalRecords: res?.totalRecords ?? data.length };
  },
};
