/**
 * Service để xử lý logic phức tạp chọn Silo và PhuLieuNM dựa trên Biểu mẫu (BM)
 * Xử lý các trường hợp:
 * 1. BM ↔ 1 NM ↔ 1 SILO (Auto chọn tất cả)
 * 2. BM ↔ 1 NM ↔ N SILO (NM cố định, user chọn Silo)
 * 3. BM ↔ N NM ↔ 1 SILO (Silo cố định, user chọn NM)
 * 4. BM ↔ N NM ↔ N SILO (1-1) (User chọn Silo, auto chọn NM)
 * 5. BM ↔ N NM ↔ N SILO (N-M chéo) (User chọn Silo, dropdown NM)
 * 6-9. Các trường hợp đặc biệt (data thiếu, đổi silo, validate)
 */

import { SiloServiceApi } from "./SiloServiceApi";
import type {
  SelectSiloResponse,
  SelectPhuLieuNMResponse,
  SiloOptionDto,
  PhuLieuNM,
} from "../models/SiloModel";
import { message } from "antd";
import dayjs from "dayjs";

export interface ResolverContext {
  phuLieuNMIds: number[]; // Danh sách PhuLieuNM từ BM
  ngaySX: string; // YYYY-MM-DD
  ca?: string; // Ca sản xuất (sáng/chiều)
  bieuMau?: string; // Biểu mẫu (BOF/LF/RH)
}

export interface ResolverResult {
  // Trạng thái auto-select
  isAutoSelectedSilo: boolean;
  isAutoSelectedPhuLieu: boolean;
  
  // Giá trị đã chọn (nếu auto)
  selectedSiloId?: number | null;
  selectedPhuLieuNMId?: number | null;
  
  // Options cho user chọn
  siloOptions: SiloOptionDto[];
  phuLieuNMOptions: number[]; // IDs của PhuLieuNM có thể chọn
  
  // Thông tin bổ sung
  theTich?: number | null; // Thể tích silo (nếu auto chọn)
  warnings: string[]; // Cảnh báo
  errors: string[]; // Lỗi
}

export interface SiloPhuLieuResolver {
  /**
   * Resolve Silo và PhuLieuNM từ context
   */
  resolve: (context: ResolverContext) => Promise<ResolverResult>;
  
  /**
   * Khi user đổi Silo, resolve lại PhuLieuNM
   */
  onSiloChange: (
    siloId: number,
    context: ResolverContext
  ) => Promise<SelectPhuLieuNMResponse>;
  
  /**
   * Validate trước khi lưu
   */
  validate: (
    siloId: number,
    phuLieuNMId: number,
    ngaySX: string
  ) => Promise<{ isValid: boolean; message?: string }>;
}

