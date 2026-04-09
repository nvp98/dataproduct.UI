/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Descriptions, Table, Typography, message } from "antd";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import BBGN_ThepLong from "../../../utils/BM_config/BBGN_ThepLong.json";
import { phieuActionService } from "../../../services/PhieuActionService";

const { Title } = Typography;

const ChiTietGN = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    "phieu_gn_theplong_id",
    "/giaonhantheplong"
  );
  const config = BBGN_ThepLong;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (!idphieu) return;
      const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
      if (!res) return;
      setData((res as any)?.data ?? res);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, safeGetDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formData = data?.jsonData || {};
  const tableData = formData?.table1 || [];

  const columns = useMemo(() => {
    const raw = (config.layout?.[0]?.columns || []) as any[];
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    return raw.map((col) => ({ ...col, align: alignType(col.align) }));
  }, [config.layout]);

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/taophieugiaonhantheplong");
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
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "");
  }, [data, getUserInfo, handleActionSuccess, idphieu, redirectToList]);

  return (
    <Card style={{ margin: 24 }} loading={loading}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          {config.title}
        </Title>
        {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
      </div>

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Ngày">
          {formData?.NgaySX ? dayjs(formData.NgaySX).format("DD/MM/YYYY") : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Ca">{formData?.ca ?? ""}</Descriptions.Item>
      </Descriptions>

      <Table
        columns={columns as any}
        dataSource={Array.isArray(tableData) ? tableData : []}
        pagination={false}
        scroll={{ x: 1200 }}
        rowKey={(r: any, idx?: number) => r?.key ?? idx ?? JSON.stringify(r)}
      />

      <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {actionButtons}
      </div>
    </Card>
  );
};

export default ChiTietGN;

