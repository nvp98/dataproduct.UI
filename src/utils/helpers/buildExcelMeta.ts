import type { HRCChildColumn } from "../../components/CustomTableHRC";

export interface ExcelColumn {
  key: string;
  title: string;
}

export interface ExcelSection {
  title: string;
  dataKey: string;
  columns: ExcelColumn[];
}

export interface ExcelMeta {
  sections: ExcelSection[];
}

/**
 * Flatten config columns (xử lý children) kết hợp với dynamic slot columns.
 * - col có children → đệ quy vào children
 * - col.dataIndex tồn tại trong slots → expand ra dynamic columns (metaLabel/title)
 * - col có dataIndex + title → thêm trực tiếp
 * - col không có title (vd: dieuChinh slot) → bỏ qua
 */
export function buildExcelColumns(
  cols: any[],
  slots: Record<string, HRCChildColumn[]>
): ExcelColumn[] {
  const out: ExcelColumn[] = [];
  for (const col of cols) {
    if (Array.isArray(col.children)) {
      out.push(...buildExcelColumns(col.children, slots));
    } else if (col.dataIndex && col.dataIndex in slots) {
      (slots[col.dataIndex] ?? []).forEach((dc) => {
        const t =
          (dc as any).metaLabel ??
          (typeof dc.title === "string" ? dc.title : "");
        if (dc.dataIndex && t) out.push({ key: String(dc.dataIndex), title: t });
      });
    } else if (col.dataIndex && col.title) {
      out.push({ key: col.dataIndex, title: String(col.title) });
    }
  }
  return out;
}

/**
 * Build _excelMeta từ config layout + dynamic slot columns.
 * @param layout    config.layout  (mảng section chứa table1, ...)
 * @param layout2   config.layout2 (mảng section chứa table2, ...)
 * @param slots     mapping dataIndex → HRCChildColumn[] (dynamic columns)
 */
export function buildExcelMeta(
  layout: any[],
  layout2: any[],
  slots: Record<string, HRCChildColumn[]>
): ExcelMeta {
  return {
    sections: [
      ...layout
        .filter((l) => l.sectionType === "table")
        .map((l) => ({
          title: l.title ?? l.key,
          dataKey: l.key,
          columns: buildExcelColumns(l.columns ?? [], slots),
        })),
      ...layout2
        .filter((l) => l.sectionType === "table")
        .map((l) => ({
          title: l.title ?? l.key,
          dataKey: l.key,
          columns: buildExcelColumns(l.columns ?? [], {}),
        })),
    ],
  };
}
