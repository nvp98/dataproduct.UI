import { Button } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { dlnmHRC2Api } from "./DLNMHRC2Api";
import { normalizeHRC2GroupedResponse } from "../models/DLMN_HRC2Model";
import type { HRC2GroupedByReportNoModel, HeaderKeyResponse } from "../models/DLMN_HRC2Model";
import type { HRCChildColumn, HRCTableRow, HRCParentColumn } from "../components/CustomTableHRC";
import type { HeaderMappingRecord } from "../components/HeaderMapping";

export interface FetchPhuLieusParams {
  NgaySX?: string | null;
  Ca?: number | null;
  LoaiBM: "LF" | "RH" | "BOF";
  Scope?: number | null;
}

type MappingPayload = HeaderMappingRecord;

export interface ProcessedPhuLieusResult {
  mappedPhuLieus: HeaderKeyResponse[];
  unmappedPhuLieus: HeaderKeyResponse[];
  phuGiaColumns: HRCChildColumn[]; // Phụ liệu loại PG (Phụ gia và chất khử oxy)
  chatHopKimColumns: HRCChildColumn[]; // Phụ liệu loại KL (Chất hợp kim hóa)
  khacColumns: HRCChildColumn[]; // Phụ liệu chưa mapped
  tableData: HRCTableRow[];
}

export interface ProcessPhuLieusOptions {
  onOpenMappingModal?: (record: MappingPayload) => void;
  baseColumns?: HRCParentColumn[];
  dataFieldMapping?: Record<string, string>; // Map từ config dataIndex sang field name trong data
  mergeMappedPhuLieus?: boolean; // Nếu true, gộp toàn bộ mapped phụ liệu vào một nhóm
}

/**
 * Service xử lý dữ liệu phụ liệu từ API filter
 */
