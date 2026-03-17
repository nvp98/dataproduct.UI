// ─────────────────────────────────────────────────────────────────────────────
//  GetThongTinLocalStore.ts
//  Hàm dùng chung toàn hệ thống để đọc thông tin user từ localStorage.
//
//  localStorage "userinfo" có thể chứa 2 định dạng key:
//    - PascalCase : iD_TaiKhoan, iD_PhongBan, iD_PhanXuong, iD_Quyen, TenNgan
//    - camelCase  : id_TaiKhoan, id_PhongBan, id_PhanXuong, id_Quyen, tenNgan
// ─────────────────────────────────────────────────────────────────────────────

export interface UserInfo {
  iD_TaiKhoan: number | null;
  iD_PhongBan: number | null;
  iD_PhanXuong: number | null;
  iD_Quyen: number | null;
  tenNgan: string | null;
}

/**
 * Đọc thông tin user từ localStorage (key = "userinfo").
 *
 * Tự động xử lý cả 2 định dạng:
 *   - `iD_TaiKhoan` (PascalCase – backend cũ)
 *   - `id_TaiKhoan` (camelCase – backend mới)
 *
 * Không bao giờ throw, không bao giờ trả null.
 *
 * @example
 * const user = getThongTinUser();
 * const userId = user.iD_TaiKhoan;   // number | null
 * const pbId   = user.iD_PhongBan;   // number | null
 */
export const getThongTinUser = (): UserInfo => {
  try {
    const raw = localStorage.getItem("userinfo");
    if (!raw) return emptyUser();

    const data = JSON.parse(raw);

    return {
      iD_TaiKhoan: data.iD_TaiKhoan ?? data.ID_TaiKhoan ?? null,
      iD_PhongBan: data.iD_PhongBan ?? data.ID_PhongBan ?? null,
      iD_PhanXuong: data.iD_PhanXuong ?? data.ID_PhanXuong ?? null,
      iD_Quyen: data.iD_Quyen ?? data.ID_Quyen ?? null,
      tenNgan: data.tenNgan ?? data.TenNgan ?? null,
    };
  } catch {
    return emptyUser();
  }
};

const emptyUser = (): UserInfo => ({
  iD_TaiKhoan: null,
  iD_PhongBan: null,
  iD_PhanXuong: null,
  iD_Quyen: null,
  tenNgan: null,
});
