/* eslint-disable @typescript-eslint/no-explicit-any */
import TKVV_TonSilo from "../../../utils/BM_config/TKVV_TonSilo.json";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { CloudDownloadOutlined, UndoOutlined } from "@ant-design/icons";
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
  tkvvTonSiloApi,
  type TKVVTonSiloRowDto,
} from "../../../services/TKVVApi";
import { TKVV_SCOPES } from "../../../utils/constants/TKVV_constant";

interface TableRow {
  key: string | number;
  dbId?: number | null; // TKVV_TonSilo.ID
  siloID?: number | null;
  nguyenVatLieuID?: number | null;
  maSilo?: string;
  nguyenLieu?: string;
  doAm?: number | string;
  tonDau?: number | string;
  nhap?: number | string;
  xuat?: number | string;
  tonCuoi?: number | string;
  tonCuoiAuto?: number | string;
  isAdjusted?: boolean;
  ghiChu?: string;
  [key: string]: any;
}

const MA_BM = "TKVV_TONSILO";

const SCOPE_OPTIONS = TKVV_SCOPES.map((s) => ({
  label: s.label,
  value: s.scope,
}));

const fromInitRecord = (item: TKVVTonSiloRowDto, idx: number): TableRow => {
  return {
    key: `silo-${item.siloID}-${idx}`,
    dbId: item.id > 0 ? item.id : null,
    siloID: item.siloID,
    nguyenVatLieuID: item.nguyenVatLieuID,
    maSilo: item.maSilo ?? "",
    nguyenLieu: item.tenNVL ?? "",
    doAm: item.doAm ?? "",
    tonDau: item.tonDau ?? "",
    nhap: item.nhap ?? "",
    xuat: item.xuat ?? "",
    tonCuoi: item.tonCuoi ?? item.tonCuoiAuto ?? "",
    tonCuoiAuto: item.tonCuoiAuto ?? "",
    isAdjusted: item.isAdjusted ?? false,
    ghiChu: item.ghiChu ?? "",
  };
};

// Có NVL lên trước, nhóm cùng NVL ở gần nhau; chưa gán NVL xuống dưới giữ thứ tự gốc
const sortSiloRows = (rows: TableRow[]): TableRow[] => {
  const withNvl = rows.filter((r) => r.nguyenVatLieuID != null);
  const withoutNvl = rows.filter((r) => r.nguyenVatLieuID == null);
  withNvl.sort((a, b) => {
    if (a.nguyenVatLieuID !== b.nguyenVatLieuID)
      return (a.nguyenVatLieuID as number) - (b.nguyenVatLieuID as number);
    return String(a.maSilo ?? "").localeCompare(String(b.maSilo ?? ""), undefined, { numeric: true });
  });
  return [...withNvl, ...withoutNvl];
};

