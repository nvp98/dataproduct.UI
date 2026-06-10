/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_NapLieuLoCao from "../../../utils/BM_config/LG_BB_NapLieuLoCao.json";
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from "antd";
import { CopyOutlined, FilterOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomTableLG, {
  type TableColumnDef,
  type TableSectionConfig,
} from "../../../components/CustomTableLG";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  lgnlChiTietApi,
  lgnlMappingApi,
  lgnlNhomNvlApi,
  lgnlNvlApi,
  lgnlSiLoMasterApi,
  napLieuLoCaoApi,
  type CreateLGNLMappingDto,
  type LGNLMappingDto,
  type LGNLNhomNvlDto,
  type LGNLNvlDto,
  type LGNLSiLoMasterDto,
  type LGNLSiloSnapshotDto,
} from "../../../services/LGNLApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const TaoPhieuNapLieuLoCao = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_BB_NapLieuLoCao;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [materialColumnsOverride, setMaterialColumnsOverride] = useState<TableColumnDef[] | null>(null);
  const [doAmMap, setDoAmMap] = useState<Record<string, number>>({});
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

  const ca = Form.useWatch("ca", form);
  const scope = Form.useWatch("scope", form);
  const ngaySX = Form.useWatch("NgaySX", form);

  const [siloSnapshotOpen, setSiloSnapshotOpen] = useState(false);
  const [siloSnapshotData, setSiloSnapshotData] = useState<LGNLSiloSnapshotDto[]>([]);
  const [siloSnapshotLoading, setSiloSnapshotLoading] = useState(false);
  const [mapDraftBySilo, setMapDraftBySilo] = useState<Record<number, number | null>>({});
  const [mapNoteBySilo, setMapNoteBySilo] = useState<Record<number, string>>({});
  const [mapSavingSiloId, setMapSavingSiloId] = useState<number | null>(null);

  const [doiNVLOpen, setDoiNVLOpen] = useState(false);
  const [doiNVLRow, setDoiNVLRow] = useState<LGNLSiloSnapshotDto | null>(null);
  const [doiNVLLoading, setDoiNVLLoading] = useState(false);
  const [nvlOptions, setNvlOptions] = useState<LGNLNvlDto[]>([]);
  const [nhomNvlOptions, setNhomNvlOptions] = useState<LGNLNhomNvlDto[]>([]);
  const [createNewNVL, setCreateNewNVL] = useState(false);
  const [createNvlForm] = Form.useForm();
  const [doiNVLForm] = Form.useForm();

  const [copyMappingLoading, setCopyMappingLoading] = useState(false);

  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [addMappingLoading, setAddMappingLoading] = useState(false);
  const [addMappingForm] = Form.useForm();
  const [siloMasterOptions, setSiloMasterOptions] = useState<LGNLSiLoMasterDto[]>([]);
  const mappedSiloIds = useMemo(
    () => new Set(siloSnapshotData.filter((item) => item.idNVL != null).map((item) => item.idSiLo)),
    [siloSnapshotData]
  );

  const scopeNvlOptions = useMemo(
    () => (scope ? nvlOptions.filter((n) => n.idLoCao === Number(scope)) : nvlOptions),
    [nvlOptions, scope]
  );

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

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

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  // Lấy table section config từ JSON — đây là nguồn sự thật cho cấu trúc bảng
  const tableConfig = useMemo(
    () =>
      config.layout.find(
        (s: any) => s.sectionType === "table" && s.key === "table1"
      ) as unknown as TableSectionConfig,
    [config.layout]
  );

  const loadDataFromAPI = useCallback(async () => {
    try {
      setLoading(true);

      if (idphieu) {
        // ── Phiếu đã tồn tại ─────────────────────────────────────────────────
        // Backend tự đọc IDPhieu, NgaySX, Ca, Scope từ BmPhieu → gọi SCADA →
        // merge với chi tiết đã lưu → insert DB → trả pivot (columns).
        const response = await napLieuLoCaoApi.syncChiTiet(idphieu);

        const apiColumns = (response.columns as TableColumnDef[]) ?? [];
        setMaterialColumnsOverride(apiColumns.length > 0 ? apiColumns : null);

        // Đọc lại từ DB để lấy đúng ManualGiaTri + GiaTri_Goc sau khi sync
        const chiTietList = await lgnlChiTietApi.getByPhieu(idphieu);
        const rowMap = new Map<number, Record<string, any>>();
        for (const item of chiTietList) {
          const t = item.thuTu ?? 0;
          if (!rowMap.has(t)) {
            rowMap.set(t, {
              key: `row-${t}`,
              thoiGianNapLieu: item.thoiGianNapLieu ?? "",
              soMe: item.soMe,
              meGio: item.meGio,
              cheDoNapLieu: item.cheDo,
              thuocThamLieu1: item.thuocThamLieu1,
              thuocThamLieu2: item.thuocThamLieu2,
              ghiChu: item.ghiChu,
            });
          }
          if (item.manualGiaTri) {
            rowMap.get(t)![`_manual_${item.idNVL}`] = true;
            if (item.giaTri_Goc != null)
              rowMap.get(t)![`_goc_${item.idNVL}`] = item.giaTri_Goc;
          }
          rowMap.get(t)![String(item.idNVL)] = item.giaTri;
        }
        const rows = Array.from(rowMap.values());
        setTableData(rows);

        const restoredDoAm: Record<string, number> = {};
        for (const item of chiTietList) {
          const k = String(item.idNVL);
          if (item.doAm != null && !(k in restoredDoAm))
            restoredDoAm[k] = item.doAm;
        }
        setDoAmMap(restoredDoAm);

        if (rows.length > 0) {
          message.success(`Cập nhật dữ liệu thành công! Có ${rows.length} bản ghi`);
        } else {
          message.info("Không có dữ liệu");
        }
      } else {
        // ── Phiếu mới (chưa lưu) ─────────────────────────────────────────────
        // Cần form fields để biết ngày/ca/lò cao → hiển thị, lưu DB khi bấm Lưu
        if (!ca) { message.warning("Vui lòng chọn Kíp"); return; }
        if (!scope) { message.warning("Vui lòng chọn Lò cao"); return; }
        const ngaySXValue = form.getFieldValue("NgaySX");
        if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }

        const ngaySXFormatted = ngaySXValue?.format
          ? ngaySXValue.format("YYYY-MM-DD")
          : ngaySXValue;

        const response = await napLieuLoCaoApi.getSiloMapped({
          idLoCao: Number(scope),
          ngay: ngaySXFormatted,
          idCa: Number(ca),
        });

        const apiColumns = (response.columns as TableColumnDef[]) ?? [];
        setMaterialColumnsOverride(apiColumns.length > 0 ? apiColumns : null);

        lgnlNhomNvlApi.getList()
          .then((res) => setNhomNvlOptions(Array.isArray(res) ? res : []))
          .catch(() => {});

        const rows = (response.rows ?? []).map((row: any, index: number) => {
          const { time, ...rest } = row;
          const thoiGianNapLieu = time
            ? new Date(time).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "";
          return { key: row?.id ?? `row-${index}`, thoiGianNapLieu, ...rest };
        });
        setTableData(rows);

        if (rows.length > 0) {
          message.success(`Cập nhật dữ liệu thành công! Có ${rows.length} bản ghi`);
        } else {
          message.info("Không có dữ liệu");
        }
      }
    } catch {
      message.error("Không thể tải dữ liệu");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [idphieu, ca, scope, form]);

  const handleFilter = useCallback(() => {
    loadDataFromAPI();
  }, [loadDataFromAPI]);

  const refreshSnapshotData = useCallback(async (ngay: string, idCa: number, idLoCao: number) => {
    setSiloSnapshotLoading(true);
    try {
      const res = await lgnlMappingApi.getSnapshotSilo({ ngay, idCa, idLoCao });
      const list = Array.isArray(res) ? res : [];
      setSiloSnapshotData(list);
      return list;
    } catch {
      message.error("Không thể tải trạng thái Silo");
      setSiloSnapshotData([]);
      return [] as LGNLSiloSnapshotDto[];
    } finally {
      setSiloSnapshotLoading(false);
    }
  }, []);

  const handleKiemTraSilo = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước khi kiểm tra Silo");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    const caNum = Number(ca);
    setSiloSnapshotOpen(true);

    // Dùng getList (không có fallback) để kiểm tra ngày/ca hiện tại có mapping thực không.
    // Backend GetSiloSnapshotAsync đã bỏ fallback nên phải tự động sao chép nếu chưa có data.
    try {
      const actualRaw = await lgnlMappingApi.getList({ ngay, idCa: caNum, idLoCao: Number(scope) });
      const actualMappings: LGNLMappingDto[] = Array.isArray(actualRaw) ? actualRaw : [];

      if (actualMappings.length === 0) {
        // Chưa có mapping cho ngày/ca này → sao chép từ ca trước, không dùng fallback backend
        const prevCa = caNum === 1 ? 2 : 1;
        const prevNgay = caNum === 1 ? dayjs(ngay).subtract(1, "day").format("YYYY-MM-DD") : ngay;
        const prevSnapshotRaw = await lgnlMappingApi.getSnapshotSilo({
          ngay: prevNgay,
          idCa: prevCa,
          idLoCao: Number(scope),
        });
        const prevSnapshot: LGNLSiloSnapshotDto[] = Array.isArray(prevSnapshotRaw) ? prevSnapshotRaw : [];
        const mappedPrev = prevSnapshot.filter((item: LGNLSiloSnapshotDto) => item.idNVL != null);
        if (mappedPrev.length > 0) {
          for (const item of mappedPrev) {
            try {
              await lgnlMappingApi.create({
                ngay,
                idCa: caNum,
                idLoCao: Number(scope),
                idSiLo: item.idSiLo,
                idNVL: item.idNVL!,
                ghiChu: null,
              });
            } catch {
              // bỏ qua lỗi từng silo, tiếp tục
            }
          }
          message.success(
            `Đã tự động sao chép ${mappedPrev.length} mapping từ Ca ${prevCa} ngày ${dayjs(prevNgay).format("DD/MM/YYYY")}`
          );
        }
      }
    } catch {
      message.error("Không thể kiểm tra/sao chép mapping ca trước");
    }

    const snapshot = await refreshSnapshotData(ngay, caNum, Number(scope));
    const initDrafts: Record<number, number | null> = {};
    const initNotes: Record<number, string> = {};
    snapshot.forEach((item) => {
      initDrafts[item.idSiLo] = item.idNVL ?? null;
      initNotes[item.idSiLo] = "";
    });
    setMapDraftBySilo(initDrafts);
    setMapNoteBySilo(initNotes);
    // Load NVL options theo lò cao + ngày/ca để lấy đúng version tại thời điểm phiếu
    lgnlNvlApi.getList({ idLoCao: Number(scope), ngaySX: ngay, idCaSX: caNum })
      .then((res) => setNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNvlOptions([]));
    lgnlNhomNvlApi.getList()
      .then((res) => setNhomNvlOptions(Array.isArray(res) ? res : []))
      .catch(() => setNhomNvlOptions([]));
  }, [form, scope, ca, refreshSnapshotData]);

  const handleOpenCreateNvl = useCallback(async () => {
    if (!scope) {
      message.warning("Vui lòng chọn Lò cao trước khi tạo NVL");
      return;
    }
    try {
      const [nvlRes, nhomRes] = await Promise.all([
        lgnlNvlApi.getList({ idLoCao: Number(scope) }),
        lgnlNhomNvlApi.getList(),
      ]);
      setNvlOptions(Array.isArray(nvlRes) ? nvlRes : []);
      setNhomNvlOptions(Array.isArray(nhomRes) ? nhomRes : []);
    } catch {
      setNvlOptions([]);
      setNhomNvlOptions([]);
    }
    createNvlForm.resetFields();
    createNvlForm.setFieldsValue({ idLoCao: Number(scope) });
    setCreateNewNVL(true);
  }, [scope, createNvlForm]);

  const handleCreateNvl = useCallback(async () => {
    try {
      const values = await createNvlForm.validateFields();
      if (!scope) {
        message.warning("Vui lòng chọn Lò cao trước khi tạo NVL");
        return;
      }
      await lgnlNvlApi.create({
        idLoCao: Number(scope),
        idNhomNVL: Number(values.idNhomNVL),
        tenNVL_NM: values.tenNVL_NM?.trim() || null,
        tenNVL_TK: values.tenNVL_TK?.trim() || null,
        thuTu: values.thuTu ?? null,
        ghiChu: values.ghiChu?.trim() || null,
        thuTuNhom: values.thuTuNhom ?? null,
        xacNhan: values.xacNhan ?? true,
      });
      const [nvlRes, nhomRes] = await Promise.all([
        lgnlNvlApi.getList({ idLoCao: Number(scope) }),
        lgnlNhomNvlApi.getList(),
      ]);
      setNvlOptions(Array.isArray(nvlRes) ? nvlRes : []);
      setNhomNvlOptions(Array.isArray(nhomRes) ? nhomRes : []);
      setCreateNewNVL(false);
      message.success("Đã thêm NVL mới");
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi tạo NVL mới");
    }
  }, [createNvlForm, scope]);

  const handleCopyFromPreviousShift = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    const caNum = Number(ca);
    const prevCa = caNum === 1 ? 2 : 1;
    const prevNgay = caNum === 1 ? dayjs(ngay).subtract(1, "day").format("YYYY-MM-DD") : ngay;

    Modal.confirm({
      title: "Sao chép mapping ca trước",
      content: `Sao chép toàn bộ mapping từ Ca ${prevCa} ngày ${dayjs(prevNgay).format("DD/MM/YYYY")} (cùng Lò cao) sang Ca ${caNum}? Các Silo đã map ở ca hiện tại sẽ bị bỏ qua.`,
      okText: "Xác nhận",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setCopyMappingLoading(true);
          const prevSnapshotRaw = await lgnlMappingApi.getSnapshotSilo({
            ngay: prevNgay,
            idCa: prevCa,
            idLoCao: Number(scope),
          });
          const prevSnapshot: LGNLSiloSnapshotDto[] = Array.isArray(prevSnapshotRaw) ? prevSnapshotRaw : [];
          const mappedPrev = prevSnapshot.filter((item: LGNLSiloSnapshotDto) => item.idNVL != null);
          if (mappedPrev.length === 0) {
            message.info(`Ca ${prevCa} ngày ${dayjs(prevNgay).format("DD/MM/YYYY")} chưa có mapping nào để sao chép`);
            return;
          }
          // Lấy snapshot ca hiện tại để biết Silo nào đã map rồi
          const currentSnapshotRaw = await lgnlMappingApi.getSnapshotSilo({
            ngay,
            idCa: caNum,
            idLoCao: Number(scope),
          });
          const currentSnapshot: LGNLSiloSnapshotDto[] = Array.isArray(currentSnapshotRaw) ? currentSnapshotRaw : [];
          const alreadyMappedIds = new Set(
            currentSnapshot.filter((item: LGNLSiloSnapshotDto) => item.idNVL != null).map((item: LGNLSiloSnapshotDto) => item.idSiLo)
          );
          const toCreate = mappedPrev.filter((item: LGNLSiloSnapshotDto) => !alreadyMappedIds.has(item.idSiLo));
          if (toCreate.length === 0) {
            message.info("Tất cả Silo đã được map ở ca hiện tại, không cần sao chép");
            return;
          }
          let successCount = 0;
          for (const item of toCreate) {
            try {
              await lgnlMappingApi.create({
                ngay,
                idCa: caNum,
                idLoCao: Number(scope),
                idSiLo: item.idSiLo,
                idNVL: item.idNVL!,
                ghiChu: null,
              });
              successCount++;
            } catch {
              // bỏ qua lỗi từng item, tiếp tục
            }
          }
          message.success(`Đã sao chép ${successCount}/${toCreate.length} mapping từ Ca ${prevCa} ngày ${dayjs(prevNgay).format("DD/MM/YYYY")}`);
          const refreshed = await refreshSnapshotData(ngay, caNum, Number(scope));
          const nextDrafts: Record<number, number | null> = {};
          const nextNotes: Record<number, string> = {};
          refreshed.forEach((item) => {
            nextDrafts[item.idSiLo] = item.idNVL ?? null;
            nextNotes[item.idSiLo] = "";
          });
          setMapDraftBySilo(nextDrafts);
          setMapNoteBySilo(nextNotes);
        } catch {
          message.error("Lỗi khi sao chép mapping ca trước");
        } finally {
          setCopyMappingLoading(false);
        }
      },
    });
  }, [form, scope, ca, refreshSnapshotData]);

  const handleOpenAddMapping = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất trước");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      const [res, nvlRes] = await Promise.all([
        lgnlSiLoMasterApi.getList({ idLoCao: Number(scope), ngaySX: ngay, idCaSX: Number(ca) }),
        lgnlNvlApi.getList({ idLoCao: Number(scope), ngaySX: ngay, idCaSX: Number(ca) }),
        refreshSnapshotData(ngay, Number(ca), Number(scope)),
      ]);
      setSiloMasterOptions(Array.isArray(res) ? res : []);
      setNvlOptions( Array.isArray(nvlRes) ? nvlRes : []
  );
    } catch {
      setSiloMasterOptions([]);
       setNvlOptions([]);
    }
    addMappingForm.resetFields();
    addMappingForm.setFieldsValue({
      ngay: form.getFieldValue("NgaySX"),
      idCa: Number(ca),
      idLoCao: Number(scope),
    });
    setAddMappingOpen(true);
  }, [form, scope, ca, addMappingForm]);

  const handleAddMapping = useCallback(async () => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      const values = await addMappingForm.validateFields();
      const snapshot = await refreshSnapshotData(ngay, Number(ca), Number(scope));
      const siloDaMap = snapshot.find((item) => item.idSiLo === values.idSiLo && item.idNVL != null);
      if (siloDaMap) {
        message.warning("Silo này đã map nguyên vật liệu rồi, không thể map tiếp. Nếu cần đổi NVL hãy dùng chức năng Đổi NVL.");
        return;
      }
      setAddMappingLoading(true);
      await lgnlMappingApi.create({
        ngay,
        idCa: Number(ca),
        idLoCao: Number(scope),
        idSiLo: values.idSiLo,
        idNVL: values.idNVL ?? null,
        ghiChu: values.ghiChu?.trim() || null,
      });
      message.success("Thêm mapping thành công");
      setAddMappingOpen(false);
      const refreshed = await refreshSnapshotData(ngay, Number(ca), Number(scope));
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
  }, [addMappingForm, form, scope, ca, refreshSnapshotData]);

  const handleMapSiloNVL = useCallback(async (row: LGNLSiloSnapshotDto) => {
    const idNVL = mapDraftBySilo[row.idSiLo];
    if (!idNVL) {
      message.warning("Vui lòng chọn NVL trước khi lưu mapping");
      return;
    }
    // if (row.idNVL != null) {
    //   message.warning("Silo này đã map nguyên vật liệu rồi, không thể map tiếp. Nếu cần đổi NVL hãy dùng chức năng Đổi NVL.");
    //   return;
    // }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!scope || !ca || !ngaySXValue) {
      message.warning("Vui lòng chọn Lò cao, Ca và Ngày sản xuất");
      return;
    }
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      setMapSavingSiloId(row.idSiLo);
      const list = await lgnlMappingApi.getList({
        ngay,
        idCa: Number(ca),
        idLoCao: Number(scope),
      });
      const mappings: LGNLMappingDto[] = Array.isArray(list) ? list : [];
      const existing = mappings.find(
        (m) => m.idSiLo === row.idSiLo && !m.ngayHetHL && !m.thoiDiemBD
      );

      const payload: CreateLGNLMappingDto = {
        ngay,
        idCa: Number(ca),
        idLoCao: Number(scope),
        idSiLo: row.idSiLo,
        idNVL,
        ghiChu: (mapNoteBySilo[row.idSiLo] ?? "").trim() || null,
      };

      if (existing) {
        await lgnlMappingApi.update(existing.id, payload);
        message.success(`Đã cập nhật mapping cho ${row.tenSiLo ?? "Silo"}`);
      } else {
        await lgnlMappingApi.create(payload);
        message.success(`Đã thêm mapping cho ${row.tenSiLo ?? "Silo"}`);
      }

      const refreshed = await refreshSnapshotData(ngay, Number(ca), Number(scope));
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
  }, [mapDraftBySilo, mapNoteBySilo, form, scope, ca, refreshSnapshotData]);

  const handleOpenDoiNVL = useCallback((row: LGNLSiloSnapshotDto) => {
    setDoiNVLRow(row);
    doiNVLForm.resetFields();
    doiNVLForm.setFieldsValue({ thoiDiem: dayjs(), ghiChu: null });
    setDoiNVLOpen(true);
  }, [doiNVLForm]);

  const handleDoiNVL = useCallback(async () => {
    if (!doiNVLRow) return;
    const ngaySXValue = form.getFieldValue("NgaySX");
    const ngay = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : String(ngaySXValue);
    try {
      const values = await doiNVLForm.validateFields();
      setDoiNVLLoading(true);
      await lgnlMappingApi.doiNVL({
        idLoCao: Number(scope),
        ngay,
        idCa: Number(ca),
        idSiLo: doiNVLRow.idSiLo,
        idNVLMoi: values.idNVLMoi,
        thoiDiem: (values.thoiDiem as dayjs.Dayjs).format("YYYY-MM-DDTHH:mm:ss"),
        ghiChu: values.ghiChu ?? null,
      });
      message.success("Đổi NVL thành công");
      setDoiNVLOpen(false);
      // Làm mới snapshot sau khi đổi
      await refreshSnapshotData(ngay, Number(ca), Number(scope));
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi đổi NVL");
    } finally {
      setDoiNVLLoading(false);
    }
  }, [doiNVLRow, doiNVLForm, form, scope, ca, refreshSnapshotData]);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";

      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);

        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          // Signatures luôn lấy từ BM_PheDuyet (DB) theo idPhieu, không parse JSON
          const signatureFields: Record<string, any> = {};
          ((res as any)?.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) => getCapDuyet(s) === pd.capDuyet && s.type === "selectNguoiKy"
            );
            if (sig && pd.nguoiDuyetId) {
              signatureFields[sig.key] = pd.nguoiDuyetId;
            }
          });

          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);

          const parsedDates: Record<string, any> = {};
          dateFields.forEach((fieldKey: string) => {
            if (data[fieldKey]) {
              const parsed = dayjs(data[fieldKey]);
              parsedDates[fieldKey] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          const normalizedData = {
            ...data,
            scope: data.scope ?? data.Scope ?? data.loCao ?? null,
          };

          const formValues = {
            ...normalizedData,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };

          form.setFieldsValue(formValues);

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => getCapDuyet(sig) === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) {
              form.setFieldsValue(overrides);
            }
          }

          // Lấy columns từ API mapping theo ngày/ca/lò cao của phiếu (luôn fresh)
          const ngaySXRaw: string | null = data.NgaySX ?? data.ngaySX ?? null;
          const caRaw = data.ca ?? data.Ca ?? null;
          if (ngaySXRaw && normalizedData.scope && caRaw) {
            try {
              const pivotRes = await napLieuLoCaoApi.getSiloMapped({
                ngay: dayjs(ngaySXRaw).format("YYYY-MM-DD"),
                idCa: Number(caRaw),
                idLoCao: Number(normalizedData.scope),
              });
              const apiCols = pivotRes.columns ?? [];
              setMaterialColumnsOverride(apiCols.length > 0 ? apiCols : null);
            } catch {
              // fallback: dùng columns đã lưu trong JSON nếu API lỗi
              if (Array.isArray(data.materialColumns) && data.materialColumns.length > 0)
                setMaterialColumnsOverride(data.materialColumns);
            }
          } else if (Array.isArray(data.materialColumns) && data.materialColumns.length > 0) {
            setMaterialColumnsOverride(data.materialColumns);
          }

          // Dùng API chi tiết để render bảng — fallback về table1 trong JSON nếu chưa có
          try {
            const chiTietList = await lgnlChiTietApi.getByPhieu(idPhieu);
            if (chiTietList.length > 0) {
              const rowMap = new Map<number, Record<string, any>>();
              for (const item of chiTietList) {
                const thuTu = item.thuTu ?? 0;
                if (!rowMap.has(thuTu)) {
                  rowMap.set(thuTu, {
                    key: `row-${thuTu}`,
                    thoiGianNapLieu: item.thoiGianNapLieu ?? "",
                    soMe: item.soMe,
                    meGio: item.meGio,
                    cheDoNapLieu: item.cheDo,
                    thuocThamLieu1: item.thuocThamLieu1,
                    thuocThamLieu2: item.thuocThamLieu2,
                    ghiChu: item.ghiChu,
                  });
                }
                // Lưu _manual_ và _goc_ vào row để frontend biết ô nào đã nhập tay
                if (item.manualGiaTri) {
                  rowMap.get(thuTu)![`_manual_${item.idNVL}`] = true;
                  if (item.giaTri_Goc != null)
                    rowMap.get(thuTu)![`_goc_${item.idNVL}`] = item.giaTri_Goc;
                }
                rowMap.get(thuTu)![String(item.idNVL)] = item.giaTri;
              }
              setTableData(Array.from(rowMap.values()));

              // Restore doAmMap từ chi tiết (lấy DoAm từ bất kỳ record nào của mỗi NVL)
              const restoredDoAm: Record<string, number> = {};
              for (const item of chiTietList) {
                const key = String(item.idNVL);
                if (item.doAm != null && !(key in restoredDoAm))
                  restoredDoAm[key] = item.doAm;
              }
              setDoAmMap(restoredDoAm);
            } else {
              setTableData(formValues.table1 || []);
              // Fallback: restore doAm từ JSON nếu có
              if (data.doAm && typeof data.doAm === "object")
                setDoAmMap(data.doAm as Record<string, number>);
            }
          } catch {
            setTableData(formValues.table1 || []);
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
          config.signatures
            .filter((sig: any) => getCapDuyet(sig) === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) {
            form.setFieldsValue(overrides);
          }
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

    const processedTable1 = tableData.map((row) => {
      const r = { ...row };
      delete r._isNewRow;
      delete r.key;
      return r;
    });

    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);

    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) {
        formattedDates[k] = formData[k].format("YYYY-MM-DD");
      }
    });

    return {
      ...formData,
      ...formattedDates,
      ca: formData.ca != null ? Number(formData.ca) : null,
      scope: formData.scope != null ? Number(formData.scope) : null,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      // Lưu cột động để khôi phục khi mở lại phiếu (xem chi tiết)
      materialColumns: materialColumnsOverride ?? [],
      // Lưu độ ẩm per NVL để backend persist vào LG_NL_ChiTiet
      doAm: doAmMap,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [getUserInfo, form, config, tableData, doAmMap, getCapDuyet]);

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
        navigate(`/taophieubienbannaplieulocao/${context.newPhieuId}`, { replace: true });
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

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
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
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFilter}
            disabled={isFormLocked}
            loading={loading}
          >
            Tải dữ liệu
          </Button>
          <Button
            icon={<SearchOutlined />}
            onClick={handleKiemTraSilo}
          >
            Kiểm tra Silo
          </Button>
          {actionButtons}
        </div>

        <Modal
          title="Thêm nguyên vật liệu"
          open={createNewNVL}
          onOk={handleCreateNvl}
          onCancel={() => setCreateNewNVL(false)}
          okText="Lưu NVL"
          cancelText="Hủy"
          destroyOnClose
          width={620}
        >
          <Form form={createNvlForm} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="idLoCao" label="Lò cao">
              <Select disabled>
                <Select.Option value={Number(scope)}>{scope}</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="tenNVL_NM" label="Tên NVL" rules={[{ required: true, message: "Nhập tên NVL" }]}>
              <Input maxLength={200} placeholder="Nhập tên NVL" />
            </Form.Item>
            <Form.Item
              name="idNhomNVL"
              label="Nhóm nguyên vật liệu"
              rules={[{ required: true, message: "Chọn nhóm nguyên vật liệu" }]}
            >
              <Select placeholder="Chọn nhóm NVL" showSearch optionFilterProp="children">
                {nhomNvlOptions.map((n) => (
                  <Select.Option key={n.id} value={n.id}>
                    {n.tenNhom}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="ghiChu" label="Ghi chú">
              <Input.TextArea rows={2} maxLength={500} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Trạng thái Silo hiện tại"
          open={siloSnapshotOpen}
          onCancel={() => setSiloSnapshotOpen(false)}
          footer={<Button onClick={() => setSiloSnapshotOpen(false)}>Đóng</Button>}
          width={920}
        >
          <Space style={{ marginBottom: 12 }} wrap>
            <Tag color="blue">Ngày: {ngaySX ? dayjs(ngaySX).format("DD/MM/YYYY") : "—"}</Tag>
            <Tag color="green">Ca: {ca ? `Ca ${ca}` : "—"}</Tag>
            <Tag color="purple">Lò cao: {scope ?? "—"}</Tag>
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
                    loading={siloSnapshotLoading}
                    dataSource={siloSnapshotData}
                    rowKey="idSiLo"
                    pagination={false}
                    columns={[
                      { title: "STT", key: "stt", width: 50, align: "center", render: (_v: unknown, _r: unknown, i: number) => i + 1 },
                      { title: "Tên Silo", dataIndex: "tenSiLo", key: "tenSiLo", render: (v: string | null) => v ?? "—" },
                      {
                        title: "NVL đang chứa", dataIndex: "tenNVL", key: "tenNVL",
                        render: (v: string | null, row: LGNLSiloSnapshotDto) => (
                          <Space size={4}>
                            <span>{v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>}</span>
                            {row.daDoiGiuaCa && <Tag color="orange">Đổi giữa ca</Tag>}
                          </Space>
                        ),
                      },
                      {
                        title: "Thời điểm đổi NVL", dataIndex: "thoiDiemBD", key: "thoiDiemBD", width: 145, align: "center",
                        render: (v: string | null) => v
                          ? <Tag color="orange">{dayjs(v).format("DD/MM/YYYY HH:mm")}</Tag>
                          : <span style={{ color: "#bbb" }}>Từ đầu ca</span>,
                      },
                      {
                        title: "", key: "action", width: 90, align: "center",
                        render: (_v: unknown, row: LGNLSiloSnapshotDto) => (
                          <Button
                            size="small"
                            icon={<SwapOutlined />}
                            onClick={() => handleOpenDoiNVL(row)}
                          >
                            Đổi NVL
                          </Button>
                        ),
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
                    <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Space>
                        <Button type="primary" onClick={handleOpenCreateNvl}>
                          Thêm NVL mới
                        </Button>
                        <Button icon={<PlusOutlined />} onClick={handleOpenAddMapping}>
                          Thêm Mapping mới
                        </Button>
                        <Button
                          icon={<CopyOutlined />}
                          onClick={handleCopyFromPreviousShift}
                          loading={copyMappingLoading}
                        >
                          Sao chép Ca trước
                        </Button>
                        <span style={{ color: "#666" }}>
                          Chỉ hiển thị NVL thuộc lò cao đang chọn: {scopeNvlOptions.length} mục
                        </span>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      bordered
                      loading={siloSnapshotLoading}
                      dataSource={siloSnapshotData}
                      rowKey="idSiLo"
                      pagination={false}
                      columns={[
                        { title: "STT", key: "stt", width: 50, align: "center", render: (_v: unknown, _r: unknown, i: number) => i + 1 },
                        { title: "Silo", dataIndex: "tenSiLo", key: "tenSiLo", width: 160, render: (v: string | null) => v ?? "—" },
                        {
                          title: "NVL hiện tại",
                          dataIndex: "tenNVL",
                          key: "tenNVL",
                          width: 220,
                          render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>Chưa cấu hình</span>,
                        },
                        {
                          title: "NVL map mới",
                          key: "nvlMoi",
                          render: (_v: unknown, row: LGNLSiloSnapshotDto) => (
                            <Select
                              style={{ width: "100%" }}
                              placeholder="Chọn NVL"
                              showSearch
                              optionFilterProp="children"
                              value={mapDraftBySilo[row.idSiLo] ?? undefined}
                              onChange={(value) => {
                                setMapDraftBySilo((prev) => ({ ...prev, [row.idSiLo]: value ?? null }));
                              }}
                            >
                              {scopeNvlOptions.map((n) => (
                                <Select.Option key={n.id} value={n.id}>
                                   {n.xacNhan && n.tenNVL_TK ? n.tenNVL_TK : n.tenNVL_NM}
                                </Select.Option>
                              ))}
                            </Select>
                          ),
                        },
                        {
                          title: "Ghi chú",
                          key: "ghiChu",
                          width: 220,
                          render: (_v: unknown, row: LGNLSiloSnapshotDto) => (
                            <Input
                              placeholder="Nhập ghi chú (nếu có)"
                              value={mapNoteBySilo[row.idSiLo] ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setMapNoteBySilo((prev) => ({ ...prev, [row.idSiLo]: value }));
                              }}
                            />
                          ),
                        },
                        {
                          title: "",
                          key: "action",
                          width: 130,
                          align: "center",
                          render: (_v: unknown, row: LGNLSiloSnapshotDto) => (
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => handleMapSiloNVL(row)}
                              loading={mapSavingSiloId === row.idSiLo}
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
            ]}
          />
        </Modal>

        <Modal
          title={
            <Space>
              <SwapOutlined />
              Đổi NVL giữa ca — Silo: <strong>{doiNVLRow?.tenSiLo}</strong>
            </Space>
          }
          open={doiNVLOpen}
          onOk={handleDoiNVL}
          onCancel={() => setDoiNVLOpen(false)}
          confirmLoading={doiNVLLoading}
          okText="Xác nhận đổi"
          cancelText="Hủy"
          destroyOnClose
          width={480}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <>NVL hiện tại: <strong>{doiNVLRow?.tenNVL ?? "—"}</strong>. Data trước thời điểm đổi vẫn tính vào NVL cũ.</>
            }
          />
          <Form form={doiNVLForm} layout="vertical">
            <Form.Item name="idNVLMoi" label="NVL mới" rules={[{ required: true, message: "Chọn NVL mới" }]}>
              <Select placeholder="Chọn NVL mới" showSearch optionFilterProp="children">
                {nvlOptions
                  .filter((n) => n.id !== doiNVLRow?.idNVL)
                  .map((n) => (
                    <Select.Option key={n.id} value={n.id}>[{n.id}] {n.xacNhan && n.tenNVL_TK ? n.tenNVL_TK : n.tenNVL_NM}</Select.Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item name="thoiDiem" label="Thời điểm bắt đầu dùng NVL mới" rules={[{ required: true, message: "Chọn thời điểm" }]}>
              <DatePicker showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} placeholder="Chọn ngày giờ" />
            </Form.Item>
            <Form.Item name="ghiChu" label="Ghi chú">
              <Input.TextArea rows={2} maxLength={500} placeholder="" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Thêm Mapping mới"
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
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} disabled />
            </Form.Item>
            <Form.Item name="idCa" label="Ca">
              <Select disabled>
                <Select.Option value={1}>Ca 1</Select.Option>
                <Select.Option value={2}>Ca 2</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="idSiLo" label="Silo" rules={[{ required: true, message: "Chọn Silo" }]}>
              <Select placeholder="Chọn Silo" showSearch optionFilterProp="children">
                {siloMasterOptions.map((s) => (
                  <Select.Option key={s.id} value={s.id} disabled={mappedSiloIds.has(s.id)}>
                    {s.tenSiLo}{mappedSiloIds.has(s.id) ? " (đã map NVL)" : ""}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="idNVL" label="NVL">
              <Select allowClear placeholder="Chọn NVL (tuỳ chọn)" showSearch optionFilterProp="children">
                {scopeNvlOptions.map((n) => (
                  <Select.Option key={n.id} value={n.id}>[{n.id}] {n.xacNhan && n.tenNVL_TK ? n.tenNVL_TK : n.tenNVL_NM}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="ghiChu" label="Ghi chú">
              <Input.TextArea rows={2} maxLength={500} placeholder="Nhập ghi chú (nếu có)" />
            </Form.Item>
          </Form>
        </Modal>

        {tableConfig && (
          <CustomTableLG
            tableConfig={tableConfig}
            materialColumnsOverride={materialColumnsOverride}
            initialData={tableData}
            onDataChange={(rows) => setTableData(rows as TableRow[])}
            loading={loading}
            editable={!isFormLocked}
            showAddButton={!isFormLocked}
            showDeleteButton={!isFormLocked}
            minRows={0}
            initialDoAmMap={doAmMap}
            onDoAmChange={setDoAmMap}
          />
        )}

        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig: any, i: number) => {
            const capDuyet = getCapDuyet(sig);
            const isLevelZero = capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === capDuyet);

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
    </Card>
  );
};

export default TaoPhieuNapLieuLoCao;
