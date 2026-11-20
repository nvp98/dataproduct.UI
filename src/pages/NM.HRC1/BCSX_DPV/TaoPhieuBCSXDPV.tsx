/* eslint-disable @typescript-eslint/no-explicit-any */
import { Alert, Button, Card, Form, Input, Popconfirm, Space, Tabs, Typography, message } from "antd";
import { CloudDownloadOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HRC1_BCSX_DPV from "../../../utils/BM_config/HRC1_BCSX_DPV.json";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { HRC1BCSXApi, NGUON_BCSX } from "../../../services/HRC1BCSXApi";
import type {
  BcsxChiTiet,
  BcsxDien,
  BcsxDongBase,
  BcsxNguyenVatLieu,
  BcsxThanhPham,
  BcsxThepLong,
} from "../../../services/HRC1BCSXApi";
import BangNhapBCSX from "./BangNhapBCSX";
import { ganKhoa } from "./bangNhapUtils";
import type { CotNhap } from "./BangNhapBCSX";
import { DUONG_DAN_BCSX } from "./duongDan";

// Biên bản chốt số liệu Xưởng Đúc phôi vuông (BM.14/QT.05.11, MaBM HRC1_BCSX_DPV).
// Ký: P.KH lập (cấp 0) → NM.HRC1 (cấp 1) → P.CNLT (cấp 2).
// 4 vùng lưu trong DataJson (thepLong / dien / nguyenVatLieu / thanhPham); API ghi lại 4 bảng HRC1_BC_* khi lưu.

const config = HRC1_BCSX_DPV as any;

const tongKL = (r: BcsxThanhPham) =>
  [r.nguoi_Loai1, r.nguoi_Loai2BM, r.nguoi_Loai2TPHH, r.nguoi_Loai3, r.nong_Loai1, r.nong_Loai2BM, r.nong_Loai2TPHH, r.nong_Loai3]
    .reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);

// ── Cột từng vùng (thứ tự giống biên bản giấy) ──────────────────────────────

const COT_THEP_LONG: CotNhap<BcsxThepLong>[] = [
  { key: "mac", title: "Mác thép", kieu: "chu", width: 110 },
  { key: "kip", title: "Kíp", kieu: "kip", width: 55 },
  { key: "donViTinh", title: "Đvt", kieu: "chu", width: 60 },
  { key: "soLuongMe", title: "Số mẻ", kieu: "nguyen", width: 70 },
  { key: "mayDuc", title: "Đúc", kieu: "nguyen", width: 60 },
  { key: "tonDau", title: "Tồn đầu", kieu: "so", width: 110, cong: true },
  { key: "nhap", title: "Nhập", kieu: "so", width: 120, cong: true },
  { key: "xuat", title: "Xuất", kieu: "so", width: 120, cong: true },
  { key: "tonCuoi", title: "Tồn cuối", kieu: "so", width: 110, cong: true },
  { key: "lenhSanXuat", title: "Lệnh sản xuất", kieu: "chu", width: 130 },
  { key: "ghiChu", title: "Ghi chú", kieu: "chu", width: 180 },
];

const COT_DIEN: CotNhap<BcsxDien>[] = [
  { key: "noiDung", title: "Nội dung", kieu: "chu", width: 160 },
  { key: "kip", title: "Kíp", kieu: "kip", width: 55 },
  { key: "donViTinh", title: "Đvt", kieu: "chu", width: 70 },
  { key: "soLieu", title: "Số liệu", kieu: "so", width: 140, cong: true },
  { key: "ghiChu", title: "Ghi chú", kieu: "chu", width: 240 },
];

