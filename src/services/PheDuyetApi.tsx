import apiService from "./ApiService";

export const PheDuyetApi = {
  getDetail: (id: string) => apiService.get(`/api/BmPheDuyet/${id}`),
  putData: (id: number, data: any) =>
    apiService.put(`/api/BmPheDuyet/${id}`, data),
  
  /**
   * Cập nhật trạng thái phê duyệt của một user
   * @param phieuId - ID của phiếu
   * @param nguoiDuyetId - ID của người duyệt
   * @param tinhTrang - 1 = xác nhận, 0 = không xác nhận
   */
  updateTinhTrang: (phieuId: string, nguoiDuyetId: number, tinhTrang: number) =>
    apiService.put("/api/BmPheDuyet/update-tinhtrang", {
      phieuId,
      nguoiDuyetId,
      tinhTrang,
    }),
};
