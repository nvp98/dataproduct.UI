/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_TonSiLo from "../../../utils/BM_config/LG_BB_TonSiLo.json";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Tooltip, Typography, message } from "antd";
import { DeleteOutlined, FilterOutlined, PlusCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  lgTSLNvlApi,
  lgTSLSiLoApi,
  lgTSLMappingApi,
  lgTSLSiLoMappingViewApi,
  lgTSLChiTietApi,
  type LGTSLNvlDto,
  type LGTSLSiLoDto,
  type LGTSLMappingDto,
  type LGTSLChiTietDto,
} from "../../../services/LGTSLApi";

// Mỗi dòng trong bảng tồn Silo; các trường _splitGroupId/_isSplitParent dùng để nhóm dòng tách liệu
interface TableRow {
  key?: string;
  stt?: number;
  idSiLo?: number | null;
  idMapping?: number | null;
  idNVL?: number | null;
  thuTu?: number | null;
  silo?: string;
  loaiNguyenNhienLieu?: string;
  klTonCuoiKip?: number | string | null;
  ghiChu?: string;
  _splitGroupId?: string;   // id nhóm tách liệu; undefined = dòng bình thường
  _isSplitParent?: boolean; // true = hàng tổng của nhóm (chỉ hiển thị, không lưu)
  _manualKL?: boolean;      // true = người dùng đã nhập tay KL (highlight cam)
  _klGoc?: number | null;   // giá trị KL gốc từ SCADA (trước khi chỉnh tay)
  [key: string]: any;
}

interface LoCaoItem {
  id: number;
  tenLoCao: string;
}

// Lấy thông tin người dùng đang đăng nhập từ localStorage
const getUserInfo = () => {
  const stored = localStorage.getItem("userinfo");
  return stored ? JSON.parse(stored) : {};
};

