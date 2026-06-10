import { useState } from "react";
import { message } from "antd";
import { PhieuApi } from "../services/PhieuApi";

/**
 * Hook dùng chung để check / bỏ check phiếu hàng loạt.
 *
 * @param selectedRowKeys   - Danh sách idphieu đang được chọn.
 * @param onSuccess         - Callback sau khi thao tác thành công (thường để reset selection).
 */
const useCheckPhieu = (
  selectedRowKeys: string[],
  onSuccess?: () => void,
  refetch?: () => void,
) => {
  const [checkLoading, setCheckLoading] = useState(false);

  const handleCheckPhieu = async (isCheck: number) => {
    if (selectedRowKeys.length === 0) {
      message.warning("Vui lòng chọn ít nhất một phiếu!");
      return;
    }
    try {
      setCheckLoading(true);
      await PhieuApi.checkNhieuPhieu(selectedRowKeys, isCheck);
      message.success(isCheck === 1 ? "Check phiếu thành công!" : "Bỏ check phiếu thành công!");
      onSuccess?.();
      refetch?.();
    } catch {
      message.error("Thao tác thất bại!");
    } finally {
      setCheckLoading(false);
    }
  };

  return { checkLoading, handleCheckPhieu };
};

export default useCheckPhieu;
