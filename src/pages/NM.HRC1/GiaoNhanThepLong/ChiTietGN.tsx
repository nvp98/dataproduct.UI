import { useCallback, useEffect, useState } from "react";
import { Button, Card, Descriptions, Empty, Spin, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { HRC1Api, type HRC1_PhieuDataVm } from "../../../services/HRC1_BBGNApi";
import { LoThoiPanel, TinhLuyenPanel, DucPanel, getScopeName, getGroupLabel } from "./TaoPhieuGN";

const { Title } = Typography;

const ChiTietGN = () => {
  const location = useLocation();
  const idphieu = (location.state as { idphieu?: string } | null)?.idphieu;

  const [data, setData] = useState<HRC1_PhieuDataVm | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!idphieu) return;
    setLoading(true);
    try {
      const res = await HRC1Api.getPhieu(idphieu);
      setData(res);
    } catch {
      message.error("Không tải được dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReload = useCallback(async () => { await loadData(); }, [loadData]);

  const congDoanLabel = data ? getGroupLabel(data.maBm ?? "") : "";
  const scopeName = data ? getScopeName(data.maBm ?? "", data.scope ?? 0) : "";

  return (
    <>
      <div style={{ margin: "24px 24px 0", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button icon={<ReloadOutlined />} onClick={() => void handleReload()} loading={loading}>
          Làm mới
        </Button>
      </div>
      <Card style={{ margin: 24 }} loading={loading}>
        {!idphieu ? (
          <Empty description="Không có thông tin phiếu" />
        ) : (
          <Spin spinning={loading}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>
                HRC1 — Biên bản giao nhận thép lỏng
              </Title>
              {data?.soPhieu && <b>Số phiếu: {data.soPhieu}</b>}
            </div>

            <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Ngày SX">
                {data?.ngaySX ? dayjs(data.ngaySX).format("DD/MM/YYYY") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Ca">
                {data?.ca === 1 ? "Ca ngày" : data?.ca === 2 ? "Ca đêm" : "-"}
                {data?.kip ? ` — Kíp ${data.kip}` : ""}
              </Descriptions.Item>
              <Descriptions.Item label="Công đoạn / Thiết bị">
                {data ? `${congDoanLabel} — ${scopeName}` : "-"}
              </Descriptions.Item>
            </Descriptions>

            {data && (
              <>
                {data.congDoan === "lo_thoi" && (
                  <LoThoiPanel phieuData={data} readOnly onReload={handleReload} />
                )}
                {data.congDoan === "tinh_luyen" && (
                  <TinhLuyenPanel phieuData={data} readOnly onReload={handleReload} />
                )}
                {data.congDoan === "duc" && (
                  <DucPanel phieuData={data} readOnly onReload={handleReload} />
                )}
              </>
            )}
          </Spin>
        )}
      </Card>
    </>
  );
};

export default ChiTietGN;
