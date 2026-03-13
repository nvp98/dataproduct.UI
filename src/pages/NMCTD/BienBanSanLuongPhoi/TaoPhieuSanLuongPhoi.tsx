/* eslint-disable @typescript-eslint/no-explicit-any */
import CTD_BB_Sanluongphoi from "../../../utils/BM_config/CTD_BB_Sanluongphoi.json";
import { Button, Card, Form, Input, Typography, message, Table } from "antd";
import { FilterOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormTable from "../../../components/CustomFormTable";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { sanLuongPhoiApi } from "../../../services/BMDucCTDApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const TaoPhieuSanLuongPhoi = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = CTD_BB_Sanluongphoi;
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
    idPhieuGoc?: string | null;
  }>({});

  // ★ Ref snapshot – đọc trong closure mà không bao giờ bị stale
  const phieuInfoRef = useRef(phieuInfo);
  useEffect(() => { phieuInfoRef.current = phieuInfo; }, [phieuInfo]);

  const kip    = Form.useWatch("kip",   form);
  const ca     = Form.useWatch("ca",    form);
  Form.useWatch("NgaySX", form); // trigger re-render khi ngày thay đổi

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const currentTinhTrang    = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu  ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  loadDataFromAPI / handleFilter
  // ─────────────────────────────────────────────────────────────────────────
  const loadDataFromAPI = useCallback(async () => {
    if (!kip) { message.warning("Vui lòng chọn Kíp"); return; }
    if (!ca)  { message.warning("Vui lòng chọn Ca");  return; }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }

    try {
      setLoading(true);
      const ngaySXFormatted = ngaySXValue?.format
        ? ngaySXValue.format("YYYY-MM-DD")
        : ngaySXValue;

      const response = await sanLuongPhoiApi.getByKipNgay({ kip, ca, NgaySX: ngaySXFormatted });

      if (response && Array.isArray(response)) {
        const updatedData = response.map((newRow: any, index: number) => {
          const existingRow = tableData.find((row: any) =>
            row.kipNgay === newRow.kipNgay &&
            row.macThep === newRow.macThep &&
            row.kichThuoc === newRow.kichThuoc
          );
          if (existingRow?.id)
            return { key: existingRow.key || `row-${index}`, ...newRow, id: existingRow.id };
          return { key: `row-${index}`, ...newRow };
        });
        setTableData(updatedData);
        message.success(`Cập nhật dữ liệu thành công! Có ${updatedData.length} bản ghi`);
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
  }, [kip, ca, form, tableData]);

  const handleFilter = useCallback(() => {
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!kip)         { message.warning("Vui lòng chọn Kíp"); return; }
    if (!ca)          { message.warning("Vui lòng chọn Ca");  return; }
    if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }
    loadDataFromAPI();
  }, [kip, ca, form, loadDataFromAPI]);

  // ─────────────────────────────────────────────────────────────────────────
  //  initData
  // ─────────────────────────────────────────────────────────────────────────
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";
      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId)
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
            });
          } else {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
              );
              if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
            });
          }

          const tinhTrang  = (res as any)?.tinhTrang ?? 0;
          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          const formValues = {
            ...data, ...signatureFields, ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };
          form.setFieldsValue(formValues);

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig) => sig.capDuyet === 0)
              .forEach((sig) => { overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null; });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          setTableData(formValues.table1 || []);
          setPhieuInfo({
            tinhTrang:  tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId  ?? null,
            idphongBan: (res as any)?.idphongBan  ?? null,
            pheDuyet:   (res as any)?.pheDuyet    || data.pheDuyet || [],
            isClone:    (res as any)?.isClone      ?? false,
            // ★ Đọc cả 3 biến thể tên field để an toàn
            // DB: ID_PhieuGoc | C# serialize: iD_PhieuGoc | camelCase: idPhieuGoc
            idPhieuGoc: (res as any)?.idPhieuGoc
                     ?? (res as any)?.iD_PhieuGoc
                     ?? (res as any)?.ID_PhieuGoc
                     ?? null,
          });
        }
      } else {
        setPhieuInfo({});
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig) => sig.capDuyet === 0)
            .forEach((sig) => { overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null; });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo]);

  useEffect(() => { initData(); }, [initData]);

  // ─────────────────────────────────────────────────────────────────────────
  //  getFormData
  // ─────────────────────────────────────────────────────────────────────────
  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();
    const pheDuyetFlow = config.signatures.map((s) => ({
      capDuyet: s.capDuyet, maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key), tinhTrang: 0, ghiChu: "",
    }));
    const processedTable1 = tableData.map((row) => {
      const r = { ...row }; delete r._isNewRow; delete r.key; return r;
    });
    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date").map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });
    return {
      ...formData, ...formattedDates,
      maBm: config.code, xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null, nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1, pheDuyet: pheDuyetFlow, prefix: config.prefix,
    };
  }, [getUserInfo, form, config, tableData]);

  // ─────────────────────────────────────────────────────────────────────────
  //  handleStatusChange
  //  Gọi từ PhieuActionService với các trạng thái: HoanThanh, DaThuHoi,
  //  KhongXacNhan. Dùng phieuInfoRef.current để tránh stale closure.
  // ─────────────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (idPhieu: string, newStatus: number) => {
      const { isClone, idPhieuGoc } = phieuInfoRef.current; // ★ luôn fresh

      try {
        const formValues = await form.validateFields();

        // ── HoanThanh → INSERT ─────────────────────────────────────────────
        if (newStatus === TrangThaiPhieuConst.HoanThanh) {
          await sanLuongPhoiApi.insertSanLuongPhoi({
            idPhieu, soPhieu: soPhieu || "",
            ngaySX:  formValues.NgaySX ? formValues.NgaySX.format("YYYY-MM-DD") : "",
            kip:     formValues.kip    || "",
            ca:      formValues.ca     || 0,
            mayDuc:  formValues.mayDuc || 0,
            table1: tableData.map((row) => ({
              kipNgay:       row.kipNgay        || "",
              macThep:       row.macThep        || "",
              kichThuoc:     row.kichThuoc      || "",
              stLoai1:       Number(row.stLoai1)       || 0,
              klLoai1:       Number(row.klLoai1)       || 0,
              stPhoiNgan:    Number(row.stPhoiNgan)    || 0,
              klPhoiNgan:    Number(row.klPhoiNgan)    || 0,
              stLoai2:       Number(row.stLoai2)       || 0,
              klLoai2:       Number(row.klLoai2)       || 0,
              stLoai3:       Number(row.stLoai3)       || 0,
              klLoai3:       Number(row.klLoai3)       || 0,
              tongSoThanh:   Number(row.tongSoThanh)   || 0,
              tongKhoiLuong: Number(row.tongKhoiLuong) || 0,
            })),
          });
          message.success("Đã insert dữ liệu sản lượng phôi thành công!");
          return;
        }

        // ── DaThuHoi → DELETE (+ RESTORE cha nếu là clone) ────────────────
        if (newStatus === TrangThaiPhieuConst.DaThuHoi) {
          await sanLuongPhoiApi.deleteSanLuongPhoiByIdPhieu(idPhieu);
          message.success("Đã xóa dữ liệu sản lượng phôi!");
          if (isClone && idPhieuGoc) {
            await sanLuongPhoiApi.restoreSanLuongPhoiByIdPhieu(idPhieuGoc);
            message.success("Đã khôi phục dữ liệu phiếu cha!");
          }
          return;
        }

        // ── KhongXacNhan → DELETE clone + RESTORE cha ─────────────────────
        if (newStatus === TrangThaiPhieuConst.KhongXacNhan) {
          if (isClone && idPhieuGoc) {
            try {
              await sanLuongPhoiApi.deleteSanLuongPhoiByIdPhieu(idPhieu);
            } catch {
              // clone chưa có data → không sao
            }
            await sanLuongPhoiApi.restoreSanLuongPhoiByIdPhieu(idPhieuGoc);
            message.success("Đã khôi phục dữ liệu sản lượng phôi của phiếu cha!");
          }
        }
      } catch (error: any) {
        console.error("❌ Error in handleStatusChange:", error);
        message.error(`Lỗi: ${error?.response?.data?.message || error?.message || "Không xác định"}`);
      }
    },
    [form, soPhieu, tableData]
    // ★ KHÔNG đưa phieuInfo vào deps – đọc từ phieuInfoRef.current
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  handleActionSuccess
  //
  //  DeNghiHieuChinh  → navigate sang clone (không làm gì với TTHD vì
  //                     phiếu cha có thể chưa có data lúc này)
  //  HoanThanh        → INSERT data + HIDE cha (nếu là clone)
  //                     ★ check prevStatus để tránh gọi lại khi đã HoanThanh
  //  KhongXacNhan     → handleStatusChange đã xử lý TRƯỚC navigate → skip
  // ─────────────────────────────────────────────────────────────────────────
  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {

      // ── DeNghiHieuChinh ───────────────────────────────────────────────────
      if (context?.newPhieuId) {
        navigate(`/taophieubienbansanluongphoi/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }

      if (!idphieu) return;

      try {
        // ★ Đọc prevStatus từ ref (không phải state) để luôn fresh
        const prevStatus = phieuInfoRef.current.tinhTrang;

        const res: any = await PhieuApi.getDetail(idphieu);
        const newStatus = res?.tinhTrang;

        // ── HoanThanh ─────────────────────────────────────────────────────
        // ★ Guard prevStatus: chỉ xử lý khi VỪA chuyển sang HoanThanh,
        //    tránh gọi lại INSERT + HIDE mỗi lần component re-render
        if (
          newStatus  === TrangThaiPhieuConst.HoanThanh &&
          prevStatus !== TrangThaiPhieuConst.HoanThanh
        ) {
          // INSERT data phiếu hiện tại (TTHD = 1)
          await handleStatusChange(idphieu, TrangThaiPhieuConst.HoanThanh);

          // Nếu là clone → HIDE data cha trực tiếp (TTHD → 0)
          // Dùng res (fresh từ API) để lấy idPhieuGoc, không dùng closure cũ
          // ★ Đọc cả 3 biến thể tên field: idPhieuGoc / iD_PhieuGoc / ID_PhieuGoc
          const parentId = res?.idPhieuGoc ?? res?.iD_PhieuGoc ?? res?.ID_PhieuGoc;
          if (res?.isClone && parentId) {
            try {
              await sanLuongPhoiApi.hideSanLuongPhoiByIdPhieu(parentId);
            } catch {
              // cha chưa có data → không block flow
            }
          }
        }

        // ── KhongXacNhan → đã xử lý trong handleStatusChange, skip ────────

      } catch {
        // bỏ qua lỗi fetch
      }

      await initData();
    },
    [navigate, initData, idphieu, handleStatusChange]
    // phieuInfoRef không cần deps – dùng ref
  );

  const handleExportPdf = async () => {
    if (!idphieu) { message.warning("Vui lòng lưu phiếu trước khi xuất PDF!"); return; }
    try {
      setLoading(true);
      const response = await sanLuongPhoiApi.exportSanLuongPdf({
        NgaySX:  form.getFieldValue("NgaySX") ? form.getFieldValue("NgaySX").format("YYYY-MM-DD") : undefined,
        Ca:      form.getFieldValue("ca"),
        Kip:     form.getFieldValue("kip"),
        idPhieu: idphieu,
      });
      const blob = new Blob([response as any], { type: "application/pdf" });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `Bien_ban_san_luong_phoi_${soPhieu || idphieu}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Xuất PDF thành công!");
    } catch (error: any) {
      console.error("Export PDF failed:", error);
      message.error(error?.message || "Xuất file PDF thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const actionButtons = useMemo(() => {
    const userInfo = getUserInfo();
    const buttons  = phieuActionService.getActionButtons({
      phieuId:               idphieu || "",
      tinhTrang:             phieuInfo.tinhTrang        ?? 0,
      isClone:               phieuInfo.isClone          ?? false,
      currentUserId:         userInfo.iD_TaiKhoan       ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan       ?? null,
      currentUserTenNgan:    userInfo.tenNgan            ?? null,
      nguoiTaoId:            phieuInfo.nguoiTaoId       ?? null,
      phieuPhongBanId:       phieuInfo.idphongBan       ?? null,
      pheDuyet:              phieuInfo.pheDuyet         ?? [],
      onStatusChange:        handleStatusChange,
      onSuccess:             handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  const tableSection = config.layout.find(
    (section: any) => section.sectionType === "table" && section.key === "table1"
  );

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
          {config.headerFields.map((f, idx) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} disabled={isFormLocked} loading={loading}>
            Tải dữ liệu
          </Button>
          {idphieu && (
            currentTinhTrang === TrangThaiPhieuConst.HoanThanh ||
            currentTinhTrang === TrangThaiPhieuConst.DaChot
          ) && (
            <Button type="default" icon={<FilePdfOutlined />} onClick={handleExportPdf} loading={loading}>
              Xuất PDF
            </Button>
          )}
          {actionButtons}
        </div>

        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={tableSection?.columns || []}
                initialData={tableData}
                onDataChange={(rows) => setTableData(rows as TableRow[])}
                addRowButtonText="+ Thêm dòng"
                minRows={0}
                loading={loading}
                editable={false}
                showAddButton={false}
                showDeleteButton={false}
                summary={(pageData) => {
                  const totals = {
                    stLoai1: 0, klLoai1: 0, stPhoiNgan: 0, klPhoiNgan: 0,
                    stLoai2: 0, klLoai2: 0, stLoai3: 0,    klLoai3: 0,
                    tongSoThanh: 0, tongKhoiLuong: 0,
                  };
                  pageData.forEach((row: any) => {
                    totals.stLoai1       += Number(row.stLoai1)       || 0;
                    totals.klLoai1       += Number(row.klLoai1)       || 0;
                    totals.stPhoiNgan    += Number(row.stPhoiNgan)    || 0;
                    totals.klPhoiNgan    += Number(row.klPhoiNgan)    || 0;
                    totals.stLoai2       += Number(row.stLoai2)       || 0;
                    totals.klLoai2       += Number(row.klLoai2)       || 0;
                    totals.stLoai3       += Number(row.stLoai3)       || 0;
                    totals.klLoai3       += Number(row.klLoai3)       || 0;
                    totals.tongSoThanh   += Number(row.tongSoThanh)   || 0;
                    totals.tongKhoiLuong += Number(row.tongKhoiLuong) || 0;
                  });
                  const fmt = (n: number) => n.toLocaleString("en-US");
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} colSpan={3} align="center">TỔNG CỘNG</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}  align="right">{fmt(totals.stLoai1)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={2}  align="right">{fmt(totals.klLoai1)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={3}  align="right">{fmt(totals.stPhoiNgan)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={4}  align="right">{fmt(totals.klPhoiNgan)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={5}  align="right">{fmt(totals.stLoai2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={6}  align="right">{fmt(totals.klLoai2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={7}  align="right">{fmt(totals.stLoai3)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={8}  align="right">{fmt(totals.klLoai3)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={9}  align="right">{fmt(totals.tongSoThanh)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={10} align="right">{fmt(totals.tongKhoiLuong)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        ))}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {config.signatures?.map((sig, i) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue   = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet       = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig} idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      {duyet?.tinhTrang === 1 ? "Đã ký"
                      : duyet?.tinhTrang === 2 ? "Đã từ chối"
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

export default TaoPhieuSanLuongPhoi;