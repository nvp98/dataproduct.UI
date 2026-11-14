import apiService from "./ApiService";

export const CA_SX_OPTIONS = [
  { value: 1, label: "Ca 1 (08:00–20:00)" },
  { value: 2, label: "Ca 2 (20:00–08:00)" },
];

export interface TagDongLuc {
  id: number;
  tagIDEMS: string;
  maHeader: string;
  yNghia?: string | null;
  maXuong: string;
  tinhTrang: number;
  thuTu: number;
  nguoiTao?: string | null;
  ngayTao?: string | null;
  nguoiCapNhat?: string | null;
  ngayCapNhat?: string | null;
}

export interface TagDongLucPayload {
  tagIDEMS: string;
  maHeader: string;
  yNghia?: string | null;
  maXuong: string;
  tinhTrang: number;
  thuTu: number;
}

export interface DuLieuDongLuc {
  id: number;
  ngay: string;
  caSX: number;
  maHeader: string;
  tagID: string;
  giaTri?: number | null;
  ngayCapNhat: string;
  maXuong: string;
}

export interface DuLieuDongLucFilter {
  tuNgay: string; // YYYY-MM-DD
  denNgay: string;
  caSX?: number;
  maXuong?: string;
  maHeader?: string;
}

export interface DongLucSyncLog {
  id: number;
  thoiGianBatDau: string;
  thoiGianKetThuc?: string | null;
  tuNgay: string;
  denNgay: string;
  maXuong?: string | null;
  soDong: number;
  thanhCong: boolean;
  loiChiTiet?: string | null;
  nguonChay?: string | null;
}

const toParams = (obj: object) => {
  const q: Record<string, string | number> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q[k] = v as string | number;
  });
  return q;
};

export const DongLucApi = {
  // ── Tag ──
  getTags: async (params?: { maXuong?: string; tinhTrang?: number; searchKey?: string }): Promise<TagDongLuc[]> =>
    ((await apiService.get("/api/DongLuc/tag", { params: toParams(params ?? {}) })) as TagDongLuc[]) ?? [],

  createTag: async (payload: TagDongLucPayload): Promise<void> => {
    await apiService.post("/api/DongLuc/tag", payload);
  },

  updateTag: async (id: number, payload: TagDongLucPayload): Promise<void> => {
    await apiService.put(`/api/DongLuc/tag/${id}`, payload);
  },

  // Xóa mềm
  deleteTag: async (id: number): Promise<void> => {
    await apiService.delete(`/api/DongLuc/tag/${id}`);
  },

  // ── Dữ liệu ──
  searchDuLieu: async (
    filter: DuLieuDongLucFilter & { page?: number; pageSize?: number }
  ): Promise<{ data: DuLieuDongLuc[]; totalRecords: number; page: number; pageSize: number }> => {
    const res = (await apiService.get("/api/DongLuc/du-lieu/search", { params: toParams(filter) })) as {
      data: DuLieuDongLuc[];
      totalRecords: number;
      page: number;
      pageSize: number;
    };
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 50,
    };
  },

  exportExcel: async (filter: DuLieuDongLucFilter): Promise<void> => {
    const blob = (await apiService.get("/api/DongLuc/du-lieu/export-excel", {
      params: toParams(filter),
      responseType: "blob",
    })) as unknown as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DuLieuDongLuc_${filter.tuNgay.replace(/-/g, "")}_${filter.denNgay.replace(/-/g, "")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Đồng bộ ──
  dongBo: async (params: { tuNgay: string; denNgay: string; maXuong?: string }): Promise<DongLucSyncLog> =>
    (await apiService.post("/api/DongLuc/dong-bo", null, { params: toParams(params) })) as DongLucSyncLog,

  // Chưa có lần đồng bộ nào → API trả 204 (body rỗng)
  lanDongBoGanNhat: async (): Promise<DongLucSyncLog | null> =>
    ((await apiService.get("/api/DongLuc/dong-bo/lan-gan-nhat")) as DongLucSyncLog | "" | null) || null,
};
