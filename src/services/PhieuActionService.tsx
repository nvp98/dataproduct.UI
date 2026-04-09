/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, Popconfirm, message } from "antd";
import type { ButtonProps } from "antd";
import {
  EditOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  UndoOutlined,
  LockOutlined,
  UnlockOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { PhieuApi } from "./PhieuApi";
import { PheDuyetApi } from "./PheDuyetApi";
import { TrangThaiPhieuConst, TrangThaiXacNhanPhieuConst } from "../utils/constants/TrangThaiPhieuConstant";

export interface PhieuActionButton {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type?: ButtonProps["type"];
  danger?: boolean;
  disabled?: boolean;
  confirm?: {
    title: string;
    description?: string;
  };
  onClick: (phieuId: string, formData?: Record<string, unknown>) => Promise<void>;
}

export interface PheDuyetItem {
  nguoiDuyetId?: number | null;
  capDuyet?: number | null;
  tinhTrang?: number | null;
  maKyDuyet?: string | null;
}

export interface ActionSuccessContext {
  newPhieuId?: string;
}

export interface PhieuActionServiceParams {
  phieuId: string;
  tinhTrang: number;
  isClone?: boolean;
  formData?: Record<string, unknown>;
  // Cho phép gọi API bổ sung sau khi lưu phiếu (ví dụ lưu sang bảng khác)
  // Được gọi sau khi PhieuApi.postData hoặc PhieuApi.putData thành công
  customPutApi?: (idphieu: string, formData: Record<string, unknown>) => Promise<any>;
  // Callback được gọi sau khi thay đổi trạng thái thành công
  // Nhận vào idPhieu và trạng thái mới
  onStatusChange?: (idPhieu: string, newStatus: number) => void | Promise<void>;
  // Thông tin user hiện tại
  currentUserId?: number | null;
  currentUserPhongBanId?: number | null;
  currentUserTenNgan?: string | null;
  // Thông tin phiếu
  nguoiTaoId?: number | null;
  phieuPhongBanId?: number | null;
  pheDuyet?: PheDuyetItem[];
  // Luồng 1 người: bỏ qua phê duyệt, "Gửi" sẽ chuyển thẳng sang HoanThanh (2) để PKH chốt
  noApproval?: boolean;
  // Callbacks
  onSuccess?: (context?: ActionSuccessContext) => void | Promise<void>;
  onError?: (error: unknown) => void;
  redirectToList?: (msg?: string) => void;
}

const STALE_PHIEU_ERROR_MARKERS = [
  "Phiếu đã bị khóa",
  "Phiếu đã bị xóa",
  "Vui lòng quay về danh sách",
];

const extractErrorMessage = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  const err = error as any;
  return err?.message || err?.error || err?.response?.data?.message;
};

const resolveListPathFromCurrentUrl = (): string => {
  const pathname = window.location.pathname || "";
  const normalizedPath = pathname.replace(/\/+$/, "");
  const hasSanXuatBase = normalizedPath.startsWith("/sanxuat/");
  const withoutBase = hasSanXuatBase
    ? normalizedPath.slice("/sanxuat".length)
    : normalizedPath;
  const segments = withoutBase.split("/").filter(Boolean);
  if (segments.length === 0) return "/sanxuat";

  const first = segments[0].toLowerCase();
  if (first.startsWith("taophieu") || first.startsWith("chitiet")) {
    const listSegments = segments.slice(1);
    if (listSegments.length > 0) {
      return `/sanxuat/${listSegments.join("/")}`;
    }
  }

  return "/sanxuat";
};

const shouldRedirectToList = (error: unknown): boolean => {
  const messageText = extractErrorMessage(error);
  if (!messageText) return false;
  return STALE_PHIEU_ERROR_MARKERS.some((marker) => messageText.includes(marker));
};

const handleActionError = (
  error: unknown,
  onError?: (error: unknown) => void,
  redirectToList?: (msg?: string) => void,
  fallbackMessage?: string
) => {
  const errMsg = extractErrorMessage(error);
  const displayMsg = errMsg || fallbackMessage || "Thao tác thất bại";
  message.error(displayMsg);

  if (shouldRedirectToList(error)) {
    if (redirectToList) {
      window.setTimeout(() => redirectToList(displayMsg), 150);
    } else {
      const listPath = resolveListPathFromCurrentUrl();
      window.setTimeout(() => {
        window.location.href = listPath;
      }, 150);
    }
  }

  onError?.(error);
};