const COT_NVL: CotNhap<BcsxNguyenVatLieu>[] = [
  { key: "noiDung", title: "Nội dung", kieu: "chu", width: 160 },
  { key: "kip", title: "Kíp", kieu: "kip", width: 55 },
  { key: "donViTinh", title: "Đvt", kieu: "chu", width: 60 },
  { key: "soLieu", title: "Số liệu", kieu: "so", width: 120, cong: true },
  { key: "soLieuBoPhan", title: "Số liệu", kieu: "so", width: 110, cong: true, nhom: "Bộ phận liên quan" },
  { key: "boPhanLienQuan", title: "Bộ phận", kieu: "chu", width: 130, nhom: "Bộ phận liên quan" },
  { key: "lenhSanXuat", title: "Lệnh sản xuất", kieu: "chu", width: 130 },
  { key: "ghiChu", title: "Ghi chú", kieu: "chu", width: 160 },
];

const cotKhoiLuong = (): CotNhap<BcsxThanhPham>[] => [
  { key: "nguoi_SoThanh", title: "Tổng số thanh", kieu: "nguyen", width: 75, cong: true, nhom: "Phôi nguội" },
  { key: "nguoi_Loai1", title: "Loại I", kieu: "so", width: 100, cong: true, nhom: "Phôi nguội" },
  { key: "nguoi_Loai2BM", title: "Loại II BM", kieu: "so", width: 90, cong: true, nhom: "Phôi nguội" },
  { key: "nguoi_Loai2TPHH", title: "Loại II TPHH", kieu: "so", width: 90, cong: true, nhom: "Phôi nguội" },
  { key: "nguoi_Loai3", title: "Loại III", kieu: "so", width: 85, cong: true, nhom: "Phôi nguội" },
  { key: "nong_SoThanh", title: "Tổng số thanh", kieu: "nguyen", width: 75, cong: true, nhom: "Phôi nóng" },
  { key: "nong_Loai1", title: "Loại I", kieu: "so", width: 100, cong: true, nhom: "Phôi nóng" },
  { key: "nong_Loai2BM", title: "Loại II BM", kieu: "so", width: 90, cong: true, nhom: "Phôi nóng" },
  { key: "nong_Loai2TPHH", title: "Loại II TPHH", kieu: "so", width: 90, cong: true, nhom: "Phôi nóng" },
  { key: "nong_Loai3", title: "Loại III", kieu: "so", width: 85, cong: true, nhom: "Phôi nóng" },
  { key: "tong", title: "Tổng", kieu: "so", width: 110, cong: true, chiDoc: true, tinh: tongKL },
];

const COT_THANH_PHAM: CotNhap<BcsxThanhPham>[] = [
  { key: "me", title: "Mẻ", kieu: "chu", width: 110 },
  { key: "mac", title: "Mác thép", kieu: "chu", width: 90 },
  { key: "kichThuoc", title: "Kích thước", kieu: "chu", width: 130 },
  { key: "kip", title: "Kíp", kieu: "kip", width: 50 },
  ...cotKhoiLuong(),
  { key: "mayDuc", title: "Đúc", kieu: "nguyen", width: 55 },
  { key: "lenhSanXuat", title: "LSX", kieu: "chu", width: 120 },
  { key: "ghiChu", title: "Ghi chú", kieu: "chu", width: 140 },
];

const COT_TONG_SAN_LUONG: CotNhap<BcsxThanhPham>[] = [
  { key: "mac", title: "Mác thép", kieu: "chu", width: 90 },
  { key: "kichThuoc", title: "Kích thước", kieu: "chu", width: 130 },
  { key: "kip", title: "Kíp", kieu: "kip", width: 50 },
  ...cotKhoiLuong(),
  { key: "mayDuc", title: "Đúc", kieu: "nguyen", width: 55 },
  { key: "lenhSanXuat", title: "LSX", kieu: "chu", width: 130 },
];

