/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
  Tooltip,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  ClearOutlined,
  ArrowUpOutlined,
  RollbackOutlined,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";
import type { TableRowSelection } from "antd/es/table/interface";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Hrc2SlabApi, type HrcSlabItem, type PhieuBBSLItem } from "../../../services/Hrc2SlabApi";
import { PhieuApi } from "../../../services/PhieuApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import {
  hasKhuVucPhu,
  getBmQuyenUiFlags,
} from "../../../utils/helpers/checkAdminRole";

const { RangePicker } = DatePicker;

// Màu sắc trạng thái
const TT_COLOR: Record<number, string> = { 0: "default", 1: "green" };
const TT_TEXT: Record<number, string>  = { 0: "Chưa", 1: "Đã XN" };

// Tính trạng thái hiển thị của phiếu BBSL
// "chot"      = BM_Phieu.TinhTrang === 5 (set bởi button Chốt phiếu)
// "hoanThanh" = tất cả slab đã được Đúc + Kho xác nhận (nhưng chưa chốt phiếu)
// "dangXuLy"  = còn lại
function getComputedPhieuStatus(p: PhieuBBSLItem): "chot" | "hoanThanh" | "dangXuLy" {
  if (p.tinhTrang === 5) return "chot";
  const total = p.soSlabDaChot;
  if (total > 0 && p.soSlabDuc >= total && p.soSlabKho >= total) return "hoanThanh";
  return "dangXuLy";
}

const getUserId = (): number => {
  try {
    const info = localStorage.getItem("userinfo");
    if (info) {
      const obj = JSON.parse(info);
      return obj.iD_TaiKhoan ?? obj.ID_TaiKhoan ?? obj.idTaiKhoan ?? 0;
    }
  } catch { /* empty */ }
  return 0;
};