const TaoPhieuTonSilo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = TKVV_TonSilo as any;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");

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

  const tableDataRef = useRef(tableData);
  useEffect(() => {
    tableDataRef.current = tableData;
  }, [tableData]);
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

          form.setFieldsValue({
            kip: data.kip,
            ca: data.ca,
            apDungCho: data.apDungCho,
            ...signatureFields,
          });

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

          const siloRows = await tkvvTonSiloApi.getRowsByPhieu(idphieu);
          setTableData(sortSiloRows(siloRows.map(fromInitRecord)));

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
        setTableData([]);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
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
  }, [idphieu, config.signatures, currentUserInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  const handleLoadRows = useCallback(async () => {
    if (!ngaySXFilter) {
      message.warning("Chọn ngày sản xuất");
      return;
    }
    if (!selectedScope) {
      message.warning("Chọn xưởng (scope)");
      return;
    }
    const caValue = form.getFieldValue("ca");
    if (!caValue) {
      message.warning("Chọn Ca");
      return;
    }
    setLoadingInit(true);
    try {
      const ngayStr = ngaySXFilter.format("YYYY-MM-DD");
      const rows = await tkvvTonSiloApi.initRows({
        ngaySX: ngayStr,
        ca: caValue,
        scope: selectedScope,
        currentUserId: currentUserInfo?.iD_TaiKhoan ?? null,
        phieuID: idphieu ?? null,
      });
      setTableData(sortSiloRows(rows.map(fromInitRecord)));
      message.info(`Đã tải ${rows.length} Silo`);
    } catch {
      message.error("Lỗi khi tải danh sách Silo");
    } finally {
      setLoadingInit(false);
    }
  }, [ngaySXFilter, selectedScope, form, currentUserInfo, idphieu]);

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

    return {
      ...formData,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processRows(tableData),
      scope: selectedScope ?? null,
      ngaySX: (ngaySXFilter ?? dayjs()).format("YYYY-MM-DD"),
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [getUserInfo, form, config, tableData, selectedScope, ngaySXFilter]);

  const saveTonSiloRows = useCallback(
    async (phieuId?: string) => {
      const userInfo = getUserInfo();
      const userId = userInfo.iD_TaiKhoan;
      if (!userId) return;

      const ngaySX = ngaySXRef.current;
      const scope = selectedScopeRef.current;
      const caValue = form.getFieldValue("ca");
      const kipValue = form.getFieldValue("kip");
      if (!ngaySX || !scope || !caValue) return;

      const ngayStr = ngaySX.format("YYYY-MM-DD");
      const toNum = (v: any) => (v !== "" && v != null ? Number(v) : null);

      const toSaveRow = (row: TableRow, idx: number) => ({
        id: row.dbId ?? null,
        ngaySX: ngayStr,
        ca: caValue,
        scope,
        siloID: row.siloID ?? 0,
        nguyenVatLieuID: row.nguyenVatLieuID ?? null,
        kip: kipValue ?? null,
        thuTu: idx + 1,
        doAm: toNum(row.doAm),
        tonDau: toNum(row.tonDau),
        nhap: toNum(row.nhap),
        xuat: toNum(row.xuat),
        tonCuoi: toNum(row.tonCuoi),
        tonCuoiAuto: toNum(row.tonCuoiAuto),
        ghiChu: row.ghiChu ?? null,
      });

      const rows = tableDataRef.current
        .filter((r) => r.dbId || r.siloID)
        .map((r, i) => toSaveRow(r, i));
      if (rows.length === 0) return;

      try {
        await tkvvTonSiloApi.saveRows({
          maBM: MA_BM,
          phieuID: phieuId ?? idphieu ?? null,
          currentUserId: userId,
          rows,
        });
      } catch {
        // không block phiếu nếu lưu bảng phụ TonSilo lỗi
      }
    },
    [getUserInfo, idphieu, form],
  );

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      await saveTonSiloRows(context?.newPhieuId);
      if (context?.newPhieuId) {
        navigate(`/chitiettonsilotkvv/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }
      await initData();
    },
    [navigate, initData, saveTonSiloRows],
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

  const handleCellChange = useCallback(
    (rowIndex: number, dataIndex: string, value: any) => {
      setTableData((prev) => {
        const updated = [...prev];
        updated[rowIndex] = { ...updated[rowIndex], [dataIndex]: value };
        return updated;
      });
    },
    [],
  );

  const cellDecorator = useCallback((dataIndex: string, record: any) => {
    if (dataIndex === "tonCuoi" && record.isAdjusted && record.tonCuoiAuto != null && record.tonCuoiAuto !== "") {
      const autoNum = parseFloat(String(record.tonCuoiAuto));
      return {
        style: { backgroundColor: "#fffbe6", borderColor: "#faad14" },
        tooltip: `Tồn cuối Auto: ${isNaN(autoNum) ? record.tonCuoiAuto : autoNum.toLocaleString("en-US", { maximumFractionDigits: 3 })}`,
      };
    }
    return undefined;
  }, []);

  const buildSummary = useCallback((data: readonly any[]) => {
    const totals: Record<string, number> = { tonDau: 0, nhap: 0, xuat: 0, tonCuoi: 0 };
    data.forEach((row) => {
      (["tonDau", "nhap", "xuat", "tonCuoi"] as const).forEach((k) => {
        const v = Number(row[k]);
        if (!Number.isNaN(v)) totals[k] += v;
      });
    });
    const fmt = (n: number) =>
      n ? n.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "";
    return (
      <tr>
        <td style={{ fontWeight: 600, textAlign: "center" }}>TỔNG</td>
        <td />
        <td />
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.tonDau)}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.nhap)}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.xuat)}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {fmt(totals.tonCuoi)}
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

        {/* ─── Ngày SX + Xưởng + headerFields (Kíp/Ca/Áp dụng cho) ────────────── */}
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
          {config.headerFields.map((f: any, idx: number) => (
            <div key={f.key} style={{ minWidth: 160 }}>
              <CustomFormItem
                field={f}
                idx={idx}
                disabled={isFormLocked}
              />
            </div>
          ))}
        </Space>

        {/* ─── Hàng action: nút quy trình + Tải dữ liệu + Quay lại ──────────── */}
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
              <Button
                icon={<CloudDownloadOutlined />}
                loading={loadingInit}
                onClick={handleLoadRows}
                disabled={!ngaySXFilter || !selectedScope}
              >
                Tải dữ liệu
              </Button>
            )}
            <Button
              icon={<UndoOutlined />}
              onClick={() => navigate("/tonsilotkvv")}
            >
              Quay lại
            </Button>
          </Space>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {tableData.length} Silo
          </Typography.Text>
        </div>
        <div style={{ width: "100%", overflowX: "auto", marginBottom: 4 }}>
          <CustomFormTable
            columns={tableColumns}
            initialData={tableData}
            onDataChange={setTableData}
            onCellChange={handleCellChange}
            editable={!isFormLocked}
            loading={loading || loadingInit}
            minRows={0}
            showAddButton={false}
            showDeleteButton={false}
            summary={buildSummary}
            cellDecorator={cellDecorator}
          />
        </div>

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
    </Card>
  );
};

export default TaoPhieuTonSilo;