// Dùng cho các action chỉ gọi changeStatus (không save/put/post khác):
// nếu lỗi thì xử lý lỗi như cũ + reload lại trang hiện tại.
const handleStatusOnlyActionError = (
  error: unknown,
  onError?: (error: unknown) => void,
  redirectToList?: (msg?: string) => void,
  fallbackMessage?: string
) => {
  handleActionError(error, onError, redirectToList, fallbackMessage);
  window.setTimeout(() => {
    window.location.reload();
  }, 150);
};

/**
 * Helper functions để kiểm tra quyền
 */
const checkPermission = {
  /**
   * Kiểm tra user có phải người tạo phiếu không
   */
  isCreatorZero: (currentUserId?: number | null, nguoiDuyet0Id?: number | null): boolean => {
    return currentUserId !== undefined && currentUserId !== null && 
           nguoiDuyet0Id !== undefined && nguoiDuyet0Id !== null &&
           currentUserId === nguoiDuyet0Id;
  },

  /**
   * Kiểm tra user có trong danh sách được assign không
   */
  isAssignedUser: (currentUserId?: number | null, pheDuyet?: PheDuyetItem[]): boolean => {
    if (!currentUserId || !pheDuyet || pheDuyet.length === 0) return false;
    return pheDuyet.some(
      (item) =>
        item.nguoiDuyetId === currentUserId &&
        item.capDuyet !== 0 &&
        item.tinhTrang === TrangThaiXacNhanPhieuConst.ChuaXacNhan
    );
  },

  /**
   * Kiểm tra user có cùng phòng ban với phiếu không
   */
  isSamePhongBan: (
    currentUserPhongBanId?: number | null,
    phieuPhongBanId?: number | null
  ): boolean => {
    return currentUserPhongBanId !== undefined && currentUserPhongBanId !== null &&
           phieuPhongBanId !== undefined && phieuPhongBanId !== null &&
           currentUserPhongBanId === phieuPhongBanId;
  },

  /**
   * Kiểm tra user có phải phòng ban PKH không (iD_PhongBan = 70 và tenNgan = "P.KH")
   */
  isPKHPhongBan: (
    currentUserPhongBanId?: number | null,
    currentUserTenNgan?: string | null
  ): boolean => {
    return currentUserPhongBanId === 70 && 
           currentUserTenNgan === "P.KH";
  },

  /**
   * Kiểm tra user có quyền duyệt (chỉ assigned user, không cần cùng phòng ban)
   */
  canApprove: (
    currentUserId?: number | null,
    pheDuyet?: PheDuyetItem[]
  ): boolean => {
    return checkPermission.isAssignedUser(currentUserId, pheDuyet);
  },
};

/**
 * Service quản lý các action buttons cho phiếu dựa trên trạng thái, isClone và quyền của user
 * 
 * Logic kiểm tra quyền theo trạng thái:
 * 
 * Trạng thái 0 (Đang lưu):
 * - Chỉ nguoiTaoId thấy: Sửa, Xóa, Gửi
 * - Người trong pheDuyet không thấy button gì
 * 
 * Trạng thái 1 (Đã gửi):
 * - NguoiTaoId thấy: Thu hồi (sửa trực tiếp trên phiếu), Lưu, Gửi khi đã thu hồi
 * - Người trong pheDuyet thấy: Xác nhận, Từ chối
 * 
 * Trạng thái 2 (Hoàn thành) / 6 (Đang phê duyệt):
 * - NguoiTaoId thấy: Đề nghị hiệu chỉnh (clone phiếu, gán phiếu gốc = Hiệu chỉnh 7, redirect sang phiếu clone)
 * - Cả phòng ban thấy: Chốt (khi Hoàn thành)
 * 
 * Trạng thái 5 (Đã chốt):
 * - NguoiTaoId không thấy: Sửa, Gửi
 * 
 * Clone: Tất cả (không cần kiểm tra quyền)
 * 
 * @example
 * const userInfo = JSON.parse(localStorage.getItem("userinfo") || "{}");
 * const phieuData = await PhieuApi.getById(phieuId);
 * const buttons = phieuActionService.getActionButtons({
 *   phieuId: phieuData.idphieu,
 *   tinhTrang: phieuData.tinhTrang,
 *   currentUserId: userInfo.iD_TaiKhoan,
 *   currentUserPhongBanId: userInfo.iD_PhongBan,
 *   nguoiTaoId: phieuData.nguoiTaoId,
 *   phieuPhongBanId: phieuData.idphongBan,
 *   pheDuyet: phieuData.pheDuyet, // Array từ jsonData.pheDuyet hoặc phieuData.pheDuyet
 * });
 */
