/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, message } from "antd";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
import { dlnmHRC2Api } from "../services/DLNMHRC2Api";

type HRC2ExportBienBanButtonsProps = {
  templateCode: string; // config.code (dùng để đặt tên file)
  bieuMau: string; // config.loaiBm
  idPhieu: string;
  soPhieu?: string;
  ngaySX?: any; // string | dayjs | Date
  ca?: number | null;
  scope?: number | null;
  containerStyle?: CSSProperties;
  disabled?: boolean;
};

const toNgayString = (ngaySX: any): string | null => {
  if (!ngaySX) return null;
  try {
    const d = dayjs(ngaySX);
    if (!d.isValid()) return null;
    return d.format("YYYY-MM-DD");
  } catch {
    return null;
  }
};

export default function HRC2ExportBienBanButtons({
  templateCode,
  bieuMau,
  idPhieu,
  soPhieu,
  ngaySX,
  ca,
  scope,
  containerStyle,
  disabled = false,
}: HRC2ExportBienBanButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleError = useCallback((error: any, defaultMsg: string) => {
    let msg = error?.message || defaultMsg;
    const dataErr = error?.response?.data;
    if (typeof dataErr === "string") {
      try {
        const parsed = JSON.parse(dataErr);
        msg = parsed?.message || parsed?.data?.message || msg;
      } catch {
        msg = dataErr || msg;
      }
    } else if (dataErr instanceof Blob) {
      // responseType="blob": error body có thể là blob
      dataErr
        .text()
        .then((text) => {
          try {
            const parsed = JSON.parse(text);
            msg = parsed?.message || parsed?.data?.message || text || msg;
          } catch {
            msg = text || msg;
          }
          message.error(msg);
        })
        .catch(() => message.error(msg));
      return;
    } else if (dataErr?.message) {
      msg = dataErr.message;
    }
    message.error(msg);
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      setExporting(true);
      const res = await dlnmHRC2Api.exportBienBan({
        Ngay: toNgayString(ngaySX),
        Ca: ca ?? null,
        Scope: scope ?? null,
        BieuMau: bieuMau,
        IdPhieu: idPhieu
      });

      const raw = res as unknown;
      if (raw == null) throw new Error("Không nhận được dữ liệu Excel từ server.");

      const blob =
        raw instanceof Blob
          ? raw
          : new Blob([raw as any], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

      if (blob.size === 0) throw new Error("Dữ liệu Excel rỗng hoặc không hợp lệ.");

      downloadBlob(blob, `${templateCode}_${soPhieu || idPhieu}.xlsx`);
    } catch (error: any) {
      handleError(error, "Xuất Excel thất bại!");
    } finally {
      setExporting(false);
    }
  }, [bieuMau, ca, downloadBlob, handleError, idPhieu, ngaySX, scope, soPhieu, templateCode]);

  const handleExportPdf = useCallback(async () => {
    try {
      setExporting(true);
      const res = await dlnmHRC2Api.exportBienBanPDF({
        Ngay: toNgayString(ngaySX),
        Ca: ca ?? null,
        Scope: scope ?? null,
        BieuMau: bieuMau,
        IdPhieu: idPhieu,
      });

      const raw = res as unknown;
      if (raw == null) throw new Error("Không nhận được dữ liệu PDF từ server.");

      const blob = raw instanceof Blob ? raw : new Blob([raw as any], { type: "application/pdf" });
      if (blob.size === 0) throw new Error("Dữ liệu PDF rỗng hoặc không hợp lệ.");

      downloadBlob(blob, `${templateCode}_${soPhieu || idPhieu}.pdf`);
    } catch (error: any) {
      handleError(error, "Xuất PDF thất bại!");
    } finally {
      setExporting(false);
    }
  }, [bieuMau, ca, downloadBlob, handleError, idPhieu, ngaySX, scope, soPhieu, templateCode]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        ...containerStyle,
      }}
    >
      <Button
        icon={<FileExcelOutlined />}
        style={{ backgroundColor: "#217346", borderColor: "#217346", color: "#fff" }}
        onClick={() => void handleExportExcel()}
        loading={exporting}
        disabled={disabled}
      >
        Xuất Excel
      </Button>
      <Button
        icon={<FilePdfOutlined />}
        style={{ backgroundColor: "#d32f2f", borderColor: "#d32f2f", color: "#fff" }}
        onClick={() => void handleExportPdf()}
        loading={exporting}
        disabled={disabled}
      >
        Xuất PDF
      </Button>
    </div>
  );
}

