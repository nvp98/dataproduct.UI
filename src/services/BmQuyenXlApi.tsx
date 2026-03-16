import apiService from "./ApiService";

export interface BmQuyenXlModel {
  id?: number;
  idTaiKhoan: number;
  maBm: string;
  maKhuVuc: string;
  quyenChucNang?: number;
  ngayTao?: string;
  nguoiTao?: string;
}

/** Quyền menu: Việc tôi bắt đầu (chỉnh sửa) và Việc đến tôi (duyệt). */
export interface MenuPermissionsResponse {
  processingForms: string[];
  approvingForms: string[];
}

export const BmQuyenXlApi = {
  // Lấy danh sách quyền xử lý của tài khoản
  getByTaiKhoan: (idTaiKhoan: number) =>
    apiService.get(`/api/BmQuyenXl?idTaiKhoan=${idTaiKhoan}`),

  /** Lấy MaBM cho menu: processingForms = XULY/CHOT, approvingForms = PHEDUYET */
  getMenuPermissions: async (idTaiKhoan: number): Promise<MenuPermissionsResponse> => {
    const res = await apiService.get<
      MenuPermissionsResponse & { ProcessingForms?: string[]; ApprovingForms?: string[] }
    >(`/api/BmQuyenXl/menu-permissions?idTaiKhoan=${idTaiKhoan}`);

    // Axios trả về AxiosResponse; cần unwrap .data trước khi đọc trường business
    const data = (res as any)?.data ?? res;

    return {
      processingForms: data?.processingForms ?? data?.ProcessingForms ?? [],
      approvingForms: data?.approvingForms ?? data?.ApprovingForms ?? [],
    };
  },

  // Lấy tất cả quyền
  getAll: () => apiService.get("/api/BmQuyenXl"),

  // Thêm quyền mới
  create: (data: BmQuyenXlModel) => apiService.post("/api/BmQuyenXl", data),

  // Cập nhật quyền (gửi idTaiKhoan, maBm, maKhuVuc, quyenChucNang)
  update: (id: number, data: Pick<BmQuyenXlModel, "idTaiKhoan" | "maBm" | "maKhuVuc" | "quyenChucNang">) =>
    apiService.put(`/api/BmQuyenXl/${id}`, data),

  // Xóa quyền
  delete: (id: number) => apiService.delete(`/api/BmQuyenXl/${id}`),

  // Thêm nhiều quyền cùng lúc
  createBulk: (data: BmQuyenXlModel[]) =>
    apiService.post("/api/BmQuyenXl/bulk", data),

  // Xóa tất cả quyền của tài khoản
  deleteByTaiKhoan: (idTaiKhoan: number) =>
    apiService.delete(`/api/BmQuyenXl/taikhoan/${idTaiKhoan}`),
};