class SiloPhuLieuResolverImpl implements SiloPhuLieuResolver {
  async resolve(context: ResolverContext): Promise<ResolverResult> {
    const { phuLieuNMIds, ngaySX } = context;
    const warnings: string[] = [];
    const errors: string[] = [];

    // TRƯỜNG HỢP 6: NM chưa được gán silo
    if (!phuLieuNMIds || phuLieuNMIds.length === 0) {
      errors.push("Không có nguyên liệu nào được chọn từ biểu mẫu.");
      return {
        isAutoSelectedSilo: false,
        isAutoSelectedPhuLieu: false,
        siloOptions: [],
        phuLieuNMOptions: [],
        warnings,
        errors,
      };
    }

    try {
      // Gọi API ResolveSilo
      const resolveResponse = await SiloServiceApi.resolveSilo({
        phuLieuNMIds,
        ngaySX,
      });

      // TRƯỜNG HỢP 1: BM ↔ 1 NM ↔ 1 SILO (Auto chọn tất cả)
      if (
        resolveResponse.isAutoSelected &&
        resolveResponse.siloId &&
        resolveResponse.phuLieuNMId
      ) {
        const siloOption = resolveResponse.options.find(
          (opt) => opt.siloId === resolveResponse.siloId
        );
        return {
          isAutoSelectedSilo: true,
          isAutoSelectedPhuLieu: true,
          selectedSiloId: resolveResponse.siloId,
          selectedPhuLieuNMId: resolveResponse.phuLieuNMId,
          siloOptions: [],
          phuLieuNMOptions: [],
          theTich: siloOption?.theTich ?? null,
          warnings,
          errors,
        };
      }

      // TRƯỜNG HỢP 2: BM ↔ 1 NM ↔ N SILO (NM cố định, user chọn Silo)
      // TRƯỜNG HỢP 3: BM ↔ N NM ↔ 1 SILO (Silo cố định, user chọn NM) - Xử lý trong onSiloChange
      // TRƯỜNG HỢP 4: BM ↔ N NM ↔ N SILO (1-1)
      // TRƯỜNG HỢP 5: BM ↔ N NM ↔ N SILO (N-M chéo)
      if (resolveResponse.options && resolveResponse.options.length > 0) {
        // Kiểm tra xem có phải trường hợp 3 không (1 silo duy nhất)
        if (resolveResponse.options.length === 1) {
          const singleSilo = resolveResponse.options[0];
          // TRƯỜNG HỢP 3: BM ↔ N NM ↔ 1 SILO
          const isSingleNM = singleSilo.phuLieuNMIds.length === 1;
          
          return {
            isAutoSelectedSilo: true,
            isAutoSelectedPhuLieu: isSingleNM,
            selectedSiloId: singleSilo.siloId,
            selectedPhuLieuNMId: isSingleNM ? singleSilo.phuLieuNMIds[0] : null,
            siloOptions: [],
            phuLieuNMOptions: singleSilo.phuLieuNMIds,
            theTich: singleSilo.theTich ?? null,
            warnings,
            errors,
          };
        }

        // TRƯỜNG HỢP 2, 4, 5: Nhiều silo
        // Nếu có 1 NM duy nhất trong tất cả options → TRƯỜNG HỢP 2
        const allPhuLieuIds = new Set<number>();
        resolveResponse.options.forEach((opt) => {
          opt.phuLieuNMIds.forEach((id) => allPhuLieuIds.add(id));
        });

        const isSingleNM = allPhuLieuIds.size === 1;
        const singleNMId = isSingleNM ? Array.from(allPhuLieuIds)[0] : null;

        // Kiểm tra xem có phải trường hợp 4 (1-1) không
        const isOneToOne = resolveResponse.options.every(
          (opt) => opt.phuLieuNMIds.length === 1
        );

        if (isOneToOne && !isSingleNM) {
          // TRƯỜNG HỢP 4: Mỗi silo chỉ có 1 NM, và các silo khác nhau
          warnings.push(
            "Mỗi silo chỉ chứa một nguyên liệu. Khi chọn silo, nguyên liệu sẽ được tự động chọn."
          );
        } else if (!isSingleNM) {
          // TRƯỜNG HỢP 5: N-M chéo
          warnings.push(
            "Một số silo chứa nhiều nguyên liệu. Vui lòng chọn cả silo và nguyên liệu."
          );
        }

        return {
          isAutoSelectedSilo: false,
          isAutoSelectedPhuLieu: isSingleNM,
          selectedPhuLieuNMId: singleNMId,
          siloOptions: resolveResponse.options,
          phuLieuNMOptions: Array.from(allPhuLieuIds),
          warnings,
          errors,
        };
      }

      // Không tìm thấy silo nào
      errors.push(
        "Không tìm thấy silo nào chứa các nguyên liệu này trong ngày sản xuất. Vui lòng kiểm tra lại mapping silo."
      );
      return {
        isAutoSelectedSilo: false,
        isAutoSelectedPhuLieu: false,
        siloOptions: [],
        phuLieuNMOptions: [],
        warnings,
        errors,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể resolve silo và nguyên liệu.";
      errors.push(errorMessage);
      return {
        isAutoSelectedSilo: false,
        isAutoSelectedPhuLieu: false,
        siloOptions: [],
        phuLieuNMOptions: [],
        warnings,
        errors,
      };
    }
  }

  async onSiloChange(
    siloId: number,
    context: ResolverContext
  ): Promise<SelectPhuLieuNMResponse> {
    const { phuLieuNMIds, ngaySX } = context;

    try {
      const response = await SiloServiceApi.resolvePhuLieuWhenChangeSilo({
        siloId,
        phuLieuNMIds,
        ngaySX,
      });

      // TRƯỜNG HỢP 3: BM ↔ N NM ↔ 1 SILO (Silo cố định, user chọn NM)
      // Nếu 1 NM → auto chọn
      // Nếu >1 NM → user chọn

      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể resolve nguyên liệu khi đổi silo.";
      message.error(errorMessage);
      throw error;
    }
  }

  async validate(
    siloId: number,
    phuLieuNMId: number,
    ngaySX: string
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      const result = await SiloServiceApi.validateBeforeSave({
        siloId,
        phuLieuNMId,
        ngaySX,
      });

      if (!result.isValid) {
        message.error(result.message || "Validation failed");
      }

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Validation failed";
      return {
        isValid: false,
        message: errorMessage,
      };
    }
  }
}

// Export singleton instance
export const siloPhuLieuResolver: SiloPhuLieuResolver =
  new SiloPhuLieuResolverImpl();

// Helper function để format ngày
export const formatNgaySX = (date: string | Date | dayjs.Dayjs): string => {
  if (typeof date === "string") {
    return date;
  }
  return dayjs(date).format("YYYY-MM-DD");
};

// Helper function để lấy PhuLieuNMIds từ tableData (dựa trên HeaderKey mapping)
export const extractPhuLieuNMIdsFromTable = (
  tableData: any[],
  headerKeyMappings?: Map<number, number> // Map HeaderKeyId -> PhuLieuNMId
): number[] => {
  const phuLieuIds = new Set<number>();

  tableData.forEach((row) => {
    // Duyệt qua tất cả các cột trong row
    Object.keys(row).forEach((key) => {
      const value = row[key];
      if (typeof value === "number" && value > 0) {
        // Nếu có mapping, sử dụng mapping
        if (headerKeyMappings && headerKeyMappings.has(value)) {
          phuLieuIds.add(headerKeyMappings.get(value)!);
        }
        // Hoặc nếu value chính là PhuLieuNMId (tùy vào cấu trúc dữ liệu)
        // phuLieuIds.add(value);
      }
    });
  });

  return Array.from(phuLieuIds);
};

