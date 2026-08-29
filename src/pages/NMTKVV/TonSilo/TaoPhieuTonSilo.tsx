/* eslint-disable @typescript-eslint/no-explicit-any */
import TKVV_TonSilo from "../../../utils/BM_config/TKVV_TonSilo.json";
import { Button, Card, Form, Input, Space, Table, Typography, message } from "antd";
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
import { TKVV_SCOPE_OPTIONS } from "../../../utils/constants/TKVV_constant";

interface TableRow {
  key: string | number;
  dbId?: number | null;
  siloID?: number | null;
  nguyenVatLieuID?: number | null;
  maSilo?: string;
  nguyenLieu?: string;
  doAm?: number | string;
  doAmText?: string;
  tonDau?: number | string;
  nhap?: number | string;
  nhapAuto?: number | string;
  xuat?: number | string;
  xuatAuto?: number | string;
  tonCuoi?: number | string;
  tonCuoiAuto?: number | string;
  isAdjusted?: boolean;
  ghiChu?: string;
  [key: string]: any;
}

const MA_BM = "TKVV_TONSILO";

const fromInitRecord = (item: TKVVTonSiloRowDto, idx: number): TableRow => ({
  key: `silo-${item.siloID}-${idx}`,
  dbId: item.id > 0 ? item.id : null,
  siloID: item.siloID,
  nguyenVatLieuID: item.nguyenVatLieuID,
  maSilo: item.maSilo ?? "",
  nguyenLieu: item.tenNVL ?? "",
  doAm: item.doAm ?? "",
  doAmText: item.doAmText ?? "",
  tonDau: item.tonDau ?? "",
  nhap: item.nhap ?? item.nhapAuto ?? "",
  nhapAuto: item.nhapAuto ?? "",
  xuat: item.xuat ?? item.xuatAuto ?? "",
  xuatAuto: item.xuatAuto ?? "",
  tonCuoi: (item.tonCuoi != null && item.tonCuoi !== 0) ? item.tonCuoi : (item.tonCuoiAuto ?? ""),
  tonCuoiAuto: item.tonCuoiAuto ?? "",
  isAdjusted: item.isAdjusted ?? false,
  ghiChu: item.ghiChu ?? "",
});

