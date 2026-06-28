/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import type { TableRowSelection } from "antd/es/table/interface";
import dayjs from "dayjs";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import {
  Hrc2SlabApi,
  type HrcSlabItem,
  type SlabTongHopItem,
} from "../../../services/Hrc2SlabApi";
import HRC2_BBGN_PhoiTam from "../../../utils/BM_config/HRC2_BBGN_PhoiTam.json";
import {
  getBmQuyenUiFlags,
  hasKhuVucPhu,
  canChotBm,
} from "../../../utils/helpers/checkAdminRole";
import { phieuActionService } from "../../../services/PhieuActionService";
import { DETAIL_HIDDEN_BUTTON_KEYS } from "../../../utils/constants/PhieuActionButtonKeys";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";

const { Title } = Typography;

const TT_COLOR: Record<number, string> = { 0: "default", 1: "green" };

const getUserId = (): number => {
  try {
    const info = localStorage.getItem("userinfo");
    if (info) {
      const obj = JSON.parse(info);
      return obj.iD_TaiKhoan ?? obj.ID_TaiKhoan ?? obj.idTaiKhoan ?? 0;
    }
  } catch {
    /* empty */
  }
  return 0;
};

// Map (loaiPhoi, chatLuongTPHH) → cặp key cột trong pivot row
function getColKeys(
  loaiPhoi?: string | null,
  chatLuong?: string | null,
): { soKey: string; klKey: string } | null {
  const lp = loaiPhoi ?? "";
  const cl = chatLuong ?? "";
  const isNguoi = /nguội|nguoi/i.test(lp);
  const isNong = /nóng|nong/i.test(lp);
  if (!isNguoi && !isNong) return null;
  const p = isNguoi ? "nguoi" : "nong";
  let mid: string | null = null;
  // Kiểm tra theo thứ tự từ cụ thể nhất đến chung nhất
  if (/iii.*th[àa]nh|3.*th[àa]nh/i.test(cl)) mid = "loai3tp";
  else if (/\biii\b|\b3\b/i.test(cl)) mid = isNguoi ? "loai3" : null;
  else if (/ii.*th[àa]nh|2.*th[àa]nh/i.test(cl)) mid = "loai2tp";
  else if (/\bii\b|\b2\b/i.test(cl)) mid = "loai2";
  else if (/\bi\b|\b1\b/i.test(cl)) mid = "loai1";
  else if (/ng[aắ]n/i.test(cl)) mid = isNguoi ? "nganDai" : null;
  if (!mid) return null;
  return { soKey: `${p}_${mid}_so`, klKey: `${p}_${mid}_kl` };
}

function getLeafCols(cols: any[]): any[] {
  return cols.flatMap((c: any) => (c.children ? getLeafCols(c.children) : [c]));
}

// Chiều rộng tối ưu cho detail view — cột hiếm (loại II, III, nóng) thu nhỏ tối đa
const COMPACT_WIDTHS: Record<string, number> = {
  stt: 50,
  kipNgay: 120,
  macThep: 110,
  meThep: 90,
  kichThuoc: 130,
  nguoi_loai1_so: 45,
  nguoi_loai1_kl: 100,
  tongSoPhoi: 50,
  tongKhoiLuong: 100,
};

function buildAntCols(cols: any[]): any[] {
  return cols.map((col: any) => {
    if (col.children)
      return { title: col.title, children: buildAntCols(col.children) };
    const width =
      COMPACT_WIDTHS[col.dataIndex] ??
      (/_so$/.test(col.dataIndex)
        ? 40
        : /_kl$/.test(col.dataIndex)
          ? 70
          : (col.width ?? 80));
    const base: any = {
      title: col.title,
      dataIndex: col.dataIndex,
      width,
      align: (col.align ?? "left") as "left" | "right" | "center",
    };
    if (/_kl$/.test(col.dataIndex) || col.dataIndex === "tongKhoiLuong")
      base.render = (v: number) =>
        v ? Math.round(v).toLocaleString("vi-VN") : "";
    else if (col.format === "number-group")
      base.render = (v: number) =>
        v
          ? Number(v).toLocaleString("vi-VN", { minimumFractionDigits: 3 })
          : "";
    return base;
  });
}

