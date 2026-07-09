/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HRCChildColumn, HRCParentColumn } from "../../../components/CustomTableHRC";
import { hrc2TableService, type DynamicColumnMeta } from "../../../services/HRC2TableService";
import { Button, Card, Descriptions, Table, Typography, Row, Col, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatNumberGroup } from "../../../utils/formatters/numberFormat";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import HRC1_BB_TieuHao_LF from "../../../utils/BM_config/HRC1_BB_TieuHao_LF.json";
import { getBmQuyenUiFlags } from "../../../utils/helpers/checkAdminRole";
import { phieuActionService } from "../../../services/PhieuActionService";
import { DETAIL_HIDDEN_BUTTON_KEYS } from "../../../utils/constants/PhieuActionButtonKeys";

const { Title, Text } = Typography;

function isTrungMeRow(record: any): boolean {
  return record?.isTrungMeThoi === true || record?.IsTrungMeThoi === true;
}

const isSttDataIndex = (dataIndex: string) => dataIndex === "stt" || dataIndex === "STT";

const formatSum = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const isInteger = Number.isInteger(abs);
  const [intRaw, fracRaw] = (isInteger ? abs.toFixed(0) : abs.toFixed(2)).split(".");
  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return isInteger ? `${sign}${intFormatted}` : `${sign}${intFormatted}.${fracRaw}`;
};