// Có NVL lên trước, nhóm cùng NVL ở gần nhau; chưa gán NVL xuống dưới giữ thứ tự gốc
const sortSiloRows = (rows: TableRow[]): TableRow[] => {
  const withNvl = rows.filter((r) => r.nguyenVatLieuID != null);
  const withoutNvl = rows.filter((r) => r.nguyenVatLieuID == null);
  withNvl.sort((a, b) => {
    if (a.nguyenVatLieuID !== b.nguyenVatLieuID)
      return (a.nguyenVatLieuID as number) - (b.nguyenVatLieuID as number);
    return String(a.maSilo ?? "").localeCompare(
      String(b.maSilo ?? ""),
      undefined,
      { numeric: true },
    );
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

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const signaturesRef = useRef<HTMLDivElement>(null);
  const [tableScrollY, setTableScrollY] = useState(400);

  const recalcTableHeight = useCallback(() => {
    if (!tableWrapperRef.current) return;
    const rect = tableWrapperRef.current.getBoundingClientRect();
    const sigH = signaturesRef.current?.offsetHeight ?? 160;
    const y = Math.max(200, Math.floor(window.innerHeight - rect.top - sigH - 100));
    setTableScrollY(y);
  }, []);

  useEffect(() => {
    const timer = setTimeout(recalcTableHeight, 50);
    window.addEventListener("resize", recalcTableHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", recalcTableHeight);
    };
  }, [loading, recalcTableHeight]);

  // Form.useWatch để reactive disable nút "Tải dữ liệu"
  const ngaySXWatch = Form.useWatch("ngaySX", form);
  const scopeWatch = Form.useWatch("scope", form);

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
          const ngaySXValue = data.ngaySX || data.NgaySX;

          form.setFieldsValue({
            ngaySX: ngaySXValue ? dayjs(ngaySXValue) : null,
            ca: data.ca,
            scope: data.scope ? Number(data.scope) : undefined,
            kip: data.kip,
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
          const overrides: Record<string, any> = { ngaySX: dayjs() };
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
    const ngaySXValue: dayjs.Dayjs | null = form.getFieldValue("ngaySX");
    if (!ngaySXValue) {
      message.warning("Chọn ngày sản xuất");
      return;
    }
    const scopeValue: number | undefined = form.getFieldValue("scope");
    if (!scopeValue) {
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
      const rows = await tkvvTonSiloApi.initRows({
        ngaySX: ngaySXValue.format("YYYY-MM-DD"),
        ca: caValue,
        scope: scopeValue,
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
  }, [form, currentUserInfo, idphieu]);

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
      scope: formData.scope ?? null,
      ngaySX: formData.ngaySX
        ? dayjs(formData.ngaySX).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [getUserInfo, form, config, tableData]);

  const saveTonSiloRows = useCallback(
    async (phieuId?: string) => {
      const userInfo = getUserInfo();
      const userId = userInfo.iD_TaiKhoan;
      if (!userId) return;

      const ngaySX: dayjs.Dayjs | null = form.getFieldValue("ngaySX");
      const scope: number | undefined = form.getFieldValue("scope");
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
        nhapAuto: toNum(row.nhapAuto),
        xuat: toNum(row.xuat),
        xuatAuto: toNum(row.xuatAuto),
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
    if (
      dataIndex === "tonCuoi" &&
      record.tonCuoiAuto != null &&
      record.tonCuoiAuto !== ""
    ) {
      const cuoiNum = parseFloat(String(record.tonCuoi));
      const autoNum = parseFloat(String(record.tonCuoiAuto));
      if (!isNaN(cuoiNum) && !isNaN(autoNum) && cuoiNum !== autoNum) {
        return {
          style: { backgroundColor: "#fffbe6", borderColor: "#faad14" },
          tooltip: `Tồn cuối Auto: ${autoNum.toLocaleString("en-US", { maximumFractionDigits: 3 })}`,
        };
      }
    }
    if (
      dataIndex === "nhap" &&
      record.nhapAuto != null &&
      record.nhapAuto !== ""
    ) {
      const nhapNum = parseFloat(String(record.nhap));
      const autoNum = parseFloat(String(record.nhapAuto));
      if (!isNaN(nhapNum) && !isNaN(autoNum) && nhapNum !== autoNum) {
        return {
          style: { backgroundColor: "#fffbe6", borderColor: "#faad14" },
          tooltip: `Nhập BBGN (Auto): ${autoNum.toLocaleString("en-US", { maximumFractionDigits: 3 })}`,
        };
      }
    }
    if (
      dataIndex === "xuat" &&
      record.xuatAuto != null &&
      record.xuatAuto !== ""
    ) {
      const xuatNum = parseFloat(String(record.xuat));
      const autoNum = parseFloat(String(record.xuatAuto));
      if (!isNaN(xuatNum) && !isNaN(autoNum) && xuatNum !== autoNum) {
        return {
          style: { backgroundColor: "#fffbe6", borderColor: "#faad14" },
          tooltip: `Xuất Auto: ${autoNum.toLocaleString("en-US", { maximumFractionDigits: 3 })}`,
        };
      }
    }
    return undefined;
  }, []);

  const buildSummary = useCallback((data: readonly any[]) => {
    const totals: Record<string, number> = {
      tonDau: 0,
      nhap: 0,
      xuat: 0,
      tonCuoi: 0,
    };
    data.forEach((row) => {
      (["tonDau", "nhap", "xuat", "tonCuoi"] as const).forEach((k) => {
        const v = Number(row[k]);
        if (!Number.isNaN(v)) totals[k] += v;
      });
    });
    const fmt = (n: number) =>
      n ? n.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "";
    return (
      <Table.Summary fixed="bottom">
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} align="center">
            <b>TỔNG</b>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={1} />
          <Table.Summary.Cell index={2} />
          <Table.Summary.Cell index={3} align="right">
            <b>{fmt(totals.tonDau)}</b>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="right">
            <b>{fmt(totals.nhap)}</b>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="right">
            <b>{fmt(totals.xuat)}</b>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={6} align="right">
            <b>{fmt(totals.tonCuoi)}</b>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={7} />
        </Table.Summary.Row>
      </Table.Summary>
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

        {/* ─── headerFields: NgaySX, Ca, Xưởng, Kíp — dàn full width 1 hàng ──── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 8,
          }}
        >
          {config.headerFields.map((f: any, idx: number) => {
            const field = {
              ...f,
              options:
                f.type === "select" && f.key === "scope"
                  ? TKVV_SCOPE_OPTIONS.length > 0
                    ? TKVV_SCOPE_OPTIONS
                    : f.options
                  : f.options,
            };
            return (
              <CustomFormItem
                key={f.key}
                field={field}
                idx={idx}
                disabled={isFormLocked || (f.lockOnEdit && !!idphieu)}
              />
            );
          })}
        </div>

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
                disabled={!ngaySXWatch || !scopeWatch}
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
        <div ref={tableWrapperRef} style={{ width: "100%", marginBottom: 4 }}>
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
            scrollY={tableScrollY}
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
          ref={signaturesRef}
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
