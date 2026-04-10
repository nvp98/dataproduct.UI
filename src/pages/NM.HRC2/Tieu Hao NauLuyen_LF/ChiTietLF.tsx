/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HRCChildColumn, HRCParentColumn } from "../../../components/CustomTableHRC";
import {
  hrc2TableService,
  type AdjustColumnMeta,
  type DynamicColumnMeta,
} from "../../../services/HRC2TableService";
import {
  Button,
  Card,
  Descriptions,
  Table,
  Tooltip,
  Typography,
  Row,
  Col,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatNumberGroup } from "../../../utils/formatters/numberFormat";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import HRC2_BB_NauLuyen_LF from "../../../utils/BM_config/HRC2_BB_NauLuyen_LF.json";
import { phieuActionService } from "../../../services/PhieuActionService";
import { hrc2PhuLieuService } from "../../../services/HRC2PhuLieuService";
import HRC2ExportBienBanButtons from "../../../components/HRC2ExportBienBanButtons";

const { Title, Text } = Typography;

/** Giống TaoPhieuLF — khớp excludedAdjustKeys khi generate cột điều chỉnh */
const DEFAULT_EXCLUDED_KEYS = [
  "meThoi",
  "macThep",
  "queLayMau",
  "queDoNhiet",
  "ghiChu",
  "stt",
  "STT",
];

function mergeAdjustColumnValuesIntoRows(
  rows: any[],
  adjustMetas: (DynamicColumnMeta & {
    values?: Array<{
      rowId?: number | null;
      meThoi?: string | null;
      value?: string | number | null;
    }>;
  })[] | undefined
): any[] {
  if (!rows?.length || !adjustMetas?.length) return rows || [];
  const list = rows.map((r) => ({ ...r }));
  adjustMetas.forEach((meta) => {
    const values = meta.values;
    if (!values?.length || !meta.dataIndex) return;
    values.forEach((v) => {
      const row = list.find(
        (r) =>
          (v.rowId != null && r.id === v.rowId) ||
          (v.meThoi != null && r.meThoi === v.meThoi)
      );
      if (row) row[meta.dataIndex] = v.value;
    });
  });
  return list;
}

function inferPhanBoMetasFromRows(rows: any[]): AdjustColumnMeta[] {
  if (!rows?.length) return [];
  const keys = new Set<string>();
  rows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (k.startsWith("phanBo_") && !k.includes("__")) keys.add(k);
    });
  });
  return Array.from(keys).map((dataIndex) => ({
    key: dataIndex,
    dataIndex,
    headerKeyId: Number(String(dataIndex).replace(/^phanBo_/, "")) || null,
    headerKeyLabel: null,
    width: 100,
    isManuallyAdded: false,
  }));
}

function mapColumnsWithHighlight(cols: any[], applyHighlightRender: (col: any) => any): any[] {
  return cols.map((col) => {
    if (col.children?.length) {
      return { ...col, children: mapColumnsWithHighlight(col.children, applyHighlightRender) };
    }
    return applyHighlightRender(col);
  });
}

function buildBaseColumnsAndEditableFields(layoutConfig: typeof HRC2_BB_NauLuyen_LF): {
  baseColumns: HRCParentColumn[];
  editableFields: string[];
} {
  const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
    a === "left" || a === "center" || a === "right" ? a : undefined;
  const rawBase =
    layoutConfig.layout.find((l: any) => l.sectionType === "table" && l.key === "table1")?.columns ||
    [];
  const baseColumns: HRCParentColumn[] = rawBase.map((col: any) => {
    if (Array.isArray(col.children)) {
      return {
        ...col,
        align: alignType(col.align),
        children: col.children.map((c: any) => ({
          ...c,
          align: alignType(c.align),
        })),
      };
    }
    return { ...col, align: alignType(col.align) };
  });
  const editableFieldSet = new Set<string>();
  baseColumns.forEach((col: any) => {
    if (col.dataIndex && !col.children && col.isLabel !== true) {
      const editable = col.editable !== false;
      if (editable) editableFieldSet.add(col.dataIndex);
    }
    if (Array.isArray(col.children)) {
      col.children.forEach((child: any) => {
        if (!child.dataIndex) return;
        const editableParent = col.editable !== false;
        const editableChild = child.editable !== false;
        if (editableParent && editableChild) {
          editableFieldSet.add(child.dataIndex);
        }
      });
    }
  });
  return { baseColumns, editableFields: Array.from(editableFieldSet) };
}