const ChiTietBienBanGiaoNhanPhoiTam = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } =
    usePhieuNavigation("phieu_bbgnphoitam_id", "/viecdentoi/bbgnphoitam");

  const config = HRC2_BBGN_PhoiTam;

  // ── Phân quyền ────────────────────────────────────────────────────────────
  const userInfo = useMemo(() => {
    try {
      const s = localStorage.getItem("userinfo");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }, []);
  const isDuc = hasKhuVucPhu(userInfo, BM_CONFIG.HRC2.HRC2_BBGN_PhoiTam, "Duc");
  const isKho = hasKhuVucPhu(userInfo, BM_CONFIG.HRC2.HRC2_BBGN_PhoiTam, "Kho");
  const isPKH = canChotBm(userInfo, BM_CONFIG.HRC2.HRC2_BBGN_PhoiTam);

  // ── State ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [slabRows, setSlabRows] = useState<SlabTongHopItem[]>([]);
  const [slabDetails, setSlabDetails] = useState<HrcSlabItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [chotLoading, setChotLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // ── Chốt / Hủy chốt phiếu ────────────────────────────────────────────────
  const handleChotPhieu = async () => {
    if (!idphieu) return;
    try {
      setChotLoading(true);
      await Hrc2SlabApi.chotPhieu(idphieu, getUserId());
      message.success("Đã chốt phiếu thành công");
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi chốt phiếu");
    } finally {
      setChotLoading(false);
    }
  };

  const handleHuyChotPhieu = async () => {
    if (!idphieu) return;
    try {
      setChotLoading(true);
      await Hrc2SlabApi.huyChotPhieu(idphieu, getUserId());
      message.success("Đã hủy chốt phiếu");
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi hủy chốt phiếu");
    } finally {
      setChotLoading(false);
    }
  };

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setSlabRows([]);
      setSlabDetails([]);
      setSelectedRowKeys([]);
      if (!idphieu) return;
      const [res, slabs, details] = await Promise.all([
        safeGetDetail(() => PhieuApi.getDetail(idphieu)),
        Hrc2SlabApi.getRuotPhieu(idphieu),
        Hrc2SlabApi.getSlabsByPhieu(idphieu),
      ]);
      if (!res) return;
      setData((res as any)?.data ?? res);
      setSlabRows(slabs);
      setSlabDetails(details);
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

  // ── Bảng tổng hợp: build columns từ JSON config ───────────────────────────
  const tongHopColumns = useMemo(
    () => buildAntCols(HRC2_BBGN_PhoiTam.layout[0].columns),
    [],
  );
  const leafCols = useMemo(
    () => getLeafCols(HRC2_BBGN_PhoiTam.layout[0].columns),
    [],
  );
  const sumKeys = useMemo(
    () =>
      leafCols
        .filter((c: any) => c.sum && c.dataIndex)
        .map((c: any) => c.dataIndex as string),
    [leafCols],
  );

  // Pivot: nhóm slabRows theo (meThep, macThep, kichThuoc); trải loaiPhoi/chatLuongTPHH thành cột
  const pivotedRows = useMemo(() => {
    // Build map: pivotKey → tập shiftName từ các slab chi tiết (mỗi nhóm có thể có nhiều shiftName)
    const shiftNameMap = new Map<string, Set<string>>();
    slabDetails.forEach((d) => {
      if (!d.shiftName) return;
      const kt = [d.chieuDay, d.chieuRong, d.chieuDai].every((v) => v != null)
        ? `${d.chieuDay}x${d.chieuRong}x${d.chieuDai}`
        : "";
      const key = `${d.meThep ?? ""}|${d.macThep ?? ""}|${kt}`;
      if (!shiftNameMap.has(key)) shiftNameMap.set(key, new Set());
      shiftNameMap.get(key)!.add(d.shiftName);
    });

    const map = new Map<string, Record<string, any>>();
    slabRows.forEach((r) => {
      const kt = [r.chieuDay, r.chieuRong, r.chieuDai].every((v) => v != null)
        ? `${r.chieuDay}x${r.chieuRong}x${r.chieuDai}`
        : "";
      const rowKey = `${r.meThep ?? ""}|${r.macThep ?? ""}|${kt}`;
      if (!map.has(rowKey)) {
        const shiftNames = shiftNameMap.get(rowKey);
        map.set(rowKey, {
          key: rowKey,
          shiftName: shiftNames ? Array.from(shiftNames).join(", ") : "",
          meThep: r.meThep,
          macThep: r.macThep,
          kichThuoc: kt,
          tongSoPhoi: 0,
          tongKhoiLuong: 0,
        });
      }
      const row = map.get(rowKey)!;
      const keys = getColKeys(r.loaiPhoi, r.chatLuongTPHH);
      if (keys) {
        row[keys.soKey] = (row[keys.soKey] ?? 0) + (r.soLuong ?? 0);
        row[keys.klKey] = (row[keys.klKey] ?? 0) + (r.tongKhoiLuong ?? 0);
      }
      row.tongSoPhoi += r.soLuong ?? 0;
      row.tongKhoiLuong += r.tongKhoiLuong ?? 0;
    });
    return Array.from(map.values()).map((r, i) => ({ ...r, stt: i + 1 }));
  }, [slabRows, slabDetails]);

  // Tính tổng các cột sum
  const sumTotals = useMemo(() => {
    const t: Record<string, number> = {};
    sumKeys.forEach((k) => {
      t[k] = 0;
    });
    pivotedRows.forEach((r: any) => {
      sumKeys.forEach((k) => {
        t[k] = (t[k] ?? 0) + (r[k] ?? 0);
      });
    });
    return t;
  }, [pivotedRows, sumKeys]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const selectedRows = useMemo(
    () => slabDetails.filter((r) => selectedRowKeys.includes(r.id)),
    [slabDetails, selectedRowKeys],
  );
  const selectedCount = selectedRowKeys.length;

  const rowSelection: TableRowSelection<HrcSlabItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  // ── Enable conditions ─────────────────────────────────────────────────────
  const canXacNhanDuc =
    selectedCount > 0 &&
    selectedRows.every((r) => r.trangThaiDuc === 0 && r.trangThaiPKH === 0);
  const canHuyDuc =
    selectedCount > 0 &&
    selectedRows.every((r) => r.trangThaiDuc === 1 && r.trangThaiPKH === 0);
  const canXacNhanKho =
    selectedCount > 0 &&
    selectedRows.every((r) => r.trangThaiKho === 0 && r.trangThaiPKH === 0);
  const canHuyKho =
    selectedCount > 0 &&
    selectedRows.every((r) => r.trangThaiKho === 1 && r.trangThaiPKH === 0);
  const canChot =
    selectedCount > 0 && selectedRows.every((r) => r.trangThaiPKH === 0);
  const canHuyChot =
    selectedCount > 0 && selectedRows.every((r) => r.trangThaiPKH === 1);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleXacNhan = async (loai: "Duc" | "Kho" | "PKH") => {
    try {
      setActionLoading(true);
      const ids = selectedRows.map((r) => r.id);
      await Hrc2SlabApi.xacNhan(ids, loai, getUserId());
      message.success(`Xác nhận ${loai} thành công cho ${ids.length} slab`);
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? `Lỗi xác nhận ${loai}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHuyXacNhan = async (loai: "Duc" | "Kho" | "PKH") => {
    try {
      setActionLoading(true);
      const ids = selectedRows.map((r) => r.id);
      await Hrc2SlabApi.huyXacNhan(ids, loai, getUserId());
      message.success(`Hủy xác nhận ${loai} thành công cho ${ids.length} slab`);
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? `Lỗi hủy xác nhận ${loai}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Export handlers ───────────────────────────────────────────────────────

  const handleExportChiTietExcel = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("chitiet-excel");
    try {
      await Hrc2SlabApi.exportExcel(idphieu, "chitiet");
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất Excel");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  const handleExportTongHopExcel = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("tonghop-excel");
    try {
      await Hrc2SlabApi.exportExcel(idphieu, "tonghop");
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất Excel");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  const handleExportTongHopPdf = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("tonghop-pdf");
    try {
      await Hrc2SlabApi.exportPdf(idphieu);
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất PDF");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  // ── Columns bảng slab chi tiết ────────────────────────────────────────────
  const detailColumns = useMemo(
    () => [
      {
        title: "Ca SX",
        dataIndex: "shiftName",
        width: 100,
        align: "center" as const,
        render: (v: string) => v ?? "-",
      },
      {
        title: "ID Slab",
        dataIndex: "idSlab",
        width: 130,
        align: "center" as const,
      },
      {
        title: "Mẻ thép",
        dataIndex: "meThep",
        width: 100,
        align: "center" as const,
      },
      {
        title: "Máy đúc",
        dataIndex: "mayDuc",
        width: 80,
        align: "center" as const,
        render: (v: number) => v != null ? `Máy ${v}` : "-",
      },
      {
        title: "Kích thước",
        dataIndex: "kichThuoc",
        width: 130,
        align: "center" as const,
        render: (_: unknown, r: HrcSlabItem) =>
          [r.chieuDay, r.chieuRong, r.chieuDai].every((v) => v != null)
            ? `${r.chieuDay}x${r.chieuRong}x${r.chieuDai}`
            : "-",
      },
      {
        title: "Mác thép",
        dataIndex: "macThep",
        width: 120,
        align: "center" as const,
      },
      {
        title: "KL (tấn)",
        dataIndex: "khoiLuong",
        width: 110,
        align: "right" as const,
        render: (v: number) =>
          v != null
            ? Number(v).toLocaleString("vi-VN", { minimumFractionDigits: 3 })
            : "-",
      },
      { title: "Chất lượng", dataIndex: "chatLuong", width: 160 },
      ...(isDuc
        ? [
            {
              title: "TT Đúc",
              dataIndex: "trangThaiDuc",
              width: 90,
              align: "center" as const,
              render: (v: number) => (
                <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã XN" : "Chưa"}</Tag>
              ),
            },
          ]
        : []),
      ...(isKho
        ? [
            {
              title: "TT Kho",
              dataIndex: "trangThaiKho",
              width: 90,
              align: "center" as const,
              render: (v: number) => (
                <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã XN" : "Chưa"}</Tag>
              ),
            },
          ]
        : []),
      ...(isPKH
        ? [
            {
              title: "TT PKH",
              dataIndex: "trangThaiPKH",
              width: 90,
              align: "center" as const,
              render: (v: number) => (
                <Tag color={v === 1 ? "blue" : "default"}>
                  {v === 1 ? "Đã chốt" : "Chưa"}
                </Tag>
              ),
            },
          ]
        : []),
    ],
    [isDuc, isKho, isPKH],
  );

  // ── Action buttons phiếu ──────────────────────────────────────────────────
  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/form-bbgnphoitam");
        return;
      }
      await loadData();
    },
    [loadData, navigateToDetail],
  );

  const actionButtons = useMemo(() => {
    if (!data || !idphieu) return null;
    const ui = getUserInfo();
    if (getBmQuyenUiFlags(config.code, ui).isView) return null;
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu,
      tinhTrang: data.tinhTrang ?? 0,
      isClone: data.isClone ?? false,
      currentUserId: ui.iD_TaiKhoan ?? null,
      currentUserPhongBanId: ui.iD_PhongBan ?? null,
      currentUserTenNgan: ui.tenNgan ?? null,
      nguoiTaoId: data.nguoiTaoId ?? null,
      phieuPhongBanId: data.idphongBan ?? null,
      pheDuyet: data.pheDuyet ?? [],
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
        message.error(
          (error as any)?.message ?? "Không thể thực hiện thao tác",
        );
      },
    });
    const filteredButtons = buttons.filter(
      (btn) => !DETAIL_HIDDEN_BUTTON_KEYS.has(btn.key),
    );
    if (filteredButtons.length === 0) return null;
    return phieuActionService.renderActionButtons(
      filteredButtons,
      idphieu || "",
    );
  }, [
    data,
    idphieu,
    config.code,
    getUserInfo,
    handleActionSuccess,
    redirectToList,
  ]);

  // const hasWorkflowButtons = isDuc || isKho || isPKH;

  return (
    <Card
      bordered
      style={{ padding: 24, background: "#fff" }}
      loading={loading}
    >
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 0 }}>
          {config.title}
        </Title>
        {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
      </div>

      <Tabs
        defaultActiveKey="slab"
        type="card"
        style={{ padding: "0 8px" }}
        items={[
          {
            key: "slab",
            label: "Chi tiết slab",
            children: (
              <>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Số phiếu">
                    {data?.soPhieu || ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày SX">
                    {formData?.NgaySX
                      ? dayjs(formData.NgaySX).format("DD/MM/YYYY")
                      : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ca sản xuất">
                    {formData?.ca == 1
                      ? "Ca ngày"
                      : formData?.ca == 2
                        ? "Ca đêm"
                        : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kíp">
                    {formData?.kip || ""}
                  </Descriptions.Item>
                </Descriptions>
                <Card
                  size="small"
                  title={`Danh sách slab (${slabDetails.length})${selectedCount > 0 ? ` — Đã chọn ${selectedCount}` : ""}`}
                  style={{ marginTop: 16 }}
                  bodyStyle={{ padding: "8px 12px" }}
                  extra={
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        loading={exportLoading === "chitiet-excel"}
                        onClick={() => void handleExportChiTietExcel()}
                        style={{ color: "#217346" }}
                      >
                        Excel
                      </Button>
                      {isDuc && (
                        <>
                          <Popconfirm
                            title={`Xác nhận Đúc ${selectedCount} slab?`}
                            onConfirm={() => handleXacNhan("Duc")}
                            disabled={!canXacNhanDuc}
                          >
                            <Button
                              size="small"
                              icon={<CheckCircleOutlined />}
                              disabled={!canXacNhanDuc}
                              loading={actionLoading}
                              style={{
                                color: canXacNhanDuc ? "#1890ff" : undefined,
                              }}
                            >
                              XN Đúc
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy XN Đúc ${selectedCount} slab?`}
                            onConfirm={() => handleHuyXacNhan("Duc")}
                            disabled={!canHuyDuc}
                          >
                            <Button
                              size="small"
                              icon={<CloseCircleOutlined />}
                              disabled={!canHuyDuc}
                              loading={actionLoading}
                              danger
                            >
                              Hủy XN Đúc
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                      {isKho && (
                        <>
                          <Popconfirm
                            title={`Xác nhận Kho ${selectedCount} slab?`}
                            onConfirm={() => handleXacNhan("Kho")}
                            disabled={!canXacNhanKho}
                          >
                            <Button
                              size="small"
                              icon={<CheckCircleOutlined />}
                              disabled={!canXacNhanKho}
                              loading={actionLoading}
                              style={{
                                color: canXacNhanKho ? "#52c41a" : undefined,
                              }}
                            >
                              XN Kho
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy XN Kho ${selectedCount} slab?`}
                            onConfirm={() => handleHuyXacNhan("Kho")}
                            disabled={!canHuyKho}
                          >
                            <Button
                              size="small"
                              icon={<CloseCircleOutlined />}
                              disabled={!canHuyKho}
                              loading={actionLoading}
                              danger
                            >
                              Hủy XN Kho
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                      {isPKH && (
                        <>
                          <Popconfirm
                            title={`Chốt PKH ${selectedCount} slab?`}
                            onConfirm={() => handleXacNhan("PKH")}
                            disabled={!canChot}
                          >
                            <Button
                              size="small"
                              icon={<CheckCircleOutlined />}
                              disabled={!canChot}
                              loading={actionLoading}
                              style={{ color: canChot ? "#722ed1" : undefined }}
                            >
                              Chốt PKH
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy chốt PKH ${selectedCount} slab?`}
                            onConfirm={() => handleHuyXacNhan("PKH")}
                            disabled={!canHuyChot}
                          >
                            <Button
                              size="small"
                              icon={<CloseCircleOutlined />}
                              disabled={!canHuyChot}
                              loading={actionLoading}
                              danger
                            >
                              Hủy chốt
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  }
                >
                  <Table<HrcSlabItem>
                    rowKey="id"
                    rowSelection={rowSelection}
                    size="small"
                    bordered
                    columns={detailColumns}
                    dataSource={slabDetails}
                    pagination={false}
                    scroll={{ x: "max-content", y: 520 }}
                    sticky={{ offsetHeader: 0 }}
                    summary={() => {
                      const totalKL = slabDetails.reduce((s, r) => s + (r.khoiLuong ?? 0), 0);
                      const optColCount = (isDuc ? 1 : 0) + (isKho ? 1 : 0) + (isPKH ? 1 : 0);
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={7} align="center">
                              <strong>Tổng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={7} align="right">
                              <strong>{Number(totalKL).toLocaleString("vi-VN", { minimumFractionDigits: 3 })}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={8} colSpan={1 + optColCount} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "tonghop",
            label: "Tổng hợp slab",
            children: (
              <>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Số phiếu">
                    {data?.soPhieu || ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày SX">
                    {formData?.NgaySX
                      ? dayjs(formData.NgaySX).format("DD/MM/YYYY")
                      : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ca sản xuất">
                    {formData?.ca == 1
                      ? "Ca ngày"
                      : formData?.ca == 2
                        ? "Ca đêm"
                        : ""}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kíp">
                    {formData?.kip || ""}
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    loading={exportLoading === "tonghop-excel"}
                    onClick={() => void handleExportTongHopExcel()}
                    style={{ color: "#217346" }}
                  >
                    Excel
                  </Button>
                  <Button
                    size="small"
                    icon={<FilePdfOutlined />}
                    loading={exportLoading === "tonghop-pdf"}
                    onClick={() => void handleExportTongHopPdf()}
                    danger
                  >
                    PDF
                  </Button>
                </div>
                <div style={{ marginTop: 0, fontSize: 11, lineHeight: 1.4 }}>
                  <Table
                    bordered
                    style={{}}
                    columns={tongHopColumns}
                    dataSource={pivotedRows}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1605 }}
                    sticky={{ offsetHeader: 0 }}
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          {leafCols.map((col: any, idx: number) => {
                            if (idx > 0 && idx < 5) {
                              return (
                                <Table.Summary.Cell
                                  key={col.dataIndex ?? idx}
                                  index={idx}
                                  colSpan={0}
                                />
                              );
                            }
                            if (idx === 0) {
                              return (
                                <Table.Summary.Cell
                                  key="tong-label"
                                  index={0}
                                  colSpan={5}
                                  align="center"
                                >
                                  <strong>Tổng</strong>
                                </Table.Summary.Cell>
                              );
                            }
                            const val = sumTotals[col.dataIndex];
                            let content: any = null;
                            if (col.sum && val != null) {
                              const formatted =
                                /_kl$/.test(col.dataIndex) ||
                                col.dataIndex === "tongKhoiLuong"
                                  ? Math.round(val).toLocaleString("vi-VN")
                                  : Number(val).toLocaleString("vi-VN");
                              content = <strong>{formatted}</strong>;
                            }
                            return (
                              <Table.Summary.Cell
                                key={col.dataIndex ?? idx}
                                index={idx}
                                align={col.align ?? "left"}
                              >
                                {content}
                              </Table.Summary.Cell>
                            );
                          })}
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      {/* ── Bảng slab chi tiết (Đúc / Kho / PKH xác nhận) ── */}

      {/* ── Bảng tổng hợp (pivot theo cấu trúc JSON config) ── */}

      {/* Ký duyệt */}
      {/* <Row justify="space-around" align="top" style={{ textAlign: "center", marginTop: 30 }}>
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
      </Row> */}

      {/* Action buttons phiếu */}
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
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void loadData()}
          loading={loading}
        >
          Làm mới
        </Button>
        {isPKH && data?.tinhTrang !== 5 && (
          <Popconfirm
            title="Chốt phiếu này? Sau khi chốt sẽ không thể chuyển thêm slab vào."
            onConfirm={handleChotPhieu}
          >
            <Button
              type="primary"
              icon={<LockOutlined />}
              loading={chotLoading}
            >
              Chốt phiếu
            </Button>
          </Popconfirm>
        )}
        {isPKH && data?.tinhTrang === 5 && (
          <Popconfirm
            title="Hủy chốt phiếu này?"
            onConfirm={handleHuyChotPhieu}
          >
            <Button danger icon={<UnlockOutlined />} loading={chotLoading}>
              Hủy chốt
            </Button>
          </Popconfirm>
        )}
        {actionButtons}
      </div>
    </Card>
  );
};

export default ChiTietBienBanGiaoNhanPhoiTam;
