import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Card, Descriptions, Empty, Select, Space, Spin, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { HRC1Api, type HRC1_PhieuDataVm } from "../../../services/HRC1_BBGNApi";
import { LoThoiPanel, TinhLuyenPanel, DucPanel, getScopeName, getGroupLabel } from "./TaoPhieuGN";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";
import { BmQuyenXlApi, type BmQuyenXlModel } from "../../../services/BmQuyenXlApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";

const { Title } = Typography;

const LO_SCOPE_OPTS = [1, 2, 3, 4, 5].map((n) => ({ label: `Lò thổi ${n}`, value: n }));
const TL_SCOPE_OPTS = [1, 2, 3, 4, 5].map((n) => ({ label: `Tinh luyện ${n}`, value: n }));

const ChiTietGN = () => {
  const location = useLocation();
  const idphieu = (location.state as { idphieu?: string } | null)?.idphieu;

  const [data, setData] = useState<HRC1_PhieuDataVm | null>(null);
  const [loading, setLoading] = useState(false);
  const [ducExtraControls, setDucExtraControls] = useState<ReactNode>(null);
  const [hasQuyenXacNhan, setHasQuyenXacNhan] = useState(false); // quyenChucNang=2
  const [hasQuyenChot, setHasQuyenChot] = useState(false);       // quyenChucNang=3

  const [loSo, setLoSo] = useState<number | null>(null);
  const [tlSo, setTlSo] = useState<number | null>(null);

  const isPKHAdmin = useMemo(() => {
    const u = getThongTinUser();
    return u.tenNgan === "P.KH" || u.iD_PhongBan === 70 || isAdminUser(u);
  }, []);

  // Kiểm tra quyền một lần khi mount (không phụ thuộc scope phiếu, nhất quán với TaoPhieuGN)
  useEffect(() => {
    if (isPKHAdmin) { setHasQuyenChot(true); return; }
    const u = getThongTinUser();
    const userId = u.iD_TaiKhoan;
    if (!userId) return;
    let cancelled = false;
    BmQuyenXlApi.getByTaiKhoan(userId)
      .then((res) => {
        if (cancelled) return;
        const arr: BmQuyenXlModel[] = Array.isArray(res) ? res : ((res as unknown as { data?: BmQuyenXlModel[] })?.data ?? []);
        const match = (q: number) =>
          arr.some(
            (r) =>
              r.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong &&
              Number(r.quyenChucNang) === q
          );
        setHasQuyenXacNhan(match(2));
        setHasQuyenChot(match(3));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isPKHAdmin]);

  // loadData dùng loSo/tlSo làm dependency → tự reload khi scope thay đổi
  const loadData = useCallback(async () => {
    if (!idphieu) return;
    setLoading(true);
    try {
      const res = await HRC1Api.getPhieu(idphieu, {
        loSo:       loSo  ?? undefined,
        scopePhieu: tlSo  ?? undefined,
      });
      setData(res);
    } catch {
      message.error("Không tải được dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, loSo, tlSo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReload = useCallback(async () => { await loadData(); }, [loadData]);

  const effectiveCanChot = isPKHAdmin || hasQuyenChot;
  const canDoAnything = effectiveCanChot || hasQuyenXacNhan;

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
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <span>Lò thổi:</span>
                        <Select
                          size="small"
                          style={{ width: 140 }}
                          placeholder="Tất cả lò thổi"
                          value={loSo ?? undefined}
                          options={LO_SCOPE_OPTS}
                          onChange={(v) => setLoSo(v ?? null)}
                          allowClear
                        />
                      </Space>
                    </div>
                    <LoThoiPanel
                      phieuData={data}
                      readOnly
                      loSo={loSo}
                      onReload={handleReload}
                    />
                  </>
                )}
                {data.congDoan === "tinh_luyen" && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <span>Tinh luyện:</span>
                        <Select
                          size="small"
                          style={{ width: 150 }}
                          placeholder="Tất cả tinh luyện"
                          value={tlSo ?? undefined}
                          options={TL_SCOPE_OPTS}
                          onChange={(v) => setTlSo(v ?? null)}
                          allowClear
                        />
                      </Space>
                    </div>
                    <TinhLuyenPanel
                      phieuData={data}
                      readOnly
                      tlSo={tlSo}
                      onReload={handleReload}
                    />
                  </>
                )}
                {data.congDoan === "duc" && (
                  <>
                    {canDoAnything && ducExtraControls && (
                      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {ducExtraControls}
                      </div>
                    )}
                    <DucPanel
                      phieuData={data}
                      readOnly={!canDoAnything}
                      onReload={handleReload}
                      onExtraChange={canDoAnything ? setDucExtraControls : undefined}
                      canXacNhan={hasQuyenXacNhan}
                      canChot={effectiveCanChot}
                    />
                  </>
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