/** Bảng "Tổng sản lượng": gộp thành phẩm theo Kíp × Mác × KT × Đúc × LSX (giống view HRC1_BC_v_TongSanLuong). */
const gopTongSanLuong = (rows: BcsxThanhPham[]): BcsxThanhPham[] => {
  const map = new Map<string, BcsxThanhPham>();
  const so = ["nguoi_SoThanh", "nguoi_Loai1", "nguoi_Loai2BM", "nguoi_Loai2TPHH", "nguoi_Loai3",
    "nong_SoThanh", "nong_Loai1", "nong_Loai2BM", "nong_Loai2TPHH", "nong_Loai3"] as const;
  rows.forEach((r) => {
    const k = [r.kip, r.mac, r.kichThuoc, r.mayDuc, r.lenhSanXuat].join("|");
    const g = map.get(k) ?? { _key: k, kip: r.kip, mac: r.mac, kichThuoc: r.kichThuoc, mayDuc: r.mayDuc, lenhSanXuat: r.lenhSanXuat };
    so.forEach((f) => ((g as any)[f] = ((g as any)[f] ?? 0) + (typeof r[f] === "number" ? (r[f] as number) : 0)));
    map.set(k, g);
  });
  return [...map.values()];
};

const RONG: BcsxChiTiet = { thepLong: [], dien: [], nguyenVatLieu: [], thanhPham: [] };

/** Bỏ khóa FE + cột tính trước khi gửi. */
const boKhoa = <T extends BcsxDongBase>(rows: T[]) =>
  rows.map(({ _key, ...r }) => {
    void _key;
    const x = { ...r } as any;
    delete x.tong;
    return x;
  });

