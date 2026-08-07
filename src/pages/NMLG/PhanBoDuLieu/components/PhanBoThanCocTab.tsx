import { useCallback, useEffect, useState } from "react";
import { Button, InputNumber, message, Popconfirm, Select, Space, Table } from "antd";
import type { Dayjs } from "dayjs";
import {
  phanBoApi,
  tyLePhanBoApi,
  type KetQuaThanCocDto,
  type ValidatePhanBoResultDto,
} from "../../../../services/PhanBoApi";
import ValidateBanner from "./ValidateBanner";

const PHUONG_THUC_TY_LE_NHAP_TAY = 2;
const TRANG_THAI_DA_CHOT = 1;
const CONG_DOAN_CHI_PHI_OPTIONS = [
  { value: "DQ1", label: "DQ1" },
  { value: "DQ2", label: "DQ2" },
];

type DisplayRow = KetQuaThanCocDto & { _isTong?: boolean };

function getCurrentUserId(): number | null {
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};
  return (
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userInfoObj?.idTaiKhoan ??
    null
  );
}

const readonlyCellStyle: React.CSSProperties = {
  padding: "4px 8px",
  textAlign: "right",
};

function formatSo(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

function rowKeyOf(row: DisplayRow) {
  return row._isTong ? `${row.idNhomPhanBo}-tong` : `${row.idNhomPhanBo}-${row.idNvl}`;
}

// Chèn 1 dòng tổng sau mỗi nhóm phân bổ (thay vì lặp cột "Tổng nhóm" trên mọi dòng)
function withTongRows(rows: KetQuaThanCocDto[]): DisplayRow[] {
  const result: DisplayRow[] = [];
  let i = 0;
  while (i < rows.length) {
    const idNhom = rows[i].idNhomPhanBo;
    const group: KetQuaThanCocDto[] = [];
    while (i < rows.length && rows[i].idNhomPhanBo === idNhom) {
      group.push(rows[i]);
      i++;
    }
    result.push(...group);

    const first = group[0];
    result.push({
      ...first,
      idNvl: 0,
      tenNvl: `Tổng ${first.tenNhomPhanBo ?? ""}`,
      khoiLuongNapLieu: group.reduce((s, r) => s + r.khoiLuongNapLieu, 0),
      tyLePhanBo: 0,
      khoiLuongPhanBoCvh: group.reduce((s, r) => s + r.khoiLuongPhanBoCvh, 0),
      khoiLuongPhanBoThanCoc10: group.reduce((s, r) => s + r.khoiLuongPhanBoThanCoc10, 0),
      khoiLuongChotCuoi: group.reduce((s, r) => s + r.khoiLuongChotCuoi, 0),
      laDongConLai: false,
      _isTong: true,
    });
  }
  return result;
}

interface PhanBoThanCocTabProps {
  ngay: Dayjs;
  ca: number;
  idLoCao: number;
}

// Gộp CVH + Than cốc <10mm: cùng 1 nhóm/NVL/tỷ lệ % (dùng chung), nhưng 2 nguồn khối lượng
// nhận về (G) khác nhau nên ra 2 cột H riêng — cộng lại thành khối lượng chốt cuối.
export default function PhanBoThanCocTab({ ngay, ca, idLoCao }: PhanBoThanCocTabProps) {
  const [data, setData] = useState<KetQuaThanCocDto[]>([]);
  const [validateCvh, setValidateCvh] = useState<ValidatePhanBoResultDto | null>(null);
  const [validateThanCoc10, setValidateThanCoc10] = useState<ValidatePhanBoResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [tinhLoading, setTinhLoading] = useState(false);
  const [chotLoading, setChotLoading] = useState(false);
  const [huyChotLoading, setHuyChotLoading] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [savingMaCongDoanKey, setSavingMaCongDoanKey] = useState<string | null>(null);

  const daChot = data.length > 0 && data.every((r) => r.trangThai === TRANG_THAI_DA_CHOT);
  const isMatched = !!validateCvh?.isMatched && !!validateThanCoc10?.isMatched;
  const displayData = withTongRows(data);

  const fetchKetQua = useCallback(async () => {
    setLoading(true);
    try {
      const res = await phanBoApi.getKetQuaThanCoc({
        ngay: ngay.format("YYYY-MM-DD"),
        idLoCao,
        ca,
      });
      setData(res.ketQua);
      setValidateCvh(res.validateCvh);
      setValidateThanCoc10(res.validateThanCoc10);
    } catch (err: any) {
      message.error(err?.message || "Không tải được dữ liệu phân bổ.");
    } finally {
      setLoading(false);
    }
  }, [ngay, ca, idLoCao]);

  useEffect(() => {
    fetchKetQua();
  }, [fetchKetQua]);

  const handleTinhLai = async () => {
    const idNguoiThucThi = getCurrentUserId();
    if (!idNguoiThucThi) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setTinhLoading(true);
    try {
      await phanBoApi.tinh({ ngay: ngay.format("YYYY-MM-DD"), idNguoiThucThi });
      await fetchKetQua();
      message.success("Đã tính lại phân bổ.");
    } catch (err: any) {
      message.error(err?.message || "Tính lại phân bổ thất bại.");
    } finally {
      setTinhLoading(false);
    }
  };

  const handleChot = async () => {
    const idNguoiXacNhan = getCurrentUserId();
    if (!idNguoiXacNhan) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setChotLoading(true);
    try {
      await phanBoApi.chot({ ngay: ngay.format("YYYY-MM-DD"), idNguoiXacNhan });
      await fetchKetQua();
      message.success("Đã chốt dữ liệu.");
    } catch (err: any) {
      message.error(err?.message || "Chốt dữ liệu thất bại.");
    } finally {
      setChotLoading(false);
    }
  };

  const handleHuyChot = async () => {
    const idNguoiXacNhan = getCurrentUserId();
    if (!idNguoiXacNhan) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setHuyChotLoading(true);
    try {
      await phanBoApi.huyChot({ ngay: ngay.format("YYYY-MM-DD"), idNguoiXacNhan });
      await fetchKetQua();
      message.success("Đã hủy chốt dữ liệu.");
    } catch (err: any) {
      message.error(err?.message || "Hủy chốt dữ liệu thất bại.");
    } finally {
      setHuyChotLoading(false);
    }
  };

  const handleSaveTyLe = async (row: KetQuaThanCocDto, percent: number | null) => {
    if (percent == null) return;
    const idNguoiNhap = getCurrentUserId();
    if (!idNguoiNhap) {
      message.error("Không xác định được người dùng hiện tại.");
      return;
    }
    setSavingRowKey(rowKeyOf(row));
    try {
      await tyLePhanBoApi.create({
        idNvl: row.idNvl,
        ngay: ngay.format("YYYY-MM-DD"),
        ca,
        tyLe: percent / 100,
        idNguoiNhap,
      });
      message.success("Đã lưu tỷ lệ. Bấm \"Tính lại\" để cập nhật kết quả phân bổ.");
    } catch (err: any) {
      message.error(err?.message || "Lưu tỷ lệ thất bại.");
    } finally {
      setSavingRowKey(null);
    }
  };

  const handleSaveMaCongDoanChiPhi = async (row: KetQuaThanCocDto, value: string | null) => {
    setSavingMaCongDoanKey(rowKeyOf(row));
    try {
      await phanBoApi.updateMaCongDoanChiPhi({
        ngay: ngay.format("YYYY-MM-DD"),
        idNvl: row.idNvl,
        maCongDoanChiPhi: value,
      });
      setData((prev) => prev.map((r) => (r.idNvl === row.idNvl ? { ...r, maCongDoanChiPhi: value } : r)));
      message.success("Đã cập nhật mã công đoạn chi phí.");
    } catch (err: any) {
      message.error(err?.message || "Cập nhật thất bại.");
    } finally {
      setSavingMaCongDoanKey(null);
    }
  };

  const columns = [
    {
      title: "Nhóm",
      dataIndex: "tenNhomPhanBo",
      width: 160,
    },
    {
      title: "NVL",
      dataIndex: "tenNvl",
      width: 200,
      render: (v: string | null, row: DisplayRow) => (
        <span style={row._isTong ? { fontWeight: 600 } : undefined}>{v}</span>
      ),
    },
    {
      title: "Mã công đoạn chi phí",
      dataIndex: "maCongDoanChiPhi",
      width: 150,
      align: "center" as const,
      render: (v: string | null, row: DisplayRow) => {
        if (row._isTong) return "";
        return (
          <Select
            style={{ width: "100%" }}
            size="small"
            allowClear
            placeholder="Chọn"
            options={CONG_DOAN_CHI_PHI_OPTIONS}
            value={v ?? undefined}
            disabled={daChot || savingMaCongDoanKey === rowKeyOf(row)}
            onChange={(value) => handleSaveMaCongDoanChiPhi(row, value ?? null)}
          />
        );
      },
    },
    {
      title: "Khối lượng nạp liệu (E)",
      dataIndex: "khoiLuongNapLieu",
      width: 150,
      align: "right" as const,
      render: (v: number, row: DisplayRow) => (
        <div style={row._isTong ? { ...readonlyCellStyle, fontWeight: 600 } : readonlyCellStyle}>
          {formatSo(v)}
        </div>
      ),
    },
    {
      title: "Tỷ lệ (%)",
      dataIndex: "tyLePhanBo",
      width: 130,
      align: "right" as const,
      render: (v: number, row: DisplayRow) => {
        if (row._isTong) return <div style={readonlyCellStyle}>—</div>;
        const editable = row.phuongThucPhanBo === PHUONG_THUC_TY_LE_NHAP_TAY && !daChot;
        if (!editable) {
          return <div style={readonlyCellStyle}>{formatSo(v * 100)}</div>;
        }
        return (
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            max={100}
            precision={3}
            defaultValue={v * 100}
            disabled={savingRowKey === rowKeyOf(row)}
            onPressEnter={(e) => handleSaveTyLe(row, Number((e.target as HTMLInputElement).value))}
            onBlur={(e) => handleSaveTyLe(row, Number(e.target.value))}
          />
        );
      },
    },
    {
      title: "CVH (Lấy từ biểu nạp liệu)",
      dataIndex: "khoiLuongNhanVeCvh",
      width: 150,
      align: "right" as const,
      onCell: (_row: DisplayRow, index?: number) => ({ rowSpan: index === 0 ? displayData.length : 0 }),
      render: (v: number) => <div style={readonlyCellStyle}>{formatSo(v)}</div>,
    },
    {
      title: "Phân bổ CVH",
      dataIndex: "khoiLuongPhanBoCvh",
      width: 130,
      align: "right" as const,
      render: (v: number, row: DisplayRow) => (
        <div style={row._isTong ? { ...readonlyCellStyle, fontWeight: 600 } : readonlyCellStyle}>
          {formatSo(v)}
        </div>
      ),
    },
    {
      title: "Than cốc <10mm (Lấy từ biên bản giao nhận)",
      dataIndex: "khoiLuongNhanVeThanCoc10",
      width: 170,
      align: "right" as const,
      onCell: (_row: DisplayRow, index?: number) => ({ rowSpan: index === 0 ? displayData.length : 0 }),
      render: (v: number) => <div style={readonlyCellStyle}>{formatSo(v)}</div>,
    },
    {
      title: "Phân bổ Than cốc <10mm",
      dataIndex: "khoiLuongPhanBoThanCoc10",
      width: 160,
      align: "right" as const,
      render: (v: number, row: DisplayRow) => (
        <div style={row._isTong ? { ...readonlyCellStyle, fontWeight: 600 } : readonlyCellStyle}>
          {formatSo(v)}
        </div>
      ),
    },
    {
      title: "Số sau khi phân bổ (đưa lên báo cáo chi phí)",
      dataIndex: "khoiLuongChotCuoi",
      width: 200,
      align: "right" as const,
      render: (v: number) => (
        <div style={{ ...readonlyCellStyle, fontWeight: 600 }}>{formatSo(v)}</div>
      ),
    },
  ];

  return (
    <div>
      <ValidateBanner validate={validateCvh} label="CVH" />
      <ValidateBanner validate={validateThanCoc10} label="Than cốc <10mm" />

      <Space className="mb-3">
        <Button type="primary" loading={tinhLoading} disabled={daChot} onClick={handleTinhLai}>
          Tính lại
        </Button>
        <Popconfirm
          title="Chốt dữ liệu phân bổ?"
          description="Sau khi chốt sẽ không thể sửa/tính lại cho ngày này (cả 3 loại phân bổ)."
          okText="Chốt"
          cancelText="Hủy"
          onConfirm={handleChot}
          disabled={daChot || !isMatched}
        >
          <Button danger disabled={daChot || !isMatched} loading={chotLoading}>
            {daChot ? "Đã chốt" : "Chốt dữ liệu"}
          </Button>
        </Popconfirm>
        {daChot && (
          <Popconfirm
            title="Hủy chốt dữ liệu phân bổ?"
            description="Sau khi hủy chốt sẽ có thể sửa/tính lại cho ngày này (cả 3 loại phân bổ)."
            okText="Hủy chốt"
            cancelText="Đóng"
            onConfirm={handleHuyChot}
          >
            <Button loading={huyChotLoading}>Hủy chốt</Button>
          </Popconfirm>
        )}
      </Space>

      <Table
        bordered
        size="small"
        rowKey={rowKeyOf}
        loading={loading}
        pagination={false}
        columns={columns}
        dataSource={displayData}
        scroll={{ x: "max-content" }}
        rowClassName={(row) => (row._isTong ? "bg-gray-50" : "")}
      />
    </div>
  );
}
