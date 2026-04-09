import type { ReactNode } from "react";
import type {
  HRCChildColumn,
  HRCParentColumn,
  HRCTableRow,
} from "../components/CustomTableHRC";
import type { HeaderMappingRecord } from "../components/HeaderMapping";

export type DynamicColumnMeta = {
  dataIndex: string;
  width?: number;
  label: string;
  allowMapping?: boolean;
  mappingPayload?: HeaderMappingRecord | null;
  metaGroup?: string;
  variant?: "source" | "adjust" | "default";
  highlight?: boolean;
  headerKeyId?: number | null;
};

export type AdjustColumnMeta = {
  key: string;
  dataIndex: string;
  headerKeyId?: number | null;
  headerKeyLabel?: string | null;
  width?: number;
  isManuallyAdded?: boolean; // true = thêm tay bằng button, cho phép chỉnh sửa
};

const DEFAULT_EXCLUDED_KEYS = ["meThoi", "macThep", "ghiChu", "stt", "STT"];

const canCurrentUserMap = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem("userinfo");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      iD_Quyen?: number;
      tenNgan?: string;
    };
    if (!parsed) return false;
    return parsed.iD_Quyen === 1 || parsed.tenNgan === "P.KH";
  } catch {
    return false;
  }
};

const resolveLabel = (title: ReactNode, fallback?: string) => {
  if (typeof title === "string") return title;
  if (fallback) return fallback;
  return "";
};

const buildAdjustColumn = (
  source: { title: ReactNode; dataIndex?: string; width?: number; metaLabel?: string },
  excludedKeys: Set<string>,
  adjustColumns: HRCChildColumn[],
  showAdjustColumns: boolean
) => {
  if (!showAdjustColumns) return;
  const dataIndex = source.dataIndex;
  if (!dataIndex || excludedKeys.has(dataIndex)) {
    return;
  }
  const label = source.metaLabel ?? resolveLabel(source.title, dataIndex);
  adjustColumns.push({
    title: label,
    dataIndex: `${dataIndex}_adjust`,
    width: source.width,
    placeholder: typeof label === "string" ? `Điều chỉnh ${label}` : undefined,
    editable: true,
    variant: "adjust",
    format: "number-group",
  });
};

const mapChildWithAdjust = (
  child: HRCChildColumn,
  excludedKeys: Set<string>,
  adjustColumns: HRCChildColumn[],
  showAdjustColumns: boolean
): HRCChildColumn => {
  buildAdjustColumn(child, excludedKeys, adjustColumns, showAdjustColumns);
  return { ...child, editable: false };
};

