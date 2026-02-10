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
  // Thông tin user hiện tại
  currentUserId?: number | null;
  currentUserPhongBanId?: number | null;
  currentUserTenNgan?: string | null;
  // Thông tin phiếu
  nguoiTaoId?: number | null;
  phieuPhongBanId?: number | null;
  pheDuyet?: PheDuyetItem[];
  // Callbacks
  onSuccess?: (context?: ActionSuccessContext) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

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
 * - NguoiTaoId thấy: Sửa, Gửi
 * - Người trong pheDuyet (tinhTrang = 0) thấy: Xác nhận, Từ chối
 * 
 * Trạng thái 2 (Hoàn thành):
 * - NguoiTaoId thấy: Sửa, Gửi
 * - Cả phòng ban (cùng idphongBan) thấy: Chốt
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
      currentUserId,
      currentUserPhongBanId,
      currentUserTenNgan,
      pheDuyet,
      onSuccess,
      onError,
    } = params;
    const buttons: PhieuActionButton[] = [];
    const isAssigned = checkPermission.isAssignedUser(currentUserId, pheDuyet);
    const isPKH = checkPermission.isPKHPhongBan(currentUserPhongBanId, currentUserTenNgan);
    const nguoiDuyet0Id = pheDuyet?.filter(x => x.capDuyet === 0)?.[0]?.nguoiDuyetId;
    const isCreatorZero = checkPermission.isCreatorZero(currentUserId, nguoiDuyet0Id);
    const hasPhieuId = phieuId !== "";

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
              await PhieuApi.changeStatus(phieuId, TrangThaiPhieuConst.DaChot);
              message.success("Chốt phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              // message.error("Không thể chốt phiếu");
              message.error((error as any)?.message);
              onError?.(error);
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
              await PhieuApi.changeStatus(phieuId, TrangThaiPhieuConst.HoanThanh);
              message.success("Hủy chốt phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              // message.error("Không thể hủy chốt phiếu");
              message.error((error as any)?.message);
              onError?.(error);
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
          label: "TaoMoi",
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
              const resIdPhieu = (res as any)?.idphieu || (res as any)?.data?.idphieu;
              await PhieuApi.initializePhieu(resIdPhieu);
              // if (customPutApi && resIdPhieu) {
              //   await customPutApi(resIdPhieu, formDataParam as Record<string, unknown>);
              // }
              const resData = res?.data as { soPhieu?: string } | undefined;
              message.success(`Tạo phiếu thành công: ${resData?.soPhieu || ""}`);
              onSuccess?.();
            } catch (error) {
              message.error("Không thể tạo phiếu");
              onError?.(error);
            }
          },
        });

      // Button Lưu và Gửi
      buttons.push({
        key: "saveAndSend",
        label: "Lưu và Gửi phiếu",
        icon: <SendOutlined />,
        type: "primary",
        confirm: {
          title: "Xác nhận",
          description: "Bạn có chắc chắn muốn lưu và gửi phiếu này?",
        },
        onClick: async (_phieuIdParam, formDataParam) => {
          try {
            if (!formDataParam) {
              message.error("Không có dữ liệu để lưu");
              return;
            }
            // Chưa có idphieu, tạo mới và chuyển sang trạng thái 1 (luôn gọi PhieuApi, thêm customPutApi nếu truyền)
            const res = await PhieuApi.postData(formDataParam);
            const resIdPhieu = (res as any)?.idphieu || (res as any)?.data?.idphieu;
            await PhieuApi.initializePhieu(resIdPhieu);
            // if (customPutApi && resIdPhieu) {
            //   await customPutApi(resIdPhieu, formDataParam as Record<string, unknown>);
            // }
            const resData = res as { idphieu?: string; soPhieu?: string } | undefined;
            if (resData?.idphieu) {
              await PhieuApi.changeStatus(resData.idphieu, TrangThaiPhieuConst.DaGui);
            }
            message.success(`Tạo và gửi phiếu thành công: ${resData?.soPhieu || ""}`);
            onSuccess?.();
          } catch (error) {
            message.error("Không thể tạo và gửi phiếu");
            onError?.(error);
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
              // message.error("Không thể lưu phiếu");
              message.error((error as any)?.message);
              onError?.(error);
            }
          },
        });

        // Button Lưu và Gửi
        buttons.push({
          key: "saveAndSend",
          label: "Lưu và Gửi phiếu",
          icon: <SendOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận",
            description: "Bạn có chắc chắn muốn lưu và gửi phiếu này?",
          },
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              // Đã có idphieu, cập nhật và chuyển sang trạng thái 1 (luôn gọi PhieuApi, thêm customPutApi nếu truyền)
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              await PhieuApi.changeStatus(phieuIdParam, TrangThaiPhieuConst.DaGui);
              message.success("Lưu và gửi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              if((error as any)?.message){
                message.error((error as any)?.message);
              } else {
                message.error("Phiếu đã được gửi, vui lòng kiểm tra lại");
              }
              onError?.(error);
            }
          },
        });
      }
      // Trạng thái 2 - Hoàn thành: Thu hồi
      if (tinhTrang === TrangThaiPhieuConst.HoanThanh && isCreatorZero) {
        buttons.push({
          key: "recall",
          label: "Thu hồi",
          icon: <UndoOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận thu hồi",
            description: "Bạn có chắc chắn muốn thu hồi phiếu này?",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(phieuId, TrangThaiPhieuConst.DaThuHoi);
              message.success("Thu hồi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              message.error((error as any)?.message);
              onError?.(error);
            }
          },
        });
      }

      // Trạng thái 1 - Đã gửi hoặc 6 - Đang phê duyệt: Thu hồi
      if ((tinhTrang === TrangThaiPhieuConst.DaGui || tinhTrang === TrangThaiPhieuConst.DangPheDuyet) && isCreatorZero) {
        buttons.push({
          key: "recall",
          label: "Thu hồi",
          icon: <UndoOutlined />,
          type: "default",
          confirm: {
            title: "Xác nhận thu hồi",
            description: "Bạn có chắc chắn muốn thu hồi phiếu này?",
          },
          onClick: async () => {
            try {
              await PhieuApi.changeStatus(phieuId, TrangThaiPhieuConst.DaThuHoi);
              message.success("Thu hồi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              message.error((error as any)?.message);
              onError?.(error);
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
              message.error((error as any)?.message);
              onError?.(error);
            }
          },
        });

        // Button Lưu và Gửi (sửa trực tiếp, không clone)
        buttons.push({
          key: "saveAndSend",
          label: "Lưu và Gửi phiếu",
          icon: <SendOutlined />,
          type: "primary",
          confirm: {
            title: "Xác nhận",
            description: "Bạn có chắc chắn muốn lưu và gửi phiếu này?",
          },
          onClick: async (phieuIdParam, formDataParam) => {
            try {
              if (!formDataParam) {
                message.error("Không có dữ liệu để lưu");
                return;
              }
              // Đã có idphieu, cập nhật trực tiếp và chuyển sang trạng thái 1 (không clone)
              await PhieuApi.putData(phieuIdParam, formDataParam);
              if (customPutApi) {
                await customPutApi(phieuIdParam, formDataParam as Record<string, unknown>);
              }
              await PhieuApi.changeStatus(phieuIdParam, TrangThaiPhieuConst.DaGui);
              message.success("Lưu và gửi phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              if((error as any)?.message){
                message.error((error as any)?.message);
              } else {
                message.error("Phiếu đã được gửi, vui lòng kiểm tra lại");
              }
              onError?.(error);
            }
          },
        });
      }
      
      // Trạng thái 5 - Đã chốt: Không hiện button nào
    // }
    

    // ========== BUTTONS CHO LIST USER PHE DUYET ==========
    const canApprovePhieu =
      (tinhTrang === TrangThaiPhieuConst.DaGui ||
        tinhTrang === TrangThaiPhieuConst.DangPheDuyet) &&
      isAssigned;

    if (canApprovePhieu) {
      // Nếu IsClone = false: Chỉ hiện button Xác nhận
      if (!isClone) {
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
              // Cập nhật tinhTrang của user hiện tại = 1 (xác nhận)
              // API sẽ tự động check và cập nhật trạng thái phiếu nếu tất cả đều xác nhận
              await PheDuyetApi.updateTinhTrang(
                phieuId,
                currentUserId,
                TrangThaiXacNhanPhieuConst.DaXacNhan
              );
              message.success("Xác nhận phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              message.error("Không thể xác nhận phiếu");
              onError?.(error);
            }
          },
        });
      } else {
        // Nếu IsClone = true: Hiện 2 button Xác nhận và Không xác nhận
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
              // Cập nhật tinhTrang của user hiện tại = 1 (xác nhận)
              // API sẽ tự động check và cập nhật trạng thái phiếu nếu tất cả đều xác nhận
              await PheDuyetApi.updateTinhTrang(phieuId, currentUserId, TrangThaiXacNhanPhieuConst.DaXacNhan);
              message.success("Xác nhận phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              message.error((error as any)?.message);
              onError?.(error);
            }
          },
        });

        buttons.push({
          key: "reject",
          label: "Không xác nhận",
          icon: <CloseOutlined />,
          type: "default",
          danger: true,
          confirm: {
            title: "Xác nhận không xác nhận",
            description: "Bạn có chắc chắn muốn từ chối phiếu này?",
          },
          onClick: async () => {
            try {
              if (!currentUserId) {
                message.error("Không tìm thấy thông tin người dùng");
                return;
              }
              // Cập nhật tinhTrang của user hiện tại = 2 (không xác nhận)
              // API sẽ tự động check và cập nhật trạng thái phiếu nếu tất cả đều không xác nhận
              await PheDuyetApi.updateTinhTrang(phieuId, currentUserId, TrangThaiXacNhanPhieuConst.KhongXacNhan);
              message.success("Từ chối phiếu thành công!");
              onSuccess?.();
            } catch (error) {
              message.error("Không thể từ chối phiếu");
              onError?.(error);
            }
          },
        });
      }
    }

    return buttons;
  },

  /**
   * Render các action buttons dưới dạng React components
   * @param getFormData - Function để lấy formData mới nhất (được gọi mỗi khi click button)
   */
  renderActionButtons(
    buttons: PhieuActionButton[],
    phieuId: string,
    getFormData?: () => Record<string, unknown> | Promise<Record<string, unknown>>
  ): React.ReactNode[] {
    return buttons.map((btn) => {
      const handleClick = async () => {
        const formData = getFormData ? await getFormData() : undefined;
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