const TaoPhieuBCSXDPV = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id: idphieu } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [goiYLoading, setGoiYLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [canhBao, setCanhBao] = useState<string[]>([]);
  const [ct, setCt] = useState<BcsxChiTiet>(RONG);
  const [tab, setTab] = useState("thepLong");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: any[];
    isClone?: boolean;
  }>({});

  const ctRef = useRef(ct);
  useEffect(() => {
    ctRef.current = ct;
  }, [ct]);

  const currentUserInfo = useMemo(() => getThongTinUser(), []);
  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [TrangThaiPhieuConst.HoanThanh, TrangThaiPhieuConst.DangPheDuyet, TrangThaiPhieuConst.DaChot].includes(currentTinhTrang);
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const datVung = <K extends keyof BcsxChiTiet>(k: K) => (rows: BcsxChiTiet[K]) => setCt((c) => ({ ...c, [k]: rows }));

  // ── Tải phiếu ─────────────────────────────────────────────────────────────

  const initData = useCallback(async () => {
    setLoading(true);
    try {
      if (idphieu) {
        const res: any = await PhieuApi.getDetail(idphieu);
        if (!res) return;
        setSoPhieu(res.soPhieu || "");
        const data = res.jsonData || {};
        const tinhTrang = res.tinhTrang ?? 0;

        const signatureFields: Record<string, any> = {};
        (res.pheDuyet || []).forEach((pd: any) => {
          const sig = config.signatures.find((s: any) => s.capDuyet === pd.capDuyet);
          if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
        });
        if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
          config.signatures
            .filter((s: any) => s.capDuyet === 0)
            .forEach((s: any) => (signatureFields[s.key] = currentUserInfo?.iD_TaiKhoan ?? null));
        }
        const ngay = data.NgaySX ?? res.ngaySX;
        form.setFieldsValue({ ...signatureFields, NgaySX: ngay ? dayjs(ngay) : null });

        setCt({
          thepLong: ganKhoa(data.thepLong),
          dien: ganKhoa(data.dien),
          nguyenVatLieu: ganKhoa(data.nguyenVatLieu),
          thanhPham: ganKhoa(data.thanhPham),
        });
        setPhieuInfo({
          tinhTrang,
          nguoiTaoId: res.nguoiTaoId ?? null,
          idphongBan: res.idphongBan ?? null,
          pheDuyet: res.pheDuyet || data.pheDuyet || [],
          isClone: res.isClone ?? false,
        });
      } else {
        setPhieuInfo({});
        setCt(RONG);
        // Thường chốt sáng hôm sau cho kỳ 08h hôm trước → 08h hôm nay
        const macDinh: Record<string, any> = { NgaySX: dayjs().subtract(1, "day") };
        config.signatures
          .filter((s: any) => s.capDuyet === 0)
          .forEach((s: any) => (macDinh[s.key] = currentUserInfo?.iD_TaiKhoan ?? null));
        setTimeout(() => form.setFieldsValue(macDinh), 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu phiếu!");
    } finally {
      setLoading(false);
    }
  }, [idphieu, form, currentUserInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  // ── Lấy dữ liệu từ Kho dữ liệu ──────────────────────────────────────────

  const handleLayDuLieu = async () => {
    const ngay = form.getFieldValue("NgaySX");
    if (!ngay) {
      message.warning("Chọn Ngày sản xuất trước khi lấy dữ liệu.");
      return;
    }
    setGoiYLoading(true);
    try {
      const g = await HRC1BCSXApi.getGoiY(dayjs(ngay).format("YYYY-MM-DD"));
      // Giữ nguyên NVL (nhập tay); 3 vùng còn lại thay bằng số gợi ý
      setCt((c) => ({
        ...c,
        thepLong: ganKhoa(g.thepLong),
        dien: ganKhoa(g.dien),
        thanhPham: ganKhoa(g.thanhPham),
      }));
      setCanhBao(g.canhBao);
      message.success(`Đã lấy ${g.thepLong.length} dòng thép lỏng, ${g.dien.length} dòng điện, ${g.thanhPham.length} dòng thành phẩm.`);
    } catch (error: any) {
      message.error(error?.message || "Không lấy được dữ liệu từ Kho dữ liệu.");
    } finally {
      setGoiYLoading(false);
    }
  };

  // ── Gửi lên API ─────────────────────────────────────────────────────────

  const kiemTra = (c: BcsxChiTiet): string[] => {
    const loi: string[] = [];
    const dongThieu = <T,>(rows: T[], thieu: (r: T) => boolean) => rows.map((r, i) => (thieu(r) ? i + 1 : 0)).filter((x) => x > 0);
    const tl = dongThieu(c.thepLong, (r) => !r.mac?.trim() || !r.kip?.trim());
    if (tl.length) loi.push(`Thép lỏng dòng ${tl.join(", ")}: thiếu Mác thép hoặc Kíp.`);
    const d = dongThieu(c.dien, (r) => !r.kip?.trim());
    if (d.length) loi.push(`Điện dòng ${d.join(", ")}: thiếu Kíp.`);
    const n = dongThieu(c.nguyenVatLieu, (r) => !r.noiDung?.trim() || !r.kip?.trim());
    if (n.length) loi.push(`NVL dòng ${n.join(", ")}: thiếu Nội dung hoặc Kíp.`);
    const tp = dongThieu(c.thanhPham, (r) => !r.me?.trim() || !r.kip?.trim());
    if (tp.length) loi.push(`Thành phẩm dòng ${tp.join(", ")}: thiếu Mẻ hoặc Kíp.`);

    const trung = (ten: string, khoa: string[]) => {
      const seen = new Set<string>();
      const dup = khoa.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
      if (dup.length) loi.push(`${ten} trùng dòng: ${[...new Set(dup)].join("; ")}.`);
    };
    trung("Thép lỏng", c.thepLong.map((r) => `kíp ${r.kip} – ${r.mac?.trim().toUpperCase()} – LSX ${r.lenhSanXuat ?? ""}`));
    trung("Điện", c.dien.map((r) => `kíp ${r.kip} – ${r.noiDung ?? "Điện"}`));
    trung("Thành phẩm", c.thanhPham.map((r) => `${r.me?.trim().toUpperCase()} – ${r.kichThuoc ?? ""}`));
    return loi;
  };

  const getFormData = useCallback(async () => {
    const userInfo = getThongTinUser();
    const formData = await form.validateFields();
    const c = ctRef.current;

    if (!isFormLocked) {
      const loi = kiemTra(c);
      if (loi.length) {
        loi.forEach((l) => message.error(l, 6));
        throw new Error(loi[0]);
      }
    }

    const pheDuyet = config.signatures.map((s: any) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    return {
      ...formData,
      NgaySX: formData.NgaySX ? dayjs(formData.NgaySX).format("YYYY-MM-DD") : null,
      maBm: config.code,
      prefix: config.prefix,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      thepLong: boKhoa(c.thepLong),
      dien: boKhoa(c.dien),
      nguyenVatLieu: boKhoa(c.nguyenVatLieu),
      thanhPham: boKhoa(c.thanhPham),
      pheDuyet,
    };
  }, [form, isFormLocked]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`${DUONG_DAN_BCSX.tao}/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error: any) {
      message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái");
    }
  }, [form]);

  const actionButtons = useMemo(() => {
    const userInfo = getThongTinUser();
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu || "",
      tinhTrang: phieuInfo.tinhTrang ?? 0,
      isClone: phieuInfo.isClone ?? false,
      currentUserId: userInfo.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo.tenNgan ?? null,
      nguoiTaoId: phieuInfo.nguoiTaoId ?? null,
      phieuPhongBanId: phieuInfo.idphongBan ?? null,
      phieuMaBm: config.code,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  // ── Render ──────────────────────────────────────────────────────────────

  const ngaySX = Form.useWatch("NgaySX", form);
  const kyText = ngaySX
    ? `Từ 08 giờ 00 ngày ${dayjs(ngaySX).format("DD/MM/YYYY")} đến 08 giờ 00 ngày ${dayjs(ngaySX).add(1, "day").format("DD/MM/YYYY")}`
    : "";
  const tongSanLuong = useMemo(() => gopTongSanLuong(ct.thanhPham), [ct.thanhPham]);
  const coDuLieu = ct.thepLong.length + ct.dien.length + ct.thanhPham.length > 0;

  const kipMoi = () => (ct.thepLong[ct.thepLong.length - 1]?.kip ?? null) as string | null;

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <style>{`.bcsx-nd td { background: #f0f0f0 !important; } .bcsx-tudong td:first-child { border-left: 3px solid #91caff !important; }`}</style>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          {config.title}
        </Typography.Title>
        <div>
          <Typography.Text type="secondary">
            {config.isoInfo.code} · Ngày hiệu lực {config.isoInfo.effectiveDate} · Lần sửa đổi {config.isoInfo.revision}
          </Typography.Text>
        </div>
        {kyText && <div>{kyText}</div>}
        {idphieu && <b>Số phiếu: {soPhieu}</b>}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 320px))", gap: 12, justifyContent: "center" }}>
          {config.headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked || !!idphieu} />
          ))}
        </div>

        <Space style={{ justifyContent: "center", width: "100%", margin: "8px 0 16px" }} wrap>
          {!isFormLocked && (
            <Popconfirm
              title="Lấy dữ liệu từ Kho dữ liệu"
              description={
                coDuLieu
                  ? "Thay số liệu Thép lỏng, Điện, Thành phẩm hiện có bằng số lấy từ CSDL Đúc phôi vuông (NVL giữ nguyên)?"
                  : "Lấy Thép lỏng, Điện, Thành phẩm từ CSDL Đúc phôi vuông theo Ngày sản xuất?"
              }
              okText="Lấy dữ liệu"
              cancelText="Hủy"
              onConfirm={handleLayDuLieu}
            >
              <Button icon={<CloudDownloadOutlined />} loading={goiYLoading}>
                Lấy dữ liệu
              </Button>
            </Popconfirm>
          )}
          {actionButtons}
          <Button icon={<UndoOutlined />} onClick={() => navigate(DUONG_DAN_BCSX.danhSach)}>
            Quay lại
          </Button>
        </Space>

        {canhBao.length > 0 && (
          <Alert
            style={{ marginBottom: 12 }}
            type="warning"
            showIcon
            closable
            onClose={() => setCanhBao([])}
            message="Lưu ý khi lấy dữ liệu"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {canhBao.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            }
          />
        )}

        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "thepLong",
              label: `I. Thép lỏng (${ct.thepLong.length})`,
              children: (
                <BangNhapBCSX<BcsxThepLong>
                  cot={COT_THEP_LONG}
                  rows={ct.thepLong}
                  onChange={datVung("thepLong")}
                  editable={!isFormLocked}
                  tongTheoKip
                  loading={loading}
                  rowClassName={(r) => (r.nguon === NGUON_BCSX.TU_DONG ? "bcsx-tudong" : "")}
                  taoDongMoi={() => ({ kip: kipMoi(), donViTinh: "kg", nguon: NGUON_BCSX.NHAP_TAY })}
                />
              ),
            },
            {
              key: "dien",
              label: `II. Điện (${ct.dien.length})`,
              children: (
                <BangNhapBCSX<BcsxDien>
                  cot={COT_DIEN}
                  rows={ct.dien}
                  onChange={datVung("dien")}
                  editable={!isFormLocked}
                  tongTheoKip
                  loading={loading}
                  rowClassName={(r) => (r.nguon === NGUON_BCSX.TU_DONG ? "bcsx-tudong" : "")}
                  taoDongMoi={() => ({ noiDung: "Điện", donViTinh: "Kwh", nguon: NGUON_BCSX.NHAP_TAY })}
                />
              ),
            },
            {
              key: "nguyenVatLieu",
              label: `III. NVL xuất cho các nhà máy (${ct.nguyenVatLieu.length})`,
              children: (
                <BangNhapBCSX<BcsxNguyenVatLieu>
                  cot={COT_NVL}
                  rows={ct.nguyenVatLieu}
                  onChange={datVung("nguyenVatLieu")}
                  editable={!isFormLocked}
                  tongTheoKip
                  loading={loading}
                  taoDongMoi={() => ({ donViTinh: "Kg", boPhanLienQuan: "X.CBNL-NM.NL", nguon: NGUON_BCSX.NHAP_TAY })}
                />
              ),
            },
            {
              key: "thanhPham",
              label: `IV. Thành phẩm (${ct.thanhPham.length})`,
              children: (
                <BangNhapBCSX<BcsxThanhPham>
                  cot={COT_THANH_PHAM}
                  rows={ct.thanhPham}
                  onChange={datVung("thanhPham")}
                  editable={!isFormLocked}
                  tongTheoKip
                  loading={loading}
                  scrollY={520}
                  rowClassName={(r) => [r.laNganDai ? "bcsx-nd" : "", r.nguon === NGUON_BCSX.TU_DONG ? "bcsx-tudong" : ""].join(" ")}
                  taoDongMoi={() => ({ laNganDai: false, nguon: NGUON_BCSX.NHAP_TAY })}
                />
              ),
            },
            {
              key: "tongSanLuong",
              label: `Tổng sản lượng (${tongSanLuong.length})`,
              children: <BangNhapBCSX<BcsxThanhPham> cot={COT_TONG_SAN_LUONG} rows={tongSanLuong} editable={false} tongTheoKip />,
            },
          ]}
        />
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          * Viền xanh bên trái: dòng lấy từ Kho dữ liệu (sửa lại sẽ chuyển thành nhập tay). Nền xám: dòng phôi ngắn dài. STT, Tổng kíp,
          Tổng cộng và Tổng sản lượng tự tính.
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-around", textAlign: "center", flexWrap: "wrap", gap: 12 }}>
          {[...config.signatures]
            .sort((a: any, b: any) => b.capDuyet - a.capDuyet) // in như biên bản: P.CNLT – NM.HRC1 – P.KH
            .map((sig: any, i: number) => {
              const isLevelZero = sig.capDuyet === 0;
              const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
              return (
                <div key={sig.key || i} style={{ minWidth: 220 }}>
                  <CustomFormItem field={sig} idx={i} disabled={isLevelZero || isSignatureReadonly || isFormLocked} />
                  {idphieu && duyet && (
                    <Typography.Text type="secondary">
                      {duyet.tinhTrang === 1 ? "Đã ký" : duyet.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                    </Typography.Text>
                  )}
                </div>
              );
            })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuBCSXDPV;
