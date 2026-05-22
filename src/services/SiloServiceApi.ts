import apiService from "./ApiService";
import type { 
  Silo, 
  SiloPayload, 
  SiloSearchResponse, 
  MapSiloPhuLieuNM, 
  MapSiloPhuLieuNMPayload, 
  PhuLieuNM, 
  PhuLieuNMSearchResponse,
  SelectSiloResponse,
  GetSiloByHeaderKeyRequest,
  SiloByHeaderKey,
  SelectPhuLieuNMResponse,
  ResolveSiloRequest,
  ResolvePhuLieuWhenChangeSiloRequest,
  ValidateBeforeSaveRequest
} from "../models/SiloModel";

// Backend response type
interface BackendSilo {
  id?: number;
  Id?: number;
  tenSilo?: string;
  TenSilo?: string;
  theTich?: number;
  TheTich?: number;
  bieuMau?: string;
  BieuMau?: string;
  scope?: number | null;
  Scope?: number | null;
  ngayTao?: string | null;
  NgayTao?: string | null;
  tinhTrang?: boolean;
  TinhTrang?: boolean;
  nhaMay?: number;
  NhaMay?: number;
}

interface BackendSearchResponse {
  data?: BackendSilo[];
  Data?: BackendSilo[];
  totalRecords?: number;
  TotalRecords?: number;
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
}

// Map từ frontend payload sang backend model
const toRequestBody = (payload: SiloPayload) => ({
  TenSilo: payload.tenSilo,
  TheTich: payload.theTich,
  BieuMau: payload.bieuMau,
  Scope: payload.scope ?? null,
  TinhTrang: payload.tinhTrang,
  NhaMay: payload.nhaMay,
});

// Map từ backend response sang frontend model
const toFrontendModel = (data: BackendSilo): Silo => ({
  id: data.id ?? data.Id ?? 0,
  tenSilo: data.tenSilo || data.TenSilo || "",
  theTich: data.theTich ?? data.TheTich ?? 0,
  bieuMau: data.bieuMau || data.BieuMau || "",
  scope: data.scope ?? data.Scope ?? null,
  ngayTao: data.ngayTao || data.NgayTao || null,
  tinhTrang: data.tinhTrang ?? data.TinhTrang ?? true,
  nhaMay: data.nhaMay ?? data.NhaMay ?? 0,
});