const ChiTietTieuHaoTinhLuyenLF = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    "phieu_hrc1_lf_id",
    "/viecdentoi/hrc1_tieuhaotinhluyenlf"
  );

  const config = HRC1_BB_TieuHao_LF;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!idphieu) return;
      const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
      if (!res) return;
      const payload = (res as any)?.data ?? res;
      setData(payload);
    } catch (error) {
      console.error("Lỗi tải dữ liệu phiếu:", error);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, safeGetDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formData = data?.jsonData || {};
  const table1Data: any[] = formData?.table1 || [];
  const table2Data = formData?.table2 || [];

  const tableSection = config.layout.find((section: any) => section.sectionType === "table" && section.key === "table1");

  const renderDynamicColumnTitle = useCallback((label: string) => label, []);

  const tableColumns = useMemo(() => {
    const dyn = (formData?.table1DynamicColumns as Record<string, DynamicColumnMeta[]> | undefined) || {};
    const restored = hrc2TableService.restoreDynamicGroups(dyn, renderDynamicColumnTitle);
    const phuGiaCols: HRCChildColumn[] = restored.LF_PhuGia ?? [];

    const tableLayout = config.layout.find((l: any) => l.sectionType === "table" && l.key === "table1");
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    const normalizeAlign = (cols: any[]): HRCParentColumn[] =>
      cols.map((col) => {
        if (Array.isArray(col.children)) {
          return { ...col, align: alignType(col.align), children: col.children.map((c: any) => ({ ...c, align: alignType(c.align) })) };
        }
        return { ...col, align: alignType(col.align) };
      });
    const baseColumns: HRCParentColumn[] = normalizeAlign((tableLayout?.columns || []) as any[]);

    const built = hrc2TableService.buildColumnsWithAdjust({
      baseColumns,
      slotColumns: { LF_PhuGia: phuGiaCols },
      showAdjustColumns: false,
      generateAdjustColumnsFromBase: false,
    });

    const applyHighlightRender = (col: any) => {
      if (!col || !col.dataIndex) return col;
      const dataIndex = col.dataIndex;
      const baseRender = col.format === "number-group" ? (value: unknown) => formatNumberGroup(value) : undefined;
      return {
        ...col,
        render: (value: any, record: any) => {
          const isDuplicateMe = dataIndex === "meThoi" && isTrungMeRow(record);
          const displayed = baseRender ? baseRender(value) : value !== undefined && value !== null ? String(value) : "";
          if (isDuplicateMe) return <span style={{ color: "red", fontWeight: 600 }}>{displayed}</span>;
          return displayed;
        },
      };
    };

    const mapColumnsWithHighlight = (cols: any[]): any[] =>
      cols.map((col) => {
        if (col.children?.length) {
          return { ...col, children: mapColumnsWithHighlight(col.children) };
        }
        return applyHighlightRender(col);
      });

    return mapColumnsWithHighlight(built as any[]);
  }, [formData?.table1DynamicColumns, renderDynamicColumnTitle, config.layout]);

  const leafColumns = useMemo(() => {
    const result: Array<{ dataIndex: string; sum?: boolean; align?: string }> = [];
    (tableColumns as any[]).forEach((col: any) => {
      if (col.children) {
        col.children.forEach((child: any) => {
          if (child.dataIndex) result.push({ dataIndex: child.dataIndex, sum: child.sum, align: child.align });
        });
      } else if (col.dataIndex) {
        result.push({ dataIndex: col.dataIndex, sum: col.sum, align: col.align });
      }
    });
    return result;
  }, [tableColumns]);

  const columnSums = useMemo(() => {
    const sums: Record<string, number> = {};
    leafColumns.forEach(({ dataIndex, sum }) => {
      if (!sum || isSttDataIndex(dataIndex)) return;
      sums[dataIndex] = table1Data.reduce((acc: number, row: any) => {
        const val = parseFloat(String(row[dataIndex] ?? "").replace(/,/g, ""));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
    });
    return sums;
  }, [leafColumns, table1Data]);

  const tableSection2 = config.layout2.find((section: any) => section.sectionType === "table" && section.key === "table2");

  const columns2 = useMemo(() => {
    const raw = (tableSection2?.columns || []) as any[];
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    return raw.map((col) => {
      if (Array.isArray(col.children)) {
        return { ...col, align: alignType(col.align), children: col.children.map((c: any) => ({ ...c, align: alignType(c.align) })) };
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
        navigateToDetail(context.newPhieuId, "/hrc1_taotieuhaotinhluyenlf");
        return;
      }
      await loadData();
    },
    [loadData, navigateToDetail]
  );

  const actionButtons = useMemo(() => {
    if (!data || !idphieu) return null;
    const userInfo = getUserInfo();
    if (getBmQuyenUiFlags(config.code, userInfo).isView) return null;
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
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
        message.error((error as any)?.message ?? "Không thể thực hiện thao tác");
      },
    });
    const filteredButtons = buttons.filter((btn) => !DETAIL_HIDDEN_BUTTON_KEYS.has(btn.key));
    if (filteredButtons.length === 0) return null;
    return phieuActionService.renderActionButtons(filteredButtons, idphieu || "");
  }, [data, idphieu, config.code, getUserInfo, handleActionSuccess, redirectToList]);

  return (
    <Card bordered style={{ padding: 24, background: "#fff" }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <img src="https://report.hoaphatdungquat.vn/img/logoHP.png" alt="logo" style={{ height: "auto", width: 150 }} />
          {config.headerInfo && (
            <>
              <Typography.Text strong>{config.headerInfo.subCompany}</Typography.Text>
              <Typography.Text strong>{config.headerInfo.company}</Typography.Text>
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
          {config.isoInfo && (
            <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
              <div><b>{config.isoInfo.code}</b></div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>{config.title}</Title>
        {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
      </div>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Số phiếu">{data?.soPhieu || ""}</Descriptions.Item>
        <Descriptions.Item label="Ngày SX">
          {formData?.NgaySX ? dayjs(formData.NgaySX).format("DD/MM/YYYY") : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Ca sản xuất">{formData?.ca == 1 ? "Ca ngày" : "Ca đêm"}</Descriptions.Item>
        <Descriptions.Item label="Tinh luyện">{"Tinh luyện " + formData?.scope || ""}</Descriptions.Item>
      </Descriptions>

      <Table
        bordered
        columns={tableColumns}
        dataSource={table1Data?.map((r: any, i: number) => ({ key: i, stt: i + 1, ...r }))}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        sticky={{ offsetHeader: 0 }}
        summary={() => {
          const hasSumColumn = leafColumns.some((c) => c.sum);
          if (!hasSumColumn) return null;
          const tongLabelIndex = (() => {
            const i = leafColumns.findIndex((c) => !isSttDataIndex(c.dataIndex));
            return i < 0 ? 0 : i;
          })();
          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                {leafColumns.map(({ dataIndex, sum, align }, idx) => (
                  <Table.Summary.Cell key={dataIndex} index={idx} align={(align as "left" | "center" | "right") ?? "right"}>
                    {idx === tongLabelIndex ? (
                      <strong>Tổng</strong>
                    ) : sum && columnSums[dataIndex] !== undefined ? (
                      <strong>{formatSum(columnSums[dataIndex])}</strong>
                    ) : null}
                  </Table.Summary.Cell>
                ))}
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
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
          dataSource={table2Data?.map((r: any, i: number) => ({ key: i, stt: i + 1, ...r }))}
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

      <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {actionButtons}
      </div>
    </Card>
  );
};

export default ChiTietTieuHaoTinhLuyenLF;
