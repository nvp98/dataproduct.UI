import adminConfig from "../configs/adminConfig.json";

/**
 * Kiểm tra user có phải admin dựa trên mã phòng ban hoặc role
 */
export const isAdmin = (user: any): boolean => {
  if (!user) return false;

  // Check theo iD_Quyen = 1 (admin)
  if (user.iD_Quyen === 1) {
    return true;
  }

  // Check theo role
//   if (user.role && adminConfig.adminRoles.includes(user.role)) {
//     return true;
//   }

  // Check theo mã phòng ban
  const maPhongBan = user.tenNgan || user.idPhongBan || user.phongBan;
  if (maPhongBan) {
    const isAdminPhongBan = adminConfig.adminPhongBan.some(
      (pb) => pb.maPhongBan === maPhongBan
    );
    if (isAdminPhongBan) return true;
  }

  return false;
};

/**
 * Kiểm tra user có quyền phân quyền biểu mẫu
 */
export const canManagePermissions = (user: any): boolean => {
  return isAdmin(user) && adminConfig.permissions.phanQuyenBieuMau;
};

/**
 * Kiểm tra user có quyền quản trị tài khoản
 */
export const canManageUsers = (user: any): boolean => {
  return isAdmin(user) && adminConfig.permissions.quanTriTaiKhoan;
};

/**
 * Kiểm tra user có quyền xem toàn bộ phiếu (không giới hạn phòng ban)
 */
export const canViewAllPhieu = (user: any): boolean => {
  return isAdmin(user) && adminConfig.permissions.xemToanBoPhieu;
};

/**
 * Kiểm tra user có quyền xóa phiếu
 */
export const canDeletePhieu = (user: any): boolean => {
  return isAdmin(user) && adminConfig.permissions.xoaPhieu;
};

/**
 * Kiểm tra user có quyền sửa phiếu đã chốt
 */
export const canEditLockedPhieu = (user: any): boolean => {
  return isAdmin(user) && adminConfig.permissions.suaPhieuDaChot;
};

/**
 * Lấy danh sách mã phòng ban admin
 */
export const getAdminPhongBanList = () => {
  return adminConfig.adminPhongBan.map((pb) => pb.maPhongBan);
};

/**
 * Kiểm tra mã phòng ban có phải admin không
 */
export const isAdminPhongBan = (maPhongBan: string): boolean => {
  return adminConfig.adminPhongBan.some((pb) => pb.maPhongBan === maPhongBan);
};

/**
 * Kiểm tra user có phải admin dựa trên mã phòng ban hoặc quyền
 * @param user User object từ localStorage
 */
export const isAdminUser = (user: any): boolean => {
  if (!user) return false;
  // Check theo iD_Quyen = 1 (admin)
  if (user.iD_Quyen === 1 || user.ID_Quyen === 1) {
    return true;
  }

  // Check theo mã phòng ban
  const maPhongBan = user.tenNgan || user.idPhongBan || user.phongBan;
  if (maPhongBan && isAdminPhongBan(maPhongBan)) {
    return true;
  }

  return false;
};

/**
 * Kiểm tra user có quyền xử lý một mã BM cụ thể
 * @param user User object
 * @param maBm Mã biểu mẫu cần kiểm tra
 * @param userPermissions Danh sách quyền của user từ API
 */
export const hasPermissionForBm = (
  user: any,
  maBm: string,
  userPermissions: any[]
): boolean => {
  if (!user || !maBm) return false;

  // Admin full quyền
  if (isAdmin(user)) return true;

  // Kiểm tra trong danh sách quyền của user
  if (Array.isArray(userPermissions)) {
    return userPermissions.some((p) => p.maBm === maBm);
  }

  return false;
};

/**
 * Lấy danh sách mã BM mà user có quyền xử lý
 * @param userPermissions Danh sách quyền của user từ API
 */
export const getAllowedBmList = (userPermissions: any[]): string[] => {
  if (!Array.isArray(userPermissions)) return [];
  return userPermissions.map((p) => p.maBm).filter((bm) => bm);
};
