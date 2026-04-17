import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import { useCallback, useState, type CSSProperties } from "react";
import { PhieuApi } from "../../services/PhieuApi";
import { bbgbThepLongApi } from "../../services/BBGNThepLongApi";

type BBGNExportButtonsProps = {
  idPhieu?: string | null;
  templateCode: string;
  soPhieu?: string;
  containerStyle?: CSSProperties;
  disabled?: boolean;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export default function BBGNExportButtons({
  idPhieu,
  templateCode,
  soPhieu,
  containerStyle,
  disabled = false,
}: BBGNExportButtonsProps) {
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const canExport = !disabled && !!idPhieu;

  const handleExportExcel = useCallback(async () => {
    if (!idPhieu) return;
    try {
      setExportingExcel(true);
      const res = await bbgbThepLongApi.exportDetailExcel(idPhieu);
      const raw = res as unknown;
      const blob =
        raw instanceof Blob
          ? raw
          : new Blob([raw as unknown as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      if (blob.size === 0) throw new Error("Dữ liệu Excel rỗng hoặc không hợp lệ.");
      downloadBlob(blob, `${templateCode}_${soPhieu || idPhieu}.xlsx`);
    } catch (e: unknown) {
      message.error((e as Error)?.message || "Xuất Excel thất bại");
    } finally {
      setExportingExcel(false);
    }
  }, [idPhieu, soPhieu, templateCode]);

  const handleExportPdf = useCallback(async () => {
    if (!idPhieu) return;
    try {
      setExportingPdf(true);
      const res = await bbgbThepLongApi.exportDetailPDF(idPhieu);
      const raw = res as unknown;
      const blob = raw instanceof Blob ? raw : new Blob([raw as unknown as BlobPart], { type: "application/pdf" });
      if (blob.size === 0) throw new Error("Dữ liệu PDF rỗng hoặc không hợp lệ.");
      downloadBlob(blob, `${templateCode}_${soPhieu || idPhieu}.pdf`);
    } catch (e: unknown) {
      message.error((e as Error)?.message || "Xuất PDF thất bại");
    } finally {
      setExportingPdf(false);
    }
  }, [idPhieu, soPhieu, templateCode]);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        ...containerStyle,
      }}
    >
      <Button
        icon={<FileExcelOutlined />}
        style={{ backgroundColor: "#217346", borderColor: "#217346", color: "#fff" }}
        onClick={() => void handleExportExcel()}
        loading={exportingExcel}
        disabled={!canExport}
      >
        Xuất Excel
      </Button>
      <Button
        icon={<FilePdfOutlined />}
        style={{ backgroundColor: "#d32f2f", borderColor: "#d32f2f", color: "#fff" }}
        onClick={() => void handleExportPdf()}
        loading={exportingPdf}
        disabled={!canExport}
      >
        Xuất PDF
      </Button>
    </div>
  );
}

