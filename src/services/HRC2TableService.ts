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
};

const DEFAULT_EXCLUDED_KEYS = ["meThoi", "macThep", "ghiChu", "stt", "STT"];

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
        headerKeyId: (col as any)?.headerKeyId ?? null,
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
    return items.map((item) => ({
      title: renderTitle(item.label, item),
      dataIndex: item.dataIndex,
      width: item.width,
      highlight: item.highlight ?? item.metaGroup === "others",
      metaLabel: item.label,
      editable: false,
      // Luôn set allowMapping = true để hiển thị button móc nối cho tất cả phụ liệu
      allowMapping: item.allowMapping ?? true,
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
    keyField = "meThoi"
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
        if (field.endsWith("_adjust")) {
          merged[field] = prevRow[field];
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
    generateAdjustColumnsFromBase = true,
  }: {
    baseColumns: HRCParentColumn[];
    slotColumns?: Record<string, HRCChildColumn[] | undefined>;
    excludedAdjustKeys?: string[];
    adjustGroupTitle?: string;
    showAdjustColumns?: boolean;
    manualAdjustColumns?: HRCChildColumn[];
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

    const processedColumns = baseColumns.map(processColumn);

    if (showAdjustColumns && adjustChildColumns.length) {
      processedColumns.push({
        title: adjustGroupTitle,
        children: adjustChildColumns,
      });
    }

    return processedColumns;
  },
};


