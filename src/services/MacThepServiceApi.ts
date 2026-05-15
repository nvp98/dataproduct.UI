import apiService from "./ApiService";
export { NhaMayEnum } from "../models/SiloModel";

export interface MacThepMayDucInfo {
  idMayDuc: number;
  tenMayDuc: string;
}

export interface NhomPhanLoaiMacThep{
  id: number;
  tenNhom: string;
}

export interface NhomPhanLoaiMacThepUpsert{
  id?: number;
  tenNhom: string;
}

export interface NhomPhanLoaiMacThepSearchResponse {
  data: NhomPhanLoaiMacThep[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface MacThep {
  id: number;
  tenMacThep: string;
  nhaMay: number;
  isLock?: boolean | null;
  isXacNhan?: boolean | null;
  mayDucs?: MacThepMayDucInfo[] | null;
  id_PhanLoaiNhomMacThep?: number | null;
  tenNhom?: string | null;
}

export interface MacThepPayload {
  tenMacThep: string;
  nhaMay: number;
  isLock?: boolean | null;
  isXacNhan?: boolean | null;
  idMayDucs?: number[] | null;
  id_PhanLoaiNhomMacThep?: number | null;
}

export interface MacThepSearchRequest {
  searchKey?: string;
  nhaMay?: number;
  isLock?: boolean | null;
  idMayDucs?: number[] | null;
  ca?: number;
  kip?: string;
  maBm?: string;
  page?: number;
  pageSize?: number;
}

export interface MacThepSearchResponse {
  data: MacThep[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const MacThepServiceApi = {
  search: async (params: MacThepSearchRequest): Promise<MacThepSearchResponse> => {
    const res = (await apiService.post("/api/MacThep/search", params)) as MacThepSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 10,
      totalPages: res.totalPages ?? 0,
    };
  },

  create: async (payload: MacThepPayload): Promise<MacThep> => {
    return (await apiService.post("/api/MacThep", payload)) as MacThep;
  },

  update: async (id: number, payload: MacThepPayload): Promise<void> => {
    await apiService.put(`/api/MacThep/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/MacThep/${id}`);
  },

  toggleXacNhan: async (id: number): Promise<{ id: number; isXacNhan: boolean }> => {
    return (await apiService.patch(`/api/MacThep/${id}/xac-nhan`)) as { id: number; isXacNhan: boolean };
  },

  getAll: async (params?: {
    nhaMay?: number;
    isLock?: boolean;
    tenMacThep?: string;
    idMayDucs?: number[];
  }): Promise<MacThep[]> => {
    const q = {
      ...(params?.nhaMay != null && { nhaMay: params.nhaMay }),
      ...(params?.isLock !== undefined && { isLock: params.isLock }),
      ...(params?.tenMacThep && { tenMacThep: params.tenMacThep }),
      ...(params?.idMayDucs?.length && { idMayDucs: params.idMayDucs }),
    };
    return (await apiService.get("/api/MacThep", { params: q })) as MacThep[];
  },

  getById: async (id: number): Promise<MacThep> => {
    return (await apiService.get(`/api/MacThep/${id}`)) as MacThep;
  },

  getMayDucs: async (id: number): Promise<number[]> => {
    return (await apiService.get(`/api/MacThep/${id}/may-duc`)) as number[];
  },

  setMayDucs: async (id: number, idMayDucs: number[]): Promise<void> => {
    await apiService.put(`/api/MacThep/${id}/may-duc`, idMayDucs);
  },

  getPhanLoaiNhomOptions: async(
    params: {
    searchKey?: string;
    page?: number;
    pageSize?: number;
  }) : Promise<NhomPhanLoaiMacThepSearchResponse> => {
    const res = await apiService.get(`/api/MacThep/search-nhom-phan-loai-mac-thep`, {params}) as NhomPhanLoaiMacThepSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 20,
      totalPages: res.totalPages ?? 0,
    };
  },

  createNhomPhanLoaiMacThep: async (payload: NhomPhanLoaiMacThepUpsert): Promise<NhomPhanLoaiMacThep> => {
    return (await apiService.post("/api/MacThep/tao-nhom-mac-thep", payload)) as NhomPhanLoaiMacThep;
  },
};
