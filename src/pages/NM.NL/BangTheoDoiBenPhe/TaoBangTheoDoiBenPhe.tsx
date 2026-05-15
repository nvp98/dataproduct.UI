import NL_BB_TheoDoiBenPhe from "../../../utils/BM_config/NL_BB_TheoDoiBenPhe.json";
import {
  Button,
  Card,
  Form,
  Input,
  Table,
  Typography,
  message,
  Select,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import CustomFormTable from "../../../components/CustomFormTable";
import CustomFormItem from "../../../components/CustomFormItem";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { phieuActionService } from "../../../services/PhieuActionService";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import * as XLSX from "xlsx";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

const TaoBangTheoDoiBenPhe = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};
  const [soPhieu, setSoPhieu] = useState("");
  const { redirectToList } = usePhieuNavigation(
    "BangTheoDoiBenPhe",
    "/BangTheoDoiBenPhe",
  );

  const config = NL_BB_TheoDoiBenPhe;
  const [form] = Form.useForm();
  const [tableData, setTableData] = useState<any[]>([{ key: uuidv4() }]);
  const [loading, setLoading] = useState(false);
  const [phieuInfo, setPhieuInfo] = useState<Record<string, any>>({
    tinhTrang: 0,
    pheDuyet: [],
    nguoiTaoId: null,
    idphongBan: null,
    sophieu: "",
    tenScope: "",
  });

  // Filter states cho export PDF
  const [pdfFilters, setPdfFilters] = useState<{
    selectedGhiChu: string[];
    minKhoiLuong: number | null;
    maxKhoiLuong: number | null;
  }>({
    selectedGhiChu: [],
    minKhoiLuong: null,
    maxKhoiLuong: null,
  });

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);
  const isFormLocked =
    currentTinhTrang === TrangThaiPhieuConst.HoanThanh ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh;

  const userInfo = getThongTinUser();

  const getFormData = useCallback(async () => {
    // call api sô phiếu theo maBm + scope để lấy số tiếp theo

    // Validate trước khi lấy dữ liệu - trigger required validation
    const values = await form.validateFields();
    const NgaySX = values?.NgaySX
      ? dayjs(values.NgaySX).format("YYYY-MM-DD")
      : "";
    const CaSX = values?.ca ? Number(values.ca) : 0;
    const STTPhieu = await PhieuApi.getSoPhieu(config.code, NgaySX, CaSX);
    const pheDuyetFlow = (config.signatures || [])
      .filter((s: any) => s.isChon)
      .map((s: any) => ({
        capDuyet: s.capduyet,
        maKyDuyet: s.key,
        nguoiDuyetId: form.getFieldValue(s.key),
        tinhTrang: 0,
        ghiChu: "",
      }));

    return {
      ...values,
      NgaySX: values?.NgaySX ? dayjs(values.NgaySX).format("YYYY-MM-DD") : null,
      maBm: config.code,
      prefix: config.prefix,
      scope: ((STTPhieu as any)?.count ?? 0) + 1, // gọi API số phiếu theo maBm + scope để lấy số tiếp theo
      tenScope: values?.tenScope || "",
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: tableData,
      pheDuyet: pheDuyetFlow,
    };
  }, [form, tableData, config.code, userInfo]);

  const handleActionSuccess = useCallback(async () => {
    message.success("Thao tác thành công!");
    if (redirectToList) {
      redirectToList("Phiếu đã được xử lý thành công");
    }
  }, [redirectToList]);

  const initData = async () => {
    const stored = getThongTinUser();
    const currentUserId = stored ? stored.iD_TaiKhoan : null;

    try {
      if (idphieu) {
        setLoading(true);
        const res = await PhieuApi.getDetail(idphieu);
        if (res) {
          const data = (res as any).jsonData || {};
          console.log("Loaded phiếu data:", data);
          const dataPhieu = (res as any) || {};
          setPhieuInfo({
            idphieu: (res as any)?.idphieu || "",
            tinhTrang: (res as any)?.tinhTrang || 0,
            pheDuyet: (res as any)?.pheDuyet || [],
            nguoiTaoId: (res as any)?.nguoiTaoId || null,
            idphongBan: (res as any)?.idphongBan || null,
            sophieu: (res as any)?.soPhieu || "",
          });
          form.setFieldsValue({
            ...data,
            idphieu: (res as any)?.idphieu || "",
            NgaySX: dataPhieu.ngaySX
              ? dayjs(dataPhieu.ngaySX, "YYYY-MM-DD")
              : null,
            ca: dataPhieu.ca ? Number(dataPhieu.ca) : null,
            kip: dataPhieu.kip ? dataPhieu.kip : null,
            tenScope: data.tenScope || "",
          });
          if (data.table1?.length) setTableData(data.table1);
          if (!dataPhieu.pheDuyet?.length) {
            // Tạo mới: set default người tạo vào các signature capduyet === 0
            const defaultSigs: Record<string, any> = {};
            config.signatures
              .filter((s) => s.capduyet === 0)
              .forEach((s) => {
                defaultSigs[s.key] = currentUserId;
              });
            form.setFieldsValue(defaultSigs);
            // setPhieuInfo({
            //   idphieu: "",
            //   tinhTrang: 0,
            //   pheDuyet: [],
            //   nguoiTaoId: currentUserId,
            //   idphongBan: stored?.iD_PhongBan || null,
            //   sophieu: "",
            // });
            return;
          }
        }
      }
    } catch {
      message.error("Không thể tải dữ liệu phiếu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, [idphieu]);

  const handleSubmit = async (values: any) => {
    try {
      // Validate fields (triggers required validation)
      await form.validateFields();

      const stored = getThongTinUser();

      const pheDuyetFlow = config.signatures
        .filter((s) => s.isChon)
        .map((s) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      const hasCreator = config.signatures.find(
        (x) => x.isChon === false && x.capduyet === 1,
      );
      if (hasCreator) {
        pheDuyetFlow.unshift({
          capDuyet: 1,
          maKyDuyet: hasCreator.key,
          nguoiDuyetId: stored ? stored.iD_TaiKhoan : null,
          tinhTrang: 1,
          ghiChu: "Người tạo phiếu",
        });
      }

      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? stored.iD_TaiKhoan : null,
        xuongId: stored ? stored.iD_PhanXuong : null,
        idphongBan: stored ? stored.iD_PhongBan : null,
        table1: tableData,
        pheDuyet: pheDuyetFlow,
      };

      if (values.idphieu) {
        await PhieuApi.putData(values.idphieu, payload);
        message.success("Cập nhật phiếu thành công!");
      } else {
        const res = await PhieuApi.postData(payload);
        message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu || ""}`);
      }
    } catch (error) {
      console.error("Lỗi lưu phiếu:", error);
      message.error("Không thể lưu phiếu! Vui lòng thử lại.");
    }
  };

  // Helper function để fix lỗi floating point precision
  const sanitizeNumber = (value: any): number | string => {
    if (value === "" || value === null || value === undefined) return "";
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return value;
    // Round to 3 decimal places để tránh lỗi floating point (26.299999999999997 → 26.3)
    const rounded = Math.round(parsed * 1000) / 1000;
    return rounded.toFixed(3);
  };

  const handleImportExcel = useCallback(
    (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
          }) as any[];

          if (jsonData.length < 2) {
            message.error("File Excel không có dữ liệu!");
            return;
          }

          // Get column headers và config từ config
          const columns = config.layout?.[0]?.columns || [];
          const columnHeaders = columns.map((col: any) => col.dataIndex);
          const columnConfigMap = Object.fromEntries(
            columns.map((col: any) => [col.dataIndex, col]),
          );

          // Parse data từ Excel
          const importedRows = jsonData
            .slice(1)
            .map((row: any[], idx: number) => {
              const newRow: any = { key: uuidv4() };
              columnHeaders.forEach((header: string, colIndex: number) => {
                let value = row[colIndex] ?? "";

                // Fix lỗi làm tròn số cho các column float/number
                if (value !== "" && value !== null) {
                  const columnConfig = columnConfigMap[header];
                  if (columnConfig?.dataIndex === "khoiLuongBen") {
                    value = sanitizeNumber(value);
                  }
                }

                newRow[header] = value;
              });
              return newRow;
            });

          // Clear bảng cũ rồi insert dữ liệu
          setTableData(importedRows);
          message.success(`Import thành công ${importedRows.length} dòng!`);

          // Reset input
          event.target.value = "";
        } catch (error) {
          console.error("Lỗi import:", error);
          message.error("Lỗi đọc file Excel!");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [tableData, config],
  );

  // Export PDF với filters
  const handleExportPdfWithFilters = useCallback(async () => {
    if (!phieuInfo.idphieu) {
      message.warning("Chưa có phiếu để xuất PDF");
      return;
    }

    try {
      setLoading(true);
      const filters: string[] = [];

      // Thêm filter theo ghi chú đã chọn
      if (pdfFilters.selectedGhiChu && pdfFilters.selectedGhiChu.length > 0) {
        filters.push(`ghiChu:${pdfFilters.selectedGhiChu.join("|")}`);
      }

      // Thêm filter theo khối lượng
      if (pdfFilters.minKhoiLuong !== null && pdfFilters.minKhoiLuong > 0) {
        filters.push(`minKL:${pdfFilters.minKhoiLuong}`);
      }
      if (pdfFilters.maxKhoiLuong !== null && pdfFilters.maxKhoiLuong > 0) {
        filters.push(`maxKL:${pdfFilters.maxKhoiLuong}`);
      }

      // Gọi API với filters
      const res = await PhieuApi.exportPdf(
        phieuInfo.idphieu,
        filters.length > 0 ? filters : undefined,
      );

      if (res instanceof Blob) {
        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BM.18-HD.25.08_BangTheoDoiBenPhe_${phieuInfo.sophieu}_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        message.success("Xuất PDF thành công!");
      }
    } catch (error) {
      console.error("Lỗi xuất PDF:", error);
      message.error("Lỗi xuất PDF!");
    } finally {
      setLoading(false);
    }
  }, [phieuInfo.idphieu, phieuInfo.sophieu, pdfFilters]);

  const downloadTemplate = useCallback(() => {
    try {
      // Get columns từ config
      const columns = (config.layout?.[0]?.columns || []) as any[];
      const headers = columns.map((col: any) => col.title);
      const dataIndices = columns.map((col: any) => col.dataIndex);

      // Tạo template với 5 dòng rỗng
      const templateData = [
        headers,
        ...Array(5)
          .fill(null)
          .map(() => dataIndices.map(() => "")),
      ];

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      // Auto-width columns
      const columnWidths = headers.map(() => 20);
      ws["!cols"] = columnWidths.map((w) => ({ wch: w }));

      // Download
      XLSX.writeFile(wb, `${config.code}_template.xlsx`);
      message.success("Template Excel đã tải xuống!");
    } catch (error) {
      console.error("Lỗi tạo template:", error);
      message.error("Lỗi tạo template Excel!");
    }
  }, [config]);

  const actionButtons = useMemo(() => {
    const userInfo = getThongTinUser();
    const buttons = phieuActionService.getActionButtons({
      phieuId: phieuInfo.idphieu || "",
      tinhTrang: phieuInfo.tinhTrang ?? 0,
      currentUserId: userInfo?.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo?.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo?.tenNgan ?? null,
      nguoiTaoId: phieuInfo.nguoiTaoId ?? null,
      phieuPhongBanId: phieuInfo.idphongBan ?? null,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(
      buttons,
      phieuInfo.idphieu || "",
      getFormData,
    );
  }, [getFormData, handleActionSuccess, phieuInfo, redirectToList]);

  // Lấy danh sách ghi chú duy nhất từ dữ liệu bảng
  // const ghiChuOptions = useMemo(() => {
  //   const uniqueGhiChu = new Set<string>();
  //   tableData.forEach((row) => {
  //     if (row.ghiChu && row.ghiChu.trim()) {
  //       uniqueGhiChu.add(row.ghiChu.trim());
  //     }
  //   });
  //   return Array.from(uniqueGhiChu)
  //     .sort()
  //     .map((value) => ({
  //       label: value,
  //       value: value,
  //     }));
  // }, [tableData]);

  // Format columns để hiển thị số với 3 chữ số thập phân
  const formattedColumns = useMemo(() => {
    const columns = config.layout?.[0]?.columns || [];

    const columnsWithStt = [
      {
        title: "STT",
        dataIndex: "stt",
        width: 50,
        type: "index",
        render: (_: any, __: any, index: number) => index + 1,
      },
      ...columns.map((col: any) => {
        // Add grouped options for ghi chú select
        // if (col.dataIndex === "ghiChu" && col.type === "select") {
        //   return {
        //     ...col,
        //     options: ghiChuOptions,
        //   };
        // }
        return col;
      }),
    ];
    return columnsWithStt;
  }, [config /*ghiChuOptions*/]);

  // Tạo hàm summary để tính tổng khối lượng
  const tableSummary = useMemo(() => {
    return (pageData: readonly any[]) => {
      const total = pageData.reduce((sum, record) => {
        const khoi = Number(record.khoiLuongBen) || 0;
        return sum + khoi;
      }, 0);

      return (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}></Table.Summary.Cell>
          <Table.Summary.Cell index={1}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Tổng</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={2}></Table.Summary.Cell>
          <Table.Summary.Cell index={3}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                textAlign: "right",
                display: "block",
              }}
            >
              {total.toFixed(3)}
            </span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={4}></Table.Summary.Cell>
        </Table.Summary.Row>
      );
    };
  }, []);

  return (
    <Card
      style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}
      loading={loading}
    >
      {/* Tiêu đề */}
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
          {idphieu && <b>Số phiếu: {phieuInfo.sophieu}</b>}
        </div>
        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {config.isoInfo.revision}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* Header fields */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <CustomFormItem
              key={f.key || idx}
              field={f}
              idx={idx}
              disabled={isFormLocked}
            />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          {actionButtons}
        </div>

        {/* Filter & Export PDF */}
        {false &&
          phieuInfo.idphieu &&
          (phieuInfo.tinhTrang == TrangThaiPhieuConst.HoanThanh ||
            phieuInfo.tinhTrang == TrangThaiPhieuConst.DaChot) && (
            <Card
              style={{ marginBottom: 20, backgroundColor: "#f6f8fb" }}
              title="Xuất PDF theo lọc"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    Lọc theo ghi chú
                  </label>
                  {/* <Select
                    mode="multiple"
                    placeholder="Chọn loại ghi chú"
                    value={pdfFilters.selectedGhiChu}
                    onChange={(value) =>
                      setPdfFilters({ ...pdfFilters, selectedGhiChu: value })
                    }
                    options={ghiChuOptions}
                    style={{ width: "100%" }}
                    allowClear
                  /> */}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    Khối lượng tối thiểu (tấn)
                  </label>
                  <Input
                    type="number"
                    placeholder="Nhập giá trị tối thiểu"
                    value={pdfFilters.minKhoiLuong ?? ""}
                    onChange={(e) =>
                      setPdfFilters({
                        ...pdfFilters,
                        minKhoiLuong: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 500,
                    }}
                  >
                    Khối lượng tối đa (tấn)
                  </label>
                  <Input
                    type="number"
                    placeholder="Nhập giá trị tối đa"
                    value={pdfFilters.maxKhoiLuong ?? ""}
                    onChange={(e) =>
                      setPdfFilters({
                        ...pdfFilters,
                        maxKhoiLuong: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                type="primary"
                onClick={handleExportPdfWithFilters}
                loading={loading}
                style={{ width: "100%" }}
              >
                Xuất PDF theo lọc
              </Button>
            </Card>
          )}

        {/* Bảng dữ liệu */}
        {config.layout.map((layout, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            {layout.sectionType === "table" && (
              <>
                <Typography.Text
                  strong
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {layout.title}
                </Typography.Text>
                {!isFormLocked && (
                  <>
                    {/* Import Excel Button */}
                    <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportExcel}
                        style={{ display: "none" }}
                        id={`excel-import-${idx}`}
                      />
                      <label htmlFor={`excel-import-${idx}`}>
                        <Button
                          type="dashed"
                          icon={<UploadOutlined />}
                          onClick={(e) => {
                            e.preventDefault();
                            document
                              .getElementById(`excel-import-${idx}`)
                              ?.click();
                          }}
                        >
                          Import Excel
                        </Button>
                      </label>
                      <Button type="default" onClick={downloadTemplate}>
                        Tải Template
                      </Button>
                    </div>
                  </>
                )}
                <CustomFormTable
                  columns={formattedColumns}
                  initialData={tableData}
                  onDataChange={setTableData}
                  addRowButtonText="+ Thêm dòng"
                  showAddButton={!isFormLocked}
                  showDeleteButton={!isFormLocked}
                  minRows={1}
                  editable={(layout as any).editable !== false}
                  loading={loading}
                  summary={tableSummary}
                />
              </>
            )}
          </div>
        ))}

        {/* Chữ ký */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures
            .filter((x) => x.isChon)
            .map((sig, i) => (
              <div key={sig.key || i}>
                <Typography.Text
                  strong
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {sig.label}
                </Typography.Text>
                <CustomFormItem
                  key={sig.key || i}
                  field={sig}
                  idx={i}
                  disabled={isFormLocked}
                />
              </div>
            ))}
        </div>
      </Form>
    </Card>
  );
};

export default TaoBangTheoDoiBenPhe;