const TaoPhieuTonSiLo = ({ useChiTietApi = false }: { useChiTietApi?: boolean }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_BB_TonSiLo;
  const [form] = Form.useForm();

  // ─── State chính của form/bảng ─────────────────────────────────────────────
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
  const ngaySXWatch = Form.useWatch("NgaySX", form);

  // ─── State panel "Kiểm tra Silo" ───────────────────────────────────────────
  const [kiemTraOpen, setKiemTraOpen] = useState(false);
  const [kiemTraData, setKiemTraData] = useState<LGTSLMappingDto[]>([]);
  const [kiemTraLoading, setKiemTraLoading] = useState(false);
  const [nvlOptions, setNvlOptions] = useState<LGTSLNvlDto[]>([]);
  const [siloOptions, setSiloOptions] = useState<LGTSLSiLoDto[]>([]);
  // mapDraftBySilo: { [idSiLo]: idNVL } — lựa chọn NVL tạm thời trước khi nhấn "Lưu map"
  const [mapDraftBySilo, setMapDraftBySilo] = useState<Record<number, number | null>>({});
  const [mapNoteBySilo, setMapNoteBySilo] = useState<Record<number, string>>({});
  const [mapSavingSiloId, setMapSavingSiloId] = useState<number | null>(null);

  // ─── State modal Thêm/Sửa NVL ──────────────────────────────────────────────
  const [addNvlOpen, setAddNvlOpen] = useState(false);
  const [addNvlLoading, setAddNvlLoading] = useState(false);
  const [addNvlForm] = Form.useForm();
  const [editingNvlId, setEditingNvlId] = useState<number | null>(null);
  const [nvlListLoading, setNvlListLoading] = useState(false);

  // ─── State modal Thêm Mapping mới ─────────────────────────────────────────
  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [addMappingLoading, setAddMappingLoading] = useState(false);
  const [addMappingForm] = Form.useForm();
  const [copyingFromPrev, setCopyingFromPrev] = useState(false);

  // Danh sách NVL đã lọc theo lò cao đang chọn (scope)
  const scopeNvlOptions = useMemo(
    () => (scope ? nvlOptions.filter((n) => n.idLoCao === Number(scope)) : nvlOptions),
    [nvlOptions, scope]
  );

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  // Chữ ký chỉ được chọn khi phiếu chưa hoàn thành / chưa phê duyệt / chưa chốt
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);

  // Form bị khóa khi phiếu không ở trạng thái đang lưu / đã thu hồi / hiệu chỉnh
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  // Đồng bộ lại mapDraftBySilo và mapNoteBySilo sau mỗi lần refresh kiemTraData
  const resetMappingDrafts = useCallback((list: LGTSLMappingDto[]) => {
    const drafts: Record<number, number | null> = {};
    const notes: Record<number, string> = {};
    list.forEach((item) => {
      drafts[item.idSiLo] = item.idNVL ?? null;
      notes[item.idSiLo] = "";
    });
    setMapDraftBySilo(drafts);
    setMapNoteBySilo(notes);
  }, []);

  // Lấy danh sách lò cao để điền vào dropdown scope
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

  // Tải dữ liệu SiLo-NVL vào bảng chính.
  // - Phiếu đã có: backend sync SCADA → merge ManualKL → lưu DB → FE đọc lại từ DB để giữ _manualKL.
  // - Phiếu mới: tải từ mapping view (SCADA) theo ngày/ca/lò cao từ form.
  const loadDataFromAPI = useCallback(async () => {
    try {
      setLoading(true);

      if (idphieu) {
        // Backend tự đọc NgaySX/Ca/Scope từ BmPhieu, lấy SCADA mới, merge ManualKL, lưu DB
        await lgTSLChiTietApi.syncChiTiet(idphieu);
        const chiTietList = await lgTSLChiTietApi.getByPhieu(idphieu) as unknown as LGTSLChiTietDto[];
        const rows = chiTietList.map((item, index) => ({
          key: `ct-${item.id ?? index}`,
          stt: item.thuTu ?? index + 1,
          idSiLo: item.idSiLo ?? null,
          idMapping: item.idMapping ?? null,
          idNVL: item.idNVL ?? null,
          thuTu: item.thuTu ?? index + 1,
          silo: item.tenSiLo ?? "",
          loaiNguyenNhienLieu: item.tenNVL ?? "",
          klTonCuoiKip: item.klTonCuoiKip ?? null,
          _manualKL: item.manualKL ?? false,
          _klGoc: item.klGoc ?? null,
          ghiChu: item.ghiChu ?? "",
        }));
        setTableData(rows);
        if (rows.length > 0) {
          message.success(`Tải dữ liệu thành công! Có ${rows.length} bản ghi`);
        } else {
          message.info("Không có dữ liệu");
        }
      } else {
        if (!scope) { message.warning("Vui lòng chọn Lò cao"); return; }
        if (!ca) { message.warning("Vui lòng chọn Ca"); return; }
        const ngaySXValue = form.getFieldValue("NgaySX");
        if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }
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
            key: String(item.idMapping ?? item.idSiLo ?? `row-${index}`),
            stt: index + 1,
            idSiLo: item.idSiLo ?? null,
            idMapping: item.idMapping ?? null,
            idNVL: item.idNVL ?? null,
            thuTu: item.thuTu ?? index + 1,
            silo: item.tenSiLo ?? "",
            loaiNguyenNhienLieu: item.tenNVL ?? "",
            klTonCuoiKip: item.ton ?? null,
            _klGoc: item.ton ?? null,
            ghiChu: item.ghiChu ?? "",
          }));
          setTableData(rows);
          message.success(`Tải dữ liệu thành công! Có ${rows.length} bản ghi`);
        } else {
          setTableData([]);
          message.info("Không có dữ liệu");
        }
      }
    } catch {
      message.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [scope, ca, form, idphieu]);

  // ─── Kiểm tra Silo handlers ────────────────────────────────────────────────

  // Gọi API lấy danh sách mapping hiện tại và cập nhật kiemTraData; trả về list để dùng tiếp
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

  // Mở modal Kiểm tra Silo và tải dữ liệu mapping + danh sách NVL/Silo song song
  const handleKiemTra = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước khi kiểm tra");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    setKiemTraOpen(true);
    const list = await refreshKiemTraData(ngay, Number(ca), Number(scope));
    resetMappingDrafts(list);
    lgTSLNvlApi.getList({ idLoCao: Number(scope) })
      .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNvlOptions([]));
    lgTSLSiLoApi.getList({ idLoCao: Number(scope) })
      .then((res) => setSiloOptions(Array.isArray(res) ? res : []))
      .catch(() => setSiloOptions([]));
  }, [form, scope, ca, refreshKiemTraData, resetMappingDrafts]);

  // Mở modal Thêm NVL mới với lò cao đã chọn được pre-fill
  const handleOpenAddNvl = useCallback(() => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao trước khi tạo NVL"); return; }
    addNvlForm.resetFields();
    addNvlForm.setFieldsValue({ idLoCao: Number(scope) });
    setEditingNvlId(null);
    setAddNvlOpen(true);
  }, [scope, addNvlForm]);

  // Mở modal Sửa NVL với dữ liệu của NVL được chọn được pre-fill
  const handleOpenEditNvl = useCallback((nvl: LGTSLNvlDto) => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao trước khi sửa NVL"); return; }
    addNvlForm.resetFields();
    addNvlForm.setFieldsValue({ tenNVL: nvl.tenNVL });
    setEditingNvlId(nvl.id);
    setAddNvlOpen(true);
  }, [scope, addNvlForm]);

  // Lưu NVL mới hoặc cập nhật NVL đang sửa, sau đó refresh danh sách NVL
  const handleSaveNvl = useCallback(async () => {
    try {
      const values = await addNvlForm.validateFields();
      setAddNvlLoading(true);
      if (editingNvlId) {
        await lgTSLNvlApi.update(editingNvlId, { idLoCao: Number(scope), tenNVL: values.tenNVL?.trim() });
        message.success("Đã cập nhật NVL");
      } else {
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

  // Xác nhận và xóa NVL, sau đó refresh danh sách NVL
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

  // Tải thủ công danh sách NVL theo lò cao (nút "Tải danh sách" trong tab Danh sách NVL)
  const loadNvlList = useCallback(async () => {
    if (!scope) { message.warning("Vui lòng chọn Lò cao trước"); return; }
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

  // Mở modal Thêm Mapping mới; tải danh sách Silo và pre-fill ngày/ca/lò cao
  const handleOpenAddMapping = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue ?? "");
    try {
      const [siloRes] = await Promise.all([
        lgTSLSiLoApi.getList({ idLoCao: Number(scope) }),
        refreshKiemTraData(ngay, Number(ca), Number(scope)),
      ]);
      setSiloOptions(Array.isArray(siloRes) ? siloRes : []);
    } catch {
      setSiloOptions([]);
    }
    const ngayDisplay = ngaySXValue?.format ? ngaySXValue.format("DD/MM/YYYY") : String(ngaySXValue ?? "");
    addMappingForm.resetFields();
    addMappingForm.setFieldsValue({ ngay: ngayDisplay, ca: Number(ca), idLoCao: Number(scope) });
    setAddMappingOpen(true);
  }, [form, scope, ca, addMappingForm, refreshKiemTraData]);

  // Tạo mapping mới
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
      resetMappingDrafts(refreshed);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi thêm mapping");
    } finally {
      setAddMappingLoading(false);
    }
  }, [addMappingForm, form, scope, ca, refreshKiemTraData, resetMappingDrafts]);

  // ─── Sao chép mapping từ ca trước ────────────────────────────────────────

  // Lấy mapping của ca liền kề trước (Ca2→Ca1 cùng ngày; Ca1→Ca2 ngày trước).
  // - Silo chưa có trong ca hiện tại: tạo mới mapping.
  // - Silo đã có: pre-fill draft NVL để người dùng xem lại và nhấn "Lưu map" nếu muốn cập nhật.
  const handleCopyFromPrevShift = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    const caNum = Number(ca);

    // Tính ca và ngày liền kề trước: Ca2 → Ca1 cùng ngày; Ca1 → Ca2 ngày trước
    const prevCa = caNum === 2 ? 1 : 2;
    const prevNgay = caNum === 2 ? ngay : dayjs(ngay).subtract(1, "day").format("YYYY-MM-DD");
    const prevLabel = `Ca ${prevCa} ngày ${dayjs(prevNgay).format("DD/MM/YYYY")}`;

    try {
      setCopyingFromPrev(true);
      const prevRes = await lgTSLMappingApi.getList({ ngay: prevNgay, ca: prevCa, idLoCao: Number(scope) });
      const prevList: LGTSLMappingDto[] = Array.isArray(prevRes) ? prevRes : [];

      if (prevList.length === 0) {
        message.warning(`Không tìm thấy dữ liệu mapping từ ${prevLabel}`);
        return;
      }

      const currentSiloIds = new Set(kiemTraData.map((r) => r.idSiLo));

      // Silo chưa có trong ca hiện tại → tạo mới (chỉ silo đã được gán NVL ở ca trước)
      const newSilos = prevList.filter((r) => !currentSiloIds.has(r.idSiLo));
      const toCreate = newSilos.filter((r) => r.idNVL);
      const noNvlCount = newSilos.length - toCreate.length;

      let createdCount = 0;
      let failedCount = 0;
      for (const prev of toCreate) {
        try {
          await lgTSLMappingApi.create({
            ngay,
            ca: caNum,
            idLoCao: Number(scope),
            idSiLo: prev.idSiLo,
            idNVL: prev.idNVL,
            ghiChu: prev.ghiChu ?? null,
          });
          createdCount++;
        } catch {
          failedCount++;
        }
      }

      // Silo đã có trong ca hiện tại → ghi nhớ pre-fill để giữ sau khi refresh
      const draftUpdates: Record<number, number | null> = {};
      prevList.forEach((r) => {
        if (currentSiloIds.has(r.idSiLo) && r.idNVL) {
          draftUpdates[r.idSiLo] = r.idNVL;
        }
      });

      // Refresh danh sách mapping; ưu tiên pre-fill từ ca trước cho silo đã có mapping hiện tại
      const refreshed = await refreshKiemTraData(ngay, caNum, Number(scope));
      const newDrafts: Record<number, number | null> = {};
      const newNotes: Record<number, string> = {};
      refreshed.forEach((item) => {
        newDrafts[item.idSiLo] = draftUpdates[item.idSiLo] ?? item.idNVL ?? null;
        newNotes[item.idSiLo] = "";
      });
      setMapDraftBySilo(newDrafts);
      setMapNoteBySilo(newNotes);

      const preFillCount = Object.keys(draftUpdates).length;

      if (failedCount > 0 && createdCount === 0 && preFillCount === 0) {
        // Tất cả lệnh tạo đều thất bại — báo lỗi rõ ràng thay vì thông báo nhầm
        message.error(`Không thể tạo mapping từ ${prevLabel}: ${failedCount} silo bị lỗi. Kiểm tra kết nối hoặc dữ liệu.`);
      } else if (createdCount > 0 || preFillCount > 0) {
        const parts: string[] = [];
        if (createdCount > 0) parts.push(`tạo mới ${createdCount} silo`);
        if (preFillCount > 0) parts.push(`cập nhật nháp ${preFillCount} silo`);
        if (failedCount > 0) parts.push(`${failedCount} silo bị lỗi khi tạo`);
        if (noNvlCount > 0) parts.push(`${noNvlCount} silo ca trước chưa có NVL`);
        message.success(`Đã sao chép từ ${prevLabel}: ${parts.join(", ")}. Kiểm tra và nhấn "Lưu map" cho từng dòng nếu cần.`);
      } else if (noNvlCount > 0 && toCreate.length === 0 && preFillCount === 0) {
        // Ca trước có silo nhưng tất cả đều chưa được gán NVL
        message.warning(`Ca trước (${prevLabel}) có ${noNvlCount} silo nhưng chưa được gán NVL nào. Hãy cấu hình mapping cho ca trước trước.`);
      } else {
        message.info(`Tất cả Silo của ca hiện tại đã có mapping hoặc ca trước không có NVL.`);
      }
    } catch {
      message.error("Lỗi khi sao chép mapping từ ca trước");
    } finally {
      setCopyingFromPrev(false);
    }
  }, [form, scope, ca, kiemTraData, refreshKiemTraData]);

  // Lưu NVL đã chọn trong draft vào mapping của silo (PUT), sau đó refresh bảng
  // Lưu NVL đã chọn trong draft vào mapping của silo (PUT), sau đó refresh bảng.
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
      await lgTSLMappingApi.update(row.id, {
        ngay,
        ca: Number(ca),
        idLoCao: Number(scope),
        idSiLo: row.idSiLo,
        idNVL,
        ghiChu: (mapNoteBySilo[row.idSiLo] ?? "").trim() || null,
      }, true);
      message.success(`Đã cập nhật mapping cho ${row.tenSiLo ?? "Silo"}`);
      const refreshed = await refreshKiemTraData(ngay, Number(ca), Number(scope));
      resetMappingDrafts(refreshed);
    } catch {
      message.error("Lỗi khi lưu mapping Silo - NVL");
    } finally {
      setMapSavingSiloId(null);
    }
  }, [mapDraftBySilo, mapNoteBySilo, form, scope, ca, refreshKiemTraData, resetMappingDrafts]);

  // ─── Init & form logic ────────────────────────────────────────────────────

  // Tải dữ liệu phiếu khi mount (hoặc khi idphieu thay đổi).
  // - useChiTietApi=true: lấy chi tiết từ LG_TSL_ChiTiet (DB, có ManualKL/KLGoc).
  // - useChiTietApi=false: parse JSON từ trường table1 trong phiếu (dùng khi tạo/sửa).
  // Chữ ký (pheDuyet) ưu tiên lấy từ jsonData nếu có, fallback về bảng BM_PheDuyet.
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

          if (useChiTietApi) {
            // Xem chi tiết: signatures luôn lấy từ bảng BM_PheDuyet (DB), không parse JSON
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
              );
              if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
            });
          } else {
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

          // Tự động điền chữ ký người tạo (capDuyet=0) khi phiếu đang ở trạng thái DangLuu
          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures.filter((sig: any) => sig.capDuyet === 0).forEach((sig: any) => {
              overrides[sig.key] = getUserInfo()?.iD_TaiKhoan ?? null;
            });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          if (useChiTietApi) {
            // Xem chi tiết: lấy từ LG_TSL_ChiTiet (đã có ManualKL, KLGoc)
            const chiTiet = await lgTSLChiTietApi.getByPhieu(idPhieu);
            const list = Array.isArray(chiTiet) ? chiTiet : [];
            setTableData(list.map((item: any, index: number) => ({
              key: `ct-${item.id ?? index}`,
              stt: item.thuTu ?? index + 1,
              idSiLo: item.idSiLo ?? null,
              idMapping: item.idMapping ?? null,
              idNVL: item.idNVL ?? null,
              thuTu: item.thuTu ?? index + 1,
              silo: item.tenSiLo ?? "",
              loaiNguyenNhienLieu: item.tenNVL ?? "",
              klTonCuoiKip: item.klTonCuoiKip ?? null,
              _manualKL: item.manualKL ?? false,
              _klGoc: item.klGoc ?? null,
              ghiChu: item.ghiChu ?? "",
            })));
          } else {
            setTableData(
              (formValues.table1 || []).map((row: any, index: number) => ({
                ...row,
                key: `loaded-${index}-${Date.now() + index}`,
                stt: row.stt || index + 1,
              }))
            );
          }
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
            overrides[sig.key] = getUserInfo()?.iD_TaiKhoan ?? null;
          });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          // Dùng functional update để tránh phụ thuộc tableData vào deps
          setTableData((prev) => prev.length === 0 ? [{ key: "row-0", stt: 1 }] : prev);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields]);

  useEffect(() => { initData(); }, [initData]);
  useEffect(() => { loadDsLoCao(); }, [loadDsLoCao]);

  // Inject options lò cao động vào config headerFields (thay thế options tĩnh từ JSON)
  const headerFields = useMemo(() => {
    return config.headerFields.map((field: any) => {
      if (field.key !== "scope") return field;
      return { ...field, options: loCaoOptions.length > 0 ? loCaoOptions : field.options || [], placeholder: "Chọn lò cao" };
    });
  }, [config.headerFields, loCaoOptions]);

  // Thu thập toàn bộ dữ liệu form + bảng để truyền vào API lưu/nộp phiếu
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
    // Bỏ qua hàng parent (tham chiếu tổng); chỉ lưu hàng con và hàng bình thường
    const processedTable1 = tableData
      .filter((row) => !row._isSplitParent)
      .map((row, index) => {
        const r = { ...row };
        delete r._isNewRow;
        delete r.key;
        delete r._isSplitParent;
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
  }, [form, config, tableData]);

  // Validate form trước khi phieuActionService thực hiện đổi trạng thái
  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
      // Validate tổng KL tách phải bằng KL gốc
      const splitGroupIds = [...new Set(tableData.filter((r) => r._splitGroupId).map((r) => r._splitGroupId!))];
      for (const gid of splitGroupIds) {
        const parent = tableData.find((r) => r._splitGroupId === gid && r._isSplitParent);
        const children = tableData.filter((r) => r._splitGroupId === gid && !r._isSplitParent);
        const childSum = children.reduce((s, r) => s + (Number(r.klTonCuoiKip) || 0), 0);
        const parentKL = Number(parent?.klTonCuoiKip) || 0;
        if (Math.abs(childSum - parentKL) > 0.001) {
          message.error(`Silo "${parent?.silo}": Tổng KL tách (${childSum.toFixed(3)}) phải bằng KL ban đầu (${parentKL.toFixed(3)})`);
          return;
        }
      }
    }
    catch (error: any) { message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái"); }
  }, [form, tableData]);

  // Sau khi action thành công: navigate đến phiếu mới (clone) hoặc reload dữ liệu hiện tại
  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieutonsilolocao/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

  // Render các nút hành động phiếu (Lưu, Nộp, Phê duyệt, Thu hồi, v.v.) theo trạng thái
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
  }, [idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  // ─── Split Silo handlers ───────────────────────────────────────────────────

  // rowSpan[i]: số dòng span cho cột STT/Silo tại vị trí i; 0 = ẩn cell (dòng con của nhóm)
  const rowSpans = useMemo(() =>
    tableData.map((row, idx) => {
      if (!row._splitGroupId) return 1;
      const gid = row._splitGroupId;
      const first = tableData.findIndex((r) => r._splitGroupId === gid);
      if (first !== idx) return 0;
      return tableData.filter((r) => r._splitGroupId === gid).length;
    }),
    [tableData]
  );

  // Chuyển dòng bình thường thành nhóm tách liệu: 1 hàng parent (tổng) + 2 hàng con
  const handleSplitRow = useCallback((rowKey: string) => {
    const idx = tableData.findIndex((r) => r.key === rowKey);
    if (idx === -1) return;
    const row = tableData[idx];
    const gid = `sg_${Date.now()}`;
    const parent: TableRow = { ...row, key: `${gid}_parent`, _splitGroupId: gid, _isSplitParent: true };
    const childBase = {
      idSiLo: row.idSiLo, idMapping: row.idMapping, silo: row.silo, thuTu: row.thuTu,
      _splitGroupId: gid, _isSplitParent: false,
      loaiNguyenNhienLieu: "", idNVL: null, klTonCuoiKip: null, ghiChu: "",
    };
    const next = [...tableData];
    next.splice(idx, 1, parent, { ...childBase, key: `${gid}_0` }, { ...childBase, key: `${gid}_1` });
    setTableData(next.map((r, i) => ({ ...r, stt: i + 1 })));
    // Tự động tải danh sách NVL nếu chưa có (để dropdown tách liệu có thể chọn)
    if (scope && nvlOptions.filter((n) => n.idLoCao === Number(scope)).length === 0) {
      lgTSLNvlApi.getList({ idLoCao: Number(scope) })
        .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
        .catch(() => { });
    }
  }, [tableData, scope, nvlOptions]);

  // Gộp lại nhóm tách liệu: xóa tất cả hàng con, giữ lại hàng parent và làm nó thành dòng bình thường
  const handleMergeGroup = useCallback((gid: string) => {
    const parent = tableData.find((r) => r._splitGroupId === gid && r._isSplitParent)!;
    const merged: TableRow = { ...parent, _splitGroupId: undefined, _isSplitParent: undefined };
    const next: TableRow[] = [];
    let inserted = false;
    tableData.forEach((r) => {
      if (r._splitGroupId === gid) {
        if (!inserted) { next.push(merged); inserted = true; }
      } else {
        next.push(r);
      }
    });
    setTableData(next.map((r, i) => ({ ...r, stt: i + 1 })));
  }, [tableData]);

  // Thêm một hàng con mới vào cuối nhóm tách liệu
  const handleAddChildToGroup = useCallback((gid: string) => {
    const parent = tableData.find((r) => r._splitGroupId === gid && r._isSplitParent)!;
    const lastIdx = tableData.reduce((last, r, i) => (r._splitGroupId === gid ? i : last), -1);
    const newChild: TableRow = {
      key: `${gid}_${Date.now()}`,
      idSiLo: parent.idSiLo, idMapping: parent.idMapping, silo: parent.silo, thuTu: parent.thuTu,
      _splitGroupId: gid, _isSplitParent: false,
      loaiNguyenNhienLieu: "", idNVL: null, klTonCuoiKip: null, ghiChu: "",
    };
    const next = [...tableData];
    next.splice(lastIdx + 1, 0, newChild);
    setTableData(next.map((r, i) => ({ ...r, stt: i + 1 })));
  }, [tableData]);

  // Xóa một hàng con khỏi nhóm tách liệu (nhóm phải còn ít nhất 1 hàng con)
  const handleDeleteSplitChild = useCallback((rowKey: string) => {
    const idx = tableData.findIndex((r) => r.key === rowKey);
    if (idx === -1 || tableData[idx]._isSplitParent) return;
    const gid = tableData[idx]._splitGroupId!;
    const childCount = tableData.filter((r) => r._splitGroupId === gid && !r._isSplitParent).length;
    if (childCount <= 1) {
      message.warning("Dùng 'Gộp lại' để hủy tách liệu.");
      return;
    }
    setTableData((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, stt: i + 1 })));
  }, [tableData]);

  // Xóa một dòng bình thường (không phải dòng tách liệu); không cho xóa nếu chỉ còn 1 dòng
  const handleDeleteNormalRow = useCallback((rowKey: string) => {
    setTableData((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.key !== rowKey).map((r, i) => ({ ...r, stt: i + 1 }));
    });
  }, []);

  // Cập nhật một ô trong tableData; đánh dấu _manualKL=true nếu người dùng chỉnh sửa KL
  const handleSiloCellChange = useCallback((rowKey: string, field: string, value: any) => {
    setTableData((prev) => prev.map((r) => {
      if (r.key !== rowKey) return r;
      if (field === "klTonCuoiKip") return { ...r, [field]: value, _manualKL: true };
      return { ...r, [field]: value };
    }));
  }, []);

  // Cập nhật NVL được chọn cho hàng con tách liệu; đồng thời đồng bộ tên hiển thị
  const handleNvlSelectChange = useCallback((rowKey: string, nvlId: number | null) => {
    setTableData((prev) => {
      const nvl = nvlId ? scopeNvlOptions.find((n) => n.id === nvlId) : null;
      return prev.map((r) =>
        r.key === rowKey
          ? { ...r, idNVL: nvlId, loaiNguyenNhienLieu: nvl?.tenHienThi ?? nvl?.tenNVL ?? "" }
          : r
      );
    });
  }, [scopeNvlOptions]);

  // ─── End Split Silo handlers ───────────────────────────────────────────────

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

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button type="primary" icon={<FilterOutlined />} onClick={loadDataFromAPI} disabled={isFormLocked} loading={loading}>
            Tải dữ liệu
          </Button>
          {!isSignatureReadonly && (
            <Button icon={<SearchOutlined />} onClick={handleKiemTra}>
              Kiểm tra Silo
            </Button>
          )}
          {actionButtons}
          <span
            style={{
              marginLeft: "auto",
              border: "1px solid #91caff",
              borderRadius: 6,
              padding: "4px 12px",
              color: "#0958d9",
              fontSize: 13,
              fontWeight: 500,
              background: "#e6f4ff",
            }}
          >
            Khối lượng tồn được chốt lúc 7h30 và 19h30 hằng ngày
          </span>
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
                      { title: "STT", key: "stt", width: 50, align: "center", render: (_v: unknown, _r: unknown, i: number) => i + 1 },
                      { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo", render: (v: string | null) => v ?? "—" },
                      {
                        title: "NVL đang chứa", dataIndex: "tenNVL", key: "tenNVL",
                        render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>,
                      },
                      { title: "Ngày", dataIndex: "ngay", key: "ngay", width: 110, align: "center", render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "—" },
                      { title: "Ca", dataIndex: "ca", key: "ca", width: 60, align: "center", render: (v: number) => `Ca ${v}` },
                      { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v: string | null) => v ?? "" },
                    ]}
                  />
                ),
              },
              {
                key: "map-nvl",
                label: "Map NVL vào Silo",
                children: (
                  <>
                    <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddNvl}>Thêm NVL mới</Button>
                      <Button icon={<PlusOutlined />} onClick={handleOpenAddMapping}>Thêm Mapping mới</Button>
                      <Tooltip title={`Tự động lấy mapping từ ${Number(ca) === 2 ? "Ca 1 cùng ngày" : "Ca 2 ngày trước"} để điền vào ca hiện tại. Silo chưa có sẽ được tạo mới, silo đã có sẽ được điền vào ô "NVL map mới" để bạn xem lại.`}>
                        <Button
                          icon={<PlusCircleOutlined />}
                          loading={copyingFromPrev}
                          onClick={handleCopyFromPrevShift}
                        >
                          Sao chép từ ca trước
                        </Button>
                      </Tooltip>
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
                      rowClassName={(row: LGTSLMappingDto) => {
                        const dupCount = kiemTraData.filter((r) => r.idSiLo === row.idSiLo).length;
                        return dupCount > 1 ? "row-duplicate-silo" : "";
                      }}
                      columns={[
                        { title: "STT", key: "stt", width: 50, align: "center", render: (_v: unknown, _r: unknown, i: number) => i + 1 },
                        {
                          title: "Silo", dataIndex: "tenSiLo", key: "tenSiLo", width: 180,
                          render: (v: string | null, row: LGTSLMappingDto) => {
                            const dupCount = kiemTraData.filter((r) => r.idSiLo === row.idSiLo).length;
                            return (
                              <span>
                                {v ?? "—"}
                                {dupCount > 1 && (
                                  <Tooltip title={`Silo này được map ${dupCount} lần trong ca. Kiểm tra lại!`}>
                                    <Tag color="warning" style={{ marginLeft: 6 }}>⚠ ×{dupCount}</Tag>
                                  </Tooltip>
                                )}
                              </span>
                            );
                          },
                        },
                        {
                          title: "NVL hiện tại", dataIndex: "tenNVL", key: "tenNVL", width: 200,
                          render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>,
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
                              onChange={(value) => setMapDraftBySilo((prev) => ({ ...prev, [row.idSiLo]: value ?? null }))}
                            >
                              {scopeNvlOptions.map((n) => (
                                <Select.Option key={n.id} value={n.id}> {n.tenHienThi ?? n.tenNVL}</Select.Option>
                              ))}
                            </Select>
                          ),
                        },
                        {
                          title: "Ghi chú", key: "ghiChu", width: 200,
                          render: (_v: unknown, row: LGTSLMappingDto) => (
                            <Input
                              placeholder="Nhập ghi chú (nếu có)"
                              value={mapNoteBySilo[row.idSiLo] ?? ""}
                              onChange={(e) => setMapNoteBySilo((prev) => ({ ...prev, [row.idSiLo]: e.target.value }))}
                            />
                          ),
                        },
                        {
                          title: "", key: "action", width: 110, align: "center",
                          render: (_v: unknown, row: LGTSLMappingDto) => (
                            <Button type="primary" size="small" loading={mapSavingSiloId === row.idSiLo} onClick={() => handleMapSiloNVL(row)}>
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
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddNvl}>Thêm NVL mới</Button>
                      <Button onClick={loadNvlList} loading={nvlListLoading}>Tải danh sách</Button>
                      <span style={{ color: "#666", alignSelf: "center" }}>Tổng: <b>{scopeNvlOptions.length}</b> mục</span>
                    </div>
                    <Table
                      size="small"
                      bordered
                      loading={nvlListLoading}
                      dataSource={scopeNvlOptions}
                      rowKey="id"
                      pagination={scopeNvlOptions.length > 10 ? { pageSize: 10 } : false}
                      columns={[
                        { title: "STT", key: "stt", width: 50, align: "center", render: (_v: unknown, _r: unknown, i: number) => i + 1 },
                        { title: "Tên NVL", dataIndex: "tenNVL", key: "tenNVL", render: (v: string | null) => v ?? "—" },
                        { title: "Tên NVL P.KH", dataIndex: "tenNVLTk", key: "tenNVLTk", render: (v: string | null) => v ?? "—" },
                        { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v: string | null) => v ?? "—" },
                        {
                          title: "Thao tác", key: "action", width: 150, align: "center",
                          render: (_v: unknown, record: LGTSLNvlDto) => (
                            <Space size="small">
                              <Button type="primary" size="small" onClick={() => handleOpenEditNvl(record)}>Sửa</Button>
                              <Button danger size="small" onClick={() => handleDeleteNvl(record.id)}>Xóa</Button>
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
          onCancel={() => { setAddNvlOpen(false); setEditingNvlId(null); }}
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
            <Form.Item name="tenNVL" label="Tên NVL" rules={[{ required: true, message: "Nhập tên NVL" }]}>
              <Input maxLength={200} placeholder="Nhập tên NVL" />
            </Form.Item>
            {!editingNvlId && (
              <>
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
            <Form.Item name="ngay" label="Ngày"><Input disabled /></Form.Item>
            <Form.Item name="ca" label="Ca">
              <Select disabled>
                <Select.Option value={1}>Ca 1</Select.Option>
                <Select.Option value={2}>Ca 2</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="idSiLo" label="Silo" rules={[{ required: true, message: "Chọn Silo" }]}>
              <Select
                placeholder="Chọn Silo"
                showSearch
                optionFilterProp="label"
                onChange={(val: number) => {
                  const existing = kiemTraData.find((r) => r.idSiLo === val);
                  if (existing) {
                    message.warning(
                      `Silo này đã được map với NVL "${existing.tenNVL ?? "chưa có NVL"}" trong ca này.`
                    );
                  }
                }}
                options={siloOptions.map((s) => {
                  const mapped = kiemTraData.find((r) => r.idSiLo === s.thuTuCoDinh);
                  return {
                    value: s.thuTuCoDinh ?? s.id,
                    label: mapped
                      ? `${s.tenSiLo} ⚠ Đã map: ${mapped.tenNVL ?? "chưa có NVL"}`
                      : (s.tenSiLo ?? ""),
                  };
                })}
              />
            </Form.Item>
            <Form.Item name="idNVL" label="NVL" rules={[{ required: true, message: "Chọn NVL" }]}>
              <Select placeholder="Chọn NVL" showSearch optionFilterProp="children">
                {scopeNvlOptions.map((n) => (
                  <Select.Option key={n.id} value={n.id}> {n.tenHienThi ?? n.tenNVL}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="ghiChu" label="Ghi chú">
              <Input.TextArea rows={2} maxLength={500} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Form>
        </Modal>

        {/* ── Bảng tồn Silo (có hỗ trợ tách liệu) ─────────────────────────── */}
        <div style={{ marginTop: 12 }}>
          <Table
            bordered
            size="small"
            pagination={false}
            loading={loading}
            dataSource={tableData}
            rowKey={(record, idx) => record.key ?? String(idx)}
            scroll={{ x: "max-content", y: 800 }}
            sticky
            onRow={(record) => ({
              style: record._manualKL ? { backgroundColor: "#fff7e6" } : {},
            })}
            summary={() => {
              const total = tableData
                .filter((r) => !r._isSplitParent)
                .reduce((s, r) => s + (Number(r.klTonCuoiKip) || 0), 0);
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                    <Table.Summary.Cell index={0} colSpan={3} align="center">TỔNG CỘNG</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{total.toLocaleString("en-US")}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                    {!isFormLocked && <Table.Summary.Cell index={3} />}
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
            columns={[
              {
                title: "STT",
                dataIndex: "stt",
                width: 55,
                align: "center" as const,
                onCell: (_: any, rowIndex?: number) => ({ rowSpan: rowSpans[rowIndex!] }),
                render: (val: number) => val,
              },
              {
                title: "Silo",
                dataIndex: "silo",
                width: 180,
                onCell: (_: any, rowIndex?: number) => ({ rowSpan: rowSpans[rowIndex!] }),
                render: (val: string, row: TableRow) => {
                  if (!row._splitGroupId) {
                    return (
                      <Input
                        value={val ?? ""}
                        disabled={isFormLocked}
                        onChange={(e) => handleSiloCellChange(row.key!, "silo", e.target.value)}
                      />
                    );
                  }
                  return (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{val || "—"}</div>
                      {!isFormLocked && (
                        <Space size={4} wrap>
                          <Button size="small" type="dashed" icon={<PlusCircleOutlined />} onClick={() => handleAddChildToGroup(row._splitGroupId!)}>
                            Thêm liệu
                          </Button>
                          <Button size="small" type="link" style={{ padding: 0, color: "#faad14" }} onClick={() => handleMergeGroup(row._splitGroupId!)}>
                            Gộp lại
                          </Button>
                        </Space>
                      )}
                    </div>
                  );
                },
              },
              {
                title: "Loại nguyên/nhiên liệu",
                dataIndex: "loaiNguyenNhienLieu",
                width: 280,
                render: (val: string, row: TableRow) => {
                  if (row._isSplitParent) {
                    return <span style={{ color: "#888", fontStyle: "italic", paddingLeft: 8 }}>Hỗn hợp</span>;
                  }
                  if (row._splitGroupId) {
                    return (
                      <Select
                        style={{ width: "100%" }}
                        placeholder="Chọn loại liệu"
                        showSearch
                        optionFilterProp="children"
                        allowClear
                        value={row.idNVL ?? undefined}
                        onChange={(v) => handleNvlSelectChange(row.key!, v ?? null)}
                        disabled={isFormLocked}
                      >
                        {scopeNvlOptions.map((n) => (
                          <Select.Option key={n.id} value={n.id}>{n.tenHienThi ?? n.tenNVL}</Select.Option>
                        ))}
                      </Select>
                    );
                  }
                  return (
                    <Input
                      value={val ?? ""}
                      disabled={isFormLocked}
                      placeholder="Loại nguyên/nhiên liệu"
                      onChange={(e) => handleSiloCellChange(row.key!, "loaiNguyenNhienLieu", e.target.value)}
                    />
                  );
                },
              },
              {
                title: "KL tồn cuối kíp (Tấn)",
                dataIndex: "klTonCuoiKip",
                width: 180,
                render: (val: any, row: TableRow) => {
                  const numVal = val === "" || val == null ? undefined : Number(val);
                  if (row._isSplitParent) {
                    const childSum = tableData
                      .filter((r) => r._splitGroupId === row._splitGroupId && !r._isSplitParent)
                      .reduce((s, r) => s + (Number(r.klTonCuoiKip) || 0), 0);
                    const parentKL = numVal ?? 0;
                    const isNotEqual = Math.abs(childSum - parentKL) > 0.001;
                    return (
                      <div>
                        <InputNumber style={{ width: "100%", backgroundColor: "#fffbe6" }} value={numVal} readOnly disabled precision={3} />
                        <div style={{ fontSize: 11, color: isNotEqual ? "#ff4d4f" : "#52c41a", marginTop: 2 }}>
                          Đã phân: {childSum.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} / {parentKL.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          {isNotEqual ? (childSum < parentKL ? " (thiếu)" : " (vượt)") : " ✓ Khớp"}
                        </div>
                      </div>
                    );
                  }
                  if (isFormLocked) {
                    if (row._manualKL) {
                      return (
                        <div>
                          <div style={{ fontWeight: 600, color: "#d46b08" }}>
                            {numVal != null ? numVal.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "—"}
                          </div>
                          {row._klGoc != null && (
                            <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
                              Gốc: {Number(row._klGoc).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <span style={{ padding: "0 4px" }}>
                        {numVal != null ? numVal.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : ""}
                      </span>
                    );
                  }
                  return (
                    <Tooltip title={row._manualKL ? "Đã chỉnh sửa thủ công" : undefined}>
                      <InputNumber
                        style={{
                          width: "100%",
                          ...(row._manualKL ? { backgroundColor: "#fff7e6", borderColor: "#fa8c16" } : {}),
                        }}
                        value={numVal}
                        min={0}
                        precision={3}
                        disabled={false}
                        placeholder="0"
                        onChange={(v) => handleSiloCellChange(row.key!, "klTonCuoiKip", v)}
                      />
                    </Tooltip>
                  );
                },
              },
              {
                title: "Ghi chú",
                dataIndex: "ghiChu",
                width: 260,
                render: (val: string, row: TableRow) => (
                  <Input
                    value={val ?? ""}
                    disabled={isFormLocked}
                    placeholder="Ghi chú"
                    onChange={(e) => handleSiloCellChange(row.key!, "ghiChu", e.target.value)}
                  />
                ),
              },
              ...(!isFormLocked
                ? [{
                  title: "Thao tác",
                  key: "action",
                  width: 120,
                  align: "center" as const,
                  render: (_: any, row: TableRow) => {
                    if (row._isSplitParent) return null;
                    if (row._splitGroupId) {
                      const childCount = tableData.filter((r) => r._splitGroupId === row._splitGroupId && !r._isSplitParent).length;
                      return (
                        <Popconfirm
                          title="Xóa dòng liệu này?"
                          okText="Xóa"
                          cancelText="Hủy"
                          disabled={childCount <= 1}
                          onConfirm={() => handleDeleteSplitChild(row.key!)}
                        >
                          <Button
                            type="text" danger size="small" icon={<DeleteOutlined />}
                            disabled={childCount <= 1}
                            title={childCount <= 1 ? "Dùng 'Gộp lại' để hủy tách" : "Xóa dòng liệu này"}
                          />
                        </Popconfirm>
                      );
                    }
                    return (
                      <Space size={4}>
                        <Button size="small" onClick={() => handleSplitRow(row.key!)} title="Tách silo thành nhiều loại liệu">
                          Tách liệu
                        </Button>
                        {/* <Popconfirm
                            title="Xóa dòng này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            disabled={tableData.filter((r) => !r._isSplitParent).length <= 1}
                            onConfirm={() => handleDeleteNormalRow(row.key!)}
                          >
                            <Button
                              type="text" danger size="small" icon={<DeleteOutlined />}
                              disabled={tableData.filter((r) => !r._isSplitParent).length <= 1}
                            />
                          </Popconfirm> */}
                      </Space>
                    );
                  },
                }]
                : []),
            ]}
          />
          {!isFormLocked && (
            <Button
              type="dashed"
              style={{ marginTop: 8 }}
              onClick={() => setTableData((prev) => [...prev, { key: `row-${Date.now()}`, stt: prev.length + 1 }])}
            >
              + Thêm dòng
            </Button>
          )}
        </div>

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
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={isLevelZero ? (getUserInfo()?.iD_TaiKhoan ?? null) : form.getFieldValue(sig.key)}
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
