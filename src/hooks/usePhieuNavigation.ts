import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { message } from "antd";

/**
 * Hook dùng chung cho các trang tạo/chi tiết phiếu.
 *
 * Giải quyết 2 vấn đề:
 * 1. Reload mất location.state → khôi phục idphieu từ sessionStorage
 * 2. Phiếu không tồn tại (404 / null) → redirect về danh sách + clear session
 *
 * @param sessionKey - Key duy nhất cho từng loại phiếu (ví dụ: "phieu_bof_id")
 * @param listPath   - Đường dẫn danh sách để redirect về (ví dụ: "/danh-sach-bof")
 *
 * @example
 * const { idphieu, redirectToList, navigateToDetail } = usePhieuNavigation(
 *   "phieu_bof_id",
 *   "/danh-sach-bof"
 * );
 */
export function usePhieuNavigation(sessionKey: string, listPath: string) {
  const location = useLocation();
  const navigate = useNavigate();

  const { idphieu: idphieuFromState } = (location.state as { idphieu?: string }) || {};

  // Resolve: ưu tiên state, fallback sessionStorage
  const idphieu: string | undefined =
    idphieuFromState || sessionStorage.getItem(sessionKey) || undefined;

  // Đồng bộ sessionStorage khi state thay đổi
  useEffect(() => {
    if (idphieuFromState) {
      sessionStorage.setItem(sessionKey, idphieuFromState);
    } else if (!idphieu) {
      // Trang tạo mới thực sự — xóa session cũ tránh nhầm
      sessionStorage.removeItem(sessionKey);
    }
  }, [idphieuFromState, sessionKey, idphieu]);

  /**
   * Redirect về danh sách, xóa session.
   * Dùng khi phiếu không tồn tại (404, null) hoặc user thoát trang.
   */
  const redirectToList = useCallback((msg?: string) => {
    if (msg) message.warning(msg);
    sessionStorage.removeItem(sessionKey);
    navigate(listPath, { replace: true });
  }, [sessionKey, listPath, navigate]);

  /**
   * Navigate sang trang chi tiết/hiệu chỉnh một phiếu khác (ví dụ sau khi clone).
   * Tự động cập nhật sessionStorage.
   */
  const navigateToDetail = useCallback((newId: string, detailPath: string) => {
    sessionStorage.setItem(sessionKey, newId);
    navigate(detailPath, { replace: true, state: { idphieu: newId } });
  }, [sessionKey, navigate]);

  /**
   * Wrapper bọc lời gọi getDetail để tự động xử lý 404 / null.
   * Trả về data hoặc undefined nếu đã redirect.
   *
   * @example
   * const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu!));
   * if (!res) return; // đã redirect, dừng lại
   */
  const safeGetDetail = useCallback(async <T>(
    fetcher: () => Promise<T | null | undefined>
  ): Promise<T | undefined> => {
    try {
      const res = await fetcher();
      if (!res) {
        redirectToList("Không tìm thấy dữ liệu phiếu. Chuyển về danh sách.");
        return undefined;
      }
      return res;
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        redirectToList("Phiếu không tồn tại hoặc đã bị xóa. Chuyển về danh sách.");
        return undefined;
      }
      throw err;
    }
  }, [redirectToList]);

  return { idphieu, redirectToList, navigateToDetail, safeGetDetail };
}
