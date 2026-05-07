/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_TonSiLo from "../../../utils/BM_config/LG_BB_TonSiLo.json";
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { FilterOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  lgTSLNvlApi,
  lgTSLSiLoApi,
  lgTSLMappingApi,
  lgTSLSiLoMappingViewApi,
  type LGTSLNvlDto,
  type LGTSLSiLoDto,
  type LGTSLMappingDto,
} from "../../../services/LGTSLApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

interface LoCaoItem {
  id: number;
  tenLoCao: string;
}

const TaoPhieuTonSiLo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_BB_TonSiLo;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loCaoOptions, setLoCaoOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  const scope = Form.useWatch("scope", form);
  const ca = Form.useWatch("ca", form);
  Form.useWatch("NgaySX", form);

  // ─── Kiểm tra Silo state ───────────────────────────────────────────────────
  const [kiemTraOpen, setKiemTraOpen] = useState(false);
  const [kiemTraData, setKiemTraData] = useState<LGTSLMappingDto[]>([]);
  const [kiemTraLoading, setKiemTraLoading] = useState(false);
  const [nvlOptions, setNvlOptions] = useState<LGTSLNvlDto[]>([]);
  const [siloOptions, setSiloOptions] = useState<LGTSLSiLoDto[]>([]);
  const [mapDraftBySilo, setMapDraftBySilo] = useState<Record<number, number | null>>({});
  const [mapNoteBySilo, setMapNoteBySilo] = useState<Record<number, string>>({});
  const [mapSavingSiloId, setMapSavingSiloId] = useState<number | null>(null);

  // ─── Thêm/Sửa NVL state ───────────────────────────────────────────────────
  const [addNvlOpen, setAddNvlOpen] = useState(false);
  const [addNvlLoading, setAddNvlLoading] = useState(false);
  const [addNvlForm] = Form.useForm();
  const [editingNvlId, setEditingNvlId] = useState<number | null>(null);
  const [nvlListLoading, setNvlListLoading] = useState(false);

  // ─── Thêm Mapping mới state ────────────────────────────────────────────────
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [addMappingLoading, setAddMappingLoading] = useState(false);
  const [addMappingForm] = Form.useForm();

  const scopeNvlOptions = useMemo(
    () => (scope ? nvlOptions.filter((n) => n.idLoCao === Number(scope)) : nvlOptions),
    [nvlOptions, scope]
  );

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

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

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const loadDsLoCao = useCallback(async () => {
    try {
      const res = await PhieuApi.getDsLoCao();
      const options = (Array.isArray(res) ? res : [])
        .map((item: LoCaoItem) => ({ label: item.tenLoCao, value: item.id }))
        .filter((item) => Number.isFinite(item.value));
      setLoCaoOptions(options);
    } catch {
      setLoCaoOptions([]);
    }
  }, []);

  const loadDataFromAPI = useCallback(async () => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao"); return; }
    if (!ca) { message.warning("Vui lòng chọn Ca"); return; }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }
    try {
      setLoading(true);
      const ngayFormatted = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : ngaySXValue;
      const response = await lgTSLSiLoMappingViewApi.getList({
        idLoCao: Number(scope),
        ca: Number(ca),
        ngay: ngayFormatted,
      });
      const list = Array.isArray(response) ? response : (response as any)?.data ?? [];
      if (list.length > 0) {
        const sorted = [...list].sort((a: any, b: any) => (a.thuTu ?? 0) - (b.thuTu ?? 0));
        const rows = sorted.map((item: any, index: number) => ({
          key: item.idMapping ?? item.idSiLo ?? `row-${index}`,
          stt: index + 1,
          silo: item.tenSiLo ?? "",
          loaiNguyenNhienLieu: item.tenNVL ?? "",
          klTonCuoiKip: item.ton ?? null,
          ghiChu: item.ghiChu ?? "",
        }));
        setTableData(rows);
        message.success(`Tải dữ liệu thành công! Có ${rows.length} bản ghi`);
      } else {
        setTableData([]);
        message.info("Không có dữ liệu");
      }
    } catch {
      message.error("Không thể tải dữ liệu");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [scope, ca, form]);

  // ─── Kiểm tra Silo handlers ────────────────────────────────────────────────

  const refreshKiemTraData = useCallback(async (ngay: string, caNum: number, idLoCao: number) => {
    setKiemTraLoading(true);
    try {
      const res = await lgTSLMappingApi.getList({ ngay, ca: caNum, idLoCao });
      const list = Array.isArray(res) ? res : [];
      setKiemTraData(list);
      return list;
    } catch {
      message.error("Không thể tải dữ liệu mapping Silo");
      setKiemTraData([]);
      return [] as LGTSLMappingDto[];
    } finally {
      setKiemTraLoading(false);
    }
  }, []);

  const handleKiemTra = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước khi kiểm tra");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    setKiemTraOpen(true);
    const list = await refreshKiemTraData(ngay, Number(ca), Number(scope));
    const initDrafts: Record<number, number | null> = {};
    const initNotes: Record<number, string> = {};
    list.forEach((item) => {
      initDrafts[item.idSiLo] = item.idNVL ?? null;
      initNotes[item.idSiLo] = "";
    });
    setMapDraftBySilo(initDrafts);
    setMapNoteBySilo(initNotes);
    lgTSLNvlApi.getList({ idLoCao: Number(scope) })
      .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNvlOptions([]));
    lgTSLSiLoApi.getList({ idLoCao: Number(scope) })
      .then((res) => setSiloOptions(Array.isArray(res) ? res : []))
      .catch(() => setSiloOptions([]));
  }, [form, scope, ca, refreshKiemTraData]);

  const handleOpenAddNvl = useCallback(() => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao trước khi tạo NVL"); return; }
    addNvlForm.resetFields();
    addNvlForm.setFieldsValue({ idLoCao: Number(scope) });
    setEditingNvlId(null);
    setAddNvlOpen(true);
  }, [scope, addNvlForm]);

  const handleOpenEditNvl = useCallback((nvl: LGTSLNvlDto) => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao trước khi sửa NVL"); return; }
    addNvlForm.resetFields();
    addNvlForm.setFieldsValue({
      tenNVL: nvl.tenNVL,
    });
    setEditingNvlId(nvl.id);
    setAddNvlOpen(true);
  }, [scope, addNvlForm]);

  const handleSaveNvl = useCallback(async () => {
    try {
      const values = await addNvlForm.validateFields();
      setAddNvlLoading(true);
      
      if (editingNvlId) {
        // Update mode - only send tenNVL
        await lgTSLNvlApi.update(editingNvlId, {
          idLoCao: Number(scope),
          tenNVL: values.tenNVL?.trim(),
        });
        message.success("Đã cập nhật NVL");
      } else {
        // Create mode
        await lgTSLNvlApi.create({
          idLoCao: Number(scope),
          tenNVL: values.tenNVL?.trim(),
          tenNVLTk: values.tenNVLTk?.trim() || null,
          ghiChu: values.ghiChu?.trim() || null,
          xacNhan: false,
        });
        message.success("Đã thêm NVL mới");
      }
      
      const res = await lgTSLNvlApi.getList({ idLoCao: Number(scope) });
      setNvlOptions(Array.isArray(res) ? res : []);
      setAddNvlOpen(false);
      setEditingNvlId(null);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(editingNvlId ? "Lỗi khi cập nhật NVL" : "Lỗi khi tạo NVL mới");
    } finally {
      setAddNvlLoading(false);
    }
  }, [addNvlForm, scope, editingNvlId]);

  const handleDeleteNvl = useCallback(async (nvlId: number) => {
    Modal.confirm({
      title: "Xác nhận xóa NVL",
      content: "Bạn có chắc chắn muốn xóa NVL này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await lgTSLNvlApi.delete(nvlId);
          const res = await lgTSLNvlApi.getList({ idLoCao: Number(scope) });
          setNvlOptions(Array.isArray(res) ? res : []);
          message.success("Đã xóa NVL");
        } catch {
          message.error("Lỗi khi xóa NVL");
        }
      },
    });
  }, [scope]);

  const loadNvlList = useCallback(async () => {
    if (!scope) {
      message.warning("Vui lòng chọn Lò cao trước");
      return;
    }
    try {
      setNvlListLoading(true);
      const res = await lgTSLNvlApi.getList({ idLoCao: Number(scope) });
      setNvlOptions(Array.isArray(res) ? res : []);
      message.success(`Tải danh sách NVL thành công! Có ${scopeNvlOptions.length} mục`);
    } catch {
      message.error("Không thể tải danh sách NVL");
      setNvlOptions([]);
    } finally {
      setNvlListLoading(false);
    }
  }, [scope, scopeNvlOptions.length]);

  const handleCreateNvl = useCallback(async () => {
    try {
      const values = await addNvlForm.validateFields();
      setAddNvlLoading(true);
      await lgTSLNvlApi.create({
        idLoCao: Number(scope),
        tenNVL: values.tenNVL?.trim(),
        tenNVLTk: values.tenNVLTk?.trim() || null,
        ghiChu: values.ghiChu?.trim() || null,
        xacNhan: false,
      });
      const res = await lgTSLNvlApi.getList({ idLoCao: Number(scope) });
      setNvlOptions(Array.isArray(res) ? res : []);
      setAddNvlOpen(false);
      message.success("Đã thêm NVL mới");
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi tạo NVL mới");
    } finally {
      setAddNvlLoading(false);
    }
  }, [addNvlForm, scope]);

  const handleOpenAddMapping = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước");
      return;
    }
    try {
      const res = await lgTSLSiLoApi.getList({ idLoCao: Number(scope) });
      setSiloOptions(Array.isArray(res) ? res : []);
    } catch {
      setSiloOptions([]);
    }
    const ngaySXDisplay = form.getFieldValue("NgaySX");
    const ngayDisplay = ngaySXDisplay?.format
      ? ngaySXDisplay.format("DD/MM/YYYY")
      : String(ngaySXDisplay ?? "");
    addMappingForm.resetFields();
    addMappingForm.setFieldsValue({
      ngay: ngayDisplay,
      ca: Number(ca),
      idLoCao: Number(scope),
    });
    setAddMappingOpen(true);
  }, [form, scope, ca, addMappingForm]);

  const handleAddMapping = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      const values = await addMappingForm.validateFields();
      setAddMappingLoading(true);
      await lgTSLMappingApi.create({
        ngay,
        ca: Number(ca),
        idLoCao: Number(scope),
        idSiLo: values.idSiLo,
        idNVL: Number(values.idNVL),
        ghiChu: values.ghiChu?.trim() || null,
      });
      message.success("Thêm mapping thành công");
      setAddMappingOpen(false);
      const refreshed = await refreshKiemTraData(ngay, Number(ca), Number(scope));
      const nextDrafts: Record<number, number | null> = {};
      const nextNotes: Record<number, string> = {};
      refreshed.forEach((item) => {
        nextDrafts[item.idSiLo] = item.idNVL ?? null;
        nextNotes[item.idSiLo] = "";
      });
      setMapDraftBySilo(nextDrafts);
      setMapNoteBySilo(nextNotes);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi thêm mapping");
    } finally {
      setAddMappingLoading(false);
    }
  }, [addMappingForm, form, scope, ca, refreshKiemTraData]);

  const handleMapSiloNVL = useCallback(async (row: LGTSLMappingDto) => {
    const idNVL = mapDraftBySilo[row.idSiLo];
    if (!idNVL) { message.warning("Vui lòng chọn NVL trước khi lưu mapping"); return; }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      setMapSavingSiloId(row.idSiLo);
      const payload = {
        ngay,
        ca: Number(ca),
        idLoCao: Number(scope),
        idSiLo: row.idSiLo,
        idNVL,
        ghiChu: (mapNoteBySilo[row.idSiLo] ?? "").trim() || null,
      };
      // Mapping đã tồn tại → update, chưa có → create mới qua addMapping
      await lgTSLMappingApi.update(row.id, payload);
      message.success(`Đã cập nhật mapping cho ${row.tenSiLo ?? "Silo"}`);
      const refreshed = await refreshKiemTraData(ngay, Number(ca), Number(scope));
      const nextDrafts: Record<number, number | null> = {};
      const nextNotes: Record<number, string> = {};
      refreshed.forEach((item) => {
        nextDrafts[item.idSiLo] = item.idNVL ?? null;
        nextNotes[item.idSiLo] = "";
      });
      setMapDraftBySilo(nextDrafts);
      setMapNoteBySilo(nextNotes);
    } catch {
      message.error("Lỗi khi lưu mapping Silo - NVL");
    } finally {
      setMapSavingSiloId(null);
    }
  }, [mapDraftBySilo, mapNoteBySilo, form, scope, ca, refreshKiemTraData]);

  // ─── Init & form logic (không thay đổi) ───────────────────────────────────

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
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
            });
          } else {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
              );
              if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
            });
          }

          const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((fieldKey: string) => {
            if (data[fieldKey]) {
              const parsed = dayjs(data[fieldKey]);
              parsedDates[fieldKey] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          const formValues = {
            ...data,
            locao: data.locao ?? data.loCao ?? data.scope ?? null,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };
          form.setFieldsValue(formValues);

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures.filter((sig: any) => sig.capDuyet === 0).forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          setTableData(
            (formValues.table1 || []).map((row: any, index: number) => ({ ...row, stt: row.stt || index + 1 }))
          );
          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
            idPhieuGoc:
              (res as any)?.idPhieuGoc ??
              (res as any)?.iD_PhieuGoc ??
              (res as any)?.ID_PhieuGoc ??
              null,
          });
        }
      } else {
        setPhieuInfo({});
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures.filter((sig: any) => sig.capDuyet === 0).forEach((sig: any) => {
            overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
          });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          if (tableData.length === 0) setTableData([{ key: "row-0", stt: 1 }]);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo, tableData.length]);

  useEffect(() => { initData(); }, [initData]);
  useEffect(() => { loadDsLoCao(); }, [loadDsLoCao]);

  const headerFields = useMemo(() => {
    return config.headerFields.map((field: any) => {
      if (field.key !== "scope") return field;
      return { ...field, options: loCaoOptions.length > 0 ? loCaoOptions : field.options || [], placeholder: "Chọn lò cao" };
    });
  }, [config.headerFields, loCaoOptions]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();
    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));
    const processedTable1 = tableData.map((row, index) => {
      const r = { ...row };
      delete r._isNewRow;
      delete r.key;
      r.stt = index + 1;
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
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [getUserInfo, form, config, tableData]);

  const handleStatusChange = useCallback(async () => {
    try { await form.validateFields(); }
    catch (error: any) { message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái"); }
  }, [form]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieubienbantonsilolocao/${context.newPhieuId}`, { replace: true });
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
      pheDuyet: phieuInfo.pheDuyet ?? [],
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  const tableSection = config.layout.find(
    (section: any) => section.sectionType === "table" && section.key === "table1"
  );
  const summaryColumns = useMemo(
    () => (tableSection?.summary?.columns as string[] | undefined) || [],
    [tableSection]
  );

  const ngaySXWatch = form.getFieldValue("NgaySX");

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>{config.title}</Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>
        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div><b>{config.isoInfo.code}</b></div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {(config.isoInfo as any).revision || "-"}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden><Input type="hidden" /></Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button type="primary" icon={<FilterOutlined />} onClick={loadDataFromAPI} disabled={isFormLocked} loading={loading}>
            Tải dữ liệu
          </Button>
          <Button icon={<SearchOutlined />} onClick={handleKiemTra}>
            Kiểm tra Silo
          </Button>
          {actionButtons}
        </div>

        {/* ── Modal: Kiểm tra Silo ─────────────────────────────────────────── */}
        <Modal
          title="Kiểm tra Silo - Lò cao"
          open={kiemTraOpen}
          onCancel={() => setKiemTraOpen(false)}
          footer={<Button onClick={() => setKiemTraOpen(false)}>Đóng</Button>}
          width={960}
          destroyOnClose
        >
          <Space style={{ marginBottom: 12 }} wrap>
            <Tag color="blue">Ngày: {ngaySXWatch ? dayjs(ngaySXWatch).format("DD/MM/YYYY") : "—"}</Tag>
            <Tag color="green">Ca: {ca ? `Ca ${ca}` : "—"}</Tag>
            <Tag color="purple">Lò cao: {loCaoOptions.find((o) => o.value === Number(scope))?.label ?? scope ?? "—"}</Tag>
          </Space>

          <Tabs
            items={[
              {
                key: "trang-thai",
                label: "Trạng thái Silo",
                children: (
                  <Table
                    size="small"
                    bordered
                    loading={kiemTraLoading}
                    dataSource={kiemTraData}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: "STT", key: "stt", width: 50, align: "center",
                        render: (_v: unknown, _r: unknown, i: number) => i + 1,
                      },
                      {
                        title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo",
                        render: (v: string | null) => v ?? "—",
                      },
                      {
                        title: "NVL đang chứa", dataIndex: "tenNVL", key: "tenNVL",
                        render: (v: string | null) =>
                          v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>,
                      },
                      {
                        title: "Ngày", dataIndex: "ngay", key: "ngay", width: 110, align: "center",
                        render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "—",
                      },
                      {
                        title: "Ca", dataIndex: "ca", key: "ca", width: 60, align: "center",
                        render: (v: number) => `Ca ${v}`,
                      },
                      {
                        title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu",
                        render: (v: string | null) => v ?? "",
                      },
                    ]}
                  />
                ),
              },
              {
                key: "map-nvl",
                label: "Map NVL vào Silo",
                children: (
                  <>
                    <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddNvl}>
                        Thêm NVL mới
                      </Button>
                      <Button icon={<PlusOutlined />} onClick={handleOpenAddMapping}>
                        Thêm Mapping mới
                      </Button>
                      <span style={{ color: "#666", alignSelf: "center" }}>
                        NVL thuộc lò cao đang chọn: {scopeNvlOptions.length} mục
                      </span>
                    </div>
                    <Table
                      size="small"
                      bordered
                      loading={kiemTraLoading}
                      dataSource={kiemTraData}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        {
                          title: "STT", key: "stt", width: 50, align: "center",
                          render: (_v: unknown, _r: unknown, i: number) => i + 1,
                        },
                        {
                          title: "Silo", dataIndex: "tenSiLo", key: "tenSiLo", width: 160,
                          render: (v: string | null) => v ?? "—",
                        },
                        {
                          title: "NVL hiện tại", dataIndex: "tenNVL", key: "tenNVL", width: 200,
                          render: (v: string | null) =>
                            v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>,
                        },
                        {
                          title: "NVL map mới",
                          key: "nvlMoi",
                          render: (_v: unknown, row: LGTSLMappingDto) => (
                            <Select
                              style={{ width: "100%" }}
                              placeholder="Chọn NVL"
                              showSearch
                              optionFilterProp="children"
                              value={mapDraftBySilo[row.idSiLo] ?? undefined}
                              onChange={(value) =>
                                setMapDraftBySilo((prev) => ({ ...prev, [row.idSiLo]: value ?? null }))
                              }
                            >
                              {scopeNvlOptions.map((n) => (
                                <Select.Option key={n.id} value={n.id}>
                                  [{n.id}] {n.tenNVL}
                                </Select.Option>
                              ))}
                            </Select>
                          ),
                        },
                        {
                          title: "Ghi chú",
                          key: "ghiChu",
                          width: 200,
                          render: (_v: unknown, row: LGTSLMappingDto) => (
                            <Input
                              placeholder="Nhập ghi chú (nếu có)"
                              value={mapNoteBySilo[row.idSiLo] ?? ""}
                              onChange={(e) =>
                                setMapNoteBySilo((prev) => ({ ...prev, [row.idSiLo]: e.target.value }))
                              }
                            />
                          ),
                        },
                        {
                          title: "", key: "action", width: 110, align: "center",
                          render: (_v: unknown, row: LGTSLMappingDto) => (
                            <Button
                              type="primary"
                              size="small"
                              loading={mapSavingSiloId === row.idSiLo}
                              onClick={() => handleMapSiloNVL(row)}
                            >
                              Lưu map
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                key: "danh-sach-nvl",
                label: "Danh sách NVL",
                children: (
                  <>
                    <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddNvl}>
                        Thêm NVL mới
                      </Button>
                      <Button onClick={loadNvlList} loading={nvlListLoading}>
                        Tải danh sách
                      </Button>
                      <span style={{ color: "#666", alignSelf: "center" }}>
                        Tổng: <b>{scopeNvlOptions.length}</b> mục
                      </span>
                    </div>
                    <Table
                      size="small"
                      bordered
                      loading={nvlListLoading}
                      dataSource={scopeNvlOptions}
                      rowKey="id"
                      pagination={scopeNvlOptions.length > 10 ? { pageSize: 10 } : false}
                      columns={[
                        {
                          title: "STT",
                          key: "stt",
                          width: 50,
                          align: "center",
                          render: (_v: unknown, _r: unknown, i: number) => i + 1,
                        },
                        {
                          title: "Tên NVL",
                          dataIndex: "tenNVL",
                          key: "tenNVL",
                          render: (v: string | null) => v ?? "—",
                        },
                        {
                          title: "Tên NVL P.KH",
                          dataIndex: "tenNVLTk",
                          key: "tenNVLTk",
                          render: (v: string | null) => v ?? "—",
                        },
                        {
                          title: "Ghi chú",
                          dataIndex: "ghiChu",
                          key: "ghiChu",
                          render: (v: string | null) => v ?? "—",
                        },
                        {
                          title: "Thao tác",
                          key: "action",
                          width: 150,
                          align: "center",
                          render: (_v: unknown, record: LGTSLNvlDto) => (
                            <Space size="small">
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => handleOpenEditNvl(record)}
                              >
                                Sửa
                              </Button>
                              <Button
                                danger
                                size="small"
                                onClick={() => handleDeleteNvl(record.id)}
                              >
                                Xóa
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
            ]}
          />
        </Modal>

        {/* ── Modal: Thêm/Sửa NVL ──────────────────────────────────────────── */}
        <Modal
          title={editingNvlId ? "Sửa nguyên vật liệu" : "Thêm nguyên vật liệu"}
          open={addNvlOpen}
          onOk={handleSaveNvl}
          onCancel={() => {
            setAddNvlOpen(false);
            setEditingNvlId(null);
          }}
          confirmLoading={addNvlLoading}
          okText={editingNvlId ? "Cập nhật" : "Lưu NVL"}
          cancelText="Hủy"
          destroyOnClose
          width={520}
        >
          <Form form={addNvlForm} layout="vertical" style={{ marginTop: 16 }}>
            {!editingNvlId && (
              <Form.Item name="idLoCao" label="Lò cao">
                <Select disabled>
                  <Select.Option value={Number(scope)}>
                    {loCaoOptions.find((o) => o.value === Number(scope))?.label ?? scope}
                  </Select.Option>
                </Select>
              </Form.Item>
            )}
            <Form.Item
              name="tenNVL"
              label="Tên NVL"
              rules={[{ required: true, message: "Nhập tên NVL" }]}
            >
              <Input maxLength={200} placeholder="Nhập tên NVL" />
            </Form.Item>
            {!editingNvlId && (
              <>
                <Form.Item name="tenNVLTk" label="Tên NVL P.KH">
                  <Input maxLength={200} placeholder="Tên NVL phòng kế hoạch (nếu có)" />
                </Form.Item>
                <Form.Item name="ghiChu" label="Ghi chú">
                  <Input.TextArea rows={2} maxLength={500} placeholder="Nhập ghi chú (nếu có)" />
                </Form.Item>
              </>
            )}
          </Form>
        </Modal>

        {/* ── Modal: Thêm Mapping mới ──────────────────────────────────────── */}
        <Modal
          title="Thêm Mapping NVL vào Silo"
          open={addMappingOpen}
          onOk={handleAddMapping}
          onCancel={() => setAddMappingOpen(false)}
          confirmLoading={addMappingLoading}
          okText="Thêm"
          cancelText="Hủy"
          destroyOnClose
          width={520}
        >
          <Form form={addMappingForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="ngay" label="Ngày">
              <Input disabled />
            </Form.Item>
            <Form.Item name="ca" label="Ca">
              <Select disabled>
                <Select.Option value={1}>Ca 1</Select.Option>
                <Select.Option value={2}>Ca 2</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="idSiLo"
              label="Silo"
              rules={[{ required: true, message: "Chọn Silo" }]}
            >
              <Select placeholder="Chọn Silo" showSearch optionFilterProp="children">
                {siloOptions.map((s) => (
                  <Select.Option key={s.id} value={s.id}>{s.tenSiLo}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="idNVL"
              label="NVL"
              rules={[{ required: true, message: "Chọn NVL" }]}
            >
              <Select placeholder="Chọn NVL" showSearch optionFilterProp="children">
                {scopeNvlOptions.map((n) => (
                  <Select.Option key={n.id} value={n.id}>[{n.id}] {n.tenNVL}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="ghiChu" label="Ghi chú">
              <Input.TextArea rows={2} maxLength={500} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Form>
        </Modal>

        {config.layout.map((layout: any, idx: number) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={tableSection?.columns || []}
                initialData={tableData}
                onDataChange={(rows) =>
                  setTableData(
                    (rows as TableRow[]).map((row, index) => ({ ...row, stt: index + 1 }))
                  )
                }
                addRowButtonText="+ Thêm dòng"
                minRows={1}
                loading={loading}
                editable={!isFormLocked}
                showAddButton={!isFormLocked}
                showDeleteButton={!isFormLocked}
                stickyHeader={true}
                scrollY={800}
                summary={(pageData) => {
                  const totals: Record<string, number> = {};
                  summaryColumns.forEach((field) => { totals[field] = 0; });
                  pageData.forEach((row: any) => {
                    summaryColumns.forEach((field) => { totals[field] += Number(row[field]) || 0; });
                  });
                  const totalValue = totals.klTonCuoiKip || 0;
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} colSpan={3} align="center">TỔNG CỘNG</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">{totalValue.toLocaleString("en-US")}</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        ))}

        {config.footerNotes?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Typography.Text strong style={{ fontStyle: "italic" }}>Ghi chú:</Typography.Text>
            {config.footerNotes.map((note: string, idx: number) => (
              <div key={`note-${idx}`} style={{ fontStyle: "italic" }}>- {note}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {config.signatures?.map((sig: any, i: number) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                    </Typography.Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuTonSiLo;
