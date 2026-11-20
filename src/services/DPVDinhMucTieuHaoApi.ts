import apiService from "./ApiService";

export interface DinhMucTieuHao {
  id: number;
  idPB?: number | null;
  idXuong?: number | null;
  dayChuyen?: string | null;
  baoCao?: string | null;
  chiTieu: string;
  donViTinh?: string | null;
  mucSanLuong?: number | null;
  dieuKienSanLuong?: number | null;
  mucTieuHaoLDG?: number | null;
  dieuKienTieuHaoLDG?: number | null;
  mucTyLePhe?: number | null;
  dieuKienTyLePhe?: number | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  ghiChu?: string | null;
  nguoiTao?: string | null;
  ngayTao?: string | null;
  nguoiCapNhat?: string | null;
  ngayCapNhat?: string | null;
}

export type DinhMucTieuHaoPayload = Omit<DinhMucTieuHao, "id" | "nguoiTao" | "ngayTao" | "nguoiCapNhat" | "ngayCapNhat">;

const toParams = (obj: object) => {
  const q: Record<string, string | number> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q[k] = v as string | number;
  });
  return q;
};

export const DinhMucTieuHaoApi = {
  search: async (params: {
    idPB?: number | null;
    idXuong?: number | null;
    baoCao?: string;
    chiTieu?: string;
    ngayApDung?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: DinhMucTieuHao[]; totalRecords: number; page: number; pageSize: number }> => {
    const res = (await apiService.get("/api/DinhMucTieuHao/search", { params: toParams(params) })) as {
      data: DinhMucTieuHao[];
      totalRecords: number;
      page: number;
      pageSize: number;
    };
    return { data: res.data ?? [], totalRecords: res.totalRecords ?? 0, page: res.page ?? 1, pageSize: res.pageSize ?? 50 };
  },

  create: async (payload: DinhMucTieuHaoPayload): Promise<void> => {
    await apiService.post("/api/DinhMucTieuHao", payload);
  },

  update: async (id: number, payload: DinhMucTieuHaoPayload): Promise<void> => {
    await apiService.put(`/api/DinhMucTieuHao/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/DinhMucTieuHao/${id}`);
  },
};