export const hrc2TableService = {
  canCurrentUserMap,
  mergeAdjustMetas(
    prev: AdjustColumnMeta[] = [],
    incoming: AdjustColumnMeta[] = []
  ): AdjustColumnMeta[] {
    // Chuẩn hoá: manual_col_* luôn xem như cột thêm tay để được editable (render autocomplete)
    const normalize = (m: AdjustColumnMeta): AdjustColumnMeta => ({
      ...m,
      isManuallyAdded:
        m.isManuallyAdded === true || (m.dataIndex ?? "").startsWith("manual_col_"),
    });

    const byDataIndex = new Map<string, AdjustColumnMeta>();
    prev.forEach((m) => {
      if (!m?.dataIndex) return;
      byDataIndex.set(m.dataIndex, normalize(m));
    });
    incoming.forEach((m) => {
      if (!m?.dataIndex) return;
      const norm = normalize(m);
      const existing = byDataIndex.get(norm.dataIndex);
      // Ưu tiên label/headerKeyId từ prev nếu có
      byDataIndex.set(norm.dataIndex, existing ? { ...norm, ...existing } : norm);
    });

    return hrc2TableService.dedupeAdjustMetas(Array.from(byDataIndex.values()));
  },
  renameRowColumnKey(
    row: HRCTableRow,
    oldDataIndex: string,
    newDataIndex: string
  ): HRCTableRow {
    if (!row || oldDataIndex === newDataIndex) return row;
    if (!(oldDataIndex in row)) return row;

    const next: HRCTableRow = { ...row };
    next[newDataIndex] = row[oldDataIndex];

    const oldOrigKey = `${oldDataIndex}__orig`;
    const newOrigKey = `${newDataIndex}__orig`;
    if (oldOrigKey in row) {
      (next as unknown as Record<string, unknown>)[newOrigKey] =
        (row as unknown as Record<string, unknown>)[oldOrigKey];
    }

    const oldManualFlagKey = `${oldDataIndex}__IsManual`;
    const newManualFlagKey = `${newDataIndex}__IsManual`;
    if (oldManualFlagKey in row) {
      (next as unknown as Record<string, unknown>)[newManualFlagKey] =
        (row as unknown as Record<string, unknown>)[oldManualFlagKey];
    }

    delete (next as unknown as Record<string, unknown>)[oldDataIndex];
    delete (next as unknown as Record<string, unknown>)[oldOrigKey];
    delete (next as unknown as Record<string, unknown>)[oldManualFlagKey];

    return next;
  },

  removeRowColumnKey(row: HRCTableRow, dataIndex: string): HRCTableRow {
    if (!row) return row;
    if (!(dataIndex in row)) return row;
    const next: HRCTableRow = { ...row };
    delete (next as unknown as Record<string, unknown>)[dataIndex];
    delete (next as unknown as Record<string, unknown>)[`${dataIndex}__orig`];
    delete (next as unknown as Record<string, unknown>)[`${dataIndex}__IsManual`];
    return next;
  },
  dedupeAdjustMetas(metas: AdjustColumnMeta[] = []): AdjustColumnMeta[] {
    if (!metas.length) return metas;

    const manualHeaderKeyIds = new Set<number>();
    metas.forEach((m) => {
      const isManualCol = (m.dataIndex ?? "").startsWith("manual_col_");
      const hk = m.headerKeyId;
      if (isManualCol && typeof hk === "number") {
        manualHeaderKeyIds.add(hk);
      }
    });

    if (!manualHeaderKeyIds.size) return metas;

    // Nếu đã có manual_col_{hk} thì bỏ adjust_{hk}_adjust để tránh render dư cột
    return metas.filter((m) => {
      const hk = m.headerKeyId;
      if (typeof hk !== "number") return true;
      const isAutoAdjust = (m.dataIndex ?? "").startsWith(`adjust_${hk}_`);
      return !(manualHeaderKeyIds.has(hk) && isAutoAdjust);
    });
  },
  buildDynamicColumnMap(
    groups: Record<string, HRCChildColumn[]>
  ): Record<string, DynamicColumnMeta[]> {
    const result: Record<string, DynamicColumnMeta[]> = {};
    Object.entries(groups).forEach(([key, cols]) => {
      if (!cols || !cols.length) {
        return;
      }
      result[key] = cols.map((col) => ({
        dataIndex: col.dataIndex,
        width: col.width,
        label:
          col.metaLabel ??
          (typeof col.title === "string" ? col.title : "") ??
          "",
        allowMapping: col.allowMapping,
        mappingPayload: col.mappingPayload ?? null,
        metaGroup: col.metaGroup,
        variant: col.variant,
        highlight: col.highlight,
        headerKeyId: (col as { headerKeyId?: number | null })?.headerKeyId ?? null,
      }));
    });
    return result;
  },

  columnsFromMeta(
    items: DynamicColumnMeta[] | undefined,
    renderTitle: (label: string, meta?: DynamicColumnMeta) => ReactNode
  ): HRCChildColumn[] {
    if (!items?.length) {
      return [];
    }
    const canMap = canCurrentUserMap();
    return items.map((item) => ({
      title: renderTitle(item.label, item),
      dataIndex: item.dataIndex,
      width: item.width,
      highlight: item.highlight ?? item.metaGroup === "others",
      metaLabel: item.label,
      editable: false,
      // Chỉ cho phép mapping khi user có quyền và meta cho phép
      allowMapping: canMap && (item.allowMapping ?? true),
      mappingPayload: item.mappingPayload,
      metaGroup: item.metaGroup,
      variant: item.variant ?? "source",
      headerKeyId: item.headerKeyId ?? undefined,
    }));
  },

  restoreDynamicGroups(
    metaMap: Record<string, DynamicColumnMeta[]> | undefined,
    renderTitle: (label: string, meta?: DynamicColumnMeta) => ReactNode
  ): Record<string, HRCChildColumn[]> {
    if (!metaMap) {
      return {};
    }
    const result: Record<string, HRCChildColumn[]> = {};
    Object.entries(metaMap).forEach(([key, items]) => {
      result[key] = hrc2TableService.columnsFromMeta(items, renderTitle);
    });
    return result;
  },

  adjustMetaFromDynamic(items?: DynamicColumnMeta[]): AdjustColumnMeta[] {
    if (!items?.length) {
      return [];
    }
    return items.map((item, index) => ({
      key: item.dataIndex || `adjust_${index}`,
      dataIndex: item.dataIndex || `adjust_${index}`,
      headerKeyId: item.headerKeyId ?? null,
      headerKeyLabel: item.label,
      width: item.width,
      isManuallyAdded: (item.dataIndex ?? "").startsWith("manual_col_"),
    }));
  },

  adjustMetaToDynamic(metas: AdjustColumnMeta[]): DynamicColumnMeta[] {
    if (!metas?.length) {
      return [];
    }
    return metas.map((meta) => ({
      dataIndex: meta.dataIndex,
      width: meta.width,
      label: meta.headerKeyLabel ?? "",
      metaGroup: "adjust",
      variant: "adjust",
      highlight: false,
      allowMapping: false,
      mappingPayload: null,
      headerKeyId: meta.headerKeyId ?? null,
    }));
  },

  mergeServerRows(
    serverRows: HRCTableRow[] = [],
    previousRows: HRCTableRow[] = [],
    keyField = "meThoi",
    preserveFields?: string[]
  ): HRCTableRow[] {
    if (!previousRows.length) {
      return serverRows;
    }

    const prevMap = new Map<string | number, HRCTableRow>();
    previousRows.forEach((row) => {
      const keyValue = row[keyField] as string | number | undefined;
      if (keyValue !== undefined && keyValue !== null) {
        prevMap.set(keyValue, row);
      }
    });

    const preserveSet = preserveFields && preserveFields.length
      ? new Set(preserveFields)
      : null;

    return serverRows.map((serverRow) => {
      const keyValue = serverRow[keyField] as string | number | undefined;
      if (keyValue === undefined || keyValue === null) {
        return serverRow;
      }
      const prevRow = prevMap.get(keyValue);
      if (!prevRow) {
        return serverRow;
      }
      const merged: HRCTableRow = { ...serverRow };
      Object.keys(prevRow).forEach((field) => {
        const shouldPreserve =
          preserveSet !== null ? preserveSet.has(field) : field.endsWith("_adjust");
        if (shouldPreserve) {
          merged[field] = prevRow[field];
        }
      });
      return merged;
    });
  },

  applyManualOverrides(
    serverRows: HRCTableRow[] = [],
    previousRows: HRCTableRow[] = [],
    options?: {
      rowIdField?: string;
      fallbackKeyField?: string;
    }
  ): HRCTableRow[] {
    if (!previousRows.length || !serverRows.length) {
      return serverRows;
    }

    const rowIdField = options?.rowIdField ?? "id";
    const fallbackKeyField = options?.fallbackKeyField ?? "meThoi";

    const prevMap = new Map<string | number, HRCTableRow>();
    previousRows.forEach((row) => {
      const idVal = row[rowIdField] as string | number | undefined;
      const fallbackVal = row[fallbackKeyField] as string | number | undefined;
      const keyValue =
        idVal !== undefined && idVal !== null && idVal !== "" ? idVal : fallbackVal;
      if (keyValue !== undefined && keyValue !== null) {
        prevMap.set(keyValue, row);
      }
    });

    const MANUAL_SUFFIX = "__IsManual";
    const ORIG_SUFFIX = "__orig";

    return serverRows.map((serverRow) => {
      const idVal = serverRow[rowIdField] as string | number | undefined;
      const fallbackVal = serverRow[fallbackKeyField] as string | number | undefined;
      const keyValue =
        idVal !== undefined && idVal !== null && idVal !== "" ? idVal : fallbackVal;
      if (keyValue === undefined || keyValue === null) {
        return serverRow;
      }
      const prevRow = prevMap.get(keyValue);
      if (!prevRow) {
        return serverRow;
      }

      const merged: HRCTableRow = { ...serverRow };

      Object.keys(prevRow).forEach((k) => {
        if (!k.endsWith(MANUAL_SUFFIX)) return;
        if (prevRow[k] !== true) return;

        const baseKey = k.slice(0, -MANUAL_SUFFIX.length);
        const isManualCol = baseKey.startsWith("manual_col_");
        const serverAuto = (baseKey in merged) ? merged[baseKey] : undefined;
        const manualValue = prevRow[baseKey];
        const origKey = `${baseKey}${ORIG_SUFFIX}`;

        if (isManualCol) {
          // manual_col_*: luôn giữ manualValue, không dựa __orig/serverAuto
          merged[baseKey] = manualValue;
          merged[k] = String(manualValue ?? "").trim() !== "";
          return;
        }

        // Orig luôn cập nhật theo số liệu server mới nhất để tooltip "Cũ/Mới" đúng sau khi làm mới.
        if (serverAuto !== undefined) {
          merged[origKey] = serverAuto;
        }

        const isStillManual = String(manualValue ?? "") !== String(serverAuto ?? "");

        if (isStillManual) {
          merged[baseKey] = manualValue;
          merged[k] = true;
        } else {
          merged[k] = false;
        }
      });

      return merged;
    });
  },

  buildColumnsWithAdjust({
    baseColumns,
    slotColumns = {},
    excludedAdjustKeys = DEFAULT_EXCLUDED_KEYS,
    adjustGroupTitle = "Điều chỉnh số liệu",
    showAdjustColumns = true,
    manualAdjustColumns,
    phanBoColumns,
    generateAdjustColumnsFromBase = true,
  }: {
    baseColumns: HRCParentColumn[];
    slotColumns?: Record<string, HRCChildColumn[] | undefined>;
    excludedAdjustKeys?: string[];
    adjustGroupTitle?: string;
    showAdjustColumns?: boolean;
    manualAdjustColumns?: HRCChildColumn[];
    phanBoColumns?: HRCChildColumn[];
    generateAdjustColumnsFromBase?: boolean;
  }): HRCParentColumn[] {
    const adjustChildColumns: HRCChildColumn[] = manualAdjustColumns
      ? [...manualAdjustColumns]
      : [];
    const excluded = new Set(excludedAdjustKeys);
    const shouldAutoGenerate = generateAdjustColumnsFromBase !== false;

    const processColumn = (col: HRCParentColumn): HRCParentColumn => {
      const dataIndex = col.dataIndex ?? "";
      const replacement = dataIndex ? slotColumns[dataIndex] : undefined;

      // Slot "dieuChinh" trong config: nơi render group điều chỉnh số liệu.
      // Nếu không có cột điều chỉnh thì ẩn hẳn slot này (không render cuối bảng).
      if (dataIndex === "dieuChinh") {
        if (!showAdjustColumns || adjustChildColumns.length === 0) {
          return { ...col, children: [] };
        }
        return {
          title: adjustGroupTitle,
          dataIndex: "dieuChinh",
          children: adjustChildColumns,
        };
      }

      if (replacement && replacement.length) {
        return {
          ...col,
          children: replacement.map((child) =>
            shouldAutoGenerate
              ? mapChildWithAdjust(child, excluded, adjustChildColumns, showAdjustColumns)
              : { ...child, editable: false }
          ),
          // editable: false,
        };
      }

      if (col.children && col.children.length > 0) {
        return {
          ...col,
          children: col.children.map((child) =>
            shouldAutoGenerate
              ? mapChildWithAdjust(child, excluded, adjustChildColumns, showAdjustColumns)
              : { ...child, editable: false }
          ),
          // editable: false,
        };
      }

      if (col.dataIndex) {
        if (shouldAutoGenerate) {
          buildAdjustColumn(col, excluded, adjustChildColumns, showAdjustColumns);
        }
        return {
          ...col,
        };
      }

      return col;
    };

    const processedColumns = baseColumns
      .map(processColumn)
      .filter(
        (c) =>
          !(
            c.dataIndex === "dieuChinh" &&
            (!c.children || c.children.length === 0)
          )
      );

    // Append group "Phân bổ" riêng nếu có phanBoColumns
    if (phanBoColumns && phanBoColumns.length > 0) {
      processedColumns.push({
        title: "Phân bổ",
        dataIndex: "phanBoGroup",
        children: phanBoColumns,
      } as HRCParentColumn);
    }

    return processedColumns;
  },
};


