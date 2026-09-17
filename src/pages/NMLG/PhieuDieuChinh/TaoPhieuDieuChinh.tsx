/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_PhieuDieuChinh from "../../../utils/BM_config/LG_PhieuDieuChinh.json";
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Typography, message } from "antd";
import { DeleteOutlined, EditOutlined, FilterOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable from "../../../components/CustomFormTable";
import type { FormColumnDef } from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { phieuDieuChinhApi, type LGPhieuDieuChinhNvlDto } from "../../../services/PhieuDieuChinhApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const getUserInfo = () => {
  const stored = localStorage.getItem("userinfo");
  return stored ? JSON.parse(stored) : {};
};

// Đánh lại "Thứ tự" theo vị trí dòng hiện tại trong bảng
const renumberThuTu = (rows: TableRow[]): TableRow[] =>
  rows.map((r, idx) => ({ ...r, thuTu: idx + 1 }));

const toNum = (v: any): number | null =>
  v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

// "Trước ẩm": không cần Độ ẩm, KL quy khô Nhập = Khối lượng Nhập.
// "Sau ẩm": KL quy khô Nhập tự tính từ Khối lượng nhập + Độ ẩm.
// Sau khi tính xong, Bên nhập mới gán qua Bên xuất.
const recomputeRows = (rows: TableRow[]): TableRow[] =>
  rows.map((row) => {
    const loaiSo = row.loaiSoDieuChinh != null ? String(row.loaiSoDieuChinh) : null;
    const khoiLuongNhap = toNum(row.khoiLuongNhap);

    let doAm = row.doAm;
    let khoiLuongQuyKhoNhap: number | null;
    if (loaiSo === "1") {
      doAm = null;
      khoiLuongQuyKhoNhap = khoiLuongNhap;
    } else if (loaiSo === "2") {
      const doAmNum = toNum(row.doAm);
      khoiLuongQuyKhoNhap =
        khoiLuongNhap != null && doAmNum != null
          ? Number((khoiLuongNhap * (doAmNum / 100)).toFixed(3))
          : null;
    } else {
      khoiLuongQuyKhoNhap = toNum(row.khoiLuongQuyKhoNhap);
    }

    return {
      ...row,
      doAm,
      khoiLuongQuyKhoNhap,
      khoiLuongXuat: khoiLuongNhap,
      khoiLuongQuyKhoXuat: khoiLuongQuyKhoNhap,
    };
  });

