/* eslint-disable @typescript-eslint/no-explicit-any */
import TKVV_BC_SanLuongChiPhi from "../../../utils/BM_config/TKVV_BC_SanLuongChiPhi.json";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import {
  CloudDownloadOutlined,
  DeploymentUnitOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable, {
  type FormColumnDef,
} from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import {
  tkvvBcSlChiPhiApi,
  tkvvNvlApi,
  tkvvNvlSiloMappingApi,
  tkvvSiloApi,
  type TKVVBaoCaoSanLuongChiPhiDto,
  type TKVVNguyenVatLieuDto,
  type TKVVNvlSiloMappingDto,
  type TKVVSiloDto,
} from "../../../services/TKVVApi";
import {
  TKVV_SCOPES,
  getTKVVScopeByNumber,
} from "../../../utils/constants/TKVV_constant";

interface TableRow {
  key: string | number;
  dbId?: number | null; // TKVV_BaoCaoSanLuongChiPhi.ID
  nguyenVatLieuID?: number;
  siloID?: number | null;
  maSilo?: string | null;
  kip?: string;
  nguyenLieu?: string;
  donViTinh?: string | null;
  klAm?: number | string;
  klAmAuto?: number | string; // KLAmAuto từ hệ thống cân — chỉ tham chiếu, không sửa
  isAdjusted?: boolean;
  doAm?: number | string;
  quyKho?: number | string;
  thanhPhamL1?: number | string;
  thanhPhamL2?: number | string;
  ghiChu?: string;
  [key: string]: any;
}

interface SiloMappingModalRow {
  id?: number;
  key: string | number;
  ca: number;
  nguyenVatLieuID: number | null;
  siloID: number | null;
  thuTu: number;
}

const SUM_KEYS = ["klAm", "quyKho", "thanhPhamL1", "thanhPhamL2"] as const;

const MA_BM = "TKVV_BC_SanLuongChiPhi";
const LOAI_DU_LIEU = "SANLUONG";

const SCOPE_OPTIONS = TKVV_SCOPES.map((s) => ({
  label: s.label,
  value: s.scope,
}));

const calcQuyKho = (klAmRaw: any, doAmRaw: any): number | string => {
  const klAm = parseFloat(String(klAmRaw));
  if (isNaN(klAm)) return "";
  const doAm = parseFloat(String(doAmRaw));
  if (isNaN(doAm)) return parseFloat(klAm.toFixed(3));
  return parseFloat((klAm * (1 - doAm / 100)).toFixed(3));
};

const withQuyKho = (rows: TableRow[]): TableRow[] =>
  rows.map((r) => ({ ...r, quyKho: calcQuyKho(r.klAm, r.doAm) }));

const buildBlankRow = (idx: number): TableRow => ({
  key: `blank-${idx}-${Date.now()}`,
  kip: "",
  nguyenLieu: "",
  klAm: "",
  doAm: "",
  quyKho: "",
  thanhPhamL1: "",
  thanhPhamL2: "",
  ghiChu: "",
});

const fromDbRecord = (
  item: TKVVBaoCaoSanLuongChiPhiDto,
  idx: number,
): TableRow => ({
  key: `db-${item.id}-${idx}`,
  dbId: item.id,
  nguyenVatLieuID: item.nguyenVatLieuID,
  kip: item.kip ?? "",
  nguyenLieu: item.tenNVL ?? "",
  donViTinh: null,
  klAm: item.klAm ?? "",
  klAmAuto: item.klAmAuto ?? "",
  isAdjusted: item.isAdjusted,
  doAm: item.doAm ?? "",
  quyKho: item.quyKho ?? calcQuyKho(item.klAm, item.doAm),
  thanhPhamL1: item.thanhPhamL1 ?? "",
  thanhPhamL2: item.thanhPhamL2 ?? "",
  ghiChu: item.ghiChu ?? "",
});

const fromNearestMapping = (
  m: TKVVNvlSiloMappingDto,
  idx: number,
): TableRow => ({
  key: `nearest-${m.siloID ?? 0}-${m.nguyenVatLieuID}-${idx}`,
  nguyenVatLieuID: m.nguyenVatLieuID,
  siloID: m.siloID,
  maSilo: m.maSilo,
  nguyenLieu: m.tenNVL ?? "",
  donViTinh: null,
  klAm: "",
  doAm: "",
  quyKho: "",
  thanhPhamL1: "",
  thanhPhamL2: "",
  ghiChu: "",
});

const TaoPhieuBaoCaoSanLuongChiPhi = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = TKVV_BC_SanLuongChiPhi as any;
  const [form] = Form.useForm();

  const [tableDataNgay, setTableDataNgay] = useState<TableRow[]>([]);
  const [tableDataDem, setTableDataDem] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEMS, setLoadingEMS] = useState(false);
  const [loadingSilo, setLoadingSilo] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");

  const [showSiloModal, setShowSiloModal] = useState(false);
  const [modalRows, setModalRows] = useState<SiloMappingModalRow[]>([]);
  const [modalNgaySXGan, setModalNgaySXGan] = useState("");
  const [nvlList, setNvlList] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [siloList, setSiloList] = useState<TKVVSiloDto[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const [ngaySXFilter, setNgaySXFilter] = useState<dayjs.Dayjs | null>(dayjs());
  const [selectedScope, setSelectedScope] = useState<number | undefined>();

  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: any[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  const phieuInfoRef = useRef(phieuInfo);
  useEffect(() => {
    phieuInfoRef.current = phieuInfo;
  }, [phieuInfo]);

  const tableDataNgayRef = useRef(tableDataNgay);
  useEffect(() => {
    tableDataNgayRef.current = tableDataNgay;
  }, [tableDataNgay]);
  const tableDataDemRef = useRef(tableDataDem);
  useEffect(() => {
    tableDataDemRef.current = tableDataDem;
  }, [tableDataDem]);
  const ngaySXRef = useRef(ngaySXFilter);
  useEffect(() => {
    ngaySXRef.current = ngaySXFilter;
  }, [ngaySXFilter]);
  const selectedScopeRef = useRef(selectedScope);
  useEffect(() => {
    selectedScopeRef.current = selectedScope;
  }, [selectedScope]);

  const currentUserInfo = useMemo(() => getThongTinUser(), []);
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

  const getUserInfo = useCallback(() => getThongTinUser(), []);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      if (idphieu) {
        const res: any = await PhieuApi.getDetail(idphieu);
        if (res) {
          setSoPhieu(res.soPhieu || "");
          const data = res.jsonData || {};

          const signatureFields: Record<string, any> = {};
          (res.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) =>
                s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy",
            );
            if (sig && pd.nguoiDuyetId)
              signatureFields[sig.key] = pd.nguoiDuyetId;
          });

          const tinhTrang = res.tinhTrang ?? 0;
          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const p = dayjs(data[k]);
              parsedDates[k] = p.isValid() ? p : null;
            }
          });

          form.setFieldsValue({ ...data, ...signatureFields, ...parsedDates });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((s: any) => s.capDuyet === 0)
              .forEach((s: any) => {
                overrides[s.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0)
              form.setFieldsValue(overrides);
          }

          setTableDataNgay(
            Array.isArray(data.table1) && data.table1.length > 0
              ? withQuyKho(
                  data.table1.map((r: any, i: number) => ({
                    ...r,
                    key: r.key ?? `ngay-${i}`,
                  })),
                )
              : [],
          );
          setTableDataDem(
            Array.isArray(data.table2) && data.table2.length > 0
              ? withQuyKho(
                  data.table2.map((r: any, i: number) => ({
                    ...r,
                    key: r.key ?? `dem-${i}`,
                  })),
                )
              : [],
          );
          if (data.scope) setSelectedScope(Number(data.scope));
          const ngaySXValue = data.ngaySX || data.NgaySX;
          if (ngaySXValue) setNgaySXFilter(dayjs(ngaySXValue));

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: res.nguoiTaoId ?? null,
            idphongBan: res.idphongBan ?? null,
            pheDuyet: res.pheDuyet || data.pheDuyet || [],
            isClone: res.isClone ?? false,
            idPhieuGoc:
              res.idPhieuGoc ?? res.iD_PhieuGoc ?? res.ID_PhieuGoc ?? null,
          });
        }
      } else {
        setPhieuInfo({});
        setTableDataNgay([]);
        setTableDataDem([]);
        setTimeout(() => {
          const overrides: Record<string, any> = {
            tuNgay: dayjs(),
            denNgay: dayjs().add(1, "day"),
          };
          config.signatures
            .filter((s: any) => s.capDuyet === 0)
            .forEach((s: any) => {
              overrides[s.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idphieu, config.signatures, config.headerFields, currentUserInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleLoadEMS = useCallback(async () => {
    if (!ngaySXFilter) {
      message.warning("Chọn ngày sản xuất");
      return;
    }
    if (!selectedScope) {
      message.warning("Chọn xưởng (scope)");
      return;
    }
    setLoadingEMS(true);
    try {
      const ngayStr = ngaySXFilter.format("YYYY-MM-DD");
      const result = await tkvvBcSlChiPhiApi.loadDuLieu({
        ngaySX: ngayStr,
        maBM: MA_BM,
        loaiDuLieu: LOAI_DU_LIEU,
        scope: selectedScope,
        createdBy: currentUserInfo?.iD_TaiKhoan ?? null,
      });

      const msgs: string[] = [];

      if (result.table1.length > 0) {
        setTableDataNgay(result.table1.map(fromDbRecord));
        msgs.push(`Ca ngày: ${result.table1.length} dòng`);
      } else {
        // Không có dữ liệu EMS — dùng mapping làm cấu trúc dòng trống
        const mapping = await tkvvNvlSiloMappingApi.getList({
          scope: String(selectedScope),
          ngaySX: ngayStr,
          ca: 1,
        });
        setTableDataNgay(mapping.map(fromNearestMapping));
        msgs.push(
          mapping.length > 0
            ? `Ca ngày: ${mapping.length} dòng từ mapping (chưa có dữ liệu EMS)`
            : "Ca ngày: chưa có dữ liệu EMS và mapping",
        );
      }

      if (result.table2.length > 0) {
        setTableDataDem(result.table2.map(fromDbRecord));
        msgs.push(`Ca đêm: ${result.table2.length} dòng`);
      } else {
        const mapping = await tkvvNvlSiloMappingApi.getList({
          scope: String(selectedScope),
          ngaySX: ngayStr,
          ca: 2,
        });
        setTableDataDem(mapping.map(fromNearestMapping));
        msgs.push(
          mapping.length > 0
            ? `Ca đêm: ${mapping.length} dòng từ mapping (chưa có dữ liệu EMS)`
            : "Ca đêm: chưa có dữ liệu EMS và mapping",
        );
      }

      message.info(msgs.join(" — "));
    } catch {
      message.error("Lỗi khi tải dữ liệu từ EMS");
    } finally {
      setLoadingEMS(false);
    }
  }, [ngaySXFilter, selectedScope, currentUserInfo]);

  const handleCheckSilo = useCallback(async () => {
    if (!ngaySXFilter) {
      message.warning("Chọn ngày sản xuất");
      return;
    }
    if (!selectedScope) {
      message.warning("Chọn xưởng (scope)");
      return;
    }
    setLoadingSilo(true);
    try {
      const ngayStr = ngaySXFilter.format("YYYY-MM-DD");
      const scopeNum = String(selectedScope);
      const [[today, nvls, silos]] = await Promise.all([
        Promise.all([
          tkvvNvlSiloMappingApi.getList({ scope: scopeNum, ngaySX: ngayStr }),
          tkvvNvlApi.getList({ scope: scopeNum }),
          tkvvSiloApi.getList({ scope: scopeNum }),
        ]),
      ]);
      setNvlList(nvls ?? []);
      setSiloList(silos ?? []);

      let source: TKVVNvlSiloMappingDto[] = today ?? [];
      let fromDate = ngayStr;
      let isToday = true;

      if (source.length === 0) {
        // Chưa có mapping hôm nay → lấy nearest để làm template
        source = await tkvvNvlSiloMappingApi.getNearest({
          scope: scopeNum,
          beforeDate: ngayStr,
        });
        fromDate = source[0]?.ngaySX
          ? String(source[0].ngaySX).slice(0, 10)
          : "";
        isToday = false;
      }

      const rows: SiloMappingModalRow[] = source.map((m, i) => ({
        id: m.id ?? 0,
        key: i,
        ca: m.ca,
        nguyenVatLieuID: m.nguyenVatLieuID,
        siloID: m.siloID ?? null,
        thuTu: m.thuTu ?? i + 1,
      }));
      setModalRows(rows);
      setModalNgaySXGan(isToday ? "" : fromDate);
      setShowSiloModal(true);
    } catch {
      message.error("Lỗi khi tải mapping silo");
    } finally {
      setLoadingSilo(false);
    }
  }, [ngaySXFilter, selectedScope]);

  const updateModalRow = useCallback(
    (idx: number, field: keyof SiloMappingModalRow, value: any) => {
      setModalRows((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const addModalRow = useCallback(() => {
    setModalRows((prev) => [
      ...prev,
      {
        key: Date.now(),
        ca: 1,
        nguyenVatLieuID: null,
        siloID: null,
        thuTu: prev.length + 1,
      },
    ]);
  }, []);

  const deleteModalRow = useCallback((idx: number) => {
    setModalRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSaveMapping = useCallback(async () => {
    if (!ngaySXFilter || !selectedScope) return;
    if (modalRows.some((r) => !r.nguyenVatLieuID)) {
      message.warning("Vui lòng chọn Nguyên vật liệu cho tất cả dòng");
      return;
    }
    setLoadingBatch(true);
    try {
      const ngayStr = ngaySXFilter.format("YYYY-MM-DD");
      await tkvvNvlSiloMappingApi.batchCreate({
        maBM: "ALL", // set maBM = "ALL" để lưu cho tất cả BM (TonSilo và BC_SanLuongChiPhi)
        scope: String(selectedScope),
        ngaySX: ngayStr,
        rows: modalRows.map((r, i) => ({
          id: r.id ?? 0,
          nguyenVatLieuID: r.nguyenVatLieuID!,
          siloID: r.siloID,
          ca: r.ca,
          thuTu: r.thuTu ?? i + 1,
        })),
      });
      setShowSiloModal(false);
      message.success("Đã lưu mapping — đang tải dữ liệu EMS...");
      await handleLoadEMS();
    } catch {
      message.error("Lỗi khi lưu mapping");
    } finally {
      setLoadingBatch(false);
    }
  }, [ngaySXFilter, selectedScope, modalRows, handleLoadEMS]);

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
    const processRows = (rows: TableRow[]) =>
      rows.map((row, idx) => {
        const r: Record<string, any> = { thuTu: idx + 1 };
        Object.keys(row).forEach((k) => {
          if (k !== "key") r[k] = row[k];
        });
        return r;
      });
    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
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
      table1: processRows(tableDataNgay),
      table2: processRows(tableDataDem),
      scope: selectedScope ?? null,
      ngaySX: (ngaySXFilter ?? dayjs()).format("YYYY-MM-DD"),
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [
    getUserInfo,
    form,
    config,
    tableDataNgay,
    tableDataDem,
    selectedScope,
    ngaySXFilter,
  ]);

  const saveBcSlRows = useCallback(
    async (phieuId?: string) => {
      const userInfo = getUserInfo();
      const userId = userInfo.iD_TaiKhoan;
      if (!userId) return;

      const ngaySX = ngaySXRef.current;
      const scope = selectedScopeRef.current;
      if (!ngaySX || !scope) return;

      const ngayStr = ngaySX.format("YYYY-MM-DD");
      const toNum = (v: any) => (v !== "" && v != null ? Number(v) : null);

      const toSaveRow = (row: TableRow, ca: number, idx: number) => ({
        id: row.dbId ?? null,
        ngaySX: ngayStr,
        ca,
        scope, // INT — gửi thẳng giá trị number
        nguyenVatLieuID: row.nguyenVatLieuID ?? 0,
        kip: row.kip ?? null,
        thuTu: idx + 1,
        klAm: toNum(row.klAm),
        klAmAuto: toNum(row.klAmAuto),
        doAm: toNum(row.doAm),
        quyKho: toNum(row.quyKho),
        thanhPhamL1: toNum(row.thanhPhamL1),
        thanhPhamL2: toNum(row.thanhPhamL2),
        ghiChu: row.ghiChu ?? null,
      });

      // Chỉ lưu các dòng có dbId (đã được load từ DB) hoặc có nguyenVatLieuID hợp lệ
      const rows = [
        ...tableDataNgayRef.current
          .filter((r) => r.dbId || r.nguyenVatLieuID)
          .map((r, i) => toSaveRow(r, 1, i)),
        ...tableDataDemRef.current
          .filter((r) => r.dbId || r.nguyenVatLieuID)
          .map((r, i) => toSaveRow(r, 2, i)),
      ];
      if (rows.length === 0) return;

      try {
        await tkvvBcSlChiPhiApi.savePhieuRows({
          maBM: MA_BM,
          phieuID: phieuId ?? idphieu ?? null,
          currentUserId: userId,
          rows,
        });
      } catch {
        // không block phiếu nếu lưu BCSL lỗi
      }
    },
    [getUserInfo, idphieu],
  );

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      await saveBcSlRows(context?.newPhieuId);
      if (context?.newPhieuId) {
        navigate(`/chitietbaocaoslcptkvv/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }
      await initData();
    },
    [navigate, initData, saveBcSlRows],
  );

  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (err: any) {
      message.error(err?.message || "Vui lòng kiểm tra dữ liệu");
    }
  }, [form]);

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
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(
      buttons,
      idphieu || "",
      getFormData,
    );
  }, [
    getUserInfo,
    idphieu,
    phieuInfo,
    getFormData,
    handleStatusChange,
    handleActionSuccess,
    config.code,
  ]);

  const tableColumns: FormColumnDef[] = useMemo(() => {
    const section = config.layout.find(
      (s: any) => s.sectionType === "table" && s.key === "table1",
    );
    return (section?.columns || []) as FormColumnDef[];
  }, [config]);

  const bcSlCellDecorator = useCallback((dataIndex: string, record: any) => {
    if (dataIndex === "klAm" && record.klAmAuto != null && record.klAmAuto !== "") {
      const klAmNum = parseFloat(String(record.klAm));
      const klAmAutoNum = parseFloat(String(record.klAmAuto));
      if (!isNaN(klAmNum) && !isNaN(klAmAutoNum) && klAmNum !== klAmAutoNum) {
        return {
          style: { backgroundColor: "#fffbe6", borderColor: "#faad14" },
          tooltip: `KL ẩm Auto: ${klAmAutoNum.toLocaleString("en-US", { maximumFractionDigits: 3 })}`,
        };
      }
    }
    return null;
  }, []);

  const handleCellChangeNgay = useCallback(
    (rowIndex: number, dataIndex: string, value: any) => {
      if (dataIndex !== "doAm" && dataIndex !== "klAm") return;
      setTableDataNgay((prev) => {
        const r = { ...prev[rowIndex], [dataIndex]: value };
        r.quyKho = calcQuyKho(r.klAm, r.doAm);
        const updated = [...prev];
        updated[rowIndex] = r;
        return updated;
      });
    },
    [],
  );

  const handleCellChangeDem = useCallback(
    (rowIndex: number, dataIndex: string, value: any) => {
      if (dataIndex !== "doAm" && dataIndex !== "klAm") return;
      setTableDataDem((prev) => {
        const r = { ...prev[rowIndex], [dataIndex]: value };
        r.quyKho = calcQuyKho(r.klAm, r.doAm);
        const updated = [...prev];
        updated[rowIndex] = r;
        return updated;
      });
    },
    [],
  );

  const buildSummary = useCallback((data: readonly any[]) => {
    const totals: Record<string, number> = {
      klAm: 0,
      quyKho: 0,
      thanhPhamL1: 0,
      thanhPhamL2: 0,
    };
    data.forEach((row) => {
      SUM_KEYS.forEach((k) => {
        const v = Number(row[k]);
        if (!Number.isNaN(v)) totals[k] += v;
      });
    });
    const fmt = (n: number) =>
      n ? n.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "";
    return (
      <tr>
        <td style={{ fontWeight: 600, textAlign: "center" }}>TỔNG</td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.klAm)}
        </td>
        <td />
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.quyKho)}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.thanhPhamL1)}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.thanhPhamL2)}
        </td>
        <td />
      </tr>
    );
  }, []);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          {config.title}
        </Typography.Title>
        {idphieu && <b>Số phiếu: {soPhieu}</b>}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* ─── Ngày SX + Xưởng ────────────────────────────────────────────────── */}
        <Space wrap align="end" style={{ marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 14 }}>
              Ngày sản xuất
            </div>
            <DatePicker
              value={ngaySXFilter}
              onChange={setNgaySXFilter}
              format="DD/MM/YYYY"
              style={{ width: 160 }}
              placeholder="Chọn ngày SX"
              allowClear={false}
              disabled={!!idphieu}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 14 }}>
              Xưởng
            </div>
            <Select
              value={selectedScope}
              onChange={setSelectedScope}
              options={SCOPE_OPTIONS}
              placeholder="Chọn xưởng"
              style={{ width: 220 }}
              allowClear
              disabled={!!idphieu}
            />
          </div>
        </Space>

        {/* ─── Hàng action: nút quy trình + Tải EMS + Quay lại ──────────────── */}
        <div
          style={{
            margin: "12px 0 16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Space wrap>
            {actionButtons}
            {!isFormLocked && (
              <>
                <Button
                  icon={<CloudDownloadOutlined />}
                  loading={loadingEMS}
                  onClick={handleLoadEMS}
                  disabled={!ngaySXFilter || !selectedScope}
                >
                  Tải dữ liệu
                </Button>
                <Button
                  icon={<DeploymentUnitOutlined />}
                  loading={loadingSilo}
                  onClick={handleCheckSilo}
                  disabled={!ngaySXFilter || !selectedScope}
                >
                  Kiểm tra Silo
                </Button>
              </>
            )}
            <Button
              icon={<UndoOutlined />}
              onClick={() => navigate("/baocaoslcptkvv")}
            >
              Quay lại
            </Button>
          </Space>
        </div>

        {/* ─── Ca ngày ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Typography.Text strong style={{ color: "#d46b08", fontSize: 14 }}>
            Ca ngày (Ca 1)
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {tableDataNgay.length} dòng
          </Typography.Text>
        </div>
        <div style={{ width: "100%", overflowX: "auto", marginBottom: 4 }}>
          <CustomFormTable
            columns={tableColumns}
            initialData={tableDataNgay}
            onDataChange={setTableDataNgay}
            onCellChange={handleCellChangeNgay}
            editable={!isFormLocked}
            loading={loading || loadingEMS}
            minRows={0}
            showAddButton={false}
            showDeleteButton={!isFormLocked && tableDataNgay.length > 0}
            summary={buildSummary}
            cellDecorator={bcSlCellDecorator}
          />
        </div>
        {!isFormLocked && (
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              setTableDataNgay((p) => [...p, buildBlankRow(p.length + 1)])
            }
            type="dashed"
            size="small"
            style={{ marginBottom: 16 }}
          >
            Thêm dòng
          </Button>
        )}

        {/* ─── Ca đêm ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Typography.Text strong style={{ color: "#0958d9", fontSize: 14 }}>
            Ca đêm (Ca 2)
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {tableDataDem.length} dòng
          </Typography.Text>
        </div>
        <div style={{ width: "100%", overflowX: "auto", marginBottom: 4 }}>
          <CustomFormTable
            columns={tableColumns}
            initialData={tableDataDem}
            onDataChange={setTableDataDem}
            onCellChange={handleCellChangeDem}
            editable={!isFormLocked}
            loading={loading || loadingEMS}
            minRows={0}
            showAddButton={false}
            showDeleteButton={!isFormLocked && tableDataDem.length > 0}
            summary={buildSummary}
            cellDecorator={bcSlCellDecorator}
          />
        </div>
        {!isFormLocked && (
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              setTableDataDem((p) => [...p, buildBlankRow(p.length + 1)])
            }
            type="dashed"
            size="small"
            style={{ marginBottom: 20 }}
          >
            Thêm dòng
          </Button>
        )}

        {config.footerNotes?.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12, color: "#888" }}>
            {config.footerNotes.map((note: string, i: number) => (
              <div key={i}>* {note}</div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig: any, i: number) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue = isLevelZero
              ? (currentUserInfo?.iD_TaiKhoan ?? null)
              : undefined;
            const duyet = phieuInfo.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capDuyet,
            );
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 6 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {duyet?.tinhTrang === 1
                        ? "Đã ký"
                        : duyet?.tinhTrang === 2
                          ? "Đã từ chối"
                          : "Chưa xử lý"}
                    </Typography.Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Form>

      {/* ─── Modal Kiểm tra / Thiết lập Silo Mapping ──────────────────────── */}
      <Modal
        title={
          <span>
            Thiết lập Silo Mapping
            {ngaySXFilter && (
              <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                — {ngaySXFilter.format("DD/MM/YYYY")} ·{" "}
                {getTKVVScopeByNumber(selectedScope ?? 0)?.label ?? ""}
              </span>
            )}
            {modalNgaySXGan && (
              <span
                style={{
                  fontWeight: 400,
                  fontSize: 12,
                  marginLeft: 8,
                  color: "#888",
                }}
              >
                (từ ngày {modalNgaySXGan})
              </span>
            )}
          </span>
        }
        open={showSiloModal}
        onCancel={() => setShowSiloModal(false)}
        width={760}
        footer={[
          <Button key="cancel" onClick={() => setShowSiloModal(false)}>
            Hủy
          </Button>,
          <Button key="add" onClick={addModalRow} icon={<PlusOutlined />}>
            Thêm dòng
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={loadingBatch}
            onClick={handleSaveMapping}
          >
            Lưu &amp; Tải dữ liệu
          </Button>,
        ]}
        destroyOnHidden
      >
        <Table<SiloMappingModalRow>
          dataSource={modalRows}
          rowKey="key"
          pagination={false}
          size="small"
          columns={[
            {
              title: "Ca",
              dataIndex: "ca",
              width: 110,
              render: (val, _, idx) => (
                <Select
                  value={val}
                  onChange={(v) => updateModalRow(idx, "ca", v)}
                  style={{ width: "100%" }}
                  options={[
                    { label: "Ca ngày", value: 1 },
                    { label: "Ca đêm", value: 2 },
                  ]}
                />
              ),
            },
            {
              title: "Tên nguyên vật liệu",
              dataIndex: "nguyenVatLieuID",
              render: (val, _, idx) => (
                <Select
                  value={val}
                  onChange={(v) => updateModalRow(idx, "nguyenVatLieuID", v)}
                  style={{ width: "100%" }}
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn NVL"
                  options={nvlList.map((n) => ({
                    label: n.tenNVL,
                    value: n.id,
                  }))}
                />
              ),
            },
            {
              title: "Mã Silo",
              dataIndex: "siloID",
              width: 200,
              render: (val, _, idx) => (
                <Select
                  value={val}
                  onChange={(v) => updateModalRow(idx, "siloID", v)}
                  style={{ width: "100%" }}
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  placeholder="Chọn Silo"
                  options={siloList.map((s) => ({
                    label: s.maSilo ? `${s.maSilo} - ${s.tenSilo}` : s.tenSilo,
                    value: s.id,
                  }))}
                />
              ),
            },
            {
              title: "Thứ tự",
              dataIndex: "thuTu",
              width: 80,
              render: (val, _, idx) => (
                <input
                  type="number"
                  value={val ?? ""}
                  onChange={(e) =>
                    updateModalRow(idx, "thuTu", Number(e.target.value))
                  }
                  style={{
                    width: "100%",
                    border: "1px solid #d9d9d9",
                    borderRadius: 4,
                    padding: "4px 8px",
                  }}
                />
              ),
            },
            {
              title: "",
              width: 50,
              render: (_, __, idx) => (
                <Button
                  danger
                  size="small"
                  type="text"
                  onClick={() => deleteModalRow(idx)}
                >
                  Xóa
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </Card>
  );
};

export default TaoPhieuBaoCaoSanLuongChiPhi;