export const SiloServiceApi = {
  /**
   * Tìm kiếm Silo với phân trang
   */
  search: async (params: {
    searchKey?: string;
    scope?: number | null;
    tinhTrang?: boolean;
    BieuMau?: string;
    nhaMay?: number;
    page?: number;
    pageSize?: number;
  }): Promise<SiloSearchResponse> => {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params.searchKey) queryParams.searchKey = params.searchKey;
    if (params.scope !== undefined && params.scope !== null) queryParams.scope = params.scope;
    if (params.tinhTrang !== undefined) queryParams.tinhTrang = params.tinhTrang;
    if (params.BieuMau) queryParams.BieuMau = params.BieuMau;
    if (params.nhaMay !== undefined) queryParams.nhaMay = params.nhaMay;
    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;

    const response = (await apiService.get("/api/Silo/search", { params: queryParams })) as BackendSearchResponse;
    
    const dataArray = response.data || response.Data || [];
    
    return {
      data: dataArray.map(toFrontendModel),
      totalRecords: response.totalRecords ?? response.TotalRecords ?? 0,
      page: response.page ?? response.Page ?? 1,
      pageSize: response.pageSize ?? response.PageSize ?? 10,
    };
  },

  /**
   * Lấy tất cả Silo
   */
  getAll: async (): Promise<Silo[]> => {
    const response = (await apiService.get("/api/Silo")) as BackendSilo[];
    return Array.isArray(response) 
      ? response.map(toFrontendModel)
      : [];
  },

  /**
   * Lấy Silo theo ID
   */
  getById: async (id: number): Promise<Silo> => {
    const response = (await apiService.get(`/api/Silo/${id}`)) as BackendSilo;
    return toFrontendModel(response);
  },

  /**
   * Tạo mới Silo
   */
  create: async (payload: SiloPayload): Promise<Silo> => {
    const response = (await apiService.post("/api/Silo", toRequestBody(payload))) as BackendSilo;
    return toFrontendModel(response);
  },

  /**
   * Cập nhật Silo
   */
  update: async (id: number, payload: SiloPayload): Promise<void> => {
    await apiService.put(`/api/Silo/${id}`, toRequestBody(payload));
  },

  /**
   * Xóa Silo
   */
  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/Silo/${id}`);
  },

  // MapSiloPhuLieuNM methods
  /**
   * Lấy danh sách mapping theo Silo ID
   */
  getMappingsBySiloId: async (siloId: number): Promise<MapSiloPhuLieuNM[]> => {
    const response = (await apiService.get(`/api/Silo/mappings/silo/${siloId}`)) as MapSiloPhuLieuNM[];
    return Array.isArray(response) ? response : [];
  },

  /**
   * Tạo mới mapping
   */
  createMapping: async (payload: MapSiloPhuLieuNMPayload): Promise<MapSiloPhuLieuNM> => {
    const backendPayload = {
      SiloId: payload.siloId,
      PhuLieuNMId: payload.phuLieuNMId,
      NgayBatDau: payload.ngayBatDau,
      NgayKetThuc: payload.ngayKetThuc ?? null,
      IsActive: payload.isActive,
    };
    const response = (await apiService.post("/api/Silo/mappings", backendPayload)) as MapSiloPhuLieuNM;
    return response;
  },

  /**
   * Cập nhật mapping
   */
  updateMapping: async (id: number, payload: MapSiloPhuLieuNMPayload): Promise<void> => {
    const backendPayload = {
      SiloId: payload.siloId,
      PhuLieuNMId: payload.phuLieuNMId,
      NgayBatDau: payload.ngayBatDau,
      NgayKetThuc: payload.ngayKetThuc ?? null,
      IsActive: payload.isActive,
    };
    await apiService.put(`/api/Silo/mappings/${id}`, backendPayload);
  },

  /**
   * Xóa mapping
   */
  deleteMapping: async (id: number): Promise<void> => {
    await apiService.delete(`/api/Silo/mappings/${id}`);
  },

  /**
   * Lấy danh sách tất cả PhuLieu_NM (backward compatible - không có search/pagination)
   */
  getAllPhuLieuNM: async (): Promise<PhuLieuNM[]> => {
    const response = (await apiService.get("/api/Silo/phu-lieu-nm", { params: { pageSize: 1000 } })) as PhuLieuNM[] | PhuLieuNMSearchResponse;
    // Nếu là array thì trả về trực tiếp (backward compatible)
    if (Array.isArray(response)) {
      return response;
    }
    // Nếu là PagedResult thì trả về data
    return (response as PhuLieuNMSearchResponse).data || [];
  },

  /**
   * Tìm kiếm PhuLieu_NM với phân trang
   */
  searchPhuLieuNM: async (params: {
    searchKey?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PhuLieuNMSearchResponse> => {
    const queryParams: Record<string, string | number> = {};
    if (params.searchKey) queryParams.searchKey = params.searchKey;
    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;

    interface BackendPhuLieuNM {
      id?: number;
      Id?: number;
      idPhuLieu?: number;
      ID_PhuLieu?: number;
      iD_PhuLieu?: number; // Backend trả về iD_PhuLieu (chữ D viết hoa)
      tenPhuLieu?: string | null;
      TenPhuLieu?: string | null;
      ngayTao?: string | null;
      NgayTao?: string | null;
      isActive?: boolean;
      IsActive?: boolean;
    }

    interface BackendPhuLieuNMResponse {
      data?: BackendPhuLieuNM[];
      Data?: BackendPhuLieuNM[];
      totalRecords?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    }

    const response = (await apiService.get("/api/Silo/phu-lieu-nm", { params: queryParams })) as BackendPhuLieuNMResponse | BackendPhuLieuNM[];
    
    // Helper function để map item từ backend sang frontend
    const mapBackendItem = (item: BackendPhuLieuNM): PhuLieuNM => ({
      id: item.id ?? item.Id ?? 0,
      idPhuLieu: item.idPhuLieu ?? item.ID_PhuLieu ?? item.iD_PhuLieu ?? 0,
      tenPhuLieu: item.tenPhuLieu ?? item.TenPhuLieu ?? null,
      ngayTao: item.ngayTao ?? item.NgayTao ?? null,
      isActive: item.isActive ?? item.IsActive ?? true,
    });
    
    // Nếu response là array (backward compatible), wrap vào object
    if (Array.isArray(response)) {
      return {
        data: response.map(mapBackendItem),
        totalRecords: response.length,
        page: 1,
        pageSize: response.length,
      };
    }
    
    // Nếu response là object với data property
    const dataArray = response.data || response.Data || [];
    return {
      data: dataArray.map(mapBackendItem),
      totalRecords: response.totalRecords ?? 0,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? 50,
    };
  },

  /**
   * Resolve Silo từ danh sách PhuLieuNMIds
   */
  resolveSilo: async (request: ResolveSiloRequest): Promise<SelectSiloResponse> => {
    const response = await apiService.post("/api/Silo/resolve-silo", request) as SelectSiloResponse;
    return response;
  },

  /**
   * Resolve PhuLieuNM khi user đổi Silo
   */
  resolvePhuLieuWhenChangeSilo: async (request: ResolvePhuLieuWhenChangeSiloRequest): Promise<SelectPhuLieuNMResponse> => {
    const response = await apiService.post("/api/Silo/resolve-phu-lieu", request) as SelectPhuLieuNMResponse;
    return response;
  },

  /**
   * Validate trước khi lưu
   */
  validateBeforeSave: async (request: ValidateBeforeSaveRequest): Promise<{ isValid: boolean; message?: string }> => {
    try {
      const response = await apiService.post("/api/Silo/validate-before-save", request) as { isValid: boolean };
      return response;
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } }; message?: string };
      return {
        isValid: false,
        message: errorObj.response?.data?.message || errorObj.message || "Validation failed",
      };
    }
  },

  /**
   * Lấy danh sách silo theo headerkeyId, ngaySX, nhaMay và bieuMau
   */
  getSilosByHeaderKey: async (request: GetSiloByHeaderKeyRequest): Promise<SiloByHeaderKey[]> => {
    const backendRequest = {
      HeaderKeyId: request.headerKeyId,
      NgaySX: request.ngaySX,
      NhaMay: request.nhaMay,
      BieuMau: request.bieuMau ?? null,
    };
    console.log("getSilosByHeaderKey request:", backendRequest);
    try {
      const response = await apiService.post("/api/Silo/get-by-headerkey", backendRequest) as any[];
      const mapped = response.map((item: any) => ({
        siloId: item.siloId ?? item.SiloId ?? 0,
        tenSilo: item.tenSilo ?? item.TenSilo ?? "",
        theTich: item.theTich ?? item.TheTich ?? null,
      }));
      return mapped;
    } catch (error) {
      console.error("getSilosByHeaderKey error:", error);
      throw error;
    }
  },
};