type NmColumnsPack = {
  phuGiaColumns: HRCChildColumn[];
  chatHopKimColumns: HRCChildColumn[];
  khacColumns: HRCChildColumn[];
  adjustMetas: AdjustColumnMeta[];
};

const ChiTietTieuHaoNauLuyen_LF = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    "phieu_lf_id",
    "/viecdentoi/tieuhaonauluyen_lf"
  );

  const config = HRC2_BB_NauLuyen_LF;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [table1DisplayRows, setTable1DisplayRows] = useState<any[]>([]);
  const [nmColumnsPack, setNmColumnsPack] = useState<NmColumnsPack | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setNmColumnsPack(null);
      setTable1DisplayRows([]);
      if (!idphieu) return;
      const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
      if (!res) return;
      const payload = (res as any)?.data ?? res;
      setData(payload);

      const fd = payload?.jsonData || {};
      const savedWithAdjust = mergeAdjustColumnValuesIntoRows(
        fd.table1 || [],
        fd.table1DynamicColumns?.adjust as
          | (DynamicColumnMeta & {
              values?: Array<{
                rowId?: number | null;
                meThoi?: string | null;
                value?: string | number | null;
              }>;
            })[]
          | undefined
      );

      const ngay = fd.NgaySX;
      const ca = fd.ca;
      const scope = fd.scope;
      if (!ngay || ca == null || scope == null) {
        setTable1DisplayRows(savedWithAdjust);
        setNmColumnsPack(null);
        return;
      }

      try {
        const { baseColumns, editableFields } = buildBaseColumnsAndEditableFields(config);
        const result = await hrc2PhuLieuService.fetchAndProcessPhuLieus(
          {
            NgaySX: dayjs(ngay).format("YYYY-MM-DD"),
            Ca: Number(ca),
            LoaiBM: "LF",
            Scope: Number(scope),
          },
          {
            onOpenMappingModal: () => {},
            baseColumns,
            mergeMappedPhuLieus: true,
          }
        );

        const isEmpty =
          !result.tableData?.length ||
          (result.tableData.length === 1 && result.tableData[0]?.key === "row-empty");

        if (isEmpty) {
          setTable1DisplayRows(savedWithAdjust);
          setNmColumnsPack(null);
          return;
        }

        const baseMerged = hrc2TableService.mergeServerRows(
          result.tableData || [],
          savedWithAdjust,
          "meThoi",
          editableFields
        );
        const finalRows = hrc2TableService.applyManualOverrides(baseMerged, savedWithAdjust, {
          rowIdField: "id",
          fallbackKeyField: "meThoi",
        });

        const phanBoMetas: AdjustColumnMeta[] = (result.phanBoColumns ?? []).map((col: any) => ({
          key: col.dataIndex || `phanBo_${col.headerKeyId}`,
          dataIndex: col.dataIndex || `phanBo_${col.headerKeyId}`,
          headerKeyId: col.headerKeyId ?? null,
          headerKeyLabel: col.metaLabel || col.title?.toString() || undefined,
          width: col.width || 100,
          isManuallyAdded: false,
        }));
        const manualMetasFromApi: AdjustColumnMeta[] = (result.adjustColumns ?? []).map((col: any) => ({
          key: col.dataIndex || `manual_col_${col.headerKeyId}`,
          dataIndex: col.dataIndex || `manual_col_${col.headerKeyId}`,
          headerKeyId: col.headerKeyId ?? null,
          headerKeyLabel: col.metaLabel || col.title?.toString() || undefined,
          width: col.width || 150,
          isManuallyAdded: false,
        }));

        const dynAdjust = fd.table1DynamicColumns?.adjust as DynamicColumnMeta[] | undefined;
        const fromSavedAdjust = dynAdjust?.length
          ? hrc2TableService.adjustMetaFromDynamic(dynAdjust)
          : [];
        const manualOnlyFromSaved = fromSavedAdjust.filter((m) => m.isManuallyAdded);
        const mergedAdjustMetas = hrc2TableService.dedupeAdjustMetas(
          hrc2TableService.mergeAdjustMetas(
            [...phanBoMetas, ...manualMetasFromApi],
            manualOnlyFromSaved
          )
        );

        setTable1DisplayRows(finalRows);
        setNmColumnsPack({
          phuGiaColumns: (result.phuGiaColumns ?? []).map((c) => ({ ...c, editable: false })),
          chatHopKimColumns: (result.chatHopKimColumns ?? []).map((c) => ({ ...c, editable: false })),
          khacColumns: (result.khacColumns ?? []).map((c) => ({ ...c, editable: false })),
          adjustMetas: mergedAdjustMetas,
        });
      } catch (nmErr) {
        console.error("Lỗi tải/merge dữ liệu NM (filter):", nmErr);
        setTable1DisplayRows(savedWithAdjust);
        setNmColumnsPack(null);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu phiếu:", error);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, safeGetDetail, config]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formData = data?.jsonData || {};
  const table2Data = formData?.table2 || [];

  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1"
  );

  const renderDynamicColumnTitle = useCallback((label: string) => label, []);

  const tableColumns = useMemo(() => {
    const dyn =
      (formData?.table1DynamicColumns as Record<string, DynamicColumnMeta[]> | undefined) ||
      {};
    const { adjust: adjustFromDyn, ...restDyn } = dyn;

    let phuGiaCols: HRCChildColumn[];
    let chatHopKimCols: HRCChildColumn[];
    let khacCols: HRCChildColumn[];
    let adjustMetas: AdjustColumnMeta[];

    if (nmColumnsPack) {
      phuGiaCols = nmColumnsPack.phuGiaColumns;
      chatHopKimCols = nmColumnsPack.chatHopKimColumns;
      khacCols = nmColumnsPack.khacColumns;
      adjustMetas = nmColumnsPack.adjustMetas;
    } else {
      const restored = hrc2TableService.restoreDynamicGroups(
        Object.keys(restDyn).length ? restDyn : undefined,
        renderDynamicColumnTitle
      );
      phuGiaCols = restored.PG ?? [];
      chatHopKimCols = restored.KL ?? [];
      khacCols = restored.others ?? [];

      adjustMetas = adjustFromDyn?.length
        ? hrc2TableService.dedupeAdjustMetas(
            hrc2TableService.adjustMetaFromDynamic(adjustFromDyn)
          )
        : [];

      adjustMetas = hrc2TableService.dedupeAdjustMetas(
        hrc2TableService.mergeAdjustMetas(
          adjustMetas,
          inferPhanBoMetasFromRows(table1DisplayRows)
        )
      );
    }

    const phanBoChildColumns: HRCChildColumn[] = adjustMetas
      .filter((m) => m.dataIndex.startsWith("phanBo_"))
      .map((meta) => ({
        title: meta.headerKeyLabel ?? "Phân bổ",
        dataIndex: meta.dataIndex,
        width: meta.width ?? 100,
        editable: false,
        variant: "adjust" as const,
        metaLabel: meta.headerKeyLabel ?? "Phân bổ",
        headerKeyId: meta.headerKeyId ?? null,
      }));

    const adjustChildColumns: HRCChildColumn[] = adjustMetas
      .filter((m) => !m.dataIndex.startsWith("phanBo_"))
      .map((meta) => ({
        title: meta.headerKeyLabel ?? "Điều chỉnh",
        dataIndex: meta.dataIndex,
        width: meta.width ?? 150,
        editable: false,
        variant: "adjust" as const,
        metaLabel: meta.headerKeyLabel ?? "Điều chỉnh",
        headerKeyId: meta.headerKeyId ?? null,
      }));

    const tableLayout = config.layout.find(
      (l: any) => l.sectionType === "table" && l.key === "table1"
    );
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    const normalizeAlign = (cols: any[]): HRCParentColumn[] =>
      cols.map((col) => {
        if (Array.isArray(col.children)) {
          return {
            ...col,
            align: alignType(col.align),
            children: col.children.map((c: any) => ({
              ...c,
              align: alignType(c.align),
            })),
          };
        }
        return { ...col, align: alignType(col.align) };
      });
    const rawBaseColumns: HRCParentColumn[] = normalizeAlign(
      (tableLayout?.columns || []) as any[]
    );
    const baseColumns = rawBaseColumns.filter((col) => {
      if (col.dataIndex === "KL" && chatHopKimCols.length === 0) return false;
      if (col.dataIndex === "PG" && phuGiaCols.length === 0) return false;
      return true;
    });

    const showAdjustColumns = adjustChildColumns.length > 0;

    const built = hrc2TableService.buildColumnsWithAdjust({
      baseColumns,
      slotColumns: {
        PG: phuGiaCols,
        KL: chatHopKimCols,
        others: khacCols,
      },
      excludedAdjustKeys: DEFAULT_EXCLUDED_KEYS,
      showAdjustColumns,
      manualAdjustColumns: adjustChildColumns,
      phanBoColumns: phanBoChildColumns,
      generateAdjustColumnsFromBase: false,
    });

    const applyHighlightRender = (col: any) => {
      if (!col || !col.dataIndex) return col;
      const dataIndex = col.dataIndex;
      const baseRender = col.format === "number-group"
        ? (value: unknown) => formatNumberGroup(value)
        : undefined;
      return {
        ...col,
        render: (value: any, record: any) => {
          const origValue = record[`${dataIndex}__orig`];
          const isManualFlag = record[`${dataIndex}__IsManual`] === true;
          const isCellChanged =
            isManualFlag ||
            (origValue !== undefined && String(value ?? "") !== String(origValue ?? ""));
          const displayed = baseRender
            ? baseRender(value)
            : value !== undefined && value !== null
            ? String(value)
            : "";
          if (isCellChanged) {
            return (
              <Tooltip title={`Tự động: ${String(origValue ?? "")} | Chỉnh sửa: ${String(value ?? "")}`}>
                <span style={{ backgroundColor: "#fff7b3", display: "block" }}>{displayed}</span>
              </Tooltip>
            );
          }
          return displayed;
        },
      };
    };

    return mapColumnsWithHighlight(built as any[], applyHighlightRender);
  }, [
    formData?.table1DynamicColumns,
    table1DisplayRows,
    nmColumnsPack,
    renderDynamicColumnTitle,
    config.layout,
  ]);

  const tableSection2 = config.layout2.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table2"
  );

  const columns2 = useMemo(() => {
    const raw = (tableSection2?.columns || []) as any[];
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    return raw.map((col) => {
      if (Array.isArray(col.children)) {
        return {
          ...col,
          align: alignType(col.align),
          children: col.children.map((c: any) => ({
            ...c,
            align: alignType(c.align),
          })),
        };
      }
      return { ...col, align: alignType(col.align) };
    });
  }, [tableSection2?.columns]);

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/taophieutieuhaonauluyen_lf");
        return;
      }
      await loadData();
    },
    [loadData, navigateToDetail]
  );

  const actionButtons = useMemo(() => {
    if (!data || !idphieu) return null;
    const userInfo = getUserInfo();
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu,
      tinhTrang: data.tinhTrang ?? 0,
      isClone: data.isClone ?? false,
      currentUserId: userInfo.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo.tenNgan ?? null,
      nguoiTaoId: data.nguoiTaoId ?? null,
      phieuPhongBanId: data.idphongBan ?? null,
      pheDuyet: data.pheDuyet ?? [],
      preConfirmCheck: async () => {
        const isChot = await hrc2TableService.checkChotPhieuTieuHao(formData?.NgaySX, formData?.ca);
        if (isChot) {
          return true;
        }
        message.error("Sổ theo dõi nhập xuất tồn chưa được chốt.");
        return false;
      },
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
        message.error((error as any)?.message ?? "Không thể thực hiện thao tác");
      },
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "");
  }, [data, idphieu, getUserInfo, handleActionSuccess, redirectToList]);

  return (
    <Card bordered style={{ padding: 24, background: "#fff" }} loading={loading}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <img
            src="https://report.hoaphatdungquat.vn/img/logoHP.png"
            alt="logo"
            style={{ height: "auto", width: 150 }}
          />
          {config.headerInfo && (
            <>
              <Typography.Text strong>{config.headerInfo.subCompany}</Typography.Text>
              <Typography.Text strong>{config.headerInfo.company}</Typography.Text>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          {idphieu && (
            <HRC2ExportBienBanButtons
              templateCode={config.code}
              bieuMau={config.loaiBm}
              idPhieu={idphieu}
              soPhieu={data?.soPhieu}
              ngaySX={formData?.NgaySX}
              ca={formData?.ca ?? null}
              scope={formData?.scope ?? null}
              disabled={loading}
            />
          )}
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => void loadData()}
            loading={loading}
          >
            Làm mới
          </Button>
          {config.isoInfo && (
            <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
              <div>
                <b>{config.isoInfo.code}</b>
              </div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          {config.title}
        </Title>
        {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
      </div>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Số phiếu">{data?.soPhieu || ""}</Descriptions.Item>
        <Descriptions.Item label="Ngày SX">
          {formData?.NgaySX ? dayjs(formData.NgaySX).format("DD/MM/YYYY") : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Ca sản xuất">{formData?.ca || ""}</Descriptions.Item>
        <Descriptions.Item label="Máy đúc">{formData?.mayduc || ""}</Descriptions.Item>
      </Descriptions>

      <Table
        bordered
        columns={tableColumns}
        dataSource={table1DisplayRows?.map((r: any, i: number) => ({
          key: i,
          stt: i + 1,
          ...r,
        }))}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        sticky={{ offsetHeader: 0 }}
      />
      {formData?.table1_lyDo && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ whiteSpace: "nowrap", fontWeight: 500, paddingTop: 4 }}>
            {(tableSection as any)?.lyDo?.label ?? "Lý do điều chỉnh"}:
          </span>
          <span style={{ paddingTop: 4 }}>{formData.table1_lyDo}</span>
        </div>
      )}

      {table2Data && table2Data.length > 0 && (
        <Table
          bordered
          style={{ marginTop: 16 }}
          columns={columns2}
          dataSource={table2Data.map((r: any, i: number) => ({
            key: i,
            stt: i + 1,
            ...r,
          }))}
          pagination={false}
          size="small"
        />
      )}
      <Row justify="space-around" align="top" style={{ textAlign: "center", marginTop: 30 }}>
        {config.signatures.map((sig) => {
          const duyet = data?.pheDuyet?.find((p: any) => p.capDuyet === sig.capduyet);
          return (
            <Col key={sig.capduyet}>
              <Text strong>{sig.label}</Text>
              <br />
              <Text type="secondary">
                <Text>{duyet?.tinhTrang === 1 ? "Đã ký" : "Chưa xử lý"}</Text>
                <br />
                {duyet?.tenNguoiDuyet}
              </Text>
            </Col>
          );
        })}
      </Row>

      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {actionButtons}
      </div>
    </Card>
  );
};

export default ChiTietTieuHaoNauLuyen_LF;
