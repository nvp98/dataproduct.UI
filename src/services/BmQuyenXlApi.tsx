import apiService from "./ApiService";

export interface BmQuyenXlModel {
  id?: number;
  idTaiKhoan: number;
  maBm: string;
  maKhuVuc: string;
  ngayTao?: string;
  nguoiTao?: string;
}

export const BmQuyenXlApi = {
  // Lấy danh sách quyền xử lý của tài khoản
  getByTaiKhoan: (idTaiKhoan: number) =>
    apiService.get(`/api/BmQuyenXl?idTaiKhoan=${idTaiKhoan}`),

  // Lấy tất cả quyền
  getAll: () => apiService.get("/api/BmQuyenXl"),

  // Thêm quyền mới
  create: (data: BmQuyenXlModel) => apiService.post("/api/BmQuyenXl", data),

  // Xóa quyền
  delete: (id: number) => apiService.delete(`/api/BmQuyenXl/${id}`),

  // Thêm nhiều quyền cùng lúc
  createBulk: (data: BmQuyenXlModel[]) =>
    apiService.post("/api/BmQuyenXl/bulk", data),

  // Xóa tất cả quyền của tài khoản
  deleteByTaiKhoan: (idTaiKhoan: number) =>
    apiService.delete(`/api/BmQuyenXl/taikhoan/${idTaiKhoan}`),
};