const TaoPhieuDieuChinh = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_PhieuDieuChinh as any;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const currentUserInfo = useMemo(() => getUserInfo(), []);

  const getCapDuyet = useCallback((sig: any) => sig?.capDuyet ?? sig?.capduyet ?? 0, []);

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);

  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const table1Section = useMemo(
    () => config.layout.find((s: any) => s.sectionType === "table" && s.key === "table1"),
    [config.layout]
  );

  // ─── Danh mục NVL (LG_PhieuDieuChinh_NVL) ──────────────────────────────────
  const [nvlOptions, setNvlOptions] = useState<LGPhieuDieuChinhNvlDto[]>([]);
  const [nvlModalOpen, setNvlModalOpen] = useState(false);
  const [nvlLoading, setNvlLoading] = useState(false);
  const [nvlEditingId, setNvlEditingId] = useState<number | null>(null);
  const [nvlForm] = Form.useForm();

  const loadNvlOptions = useCallback(async () => {
    try {
      const res = await phieuDieuChinhApi.getNvlList(true);
      setNvlOptions(Array.isArray(res) ? res : []);
    } catch {
      setNvlOptions([]);
    }
  }, []);

  useEffect(() => {
    loadNvlOptions();
  }, [loadNvlOptions]);

  // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — khóa ô lại khi Trước ẩm,
  // xử lý ngay trong trang này qua custom render (không sửa CustomFormTable dùng chung).
  const handleDoAmChange = useCallback((rowKey: string | undefined, value: string) => {
    setTableData((prev) =>
      recomputeRows(prev.map((r) => (r.key === rowKey ? { ...r, doAm: value } : r)))
    );
  }, []);

  const tableColumns = useMemo(() => {
    // Select lưu thẳng ID (value = id, label = tên) — không lưu tên NVL chi tiết riêng.
    const nvlSelectOptions = nvlOptions.map((n) => ({ label: n.tenNVL, value: n.id }));
    return (table1Section?.columns ?? []).map((col: any) => {
      if (col.key === "khoiLuongQuyKhoXuat" && col.key === "khoiLuongXuat") {
        return {
          ...col,
          disabled: true,
        };
      }
      // "Tên NVL chi tiết" chọn từ danh mục LG_PhieuDieuChinh_NVL — cột "Tên NVL" (từ BBGN)
      // giữ nguyên gõ tự do, không đụng vào.
      if (col.dataIndex === "idNVLChiTiet") {
        return { ...col, options: nvlSelectOptions };
      }
      // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — dùng type "index" để tự
      // render Input riêng (CustomFormTable không hỗ trợ khóa ô theo từng dòng).
      if (col.dataIndex === "doAm") {
        return {
          ...col,
          type: "index",
          render: (value: any, record: TableRow) => {
            const disabled = String(record.loaiSoDieuChinh) === "1";
            return (
              <Input
                value={value ?? ""}
                disabled={disabled || isFormLocked}
                onChange={(e) => handleDoAmChange(record.key, e.target.value)}
                style={disabled ? { backgroundColor: "#f5f5f5" } : undefined}
              />
            );
          },
        };
      }

      return col;
    }) as FormColumnDef[];
  }, [table1Section, nvlOptions, handleDoAmChange, isFormLocked]);

  // ─── Quản lý NVL: thêm/sửa/xóa ─────────────────────────────────────────────
  const handleOpenNvlManager = useCallback(() => {
    nvlForm.resetFields();
    setNvlEditingId(null);
    setNvlModalOpen(true);
  }, [nvlForm]);

  const handleEditNvl = useCallback(
    (record: LGPhieuDieuChinhNvlDto) => {
      setNvlEditingId(record.id);
      nvlForm.setFieldsValue({ tenNVL: record.tenNVL });
    },
    [nvlForm]
  );

  const handleCancelEditNvl = useCallback(() => {
    setNvlEditingId(null);
    nvlForm.resetFields();
  }, [nvlForm]);

  const handleSaveNvl = useCallback(async () => {
    try {
      const values = await nvlForm.validateFields();
      setNvlLoading(true);
      if (nvlEditingId) {
        await phieuDieuChinhApi.updateNvl(nvlEditingId, values.tenNVL.trim(), true);
        message.success("Đã cập nhật NVL");
      } else {
        await phieuDieuChinhApi.createNvl(values.tenNVL.trim());
        message.success("Đã thêm NVL mới");
      }
      nvlForm.resetFields();
      setNvlEditingId(null);
      await loadNvlOptions();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi lưu NVL");
    } finally {
      setNvlLoading(false);
    }
  }, [nvlForm, nvlEditingId, loadNvlOptions]);

  const handleDeleteNvl = useCallback(
    async (id: number) => {
      try {
        await phieuDieuChinhApi.deleteNvl(id);
        message.success("Đã xóa NVL");
        await loadNvlOptions();
      } catch {
        message.error("Lỗi khi xóa NVL");
      }
    },
    [loadNvlOptions]
  );

  // Tải dữ liệu nguồn từ BBGN (Ngày/Ca/Kíp) để làm nháp ban đầu cho bảng chi tiết —
  // người dùng có thể chỉnh sửa lại (đổi phòng ban/xưởng xuất-nhập, KL...) trước khi Lưu.
  const handleLoadFromBBGN = useCallback(async () => {
    const ngayValue = form.getFieldValue("NgaySX");
    const ca = form.getFieldValue("ca");
    const kip = form.getFieldValue("kip");
    if (!ngayValue) {
      message.warning("Vui lòng chọn Ngày trước khi tải dữ liệu nguồn");
      return;
    }
    try {
      setLoading(true);
      const ngay = ngayValue?.format ? ngayValue.format("YYYY-MM-DD") : String(ngayValue);
      const res = await phieuDieuChinhApi.getBBGN({ ngay, ca: ca ? Number(ca) : undefined, kip: kip || undefined });
      const rows = (Array.isArray(res) ? res : []).map((r, idx) => ({
        key: `bbgn-${r.idCtBBGN ?? idx}`,
        idNVL: r.idVatTu ?? null,
        tenNVL: r.tenVatTu ?? "",
        // Dữ liệu từ BBGN mặc định là Loại điều chỉnh "Nhập - Xuất" (value 1)
        loaiDieuChinh: 1,
        // Tên NVL chi tiết (idNVLChiTiet) là giá trị người dùng tự chọn từ danh mục
        // LG_PhieuDieuChinh_NVL, không có sẵn trong BBGN.
        idNVLChiTiet: null,
        idNhomNVL: null,
        dvt: "",
        maLo: r.maLo ?? "",
        thuTu: idx + 1,
        // Phòng ban/Xưởng Giao-Nhận lấy tên thật từ SP_Get_BBGN (đã join Tbl_Xuong/Tbl_PhongBan).
        // Khối lượng, KL quy khô (Xuất/Nhập) và Độ ẩm là giá trị điều chỉnh — không lấy từ
        // BBGN, người dùng tự nhập tay trước khi Lưu rồi mới insert vào LG_PhieuDieuChinh_ChiTiet.
        phongBanXuat: r.tenPhongBanGiao ?? "",
        xuongXuat: r.tenXuongGiao ?? "",
        khoiLuongXuat: null,
        khoiLuongQuyKhoXuat: null,
        phongBanNhap: r.tenPhongBanNhan ?? "",
        xuongNhap: r.tenXuongNhan ?? "",
        khoiLuongNhap: null,
        khoiLuongQuyKhoNhap: null,
        doAm: null,
        viTri: "",
        phanLoai: "",
        ghiChu: r.ghiChu ?? "",
      }));
      setTableData(rows);
      if (rows.length > 0) {
        message.success(`Đã tải ${rows.length} dòng dữ liệu nguồn từ BBGN`);
      } else {
        message.info("Không có dữ liệu BBGN cho Ngày/Ca/Kíp đã chọn");
      }
    } catch {
      message.error("Không thể tải dữ liệu nguồn BBGN");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";

      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          ((res as any)?.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) => getCapDuyet(s) === pd.capDuyet && s.type === "selectNguoiKy"
            );
            if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
          });

          const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          form.setFieldsValue({
            ...data,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => getCapDuyet(sig) === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          // Nguồn sự thật của bảng chi tiết là LG_PhieuDieuChinh_ChiTiet — fallback về
          // table1 trong jsonData nếu phiếu chưa từng lưu chi tiết (mới tạo, chưa bấm Lưu).
          try {
            const chiTietRes = await phieuDieuChinhApi.getChiTiet(idPhieu);
            const chiTiet = Array.isArray(chiTietRes) ? chiTietRes : [];
            if (chiTiet.length > 0) {
              setTableData(
                chiTiet.map((c, idx) => ({
                  key: `ct-${c.id ?? idx}`,
                  idNVL: c.idNVL,
                  tenNVL: c.tenNVL,
                  idNVLChiTiet: c.idNVLChiTiet,
                  idNhomNVL: c.idNhomNVL,
                  dvt: c.dvt,
                  maLo: c.maLo,
                  thuTu: c.thuTu ?? idx + 1,
                  loaiDieuChinh: c.loaiDieuChinh,
                  loaiSoDieuChinh: c.loaiSoDieuChinh,
                  phongBanXuat: c.phongBanXuat,
                  xuongXuat: c.xuongXuat,
                  khoiLuongXuat: c.khoiLuongXuat,
                  khoiLuongQuyKhoXuat: c.khoiLuongQuyKhoXuat,
                  phongBanNhap: c.phongBanNhap,
                  xuongNhap: c.xuongNhap,
                  khoiLuongNhap: c.khoiLuongNhap,
                  khoiLuongQuyKhoNhap: c.khoiLuongQuyKhoNhap,
                  doAm: c.doAm,
                  viTri: c.viTri,
                  phanLoai: c.phanLoai,
                  ghiChu: c.ghiChu,
                }))
              );
            } else {
              setTableData(data.table1 || []);
            }
          } catch {
            setTableData(data.table1 || []);
          }

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });
        }
      } else {
        setPhieuInfo({});
        setTableData([]);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig: any) => getCapDuyet(sig) === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo, getCapDuyet]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();

    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: getCapDuyet(s),
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const processedTable1 = renumberThuTu(tableData).map((row) => {
      const r = { ...row };
      delete r.key;
      return r;
    });

    const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });

    return {
      ...formData,
      ...formattedDates,
      ca: formData.ca != null ? Number(formData.ca) : null,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [form, config, tableData, getCapDuyet]);

  // Ghi đè toàn bộ chi tiết vào LG_PhieuDieuChinh_ChiTiet sau khi BmPhieu (header) đã lưu —
  // gọi lại từ phieuActionService (customPutApi) mỗi lần bấm Lưu/Gửi.
  const saveChiTiet = useCallback(async (phieuId: string, formDataParam: Record<string, unknown>) => {
    const userInfo = getUserInfo();
    const items = ((formDataParam.table1 as TableRow[]) || []).map((row) => ({
      idNVL: row.idNVL ?? null,
      tenNVL: row.tenNVL ?? "",
      idNVLChiTiet: row.idNVLChiTiet != null && row.idNVLChiTiet !== "" ? Number(row.idNVLChiTiet) : null,
      idNhomNVL: row.idNhomNVL ?? null,
      dvt: row.dvt ?? null,
      maLo: row.maLo ?? null,
      thuTu: row.thuTu ?? null,
      loaiDieuChinh: row.loaiDieuChinh != null && row.loaiDieuChinh !== "" ? Number(row.loaiDieuChinh) : null,
      loaiSoDieuChinh: row.loaiSoDieuChinh != null && row.loaiSoDieuChinh !== "" ? Number(row.loaiSoDieuChinh) : null,
      phongBanXuat: row.phongBanXuat ?? null,
      xuongXuat: row.xuongXuat ?? null,
      khoiLuongXuat: row.khoiLuongXuat != null && row.khoiLuongXuat !== "" ? Number(row.khoiLuongXuat) : null,
      khoiLuongQuyKhoXuat:
        row.khoiLuongQuyKhoXuat != null && row.khoiLuongQuyKhoXuat !== "" ? Number(row.khoiLuongQuyKhoXuat) : null,
      phongBanNhap: row.phongBanNhap ?? null,
      xuongNhap: row.xuongNhap ?? null,
      khoiLuongNhap: row.khoiLuongNhap != null && row.khoiLuongNhap !== "" ? Number(row.khoiLuongNhap) : null,
      khoiLuongQuyKhoNhap:
        row.khoiLuongQuyKhoNhap != null && row.khoiLuongQuyKhoNhap !== "" ? Number(row.khoiLuongQuyKhoNhap) : null,
      doAm: row.doAm != null && row.doAm !== "" ? Number(row.doAm) : null,
      viTri: row.viTri ?? null,
      phanLoai: row.phanLoai ?? null,
      ghiChu: row.ghiChu ?? null,
    }));

    await phieuDieuChinhApi.saveChiTiet(phieuId, items, userInfo?.hoVaTen ?? userInfo?.tenDangNhap ?? null);
  }, []);

  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error: any) {
      message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái");
    }
  }, [form]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieudieuchinh/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

  const actionButtons = useMemo(() => {
    const userInfo = getUserInfo();
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
      customPutApi: saveChiTiet,
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [idphieu, phieuInfo, getFormData, saveChiTiet, handleStatusChange, handleActionSuccess, config.code]);
  const handleTableDataChange = useCallback((rows: TableRow[]) => {
    setTableData(recomputeRows(rows));
  }, []);
  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>{config.title}</Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden><Input type="hidden" /></Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {config.headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleLoadFromBBGN}
            disabled={isFormLocked}
            loading={loading}
          >
            Tải dữ liệu nguồn
          </Button>
          <Button icon={<SettingOutlined />} onClick={handleOpenNvlManager}>
            Quản lý NVL
          </Button>
          {actionButtons}
        </div>

        <Modal
          title="Quản lý danh mục NVL"
          open={nvlModalOpen}
          onCancel={() => setNvlModalOpen(false)}
          footer={<Button onClick={() => setNvlModalOpen(false)}>Đóng</Button>}
          width={520}
          destroyOnClose
        >
          <Form form={nvlForm} layout="inline" style={{ marginBottom: 12 }} onFinish={handleSaveNvl}>
            <Form.Item
              name="tenNVL"
              rules={[{ required: true, message: "Nhập tên NVL" }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input placeholder="Tên NVL" maxLength={255} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={nvlLoading}>
                  {nvlEditingId ? "Cập nhật" : "Thêm"}
                </Button>
                {nvlEditingId && <Button onClick={handleCancelEditNvl}>Hủy</Button>}
              </Space>
            </Form.Item>
          </Form>
          <Table
            size="small"
            bordered
            rowKey="id"
            dataSource={nvlOptions}
            pagination={nvlOptions.length > 10 ? { pageSize: 10 } : false}
            columns={[
              { title: "Tên NVL", dataIndex: "tenNVL" },
              {
                title: "",
                key: "action",
                width: 90,
                align: "center" as const,
                render: (_: unknown, record: LGPhieuDieuChinhNvlDto) => (
                  <Space size={4}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditNvl(record)} />
                    <Popconfirm
                      title="Xóa NVL này?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => handleDeleteNvl(record.id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Modal>

        {table1Section && (
          <div>
            {table1Section.title && (
              <Typography.Title level={5} style={{ marginTop: 4, marginBottom: 2 }}>
                {table1Section.title}
              </Typography.Title>
            )}
            {/* Giới hạn bảng trong khung riêng — cuộn ngang/dọc chỉ diễn ra bên trong bảng,
                không kéo giãn/cuộn theo cả trang. */}
            <div style={{ maxWidth: "100%", overflow: "auto" }}>
              <CustomFormTable
                columns={tableColumns}
                initialData={tableData}
                //onDataChange={(rows) => setTableData(rows as TableRow[])}
                onDataChange={handleTableDataChange}
                loading={loading}
                editable={!isFormLocked}
                showAddButton={!isFormLocked}
                showDeleteButton={!isFormLocked}
                minRows={0}
                scrollY={600}
                showPlaceholder={false}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {config.signatures?.map((sig: any, i: number) => {
            const capDuyet = getCapDuyet(sig);
            const isLevelZero = capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === capDuyet);

            return (
              <Space key={sig.key || i} direction="vertical" align="center">
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <Typography.Text type="secondary">
                    {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                  </Typography.Text>
                )}
              </Space>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuDieuChinh;