export const hrc2PhuLieuService = {
  /**
   * Fetch và xử lý dữ liệu phụ liệu từ API
   */
  async fetchAndProcessPhuLieus(
    params: FetchPhuLieusParams,
    options: ProcessPhuLieusOptions = {}
  ): Promise<ProcessedPhuLieusResult> {
    const {
      onOpenMappingModal,
      baseColumns = [],
      dataFieldMapping = {},
      mergeMappedPhuLieus = false,
    } = options;

    // Gọi API filter
    const res = await dlnmHRC2Api.filter({
      NgaySX: params.NgaySX,
      Ca: params.Ca,
      LoaiBM: params.LoaiBM,
      Scope: params.Scope,
    });

    // Normalize dữ liệu từ API response
    const rawData = Array.isArray(res) ? res : [res];
    const data: HRC2GroupedByReportNoModel[] = rawData.map(normalizeHRC2GroupedResponse);

    // Tập hợp tất cả phụ liệu đã mapped từ tất cả các item (mẻ) và loại bỏ trùng lặp
    const allMappedPhuLieus: Record<number, HeaderKeyResponse> = {};
    data.forEach(item => {
      if (item.mappedPhulieus && item.mappedPhulieus.length > 0) {
        item.mappedPhulieus.forEach(phuLieu => {
          if (phuLieu.idHeaderKey && !allMappedPhuLieus[phuLieu.idHeaderKey]) {
            allMappedPhuLieus[phuLieu.idHeaderKey] = phuLieu;
          }
        });
      }
    });

    // Tập hợp tất cả phụ liệu chưa mapped từ tất cả các item (mẻ) và loại bỏ trùng lặp
    const allUnmappedPhuLieus: Record<string, HeaderKeyResponse> = {};
    data.forEach(item => {
      if (item.unmappedPhulieus && item.unmappedPhulieus.length > 0) {
        item.unmappedPhulieus.forEach(phuLieu => {
          const groupKey = (phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || `PL-${phuLieu.idPhuLieu}`)?.trim() || `PL-${phuLieu.idPhuLieu}`;
          if (!allUnmappedPhuLieus[groupKey]) {
            allUnmappedPhuLieus[groupKey] = phuLieu;
          }
        });
      }
    });

    // Chuyển đổi thành mảng
    const mappedPhuLieus = Object.values(allMappedPhuLieus);
    const unmappedPhuLieus = Object.values(allUnmappedPhuLieus);

    // Tách phụ liệu đã mapped theo loaiPhuLieu: PG (Phụ gia) và KL (Chất hợp kim)
    const normalizeLoaiPhuLieu = (value?: string | null) =>
      value?.trim().toLowerCase();

    const phuGiaPhuLieus = mappedPhuLieus.filter((phuLieu) => {
      const loai = normalizeLoaiPhuLieu(phuLieu.loaiPhuLieu);
      return loai === "pg" || loai === "phụ gia và chất khử oxy";
    });

    const chatHopKimPhuLieus = mappedPhuLieus.filter((phuLieu) => {
      const loai = normalizeLoaiPhuLieu(phuLieu.loaiPhuLieu);
      return loai === "kl" || loai === "chất hợp kim hóa";
    });

    // Sắp xếp phụ liệu theo thuTu (thứ tự tăng dần, null/undefined ở cuối)
    const sortByThuTu = (a: HeaderKeyResponse, b: HeaderKeyResponse): number => {
      const thuTuA = a.thuTu ?? Number.MAX_SAFE_INTEGER;
      const thuTuB = b.thuTu ?? Number.MAX_SAFE_INTEGER;
      if (thuTuA !== thuTuB) {
        return thuTuA - thuTuB;
      }
      // Nếu cùng thuTu, sắp xếp theo tên
      const tenA = a.tenHienThi || a.tenNguonDuLieu || a.tenPhuLieu || "";
      const tenB = b.tenHienThi || b.tenNguonDuLieu || b.tenPhuLieu || "";
      return tenA.localeCompare(tenB);
    };

    // Sắp xếp các mảng phụ liệu
    const sortedPhuGiaPhuLieus = [...phuGiaPhuLieus].sort(sortByThuTu);
    const sortedChatHopKimPhuLieus = [...chatHopKimPhuLieus].sort(sortByThuTu);

    // Tạo columns cho phụ liệu loại PG (Phụ gia và chất khử oxy)
    const buildMappingPayload = (phuLieu: HeaderKeyResponse): MappingPayload => ({
      idPhuLieu: phuLieu.idPhuLieu ?? null,
      tenPhuLieu: phuLieu.tenPhuLieu ?? phuLieu.tenNguonDuLieu ?? "",
      tenNguonDuLieu: phuLieu.tenNguonDuLieu ?? phuLieu.tenPhuLieu ?? "",
      idHeaderKey: phuLieu.idHeaderKey ?? null,
      mappingId: phuLieu.mappingId ?? null,
      headerKeyName: phuLieu.tenHienThi ?? undefined,
    });

    const renderServerTitle = (
      label: string,
      payload: MappingPayload,
      allowMapping: boolean
    ) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span>{label}</span>
        {allowMapping && onOpenMappingModal && (
          <Button
            size="small"
            type="link"
            icon={<LinkOutlined />}
            onClick={() => onOpenMappingModal(payload)}
          />
        )}
      </div>
    );

    const allowMappingButtons = !!onOpenMappingModal;

    const phuGiaColumns: HRCChildColumn[] = sortedPhuGiaPhuLieus.map(phuLieu => {
      const label = phuLieu.tenHienThi || phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || "";
      const payload = buildMappingPayload(phuLieu);
      return {
        title: renderServerTitle(label, payload, allowMappingButtons),
        dataIndex: `phuLieu_${phuLieu.idHeaderKey}`,
        width: 100,
        metaLabel: label,
        metaGroup: "PG",
        allowMapping: allowMappingButtons,
        mappingPayload: payload,
        variant: "source",
        headerKeyId: phuLieu.idHeaderKey ?? null,
        thuTu: phuLieu.thuTu ?? null,
      };
    });

    const chatHopKimColumns: HRCChildColumn[] = sortedChatHopKimPhuLieus.map(phuLieu => {
      const label = phuLieu.tenHienThi || phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || "";
      const payload = buildMappingPayload(phuLieu);
      return {
        title: renderServerTitle(label, payload, allowMappingButtons),
        dataIndex: `phuLieu_${phuLieu.idHeaderKey}`,
        width: 100,
        metaLabel: label,
        metaGroup: "KL",
        allowMapping: allowMappingButtons,
        mappingPayload: payload,
        variant: "source",
        headerKeyId: phuLieu.idHeaderKey ?? null,
        thuTu: phuLieu.thuTu ?? null,
      };
    });

    // Sắp xếp unmapped phụ liệu theo tên (vì không có thuTu)
    const sortedUnmappedPhuLieus = [...unmappedPhuLieus].sort((a, b) => {
      const tenA = a.tenNguonDuLieu || a.tenPhuLieu || `PL-${a.idPhuLieu}` || "";
      const tenB = b.tenNguonDuLieu || b.tenPhuLieu || `PL-${b.idPhuLieu}` || "";
      return tenA.localeCompare(tenB);
    });

    const khacColumns: HRCChildColumn[] = sortedUnmappedPhuLieus.map(phuLieu => {
      const groupKey = (phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || `PL-${phuLieu.idPhuLieu}`)?.trim() || `PL-${phuLieu.idPhuLieu}`;
      const label = phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || groupKey;
      const payload = buildMappingPayload(phuLieu);
      return {
        title: renderServerTitle(label, payload, allowMappingButtons),
        dataIndex: `others_${groupKey.replace(/[^a-zA-Z0-9]/g, "_")}`,
        highlight: true,
        width: 100,
        metaLabel: label,
        metaGroup: "others",
        allowMapping: allowMappingButtons,
        mappingPayload: payload,
        variant: "source",
      };
    });

    // Map dữ liệu từ API vào table rows
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

    const tableData: HRCTableRow[] = data.map((item, index) => {
      const row: HRCTableRow = {
        key: `row-${item.data?.reportNo || index}`,
        IsNM: item.data?.isNM ?? true,
        id: item.data?.id ?? undefined,
      };

      // Map các cột cơ bản từ config
      baseColumns.forEach((col) => {
        // Helper function để tìm giá trị từ dataItem với các biến thể tên field
        const getFieldValue = (
          dataItem: Record<string, unknown>,
          dataIndex: string
        ): unknown => {
          // Thử mapping trước
          const mappedField = dataFieldMapping[dataIndex];
          if (
            mappedField &&
            dataItem[mappedField] !== undefined &&
            dataItem[mappedField] !== null
          ) {
            return dataItem[mappedField];
          }
          
          // Thử dataIndex trực tiếp
          if (dataItem[dataIndex] !== undefined && dataItem[dataIndex] !== null) {
            return dataItem[dataIndex];
          }
          
          // Thử các biến thể: camelCase, lowercase, uppercase
          const camelCase = dataIndex.charAt(0).toUpperCase() + dataIndex.slice(1);
          if (dataItem[camelCase] !== undefined && dataItem[camelCase] !== null) {
            return dataItem[camelCase];
          }
          
          const lowerCase = dataIndex.toLowerCase();
          if (dataItem[lowerCase] !== undefined && dataItem[lowerCase] !== null) {
            return dataItem[lowerCase];
          }
          
          const upperCase = dataIndex.toUpperCase();
          if (dataItem[upperCase] !== undefined && dataItem[upperCase] !== null) {
            return dataItem[upperCase];
          }
          
          return null;
        };
        
        // Map cột cha (không có children)
        if (col.dataIndex && !col.children) {
          const dataItem = item.data as Record<string, unknown> | null;
          const dataIndex = col.dataIndex;
          
          if (dataItem) {
            const value = getFieldValue(dataItem, dataIndex);
            if (value !== undefined && value !== null) {
              assignRowValue(row, dataIndex, value);
            }
          }
        }
        
        // Map các cột con (children) - ví dụ: các cột khí
        if (col.children && Array.isArray(col.children)) {
          col.children.forEach((childCol) => {
            if (childCol.dataIndex) {
              const dataItem = item.data as Record<string, unknown> | null;
              const dataIndex = childCol.dataIndex;
              
              if (dataItem) {
                const value = getFieldValue(dataItem, dataIndex);
                if (value !== undefined && value !== null) {
                  assignRowValue(row, dataIndex, value);
                }
              }
            }
          });
        }
      });

      // Map các phụ liệu đã mapped (cả PG và KL)
      mappedPhuLieus.forEach(phuLieu => {
        const dataIndex = `phuLieu_${phuLieu.idHeaderKey}`;
        const matchedPhuLieu = item.mappedPhulieus?.find(
          (p: HeaderKeyResponse) => p.idHeaderKey === phuLieu.idHeaderKey
        );
        if (matchedPhuLieu) {
          row[dataIndex] = matchedPhuLieu.klPhuGiaTotal ?? matchedPhuLieu.klPhuGia ?? "";
        }
      });

      // Map các phụ liệu chưa mapped
      unmappedPhuLieus.forEach(phuLieu => {
        const groupKey = (phuLieu.tenNguonDuLieu || phuLieu.tenPhuLieu || `PL-${phuLieu.idPhuLieu}`)?.trim() || `PL-${phuLieu.idPhuLieu}`;
        const dataIndex = `others_${groupKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
        
        const matchedPhuLieu = item.unmappedPhulieus?.find(
          (p: HeaderKeyResponse) => {
            const pKey = (p.tenNguonDuLieu || p.tenPhuLieu || `PL-${p.idPhuLieu}`)?.trim() || `PL-${p.idPhuLieu}`;
            return pKey === groupKey;
          }
        );
        
        if (matchedPhuLieu) {
          row[dataIndex] = matchedPhuLieu.klPhuGiaTotal ?? matchedPhuLieu.klPhuGia ?? "";
        }
      });

      return row;
    });

    // Nếu không có dữ liệu, tạo 1 dòng trống
    if (tableData.length === 0) {
      tableData.push({ key: "row-empty" });
    }

    // Khi merge, cần sắp xếp lại toàn bộ theo ThuTu để đảm bảo thứ tự đúng
    const mergedColumns = mergeMappedPhuLieus
      ? [...phuGiaColumns, ...chatHopKimColumns].sort((a, b) => {
          // Lấy thuTu từ column metadata (đã lưu khi tạo column)
          const thuTuA = a.thuTu ?? Number.MAX_SAFE_INTEGER;
          const thuTuB = b.thuTu ?? Number.MAX_SAFE_INTEGER;
          if (thuTuA !== thuTuB) {
            return thuTuA - thuTuB;
          }
          // Nếu cùng thuTu, sắp xếp theo tên
          const labelA = a.metaLabel || "";
          const labelB = b.metaLabel || "";
          return labelA.localeCompare(labelB);
        })
      : phuGiaColumns;

    return {
      mappedPhuLieus,
      unmappedPhuLieus,
      phuGiaColumns: mergedColumns,
      chatHopKimColumns: mergeMappedPhuLieus ? [] : chatHopKimColumns,
      khacColumns,
      tableData,
    };
  },
};