export const phieuActionService = {
  /**
   * Lấy danh sách các action buttons có thể hiển thị
   * 
   * Logic kiểm tra quyền theo trạng thái:
   * - Trạng thái 0: Chỉ nguoiTaoId thấy Sửa/Xóa/Gửi
   * - Trạng thái 1: NguoiTaoId thấy Sửa/Gửi, người trong pheDuyet thấy Xác nhận/Từ chối
   * - Trạng thái 2: NguoiTaoId thấy Sửa/Gửi, cả phòng ban thấy Chốt
   * - Trạng thái 5: NguoiTaoId không thấy Sửa/Gửi
   */
  getActionButtons(params: PhieuActionServiceParams): PhieuActionButton[] {
    const {
      phieuId,
      tinhTrang,
      isClone,
      customPutApi,
      onStatusChange,
      currentUserId,
      currentUserPhongBanId,
      currentUserTenNgan,
      pheDuyet,
      noApproval = false,
      onSuccess,
      onError,
      redirectToList,
    } = params;
    const buttons: PhieuActionButton[] = [];
    const isAssigned = checkPermission.isAssignedUser(currentUserId, pheDuyet);
    const isPKH = checkPermission.isPKHPhongBan(currentUserPhongBanId, currentUserTenNgan);
    const nguoiDuyet0Id = pheDuyet?.filter(x => x.capDuyet === 0)?.[0]?.nguoiDuyetId;
    const isCreatorZero = checkPermission.isCreatorZero(currentUserId, nguoiDuyet0Id);
    const hasPhieuId = phieuId !== "";
    // noApproval: "Gửi" đi thẳng HoanThanh (2), PKH chốt luôn mà không cần bước phê duyệt
    const sendTargetStatus = noApproval
      ? TrangThaiPhieuConst.HoanThanh
      : TrangThaiPhieuConst.DaGui;
    const sendLabel = noApproval ? "Lưu và Gửi PKH" : "Lưu và Gửi phiếu";
    const sendConfirmDesc = noApproval
      ? "Phiếu sẽ được gửi thẳng đến PKH để chốt. Bạn có chắc chắn?"
      : "Bạn có chắc chắn muốn lưu và gửi phiếu này?";

    // Quy tắc riêng cho phòng PKH: chỉ thấy Chốt/Hủy chốt ở trạng thái phù hợp
    if (isPKH) {
      if (tinhTrang === TrangThaiPhieuConst.HoanThanh) {
        buttons.push({
          key: "lock",
          label: "Chốt",
          icon: <LockOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận chốt",
            description: "Bạn có chắc chắn muốn chốt phiếu này? Sau khi chốt, phiếu sẽ không thể chỉnh sửa.",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(
                phieuId,
                TrangThaiPhieuConst.DaChot,
                currentUserId ?? null
              );
              message.success("Chốt phiếu thành công!");
              await onStatusChange?.(phieuId, TrangThaiPhieuConst.DaChot);
              onSuccess?.();
            } catch (error) {
              handleStatusOnlyActionError(error, onError, redirectToList, "Không thể chốt phiếu");
            }
          },
        });
      } else if (tinhTrang === TrangThaiPhieuConst.DaChot) {
        buttons.push({
          key: "unlock",
          label: "Hủy Chốt",
          icon: <UnlockOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận hủy chốt",
            description: "Bạn có chắc chắn muốn hủy chốt phiếu này?",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(
                phieuId,
                TrangThaiPhieuConst.HoanThanh,
                currentUserId ?? null
              );
              message.success("Hủy chốt phiếu thành công!");
              await onStatusChange?.(phieuId, TrangThaiPhieuConst.HoanThanh);
              onSuccess?.();
            } catch (error) {
              handleStatusOnlyActionError(error, onError, redirectToList, "Không thể hủy chốt phiếu");
            }
          },
        });
      }
      return buttons;
    }

    // ========== BUTTONS KHI CHƯA CÓ PHIEU ID (TẠO MỚI) ==========
    if (!hasPhieuId) {
        // Button Lưu
        buttons.push({
          key: "save",
          label: "Tạo mới",
          icon: <EditOutlined />,
          type: "default",
          onClick: async (_phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }

              // Chưa có idphieu, tạo mới (luôn gọi PhieuApi, thêm customPutApi nếu truyền)
              const res = await PhieuApi.postData(formDataParam);
              // const resIdPhieu = (res as any)?.idphieu || (res as any)?.data?.idphieu;
              // if (customPutApi && resIdPhieu) {
              //   await customPutApi(resIdPhieu, formDataParam as Record<string, unknown>);
              // }
              const resData = res?.data as { soPhieu?: string } | undefined;
              message.success(`Tạo phiếu thành công: ${resData?.soPhieu || ""}`);
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể tạo phiếu");
            }
          },
        });

      // Button Lưu và Gửi
      buttons.push({
        key: "saveAndSend",
        label: sendLabel,
        icon: <SendOutlined />,
        type: "primary",
        confirm: {
          title: "Xác nhận",
          description: sendConfirmDesc,
        },
        onClick: async (_phieuIdParam, formDataParam) => {
          try {
            if (!formDataParam) {
              message.error("Không có dữ liệu để lưu");
              return;
            }
            const res = await PhieuApi.postData(formDataParam);
            const resData = res as { idphieu?: string; soPhieu?: string } | undefined;
            if (resData?.idphieu) {
              await PhieuApi.changeStatus(
                resData.idphieu,
                sendTargetStatus,
                currentUserId ?? null
              );
              await onStatusChange?.(resData.idphieu, sendTargetStatus);
            }
            message.success(`Tạo và gửi phiếu thành công: ${resData?.soPhieu || ""}`);
            onSuccess?.();
          } catch (error) {
            handleActionError(error, onError, redirectToList, "Không thể tạo và gửi phiếu");
          }
        },
      });
      
      return buttons; // Trả về ngay khi chưa có phieuId
    }

    // ========== BUTTONS CHO NGUOI TAO ID ==========
    // if (isCreatorZero) {
      // Trạng thái 0 - Đang lưu: Xóa, Lưu, Lưu và Gửi
      if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
        // Button Lưu
        buttons.push({
          key: "save",
          label: "Lưu",
          icon: <EditOutlined />,
          type: "default",
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              // Đã có idphieu, cập nhật (luôn gọi PhieuApi, thêm customPutApi nếu truyền)
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              message.success("Lưu phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể lưu phiếu");
            }
          },
        });

        // Button Lưu và Gửi
        buttons.push({
          key: "saveAndSend",
          label: sendLabel,
          icon: <SendOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận",
            description: sendConfirmDesc,
          },
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              await PhieuApi.changeStatus(
                phieuIdParam,
                sendTargetStatus,
                currentUserId ?? null
              );
              await onStatusChange?.(phieuIdParam, sendTargetStatus);
              message.success("Lưu và gửi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Phiếu đã được gửi, vui lòng kiểm tra lại");
            }
          },
        });
      }
      // Trạng thái 1 - Đã gửi: Thu hồi (sửa trực tiếp trên phiếu đó)
      if (tinhTrang === TrangThaiPhieuConst.DaGui && isCreatorZero) {
        buttons.push({
          key: "recall",
          label: "Thu hồi",
          icon: <UndoOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận thu hồi",
            description: "Bạn có chắc chắn muốn thu hồi phiếu này? Sau khi thu hồi có thể chỉnh sửa trực tiếp trên phiếu.",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(
                phieuId,
                TrangThaiPhieuConst.DaThuHoi,
                currentUserId ?? null
              );
              await onStatusChange?.(phieuId, TrangThaiPhieuConst.DaThuHoi);
              message.success("Thu hồi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleStatusOnlyActionError(error, onError, redirectToList, "Không thể thu hồi phiếu");
            }
          },
        });
      }

      // noApproval + HoanThanh: chỉ cần Thu hồi đơn giản về DangLuu để sửa lại (không clone)
      if (noApproval && tinhTrang === TrangThaiPhieuConst.HoanThanh && isCreatorZero) {
        buttons.push({
          key: "recall",
          label: "Thu hồi",
          icon: <UndoOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận thu hồi",
            description: "Thu hồi phiếu về trạng thái đang lưu để chỉnh sửa. Bạn có chắc chắn?",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(
                phieuId,
                TrangThaiPhieuConst.DangLuu,
                currentUserId ?? null
              );
              await onStatusChange?.(phieuId, TrangThaiPhieuConst.DangLuu);
              message.success("Thu hồi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleStatusOnlyActionError(error, onError, redirectToList, "Không thể thu hồi phiếu");
            }
          },
        });
      }

      // Trạng thái 6 - Đang phê duyệt hoặc 2 - Hoàn thành: Đề nghị hiệu chỉnh (cho cả phiếu clone nếu cần)
      if (
        !noApproval &&
        (tinhTrang === TrangThaiPhieuConst.DangPheDuyet || tinhTrang === TrangThaiPhieuConst.HoanThanh) &&
        isCreatorZero
      ) {
        buttons.push({
          key: "requestEdit",
          label: "Đề nghị hiệu chỉnh",
          icon: <EditOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận đề nghị hiệu chỉnh",
            description:
              "Sẽ tạo bản sao phiếu để chỉnh sửa. Phiếu hiện tại sẽ bị ẩn (khóa). Bạn có chắc chắn?",
          },
          onClick: async (_phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu form. Vui lòng tải lại trang và thử lại.");
                onError?.(new Error("Missing formData for clone"));
                return;
              }
              const res = await PhieuApi.clone(phieuId, formDataParam);
              const newPhieuId =
                (res as any)?.idphieu ?? (res as any)?.data?.idphieu ?? (res as any)?.IdPhieu;
              if (!newPhieuId) {
                message.error("Tạo phiếu hiệu chỉnh thất bại: không nhận được ID phiếu mới.");
                onError?.(new Error("Clone response missing idphieu"));
                return;
              }
              if (customPutApi) {
                await customPutApi(newPhieuId, formDataParam as Record<string, unknown>);
              }
              message.success("Đề nghị hiệu chỉnh thành công! Đang chuyển sang phiếu mới.");
              onSuccess?.({ newPhieuId: String(newPhieuId) });
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể đề nghị hiệu chỉnh.");
            }
          },
        });
      }

      // Trạng thái 7 - Hiệu chỉnh (phiếu clone): Lưu không đổi trạng thái, Lưu và Gửi thì đi luồng bình thường
      if (tinhTrang === TrangThaiPhieuConst.HieuChinh && isCreatorZero) {
        buttons.push({
          key: "save",
          label: "Lưu",
          icon: <EditOutlined />,
          type: "default",
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              message.success("Lưu phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể lưu phiếu");
            }
          },
        });
        buttons.push({
          key: "saveAndSend",
          label: sendLabel,
          icon: <SendOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận",
            description: sendConfirmDesc,
          },
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              await PhieuApi.changeStatus(
                phieuIdParam,
                sendTargetStatus,
                currentUserId ?? null
              );
              await onStatusChange?.(phieuIdParam, sendTargetStatus);
              message.success("Lưu và gửi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Phiếu đã được gửi, vui lòng kiểm tra lại");
            }
          },
        });
      }

      // Trạng thái 3 - Đã thu hồi: Lưu, Lưu và Gửi (sửa trực tiếp, không clone)
      if (tinhTrang === TrangThaiPhieuConst.DaThuHoi && isCreatorZero) {
        // Button Lưu (sửa trực tiếp, không clone)
        buttons.push({
          key: "save",
          label: "Lưu",
          icon: <EditOutlined />,
          type: "default",
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              // Đã có idphieu, cập nhật trực tiếp (không clone)
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              message.success("Lưu phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể lưu phiếu");
            }
          },
        });

        // Button Lưu và Gửi (sửa trực tiếp, không clone)
        buttons.push({
          key: "saveAndSend",
          label: sendLabel,
          icon: <SendOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận",
            description: sendConfirmDesc,
          },
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              await PhieuApi.changeStatus(
                phieuIdParam,
                sendTargetStatus,
                currentUserId ?? null
              );
              await onStatusChange?.(phieuIdParam, sendTargetStatus);
              message.success("Lưu và gửi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Phiếu đã được gửi, vui lòng kiểm tra lại");
            }
          },
        });
      }
      
      // Trạng thái 5 - Đã chốt: Không hiện button nào
    // }
    

    // ========== NÚT XUẤT PDF (cho tất cả mọi người khi phiếu ở trạng thái Hoàn thành hoặc Đã chốt) ==========
    if (tinhTrang === TrangThaiPhieuConst.HoanThanh || tinhTrang === TrangThaiPhieuConst.DaChot) {
      buttons.push({
        key: "exportPdf",
        label: "Xuất PDF",
        icon: <FilePdfOutlined />,
        type: "default",
        onClick: async (phieuIdParam) => {
          try {
            const response = await PhieuApi.exportDynamicPDF(phieuIdParam, {});
            const blob = new Blob([response as any], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Phieu_${phieuIdParam}_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success("Xuất PDF thành công!");
          } catch (error) {
            message.error((error as any)?.message ?? "Xuất PDF thất bại!");
            onError?.(error);
          }
        },
      });
    }

    // ========== BUTTONS CHO CẤP PHÊ DUYỆT (trừ cấp 0): Xác nhận luôn; Không xác nhận chỉ khi phiếu là clone ==========
    const canApprovePhieu =
      (tinhTrang === TrangThaiPhieuConst.DaGui ||
        tinhTrang === TrangThaiPhieuConst.DangPheDuyet) &&
      isAssigned;

    if (canApprovePhieu) {
      buttons.push({
        key: "approve",
        label: "Xác nhận",
        icon: <CheckOutlined />,
        type: "primary",
        confirm: {
          title: "Xác nhận phiếu",
          description: "Bạn có chắc chắn muốn xác nhận phiếu này?",
        },
        onClick: async () => {
          try {
            if (!currentUserId) {
              message.error("Không tìm thấy thông tin người dùng");
              return;
            }
            await PheDuyetApi.updateTinhTrang(
              phieuId,
              currentUserId,
              TrangThaiXacNhanPhieuConst.DaXacNhan
            );
            message.success("Xác nhận phiếu thành công!");
            onSuccess?.();
          } catch (error) {
            handleActionError(error, onError, redirectToList, "Không thể xác nhận phiếu");
          }
        },
      });
      // Chỉ phiếu clone mới hiện nút Không xác nhận (xóa clone và lôi phiếu gốc lên)
      if (isClone) {
        buttons.push({
          key: "reject",
          label: "Không xác nhận",
          icon: <CloseOutlined />,
          type: "default",
          danger: true,
          confirm: {
            title: "Xác nhận không xác nhận",
            description:
              "Bạn có chắc chắn muốn từ chối phiếu này? Phiếu hiệu chỉnh sẽ bị xóa và phiếu gốc sẽ được hiển thị lại.",
          },
          onClick: async () => {
            try {
              if (!currentUserId) {
                message.error("Không tìm thấy thông tin người dùng");
                return;
              }
              await PheDuyetApi.updateTinhTrang(
                phieuId,
                currentUserId,
                TrangThaiXacNhanPhieuConst.KhongXacNhan
              );
              message.success("Từ chối phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              handleActionError(error, onError, redirectToList, "Không thể từ chối phiếu");
            }
          },
        });
      }
    }

    return buttons;
  },

  /**
   * Render các action buttons dưới dạng React components
   * @param getFormData - Function để lấy formData mới nhất (được gọi mỗi khi click button, nhận actionKey để phân biệt loại action)
   */
  renderActionButtons(
    buttons: PhieuActionButton[],
    phieuId: string,
    getFormData?: (actionKey?: string) => Record<string, unknown> | Promise<Record<string, unknown>>
  ): React.ReactNode[] {
    return buttons.map((btn) => {
      const handleClick = async () => {
        const formData = getFormData ? await getFormData(btn.key) : undefined;
        await btn.onClick(phieuId, formData);
      };

      const buttonElement = (
        <Button
          key={btn.key}
          type={btn.type}
          danger={btn.danger}
          icon={btn.icon}
          disabled={btn.disabled}
          htmlType="button" // Ngăn form submit khi click button
          onClick={handleClick}
        >
          {btn.label}
        </Button>
      );

      if (btn.confirm) {
        return (
          <Popconfirm
            key={btn.key}
            title={btn.confirm.title}
            description={btn.confirm.description}
            onConfirm={handleClick}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={btn.danger ? { danger: true } : undefined}
          >
            <Button
              type={btn.type}
              danger={btn.danger}
              icon={btn.icon}
              disabled={btn.disabled}
              htmlType="button" // Ngăn form submit khi click button
            >
              {btn.label}
            </Button>
          </Popconfirm>
        );
      }

      return buttonElement;
    });
  },
};