const BkHrc2SlabTable = ({ readOnly = false }: { readOnly?: boolean }) => {
  // ── Phân quyền theo bộ phận ──────────────────────────────────────────────
  const userInfo = (() => { try { const s = localStorage.getItem("userinfo"); return s ? JSON.parse(s) : null; } catch { return null; } })();
  const isView    = getBmQuyenUiFlags(BM_CONFIG.HRC2.HRC2_BBSL_PhoiTam, userInfo).isView;
  const isKCS     = hasKhuVucPhu(userInfo, BM_CONFIG.HRC2.HRC2_BBSL_PhoiTam, 'KCS');

  const [form] = Form.useForm();
  const [data, setData] = useState<HrcSlabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const [showExtraColumns, setShowExtraColumns] = useState(false);

  const [syncVisible, setSyncVisible] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncForm] = Form.useForm();

  // Paste ID Slab
  const [idSlabPasteOpen, setIdSlabPasteOpen] = useState(false);
  const [idSlabPasteText, setIdSlabPasteText] = useState("");

  const handleIdSlabPasteConfirm = () => {
    const ids = idSlabPasteText
      .split(/[\n\t,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 0) form.setFieldValue("idSlabs", ids);
    setIdSlabPasteOpen(false);
    setIdSlabPasteText("");
  };

  const handleSync = async (values: any) => {
    try {
      setSyncLoading(true);
      const ngayBatDau = values.syncRange?.[0] ? dayjs(values.syncRange[0]).format("YYYY-MM-DD") : null;
      const ngayKetThuc = values.syncRange?.[1] ? dayjs(values.syncRange[1]).format("YYYY-MM-DD") : null;
      const res = await Hrc2SlabApi.sync(ngayBatDau, ngayKetThuc);
      if (res.trangThai === "RUNNING") {
        message.warning("Sync đang được thực hiện bởi tiến trình khác, vui lòng thử lại sau!");
      } else {
        message.success(`Sync hoàn thành: ${res.soRecordSync ?? 0} bản ghi`);
      }
      setSyncVisible(false);
      syncForm.resetFields();
      await fetchData(1, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi sync dữ liệu!");
    } finally {
      setSyncLoading(false);
    }
  };

  // Modal chọn phiếu BBSL
  const [modalVisible, setModalVisible] = useState(false);
  const [phieuList, setPhieuList] = useState<PhieuBBSLItem[]>([]);
  const [phieuLoading, setPhieuLoading] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState<PhieuBBSLItem | null>(null);
  // Kíp/Ca cố định theo slab đã chọn — chỉ khoảng ngày là tiêu chí tìm kiếm người dùng điều chỉnh được
  const [phieuKipCa, setPhieuKipCa] = useState<{ kip: string | null; ca: number | null }>({ kip: null, ca: null });
  const [phieuSearchForm] = Form.useForm();

  // Sub-modal tạo phiếu BBSL mới
  const [createVisible, setCreateVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  const fetchData = useCallback(async (page = 1, pageSize = 50, values?: any, resetSel = true) => {
    try {
      setLoading(true);
      const filters = values ?? form.getFieldsValue();
      const dateRange = filters.dateRange;
      const dateXLRange = filters.dateXLRange;
      const res = await Hrc2SlabApi.search({
        tuNgay:    dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : null,
        denNgay:   dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : null,
        tuNgayXL:  dateXLRange?.[0] ? dayjs(dateXLRange[0]).format("YYYY-MM-DD") : null,
        denNgayXL: dateXLRange?.[1] ? dayjs(dateXLRange[1]).format("YYYY-MM-DD") : null,
        caSanXuat: filters.caSanXuat || null,
        kip:       filters.kip || null,
        mayDuc:    filters.mayDuc ?? null,
        meThep:    filters.meThep || null,
        idSlabs:   filters.idSlabs?.length > 0 ? filters.idSlabs : null,
        macThep:   filters.macThep || null,
        isChot:         filters.isChot ?? null,
        isTrungIDSlab:  filters.isTrungIDSlab ? true : null,
        isDiffMacThep:  filters.isDiffMacThep ? true : null,
        isSaiLotName:   filters.isSaiLotName ? true : null,
        trangThaiKCS:   filters.trangThaiKCS ?? null,
        page,
        pageSize,
      });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalCount });
      if (resetSel) setSelectedRowKeys([]);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, [form]);

  // Auto-sync BKMIS đúng 1 lần khi vào trang / load lại trang — KHÔNG sync
  // lại mỗi lần bấm "Tìm" (nặng, mất thời gian).
  useEffect(() => {
    (async () => {
      try {
        const homNay = dayjs().format("YYYY-MM-DD");
        await Hrc2SlabApi.sync(homNay, homNay);
      } catch (err) {
        console.error("Auto-sync BKMIS khi vào trang bị lỗi:", err);
      }
      await fetchData(1, pagination.pageSize);
    })();
  }, []);

  const handleSearch = async (values: any) => {
    await fetchData(1, pagination.pageSize, values);
  };

  const handleClear = () => {
    form.resetFields();
    setData([]);
    setSelectedRowKeys([]);
    setPagination({ current: 1, pageSize: 50, total: 0 });
  };

  const selectedRows = useMemo(
    () => data.filter((r) => selectedRowKeys.includes(r.id)),
    [data, selectedRowKeys]
  );

  // ── Validate trước khi thao tác ──────────────────────────────────────────

  // Thu hồi chỉ hợp lệ khi slab đã chuyển BBSL nhưng chưa bên nào (Đúc/Kho/PKH)
  // xác nhận và phiếu BBSL chứa nó chưa bị chốt — 1 bên đã xác nhận/chốt là khóa thu hồi.
  const canThuHoiRow = (r: HrcSlabItem): boolean =>
    r.trangThaiKCS === 1 &&
    r.trangThaiDuc === 0 &&
    r.trangThaiKho === 0 &&
    r.trangThaiPKH === 0 &&
    !r.isChot;

  const hasChatLuong = (r: HrcSlabItem): boolean =>
    !!(r.chatLuong && String(r.chatLuong).trim() !== "");

  const canChuyenBBSLRow = (r: HrcSlabItem): boolean =>
    r.trangThaiKCS === 0 && r.isSaiLotName === false && r.isTrungIDSlab === false && r.isDiffMacThep === false && hasChatLuong(r);

  const validateSameCaSanXuat = (): boolean => {
    const caValues = [...new Set(selectedRows.map((r) => r.caSanXuat ?? ""))];
    if (caValues.length > 1) {
      message.warning("Các mẻ được chọn phải cùng ca sản xuất!");
      return false;
    }
    return true;
  };

  const validateSameKipSanXuat = (): boolean => {
    const kipValues = [...new Set(selectedRows.map((r) => r.kipSanXuat ?? ""))];
    if (kipValues.length > 1) {
      message.warning("Các mẻ được chọn phải cùng kíp sản xuất!");
      return false;
    }
    return true;
  };

  // ── Mở popup chọn phiếu ──────────────────────────────────────────────────

  const handleOpenChuyenBBSL = async () => {
    if (selectedRows.length === 0) { message.warning("Vui lòng chọn ít nhất 1 slab!"); return; }
    if (!validateSameCaSanXuat()) return;
    if (!validateSameKipSanXuat()) return;

    const hasChuyenRoi = selectedRows.some((r) => r.trangThaiKCS === 1);
    if (hasChuyenRoi) { message.warning("Một số mẻ đã được chuyển BBSL, vui lòng bỏ chọn chúng!"); return; }

    const invalidRows = selectedRows.filter(
      (r) => r.isSaiLotName || r.isTrungIDSlab || r.isDiffMacThep || !hasChatLuong(r)
    );
    if (invalidRows.length > 0) {
      const lines = invalidRows.map((r) => {
        const reasons: string[] = [];
        if (r.isSaiLotName) reasons.push("LotName");
        if (r.isTrungIDSlab) reasons.push("ID Slab (trùng)");
        if (r.isDiffMacThep) reasons.push("Mác thép (khác)");
        if (!hasChatLuong(r)) reasons.push("thiếu Chất lượng");
        return `Không thể chuyển BBSL ID ${r.idSlab} vì đang sai ${reasons.join(", ")}`;
      });
      message.error(
        <div style={{ textAlign: "left" }}>
          {lines.map((line, idx) => <div key={idx}>{line}</div>)}
        </div>
      );
      return;
    }

    const firstKip = selectedRows[0]?.kipSanXuat ?? null;
    const firstCaStr = selectedRows[0]?.caSanXuat;
    const caNum = firstCaStr ? parseInt(String(firstCaStr), 10) : null;
    const ca = caNum != null && !isNaN(caNum) ? caNum : null;
    setPhieuKipCa({ kip: firstKip, ca });

    // Mặc định tìm phiếu trong 30 ngày gần nhất — người dùng có thể mở rộng khoảng ngày để tìm xa hơn
    const defaultRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(30, "day"), dayjs()];
    phieuSearchForm.setFieldsValue({ dateRange: defaultRange });

    setModalVisible(true);
    setSelectedPhieu(null);
    await fetchPhieuBBSL(firstKip, defaultRange[0].format("YYYY-MM-DD"), defaultRange[1].format("YYYY-MM-DD"));
  };

  // Không lọc theo "ca" — chỉ theo kíp + khoảng ngày (xem ghi chú trong Hrc2SlabApi.getPhieuBBSL)
  const fetchPhieuBBSL = useCallback(
    async (kip: string | null, tuNgay: string | null, denNgay: string | null) => {
      try {
        setPhieuLoading(true);
        const list = await Hrc2SlabApi.getPhieuBBSL(kip, tuNgay, denNgay);
        setPhieuList(list);
      } catch {
        message.error("Không thể tải danh sách phiếu!");
      } finally {
        setPhieuLoading(false);
      }
    },
    []
  );

  const handleSearchPhieuBBSL = async () => {
    const values = phieuSearchForm.getFieldsValue();
    const range = values.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    const tuNgay = range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : null;
    const denNgay = range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : null;
    await fetchPhieuBBSL(phieuKipCa.kip, tuNgay, denNgay);
  };

  const handleConfirmChuyenBBSL = async () => {
    if (!selectedPhieu) { message.warning("Vui lòng chọn phiếu!"); return; }
    if (getComputedPhieuStatus(selectedPhieu) === "chot") { message.error("Phiếu đã chốt, không thể chuyển slab vào!"); return; }
    try {
      setActionLoading(true);
      const userId = getUserId();
      const ids = selectedRows.map((r) => r.id);
      // Bắt thời điểm ngay lúc người dùng bấm xác nhận trong popup — không dùng giờ server nhận request
      // (có thể lệch do độ trễ mạng) để lưu vết đúng thời điểm thao tác thực tế.
      const thoiDiemThaoTac = dayjs().toISOString();
      await Hrc2SlabApi.chuyenBBSL(ids, selectedPhieu.idPhieu, userId, thoiDiemThaoTac);
      message.success(`Đã chuyển ${ids.length} slab vào phiếu ${selectedPhieu.soPhieu}`);
      setModalVisible(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi chuyển BBSL!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePhieu = async (values: any) => {
    try {
      setCreateLoading(true);
      const stored = localStorage.getItem("userinfo");
      const userInfo = stored ? JSON.parse(stored) : {};
      const payload = {
        maBm: BM_CONFIG.HRC2.HRC2_BBSL_PhoiTam,
        NgaySX: values.ngaySX ? dayjs(values.ngaySX).format("YYYY-MM-DD") : null,
        ca: values.ca,
        // kip: values.kip || null,
        nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
        xuongId: userInfo.iD_PhanXuong ?? null,
        idphongBan: userInfo.iD_PhongBan ?? null,
        tinhTrang: 0,
        prefix: "HRC2_BBSL_PhoiTam",
      };
      const res = await PhieuApi.postData(payload as Record<string, unknown>);
      message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu ?? ""}`);
      setCreateVisible(false);
      createForm.resetFields();
      // Reload danh sách phiếu — dùng lại kíp + khoảng ngày đang tìm kiếm trong popup
      const searchValues = phieuSearchForm.getFieldsValue();
      const range = searchValues.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
      const tuNgay = range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : null;
      const denNgay = range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : null;
      const list = await Hrc2SlabApi.getPhieuBBSL(phieuKipCa.kip, tuNgay, denNgay);
      setPhieuList(list);
      // Auto-select phiếu vừa tạo
      const newId = (res as any)?.idphieu;
      if (newId) {
        const newPhieu = list.find((p) => p.idPhieu === newId);
        if (newPhieu) setSelectedPhieu(newPhieu);
      }
    } catch (err: any) {
      message.error(err?.message ?? "Không thể tạo phiếu!");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Thu hồi ──────────────────────────────────────────────────────────────

  const handleThuHoi = async () => {
    const canThuHoi = selectedRows.every(canThuHoiRow);
    if (!canThuHoi) {
      message.warning("Chỉ có thể thu hồi slab đã chuyển, chưa được Đúc/Kho xác nhận và chưa chốt PKH!");
      return;
    }
    try {
      setActionLoading(true);
      await Hrc2SlabApi.thuHoi(selectedRows.map((r) => r.id), getUserId());
      message.success(`Đã thu hồi ${selectedRows.length} slab`);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi thu hồi!");
    } finally {
      setActionLoading(false);
    }
  };

  const currentPageKeys = useMemo(() => data.map((r) => r.id as React.Key), [data]);

  // Slab chưa chuyển BBSL mà thiếu Chất lượng thì không cho tick chọn
  const isRowSelectable = (r: HrcSlabItem): boolean =>
    r.trangThaiKCS !== 0 || hasChatLuong(r);

  const rowSelection: TableRowSelection<HrcSlabItem> = {
    selectedRowKeys,
    getCheckboxProps: (r) => ({
      disabled: !isRowSelectable(r),
      title: !isRowSelectable(r) ? "Thiếu thông tin Chất lượng, không thể chọn để chuyển BBSL" : undefined,
    }),
    onChange: (newKeys) => {
      // Giữ lại selections từ các trang khác, merge với selection trang hiện tại
      const otherPageKeys = selectedRowKeys.filter((k) => !currentPageKeys.includes(k));
      setSelectedRowKeys([...otherPageKeys, ...newKeys]);
    },
    onSelectAll: (selected) => {
      if (selected) {
        const selectableCurrentPageKeys = data
          .filter((r) => isRowSelectable(r))
          .map((r) => r.id as React.Key);
        setSelectedRowKeys([...new Set([...selectedRowKeys, ...selectableCurrentPageKeys])]);
      } else {
        setSelectedRowKeys(selectedRowKeys.filter((k) => !currentPageKeys.includes(k)));
      }
    },
  };

  // Cột mặc định hiện
  const visibleCols = useMemo(() => [
    {
      title: "TT KCS",
      dataIndex: "trangThaiKCS",
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (v: number, r: HrcSlabItem) => (
        <Tooltip title={v === 1 ? `Phiếu: ${r.soPhieuBBSL ?? r.idPhieuBBSL}` : "Chưa chuyển"}>
          <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã chuyển" : "Chưa"}</Tag>
        </Tooltip>
      ),
    },
    {
      title: "TT Đúc",
      dataIndex: "trangThaiDuc",
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (v: number) => <Tag color={TT_COLOR[v]}>{TT_TEXT[v]}</Tag>,
    },
    {
      title: "TT Kho",
      dataIndex: "trangThaiKho",
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (v: number) => <Tag color={TT_COLOR[v]}>{TT_TEXT[v]}</Tag>,
    },
    {
      title: "TT PKH",
      dataIndex: "trangThaiPKH",
      width: 60,
      align: "center" as const,
      fixed: "left" as const,
      render: (v: number) => (
        <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã chốt" : "Chưa"}</Tag>
      ),
    },
    {
      title: "Ngày SX",
      dataIndex: "ngaySXTheoCa",
      width: 95,
      fixed: "left" as const,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Ngày lên BBSL",
      dataIndex: "ngayXuLy",
      fixed: "left" as const,
      width: 105,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    { title: "Ca SX", dataIndex: "shiftName", width: 150, align: "center" as const, fixed: "left" as const, render: (v: string) => v ?? "-" },
    { title: "Kíp", dataIndex: "kipSanXuat", width: 40, align: "center" as const, fixed: "left" as const, render: (v: string) => v ?? "-" },
    { title: "Mẻ thép", dataIndex: "meThep", width: 100, align: "center" as const, fixed: "left" as const },
    {
      title: "ID Slab",
      dataIndex: "idSlab",
      width: 110,
      align: "center" as const,
      fixed: "left" as const,
      render: (v: string, r: HrcSlabItem) => (
        <span style={{ color: r.isDiffMacThep ? "#ff4d4f" : undefined, fontWeight: r.isDiffMacThep ? 600 : undefined }}>
          {v ?? "-"}
        </span>
      ),
    },
    { title: "Mác thép", dataIndex: "macThep", width: 160 , align: "center"},
    {
      title: "Kích thước (mm)",
      key: "kichThuoc",
      width: 190,
      align: "center",
      render: (_: unknown, r: HrcSlabItem) => {
        const parts = [r.chieuDay, r.chieuRong, r.chieuDai];
        return parts.some((v) => v != null) ? parts.map((v) => v ?? "-").join(" × ") : "-";
      },
    },
    {
      title: "KL (tấn)",
      dataIndex: "khoiLuong",
      width: 150,
      align: "right" as const,
      render: (v: number) =>
        v != null ? Number(v).toLocaleString("vi-VN", { minimumFractionDigits: 3 }) : "-",
    },
    {
      title: "Chất lượng",
      dataIndex: "chatLuong",
      width: 280,
      render: (v: string, r: HrcSlabItem) => {
        const missing = r.trangThaiKCS === 0 && !hasChatLuong(r);
        return (
          <Tooltip title={missing ? "Thiếu Chất lượng, không thể chuyển BBSL" : undefined}>
            <span style={{ color: missing ? "#ff4d4f" : undefined, fontWeight: missing ? 600 : undefined }}>
              {v ?? "-"}
            </span>
          </Tooltip>
        );
      },
    },
    { title: "OrderID", dataIndex: "orderId", width: 150 },
    {
      title: "LotName",
      dataIndex: "soLo",
      width: 150,
      render: (v: string, r: HrcSlabItem) => (
        <Tooltip title={r.isSaiLotName ? "Tháng trong LotName không khớp tháng trong Ca SX" : undefined}>
          <span style={{ color: r.isSaiLotName ? "#ff4d4f" : undefined, fontWeight: r.isSaiLotName ? 600 : undefined }}>
            {v ?? "-"}
          </span>
        </Tooltip>
      ),
    },
  ], []);

  // Cột ẩn mặc định — bật/tắt bằng nút "Hiện cột phụ"
  const extraCols = useMemo(() => [
    { title: "Loại phôi", dataIndex: "loaiPhoi", width: 95, render: (v: string) => v ?? "-" },
    { title: "SAP Description", dataIndex: "sapDescription", width: 300, render: (v: string) => v ?? "-" },
    {
      title: "Ca (phiếu)",
      dataIndex: "caBBSL",
      width: 85,
      render: (v: number) => (v === 1 ? "Ca Ngày" : v === 2 ? "Ca Đêm" : (v ?? "-")),
    },
    { title: "Kíp (phiếu)", dataIndex: "kipBBSL", width: 85, render: (v: string) => v ?? "-" },
    { title: "Người Chuyển BBSL (KCS)", dataIndex: "nguoiChuyenBBSL", width: 200, render: (v: string) => v ?? "-" },
    {
      title: "Thời điểm thao tác",
      dataIndex: "thoiDiemThaoTac",
      width: 150,
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm:ss") : "-"),
    },
    { title: "Người xác nhận Đúc", dataIndex: "nguoiXacNhanDuc", width: 200, render: (v: string) => v ?? "-" },
    { title: "Người xác nhận Kho", dataIndex: "nguoiXacNhanKho", width: 200, render: (v: string) => v ?? "-" },
    { title: "Người xác nhận PKH", dataIndex: "nguoiXacNhanPKH", width: 200, render: (v: string) => v ?? "-" },
  ], []);

  const columns = useMemo((): ColumnsType<HrcSlabItem> => {
    if (showExtraColumns) return [...visibleCols, ...extraCols] as ColumnsType<HrcSlabItem>;
    // Khi ẩn cột phụ: bỏ width cột Chất lượng để nó dãn fill ngang bảng
    return visibleCols.map((c) =>
      (c as any).dataIndex === "chatLuong" ? { ...c, width: undefined } : c
    ) as ColumnsType<HrcSlabItem>;
  }, [showExtraColumns, visibleCols, extraCols]);

  const selectedCount = selectedRowKeys.length;
  const canChuyenBBSL = selectedCount > 0 && selectedRows.every(canChuyenBBSLRow);
  const canThuHoi     = selectedCount > 0 && selectedRows.every(canThuHoiRow);

  // Cột phiếu BBSL trong modal
  const phieuColumns = [
    { title: "Số phiếu", dataIndex: "soPhieu", width: 170 },
    { title: "Ngày lên BBSL", dataIndex: "ngaySX", width: 110, render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "-", onCell: () => ({ style: { fontWeight: "bold" } }) },
    { title: "Ca", dataIndex: "ca", width: 100, render: (v: number) => v === 1 ? "Ca Ngày" : v === 2 ? "Ca Đêm" : v ?? "-", onCell: () => ({ style: { fontWeight: "bold" } }) },
    { title: "Kíp", dataIndex: "kip", width: 70, onCell: () => ({ style: { fontWeight: "bold" } }) },
    { title: "Số slab", dataIndex: "soSlabDaChot", width: 75, align: "right" as const },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      width: 110,
      render: (_: number, r: PhieuBBSLItem) => {
        const computed = getComputedPhieuStatus(r);
        if (computed === "chot")       return <Tag color="blue">Đã chốt</Tag>;
        if (computed === "hoanThanh")  return <Tag color="green">Hoàn thành</Tag>;
        return <Tag color="processing">Đang xử lý</Tag>;
      },
    },
  ];

  return (
    <div>
      {/* Form search + Toolbar gộp chung */}
      <Card style={{ marginBottom: 8 }}>
        <Form form={form} layout="vertical" size="small" className="hrc2-search-form" onFinish={handleSearch}>
          <style>{`
            .hrc2-search-form .ant-form-item { margin-bottom: 8px; }
            .hrc2-search-form .ant-form-item-label { padding-bottom: 2px; }
            .hrc2-search-form .ant-form-item-label > label { font-size: 12px; height: 18px; }
          `}</style>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12} md={4}>
              <Form.Item name="dateRange" label="Khoảng ngày SX">
                <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder={["Từ ngày", "Đến ngày"]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item name="dateXLRange" label="Khoảng ngày lên BBSL">
                <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder={["Từ ngày", "Đến ngày"]} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="caSanXuat" label="Ca">
                <Select allowClear placeholder="Chọn ca">
                  <Select.Option value="1">Ca Ngày</Select.Option>
                  <Select.Option value="2">Ca Đêm</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={1}>
              <Form.Item name="kip" label="Kíp">
                <Select allowClear placeholder="Chọn kíp">
                  <Select.Option value="A">A</Select.Option>
                  <Select.Option value="B">B</Select.Option>
                  <Select.Option value="C">C</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            {/* <Col xs={12} sm={6} md={2}>
              <Form.Item name="mayDuc" label="Lò">
                <Select allowClear placeholder="Chọn lò">
                  <Select.Option value={6}>Lò 6</Select.Option>
                  <Select.Option value={7}>Lò 7</Select.Option>
                </Select>
              </Form.Item>
            </Col> */}
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="meThep" label="Tên mẻ">
                <Input placeholder="Tên mẻ..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Form.Item
                name="idSlabs"
                label={
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    ID Slab
                    <Button
                      type="link"
                      size="small"
                      icon={<SnippetsOutlined />}
                      style={{ padding: 0, height: "auto", lineHeight: 1 }}
                      onClick={() => setIdSlabPasteOpen(true)}
                    >
                      Paste
                    </Button>
                  </span>
                }
              >
                <Select
                  mode="tags"
                  allowClear
                  placeholder="Nhập hoặc paste nhiều ID..."
                  tokenSeparators={[",", "\t"]}
                  open={false}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="macThep" label="Mác thép">
                <Input placeholder="Mác thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="trangThaiKCS" label="Tình trạng KCS">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={0}>Chưa chuyển</Select.Option>
                  <Select.Option value={1}>Đã chuyển</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="isChot" label="Tình trạng Chốt">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={false}>Chưa chốt</Select.Option>
                  <Select.Option value={true}>Đã chốt</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="isTrungIDSlab" valuePropName="checked" label=" ">
                <Checkbox>ID Slab trùng</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="isDiffMacThep" valuePropName="checked" label=" ">
                <Checkbox>Khác mác</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="isSaiLotName" valuePropName="checked" label=" ">
                <Checkbox>Sai LotName</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          {/* Hàng nút tìm kiếm + actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>Tìm</Button>
            <Button icon={<ClearOutlined />} onClick={handleClear}>Xóa Lọc</Button>

            <span style={{ color: "#d9d9d9" }}>|</span>
            <span style={{ color: "#555" }}>
              {selectedCount > 0
                ? <b style={{ color: "#1976d2" }}>Đã chọn {selectedCount} dòng</b>
                : `Tổng: ${pagination.total} bản ghi`}
            </span>

            {!readOnly && !isView && isKCS && (<>
              <Button type="primary" icon={<ArrowUpOutlined />} disabled={!canChuyenBBSL} loading={actionLoading} onClick={handleOpenChuyenBBSL}>
                Chuyển BBSL
              </Button>
              <Popconfirm title={`Thu hồi ${selectedCount} slab đã chọn?`} onConfirm={handleThuHoi} disabled={!canThuHoi}>
                <Button icon={<RollbackOutlined />} disabled={!canThuHoi} loading={actionLoading}>Thu hồi</Button>
              </Popconfirm>
            </>)}

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button icon={showExtraColumns ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setShowExtraColumns((v) => !v)}>
                {showExtraColumns ? "Ẩn cột phụ" : "Hiện cột phụ"}
              </Button>
              {!readOnly && isKCS && (
                <Button icon={<SyncOutlined />} onClick={() => setSyncVisible(true)}>Sync BKMIS</Button>
              )}
            </div>
          </div>
        </Form>
      </Card>

      {/* Bảng dữ liệu */}
      <Card bodyStyle={{ padding: "8px 12px" }}>
        <Table<HrcSlabItem>
          rowKey="id"
          rowSelection={readOnly ? undefined : rowSelection}
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          sticky
          scroll={{ x: showExtraColumns ? "max-content" : true, y: "calc(100vh - 330px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            onChange: (page, pageSize) => fetchData(page, pageSize, undefined, false),
          }}
          rowClassName={(r) =>
            r.isTrungIDSlab ? "row-trung-idslab" :
            r.isChot ? "row-chot" :
            r.trangThaiKCS === 1 ? "row-chuyen" : ""
          }
        />
      </Card>

      {/* Modal Sync BKMIS */}
      <Modal
        title="Sync dữ liệu từ BKMIS"
        open={syncVisible}
        onCancel={() => { setSyncVisible(false); syncForm.resetFields(); }}
        footer={null}
        width={440}
      >
        <Form form={syncForm} layout="vertical" onFinish={handleSync}>
          <Form.Item name="syncRange" label="Khoảng ngày sync">
            <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder={["Từ ngày", "Đến ngày"]} />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setSyncVisible(false); syncForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={syncLoading} icon={<SyncOutlined />}>
                Sync ngay
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chọn phiếu BBSL */}
      <Modal
        title="Chọn phiếu BBSL để chuyển slab vào"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Hủy</Button>,
          <Button
            key="create"
            onClick={() => {
              // Pre-fill ngaySX và ca từ slab đã chọn
              const first = selectedRows[0];
              if (first?.ngaySanXuat) {
                createForm.setFieldValue("ngaySX", dayjs(String(first.ngaySanXuat)));
              }
              const caRaw = parseInt(String(first?.caSanXuat ?? ""), 10);
              if (caRaw === 1 || caRaw === 2) createForm.setFieldValue("ca", caRaw);
              setCreateVisible(true);
            }}
          >
            + Tạo phiếu mới
          </Button>,
          <Button
            key="ok"
            type="primary"
            disabled={!selectedPhieu}
            loading={actionLoading}
            onClick={handleConfirmChuyenBBSL}
          >
            Xác nhận chuyển vào phiếu đã chọn
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 8, color: "#555" }}>
          Sẽ chuyển <b>{selectedCount}</b> slab vào phiếu được chọn (Kíp <b>{phieuKipCa.kip ?? "-"}</b>, Ca{" "}
          <b>{phieuKipCa.ca === 1 ? "Ngày" : phieuKipCa.ca === 2 ? "Đêm" : phieuKipCa.ca ?? "-"}</b>).
          {selectedPhieu && (
            <> Phiếu đã chọn: <b style={{ color: "#1976d2" }}>{selectedPhieu.soPhieu}</b></>
          )}
        </p>
        <Form form={phieuSearchForm} layout="inline" style={{ marginBottom: 12 }} onFinish={handleSearchPhieuBBSL}>
          <Form.Item name="dateRange" label="Khoảng ngày SX của phiếu">
            <RangePicker format="DD/MM/YYYY" allowClear={false} />
          </Form.Item>
          <Form.Item>
            <Button icon={<SearchOutlined />} htmlType="submit" loading={phieuLoading}>
              Tìm kiếm
            </Button>
          </Form.Item>
        </Form>
        <Table<PhieuBBSLItem>
          rowKey="idPhieu"
          columns={phieuColumns}
          dataSource={phieuList}
          loading={phieuLoading}
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedPhieu ? [selectedPhieu.idPhieu] : [],
            onChange: (_, rows) => {
              const p = rows[0];
              if (p && getComputedPhieuStatus(p) === "chot") { message.warning("Phiếu đã chốt, không thể chọn!"); return; }
              setSelectedPhieu(p ?? null);
            },
            getCheckboxProps: (r) => ({ disabled: getComputedPhieuStatus(r) === "chot" }),
          }}
          onRow={(r) => ({
            onClick: () => {
              if (getComputedPhieuStatus(r) === "chot") { message.warning("Phiếu đã chốt, không thể chọn!"); return; }
              setSelectedPhieu(r);
            },
            style: {
              cursor: getComputedPhieuStatus(r) === "chot" ? "not-allowed" : "pointer",
              opacity: getComputedPhieuStatus(r) === "chot" ? 0.5 : 1,
            },
          })}
        />
      </Modal>

      {/* Modal paste danh sách ID Slab */}
      <Modal
        title="Paste danh sách ID Slab"
        open={idSlabPasteOpen}
        onOk={handleIdSlabPasteConfirm}
        onCancel={() => { setIdSlabPasteOpen(false); setIdSlabPasteText(""); }}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <p style={{ marginBottom: 8, color: "#666", fontSize: 12 }}>
          Paste danh sách ID Slab từ Excel (mỗi dòng 1 ID, hoặc phân cách bằng dấu phẩy/tab).
        </p>
        <Input.TextArea
          autoFocus
          value={idSlabPasteText}
          onChange={(e) => setIdSlabPasteText(e.target.value)}
          placeholder="Paste dữ liệu từ Excel vào đây..."
          rows={8}
        />
      </Modal>

      {/* Sub-modal tạo phiếu BBSL mới */}
      <Modal
        title="Tạo phiếu biên bản sản lượng mới"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); createForm.resetFields(); }}
        footer={null}
        width={380}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreatePhieu}>
          <Form.Item
            name="ngaySX"
            label="Ngày sản xuất"
            rules={[{ required: true, message: "Chọn ngày sản xuất" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
          </Form.Item>
          <Form.Item
            name="ca"
            label="Ca sản xuất"
            rules={[{ required: true, message: "Chọn ca" }]}
          >
            <Select placeholder="Chọn ca">
              <Select.Option value={1}>Ca ngày (1)</Select.Option>
              <Select.Option value={2}>Ca đêm (2)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setCreateVisible(false); createForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                Tạo phiếu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BkHrc2SlabTable;
