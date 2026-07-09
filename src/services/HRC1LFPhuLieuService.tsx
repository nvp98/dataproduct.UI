/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HRCChildColumn, HRCTableRow, HRCParentColumn } from "../components/CustomTableHRC";
import { dlnmHRC1Api } from "./DLNMHRC1Api";
import { Hrc1PhuLieuNmServiceApi } from "./Hrc1PhuLieuNmServiceApi";

export interface FetchHrc1LFPhuLieusParams {
  NgaySX?: string | null;
  Ca?: number | null;
  Scope?: number | null;
}

type Hrc1RawItem = Record<string, unknown>;

export interface ProcessedHrc1LFPhuLieusResult {
  phuGiaColumns: HRCChildColumn[];
  tableData: HRCTableRow[];
}

export interface ProcessHrc1LFPhuLieusOptions {
  baseColumns?: HRCParentColumn[];
}

/** BE trả camelCase (System.Text.Json mặc định) — thử thêm biến thể PascalCase để phòng ngừa. */
const getVal = <T,>(item: Hrc1RawItem, ...keys: string[]): T | null => {
  for (const key of keys) {
    const val = item[key];
    if (val !== undefined && val !== null) return val as T;
  }
  return null;
};

/**
 * Service xử lý dữ liệu phụ liệu HRC1 Tinh luyện LF — khác hrc1PhuLieuService (BOF): LF không có
 * nguồn NM nào để đồng bộ, mọi mẻ + phụ liệu đều nhập tay 100%. Vì vậy:
 * - Không có khái niệm "auto vs manual" / baseline để so sánh (không __orig, không __IsManual).
 * - Cột phụ liệu luôn lấy TOÀN BỘ danh mục HRC1_PhuLieuNM đang active (dùng chung với BOF,
 *   không phân biệt theo BieuMau), không lọc theo "đã có dữ liệu" như BOF — vì người dùng cần
 *   cột trống để gõ vào ngay từ đầu.
 * - Mọi dòng trả về đều ép IsNM=false (bắt buộc để CustomTableHRC cho sửa meThoi/macThep).
 */
export const hrc1LFPhuLieuService = {
  async fetchAndProcessPhuLieus(
    params: FetchHrc1LFPhuLieusParams,
    options: ProcessHrc1LFPhuLieusOptions = {}
  ): Promise<ProcessedHrc1LFPhuLieusResult> {
    const { baseColumns = [] } = options;

    const [res, catalog] = await Promise.all([
      dlnmHRC1Api.filter({
        NgaySX: params.NgaySX,
        Ca: params.Ca,
        Scope: params.Scope,
        BieuMau: "LF",
      }),
      // Danh mục HRC1_PhuLieuNM dùng chung cho cả BOF và LF, không phân biệt theo BieuMau.
      Hrc1PhuLieuNmServiceApi.getAll({ dangSuDung: true }),
    ]);

    const rawData = (Array.isArray(res) ? res : res ? [res] : []) as Hrc1RawItem[];

    const phuGiaColumns: HRCChildColumn[] = [...catalog]
      .sort((a, b) => {
        const ta = a.thuTu ?? Number.MAX_SAFE_INTEGER;
        const tb = b.thuTu ?? Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return a.id - b.id;
      })
      .map((pl) => ({
        title: pl.tenPhuLieu,
        dataIndex: `phuLieu_${pl.id}`,
        width: 100,
        format: "number-group",
        sum: true,
        metaLabel: pl.tenPhuLieu,
        metaGroup: "LF_PhuGia",
        editable: true,
        variant: "default" as const,
        headerKeyId: pl.id,
      }));

    const assignRowValue = (target: HRCTableRow, key: string, value: unknown) => {
      if (typeof value === "number" || typeof value === "string") {
        target[key] = value;
        return;
      }
      if (value instanceof Date) {
        target[key] = value.toISOString();
        return;
      }
      if (value !== null && value !== undefined) {
        target[key] = String(value);
      }
    };

    const tableData: HRCTableRow[] = rawData.map((item, index) => {
      const data = (getVal<Hrc1RawItem>(item, "data", "Data") ?? {}) as Hrc1RawItem;
      const meThoi = getVal<string>(data, "meThoi", "MeThoi");
      const isTrungMe = getVal<boolean>(data, "isTrungMeThoi", "IsTrungMeThoi") === true;

      const row: HRCTableRow = {
        key: `row-${meThoi ?? index}`,
        id: getVal<number>(data, "id", "ID") ?? undefined,
        // LF không có mẻ từ NM — luôn ép false để CustomTableHRC cho sửa mọi ô (meThoi/macThep...).
        IsNM: false,
        isTrungMeThoi: isTrungMe,
        IsTrungMeThoi: isTrungMe,
        __fromFilterAPI: true,
      };

      const mapField = (dataIndex?: string) => {
        if (!dataIndex) return;
        const pascal = dataIndex.charAt(0).toUpperCase() + dataIndex.slice(1);
        const val = getVal<unknown>(data, dataIndex, pascal);
        if (val !== undefined && val !== null) assignRowValue(row, dataIndex, val);
      };

      baseColumns.forEach((col: any) => {
        if (col.dataIndex && !col.children) mapField(col.dataIndex);
        if (Array.isArray(col.children)) {
          col.children.forEach((c: any) => mapField(c.dataIndex));
        }
      });

      const phuLieus = (getVal<Hrc1RawItem[]>(item, "phuLieus", "PhuLieus") ?? []) as Hrc1RawItem[];
      phuLieus.forEach((pl) => {
        const id = getVal<number>(pl, "idPhuLieu", "iD_PhuLieu", "ID_PhuLieu");
        if (id == null) return;
        const value = getVal<number>(pl, "klPhuGia", "KLPhuGia");
        row[`phuLieu_${id}`] = value ?? "";
      });

      return row;
    });

    if (tableData.length === 0) {
      tableData.push({ key: "row-empty" });
    }

    return { phuGiaColumns, tableData };
  },

  /** Chuẩn hóa table rows trước khi gửi payload — LF không cần dọn __orig/manual_col_* vì không dùng. */
  sanitizeRowsBeforeSubmit(rows: HRCTableRow[]): HRCTableRow[] {
    return rows.map((row) => {
      const processedRow: Record<string, unknown> = { ...row };
      processedRow.IsNM = false;
      delete processedRow._isNewRow;
      delete processedRow.__fromFilterAPI;
      return processedRow as HRCTableRow;
    });
  },
};
