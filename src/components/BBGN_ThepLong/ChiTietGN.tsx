/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Descriptions, Row, Typography, message } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { usePhieuNavigation } from "../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../services/PhieuApi";
import HRC1_BBGN_ThepLong from "../../utils/BM_config/HRC1_BBGN_ThepLong.json";
import HRC2_BBGN_ThepLong from "../../utils/BM_config/HRC2_BBGN_ThepLong.json";
import { phieuActionService } from "../../services/PhieuActionService";
import { DETAIL_HIDDEN_BUTTON_KEYS } from "../../utils/constants/PhieuActionButtonKeys";
import type { BBGNThepLongBieuMau } from "./GiaoNhanThepLongList";
import BBGNThepLongTable, { type BBGNRow } from "./BBGNThepLongTable";
import { bbgbThepLongApi } from "../../services/BBGNThepLongApi";
import BBGNExportButtons from "./BBGNExportButtons";

const CONFIG_MAP = {
  HRC1_BBGN_ThepLong: HRC1_BBGN_ThepLong,
  HRC2_BBGN_ThepLong: HRC2_BBGN_ThepLong,
} as const;

const NHAMAY_MAP: Record<BBGNThepLongBieuMau, number> = {
  HRC1_BBGN_ThepLong: 1,
  HRC2_BBGN_ThepLong: 2,
};

const normalizeTableRows = (rows: unknown[]): BBGNRow[] =>
  rows.map((raw, idx) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const id = row.id;
    const key =
      typeof row.key === "string" && row.key.trim()
        ? row.key
        : typeof id === "number"
          ? `id-${id}`
          : `row-${idx}`;

    const isTrungMeThoiRaw = row.isTrungMeThoi ?? row.IsTrungMeThoi;

    return {
      ...(row as BBGNRow),
      key,
      isTrungMeThoi: isTrungMeThoiRaw === true,
      klLFSauThep: (row.klLFSauThep ?? row.kllfSauThep ?? null) as number | null,
    };
  });

interface ChiTietGNProps {
  bieuMau: BBGNThepLongBieuMau;
  storageKey?: string;    // default: "phieu_gn_theplong_id"
  routeList?: string;     // default: "/giaonhantheplong"
  routeCreate?: string;   // default: "/taophieugiaonhantheplong"
}

const { Title, Text } = Typography;

const ChiTietGN = ({
  bieuMau,
  storageKey = "phieu_gn_theplong_id",
  routeList = "/giaonhantheplong",
  routeCreate = "/taophieugiaonhantheplong",
}: ChiTietGNProps) => {
  const config = CONFIG_MAP[bieuMau];
  const nhaMay = NHAMAY_MAP[bieuMau];
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    storageKey,
    routeList
  );

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<BBGNRow[]>([]);

  const fetchTableFromLoadApi = useCallback(
    async (detail: any, opts?: { notify?: boolean }) => {
      if (!idphieu) return;
      const json = detail?.jsonData ?? {};
      const ngaySX = json?.NgaySX ? dayjs(json.NgaySX).format("YYYY-MM-DD") : null;
      const ca = json?.ca;

      if (!ngaySX || ca == null || ca === "") {
        setTableData(Array.isArray(json?.table1) ? normalizeTableRows(json.table1) : []);
        return;
      }

      try {
        const res = await bbgbThepLongApi.load({
          IdPhieu: idphieu,
          NgaySX: ngaySX,
          Ca: Number(ca),
          BieuMau: bieuMau,
        });
        const loadRows = (res as any)?.data ?? res;
        if (Array.isArray(loadRows)) {
          setTableData(normalizeTableRows(loadRows));
          if (opts?.notify) message.success("Làm mới dữ liệu thành công");
          return;
        }
      } catch (e) {
        console.error(e);
      }

      setTableData(Array.isArray(json?.table1) ? normalizeTableRows(json.table1) : []);
      if (opts?.notify) message.error("Lấy dữ liệu thất bại");
    },
    [bieuMau, idphieu]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!idphieu) return;
      const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
      if (!res) return;
      const detail = (res as any)?.data ?? res;
      setData(detail);
      await fetchTableFromLoadApi(detail);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [fetchTableFromLoadApi, idphieu, safeGetDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formData = data?.jsonData || {};

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, routeCreate);
        return;
      }
      await loadData();
    },
    [loadData, navigateToDetail, routeCreate]
  );

  const handleRefresh = useCallback(async () => {
    if (!data) return;
    await fetchTableFromLoadApi(data, { notify: true });
  }, [data, fetchTableFromLoadApi]);

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
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    const filteredButtons = buttons.filter((btn) => !DETAIL_HIDDEN_BUTTON_KEYS.has(btn.key));
    if (filteredButtons.length === 0) return null;
    return phieuActionService.renderActionButtons(filteredButtons, idphieu || "");
  }, [data, getUserInfo, handleActionSuccess, idphieu, redirectToList]);

  return (
    <>
      <div style={{ margin: "24px 24px 0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button type="primary" icon={<FilterOutlined />} onClick={() => void handleRefresh()} loading={loading}>
          Làm mới phiếu
        </Button>
        <BBGNExportButtons idPhieu={idphieu} templateCode={config.code} soPhieu={data?.soPhieu} />
      </div>
      <Card style={{ margin: 24 }} loading={loading}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <Title level={4} style={{ marginBottom: 0 }}>
              {config.title}
            </Title>
            {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
          </div>
        </div>

      <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Ngày">
          {formData?.NgaySX ? dayjs(formData.NgaySX).format("DD/MM/YYYY") : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Ca">{formData?.ca ?? ""}</Descriptions.Item>
        <Descriptions.Item label="Máy đúc">{formData?.tenScope ?? ""}</Descriptions.Item>
      </Descriptions>

      <BBGNThepLongTable
        value={tableData}
        disabled={true}
        scopeValue={formData?.scope ?? null}
        scopeLabel={formData?.tenScope ?? null}
        nhaMay={nhaMay}
      />

      {/* Khu vực ký duyệt */}
      <Row justify="space-around" align="top" style={{ textAlign: "center", marginTop: 30 }}>
        {(config.signatures || []).map((sig: any) => {
          const duyet = data?.pheDuyet?.find(
            (p: any) => p.capDuyet === sig.capduyet
          );
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
    </>
  );
};

export default ChiTietGN;
