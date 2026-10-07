/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_PhieuDieuChinh from "../../../utils/BM_config/LG_PhieuDieuChinh.json";
import { Badge, Button, Card, Checkbox, Collapse, Form, Input, Modal, Popconfirm, Popover, Select, Space, Table, Tabs, Typography, message } from "antd";
import { DeleteOutlined, EditOutlined, FilterOutlined, PlusOutlined, SettingOutlined, TableOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTableV2 from "../../../components/FormPhieuDieuChinh";
import type { FormColumnDef } from "../../../components/FormPhieuDieuChinh";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  phieuDieuChinhApi,
  type LGPhieuDieuChinhNvlDto,
  type PhieuDieuChinhChiTietDto,
} from "../../../services/PhieuDieuChinhApi";
import { TaiKhoanApi } from "../../../services/TaiKhoanService";
import "../../../styles/phieuDieuChinhCompact.css";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const getUserInfo = () => {
  const stored = localStorage.getItem("userinfo");
  return stored ? JSON.parse(stored) : {};
};

// Đánh lại "Thứ tự" theo vị trí dòng hiện tại trong bảng
const renumberThuTu = (rows: TableRow[]): TableRow[] =>
  rows.map((r, idx) => ({ ...r, thuTu: idx + 1 }));

const toNum = (v: any): number | null =>
  v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

// "Trước ẩm": không cần Độ ẩm, KL quy khô Nhập = Khối lượng Nhập.
// "Sau ẩm": KL quy khô Nhập tự tính từ Khối lượng nhập + Độ ẩm.
// Sau khi tính xong, Bên nhập mới gán qua Bên xuất.
//
// "Người điều chỉnh nhận" không còn chọn tay — tự động gán người đang đăng nhập ngay khi
// họ (bên nhận) sửa Khối lượng Nhập hoặc Độ ẩm của dòng (so với prevRows để biết có thật sự
// vừa sửa). "Người điều chỉnh giao" tách riêng: người dùng (bên giao) tự tích xác nhận (xem
// cột "Người điều chỉnh giao" trong tableColumns), không tự động theo thao tác sửa số liệu.
const recomputeRows = (
  rows: TableRow[],
  prevRows: TableRow[] = [],
  currentUserId?: number | null,
): TableRow[] => {
  const prevByKey = new Map(prevRows.map((r) => [r.key, r]));

  return rows.map((row) => {
    const loaiSo = row.loaiSoDieuChinh != null ? String(row.loaiSoDieuChinh) : null;
    const khoiLuongNhap = toNum(row.khoiLuongNhap);

    let doAm = row.doAm;
    let khoiLuongQuyKhoNhap: number | null;
    if (loaiSo === "1") {
      doAm = null;
      khoiLuongQuyKhoNhap = khoiLuongNhap;
    } else if (loaiSo === "2") {
      const doAmNum = toNum(row.doAm);
      khoiLuongQuyKhoNhap =
        khoiLuongNhap != null && doAmNum != null
          ? Number((khoiLuongNhap * (1 - doAmNum / 100)).toFixed(3))
          : null;
    } else {
      khoiLuongQuyKhoNhap = toNum(row.khoiLuongQuyKhoNhap);
    }

    let nguoiDieuChinhNhan = row.nguoiDieuChinhNhan;
    let thoiGianDieuChinhNhan = row.thoiGianDieuChinhNhan;
    const prev = prevByKey.get(row.key);
    if (currentUserId != null && prev) {
      const khoiLuongDaDoi = String(prev.khoiLuongNhap ?? "") !== String(row.khoiLuongNhap ?? "");
      const doAmDaDoi = String(prev.doAm ?? "") !== String(row.doAm ?? "");
      if (khoiLuongDaDoi || doAmDaDoi) {
        nguoiDieuChinhNhan = currentUserId;
        thoiGianDieuChinhNhan = new Date().toISOString();
      }
    }

    return {
      ...row,
      doAm,
      khoiLuongQuyKhoNhap,
      khoiLuongXuat: khoiLuongNhap,
      khoiLuongQuyKhoXuat: khoiLuongQuyKhoNhap,
      nguoiDieuChinhNhan,
      thoiGianDieuChinhNhan,
    };
  });
};

// LG_PhieuDieuChinh_ChiTiet (DB) → TableRow hiển thị trên UI — dùng chung cho initData
// (mở lại phiếu đã lưu) và handleLoadFromSource (sau khi sync-tu-bbgn/sync-tu-naplieulocao insert xong).
const chiTietDtoToRows = (chiTiet: PhieuDieuChinhChiTietDto[]): TableRow[] =>
  chiTiet.map((c, idx) => ({
    key: `ct-${c.id ?? idx}`,
    // Id thật trong LG_PhieuDieuChinh_ChiTiet — dùng để gọi API xác nhận riêng cho từng dòng
    // (xem handleXacNhanGiao). Dòng ở phiếu mới chưa Lưu thì không có id này.
    id: c.id,
    idNVL: c.idNVL,
    tenNVL: c.tenNVL,
    idNVLChiTiet: c.idNVLChiTiet,
    idNhomNVL: c.idNhomNVL,
    dvt: c.dvt,
    maLo: c.maLo,
    thuTu: c.thuTu ?? idx + 1,
    loaiDieuChinh: c.loaiDieuChinh,
    loaiSoDieuChinh: c.loaiSoDieuChinh,
    phongBanXuat: c.phongBanXuat,
    xuongXuat: c.xuongXuat,
    khoiLuongXuat: c.khoiLuongXuat,
    khoiLuongQuyKhoXuat: c.khoiLuongQuyKhoXuat,
    phongBanNhap: c.phongBanNhap,
    xuongNhap: c.xuongNhap,
    khoiLuongNhap: c.khoiLuongNhap,
    khoiLuongQuyKhoNhap: c.khoiLuongQuyKhoNhap,
    doAm: c.doAm,
    viTri: c.viTri,
    phanLoai: c.phanLoai,
    ghiChu: c.ghiChu,
    nguoiDieuChinhGiao: c.nguoiDieuChinhGiao,
    thoiGianDieuChinhGiao: c.thoiGianDieuChinhGiao,
    nguoiDieuChinhNhan: c.nguoiDieuChinhNhan,
    thoiGianDieuChinhNhan: c.thoiGianDieuChinhNhan,
    trangThai: c.trangThai ?? 0,
    // Khóa liên kết ngược tới dòng BBGN nguồn — giữ lại để khi Lưu không bị mất, và để lần
    // "Tải dữ liệu" sau khớp lại đúng dòng cũ thay vì tạo trùng.
    idCtBBGN: c.idCtBBGN ?? null,
  }));

const TaoPhieuDieuChinh = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_PhieuDieuChinh as any;
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
  }>({});

  const currentUserInfo = useMemo(() => getUserInfo(), []);

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

  const table1Section = useMemo(
    () => config.layout.find((s: any) => s.sectionType === "table" && s.key === "table1"),
    [config.layout]
  );

  // ─── Cột hiển thị ───────────────────────────────────────────────────────────
  // Bảng chi tiết có ~21 cột, quá rộng để xem hết cùng lúc — cho phép người dùng
  // ẩn bớt cột ít dùng, nhớ lựa chọn qua các lần mở trang (localStorage, chỉ là
  // tiện ích hiển thị riêng cho máy này, không phải dữ liệu nghiệp vụ).
  const HIDDEN_COLUMNS_STORAGE_KEY = "taoPhieuDieuChinh_hiddenColumns";
  const DEFAULT_HIDDEN_COLUMNS = useMemo(() => ["idNhomNVL", "viTri", "phanLoai"], []);

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_HIDDEN_COLUMNS;
    } catch {
      return DEFAULT_HIDDEN_COLUMNS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify(hiddenColumns));
    } catch {
      /* localStorage có thể bị chặn (private mode...) — bỏ qua, không ảnh hưởng chức năng chính */
    }
  }, [hiddenColumns]);

  // Danh sách cột có thể ẩn/hiện — làm phẳng nhóm "Bên xuất"/"Bên nhập". "Thứ tự" luôn hiển thị.
  const toggleableColumns = useMemo(() => {
    const result: { dataIndex: string; label: string }[] = [];
    (table1Section?.columns ?? []).forEach((col: any) => {
      if (col.dataIndex === "thuTu") return;
      if (col.children) {
        col.children.forEach((child: any) => {
          if (child.dataIndex) result.push({ dataIndex: child.dataIndex, label: `${col.title} - ${child.title}` });
        });
      } else if (col.dataIndex) {
        result.push({ dataIndex: col.dataIndex, label: col.title });
      }
    });
    return result;
  }, [table1Section]);

  // ─── Danh mục NVL (LG_PhieuDieuChinh_NVL) ──────────────────────────────────
  const [nvlOptions, setNvlOptions] = useState<LGPhieuDieuChinhNvlDto[]>([]);
  const [nvlModalOpen, setNvlModalOpen] = useState(false);
  const [nvlLoading, setNvlLoading] = useState(false);
  const [nvlEditingId, setNvlEditingId] = useState<number | null>(null);
  const [nvlForm] = Form.useForm();

  const loadNvlOptions = useCallback(async () => {
    try {
      const res = await phieuDieuChinhApi.getNvlList(true);
      setNvlOptions(Array.isArray(res) ? res : []);
    } catch {
      setNvlOptions([]);
    }
  }, []);

  useEffect(() => {
    loadNvlOptions();
  }, [loadNvlOptions]);

  // ─── Danh sách tài khoản (để hiển thị tên Người điều chỉnh giao/nhận) ──────
  // Tải 1 lần cho cả trang thay vì để từng dòng tự gọi API riêng (trước đây mỗi dòng dùng
  // CustomChonNguoiKy, 35 dòng x 2 cột = 70 lần gọi /api/TaiKhoan/nguoiky cùng lúc).
  const [nguoiKyMap, setNguoiKyMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    TaiKhoanApi.getData({})
      .then((res: any) => {
        const map = new Map<number, string>();
        (Array.isArray(res) ? res : []).forEach((x: any) => {
          map.set(x.iD_TaiKhoan, `${x.tenTaiKhoan} - ${x.hoVaTen}`);
        });
        setNguoiKyMap(map);
      })
      .catch(() => setNguoiKyMap(new Map()));
  }, []);

  // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — khóa ô lại khi Trước ẩm,
  // xử lý ngay trong trang này qua custom render (không sửa CustomFormTable dùng chung).
  // Sửa Độ ẩm cũng tính là sửa số liệu — tự gán "Người điều chỉnh giao" (xem recomputeRows).
  const handleDoAmChange = useCallback((rowKey: string | undefined, value: string) => {
    setTableData((prev) =>
      recomputeRows(
        prev.map((r) => (r.key === rowKey ? { ...r, doAm: value } : r)),
        prev,
        currentUserInfo?.iD_TaiKhoan
      )
    );
  }, [currentUserInfo]);

  // "Người điều chỉnh giao" không còn chọn tay — người dùng (bên giao) tự tích xác nhận, hệ
  // thống ghi tên người đang đăng nhập vào dòng đó, đồng thời khóa dòng (trangThai = 1) để
  // không sửa KL/Độ ẩm... được nữa. Bấm "Hủy xác nhận" (checked=false) mở khóa lại dòng.
  //
  // Dòng đã có id thật (đã Lưu hoặc đã Tải dữ liệu nguồn từ BBGN) → gọi API riêng lưu ngay
  // xuống DB, không cần chờ Lưu cả phiếu; lỗi thì báo và hoàn tác lại trên UI. Dòng ở phiếu
  // mới chưa Lưu (chưa có id) thì chỉ cập nhật tạm trong bộ nhớ như trước, lưu cùng lúc Lưu phiếu.
  const handleXacNhanGiao = useCallback(
    (rowKey: string | undefined, checked: boolean) => {
      // rowKey undefined không được khớp bất kỳ dòng nào — tránh trường hợp nhiều dòng cùng
      // thiếu "key" (vd rơi vào bảng jsonData.table1 cũ) khiến 1 lần bấm xác nhận tất cả dòng.
      if (rowKey === undefined) return;

      const idNguoiThucHien = currentUserInfo?.iD_TaiKhoan ?? null;
      const nowIso = new Date().toISOString();
      let targetId: number | null = null;

      setTableData((prev) =>
        prev.map((r) => {
          if (r.key === undefined || r.key !== rowKey) return r;
          targetId = r.id ?? null;
          return {
            ...r,
            nguoiDieuChinhGiao: checked ? idNguoiThucHien : null,
            thoiGianDieuChinhGiao: checked ? nowIso : null,
            trangThai: checked ? 1 : 0,
          };
        })
      );

      if (targetId != null) {
        phieuDieuChinhApi.xacNhanGiao(targetId, checked, idNguoiThucHien).catch(() => {
          message.error("Không thể lưu xác nhận xuống hệ thống, vui lòng thử lại");
          setTableData((prev) =>
            prev.map((r) =>
              r.key === rowKey
                ? {
                    ...r,
                    nguoiDieuChinhGiao: checked ? null : idNguoiThucHien,
                    thoiGianDieuChinhGiao: checked ? null : nowIso,
                    trangThai: checked ? 0 : 1,
                  }
                : r
            )
          );
        });
      }
    },
    [currentUserInfo]
  );

  // "Loại điều chỉnh" — nguồn cho các Tab (Nhập - Xuất / Nội bộ - Xuất SX) và cho hiển thị
  // nhãn ở cột loaiDieuChinh trong bảng (xem tableColumns bên dưới).
  const loaiDieuChinhOptions = useMemo(
    () => (table1Section?.columns ?? []).find((c: any) => c.dataIndex === "loaiDieuChinh")?.options ?? [],
    [table1Section]
  );

  const tableColumns = useMemo(() => {
    // Select lưu thẳng ID (value = id, label = tên) — không lưu tên NVL chi tiết riêng.
    const nvlSelectOptions = nvlOptions.map((n) => ({ label: n.tenNVL, value: n.id }));
    return (table1Section?.columns ?? []).map((col: any) => {
      if (col.key === "khoiLuongQuyKhoXuat" && col.key === "khoiLuongXuat") {
        return {
          ...col,
          disabled: true,
        };
      }
      // "Tên NVL chi tiết" chọn từ danh mục LG_PhieuDieuChinh_NVL — cột "Tên NVL" (từ BBGN)
      // giữ nguyên gõ tự do, không đụng vào.
      if (col.dataIndex === "idNVLChiTiet") {
        return { ...col, options: nvlSelectOptions };
      }
      // "Loại điều chỉnh" nay do Tab quyết định (xem activeTab) — chỉ hiển thị nhãn, không
      // cho sửa tay trong bảng để tránh dòng "biến mất" khỏi tab đang xem sau khi đổi giá trị.
      if (col.dataIndex === "loaiDieuChinh") {
        return {
          ...col,
          type: "index",
          render: (value: any) => (
            <div style={{ paddingLeft: 8 }}>
              {loaiDieuChinhOptions.find((o: any) => String(o.value) === String(value))?.label ?? "—"}
            </div>
          ),
        };
      }
      // Độ ẩm chỉ nhập được khi "Loại số điều chỉnh" = Sau ẩm — dùng type "index" để tự
      // render Input riêng (CustomFormTable không hỗ trợ khóa ô theo từng dòng).
      if (col.dataIndex === "doAm") {
        return {
          ...col,
          type: "index",
          render: (value: any, record: TableRow) => {
            const disabled = String(record.loaiSoDieuChinh) === "1" || record.trangThai === 1;
            return (
              <Input
                value={value ?? ""}
                disabled={disabled || isFormLocked}
                onChange={(e) => handleDoAmChange(record.key, e.target.value)}
                style={disabled ? { backgroundColor: "#f5f5f5" } : undefined}
              />
            );
          },
        };
      }

      // Người điều chỉnh nhận — không chọn tay nữa, tự động gán người (bên nhận) vừa sửa
      // Khối lượng/Độ ẩm của dòng (xem recomputeRows). Chỉ hiển thị tên, không cho sửa trực
      // tiếp ở đây.
      if (col.dataIndex === "nguoiDieuChinhNhan") {
        return {
          ...col,
          type: "index",
          render: (value: any) => (
            <div style={{ paddingLeft: 8, color: value ? undefined : "#bbb" }}>
              {value ? (nguoiKyMap.get(Number(value)) ?? `#${value}`) : "Chưa có"}
            </div>
          ),
        };
      }

      // Người điều chỉnh giao — người dùng (bên giao) tự tích xác nhận, hệ thống ghi tên
      // người đang đăng nhập vào dòng đó (không chọn người khác được). Sau khi tích, checkbox
      // tự khóa lại — phải bấm "Hủy xác nhận" (có hỏi lại) mới xác nhận lại được, tránh bỏ
      // tích nhầm.
      if (col.dataIndex === "nguoiDieuChinhGiao") {
        return {
          ...col,
          type: "index",
          render: (value: any, record: TableRow) => {
            const confirmed = !!value;
            return (
              <Space size={6}>
                <Checkbox
                  checked={confirmed}
                  disabled={isFormLocked || confirmed}
                  onChange={(e) => handleXacNhanGiao(record.key, e.target.checked)}
                />
                <span style={{ color: confirmed ? undefined : "#bbb" }}>
                  {confirmed ? (nguoiKyMap.get(Number(value)) ?? `#${value}`) : "Chưa xác nhận"}
                </span>
                {confirmed && !isFormLocked && (
                  <Popconfirm
                    title="Hủy xác nhận dòng này?"
                    okText="Hủy xác nhận"
                    cancelText="Đóng"
                    onConfirm={() => handleXacNhanGiao(record.key, false)}
                  >
                    <Button type="link" danger size="small" style={{ padding: 0 }}>
                      Hủy xác nhận
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            );
          },
        };
      }

      return col;
    }) as FormColumnDef[];
  }, [table1Section, nvlOptions, handleDoAmChange, handleXacNhanGiao, nguoiKyMap, isFormLocked, loaiDieuChinhOptions]);

  // Áp dụng lựa chọn ẩn/hiện cột lên tableColumns — nhóm "Bên xuất"/"Bên nhập" nào
  // bị ẩn hết cột con thì bỏ luôn cả nhóm.
  const visibleTableColumns = useMemo(() => {
    const filterCol = (col: FormColumnDef): FormColumnDef | null => {
      if (col.children) {
        const filteredChildren = col.children.filter((c) => !hiddenColumns.includes(c.dataIndex ?? ""));
        if (filteredChildren.length === 0) return null;
        return { ...col, children: filteredChildren };
      }
      if (col.dataIndex && hiddenColumns.includes(col.dataIndex)) return null;
      return col;
    };
    return tableColumns.map(filterCol).filter((c): c is FormColumnDef => c !== null);
  }, [tableColumns, hiddenColumns]);

  // ─── Quản lý NVL: thêm/sửa/xóa ─────────────────────────────────────────────
  const handleOpenNvlManager = useCallback(() => {
    nvlForm.resetFields();
    setNvlEditingId(null);
    setNvlModalOpen(true);
  }, [nvlForm]);

  const handleEditNvl = useCallback(
    (record: LGPhieuDieuChinhNvlDto) => {
      setNvlEditingId(record.id);
      nvlForm.setFieldsValue({ tenNVL: record.tenNVL });
    },
    [nvlForm]
  );

  const handleCancelEditNvl = useCallback(() => {
    setNvlEditingId(null);
    nvlForm.resetFields();
  }, [nvlForm]);

  const handleSaveNvl = useCallback(async () => {
    try {
      const values = await nvlForm.validateFields();
      setNvlLoading(true);
      if (nvlEditingId) {
        await phieuDieuChinhApi.updateNvl(nvlEditingId, values.tenNVL.trim(), true);
        message.success("Đã cập nhật NVL");
      } else {
        await phieuDieuChinhApi.createNvl(values.tenNVL.trim());
        message.success("Đã thêm NVL mới");
      }
      nvlForm.resetFields();
      setNvlEditingId(null);
      await loadNvlOptions();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi lưu NVL");
    } finally {
      setNvlLoading(false);
    }
  }, [nvlForm, nvlEditingId, loadNvlOptions]);

  const handleDeleteNvl = useCallback(
    async (id: number) => {
      try {
        await phieuDieuChinhApi.deleteNvl(id);
        message.success("Đã xóa NVL");
        await loadNvlOptions();
      } catch {
        message.error("Lỗi khi xóa NVL");
      }
    },
    [loadNvlOptions]
  );

  // Tải dữ liệu nguồn (Ngày/Ca/Kíp) — 1 nút bấm gọi GỘP cả 2 nguồn cùng lúc:
  // - SP_Get_BBGN → Loại điều chỉnh = 1 (Nhập - Xuất)
  // - Sp_GetNVLNapLieuLoCao → Loại điều chỉnh = 2 (Nội bộ - Xuất SX)
  // Mỗi dòng trả về tự mang theo loaiDieuChinh nên FE không cần biết dòng nào đến từ nguồn nào,
  // chỉ cần lọc theo loaiDieuChinh để hiển thị vào đúng Tab (xem visibleTableData).
  //
  // Phiếu ĐÃ LƯU (có idphieu): backend (GetNguonAsync/SyncChiTietFromNguonAsync) tự đọc
  // Ngày/Ca/Kíp từ BmPhieu, insert/khớp thẳng vào LG_PhieuDieuChinh_ChiTiet cho cả 2 nguồn (mỗi
  // nguồn chỉ chạm đúng dòng của nó, xem SyncChiTietFromBBGNAsync/SyncChiTietFromNapLieuLoCaoAsync
  // ở BE), rồi trả về TOÀN BỘ chi tiết đã lưu nên setTableData ghi đè thẳng là an toàn.
  //
  // Phiếu MỚI (chưa có idphieu, chưa lưu header): chưa có ID để insert vào DB — giữ tạm ở bộ nhớ
  // trình duyệt, lưu cùng lúc với cả phiếu khi bấm Lưu/Gửi.
  const handleLoadFromSource = useCallback(async () => {
    const ngayValue = form.getFieldValue("NgaySX");
    const ca = form.getFieldValue("ca");
    const kip = form.getFieldValue("kip");
    if (!ngayValue) {
      message.warning("Vui lòng chọn Ngày trước khi tải dữ liệu nguồn");
      return;
    }

    try {
      setLoading(true);

      if (idphieu) {
        const userInfo = getUserInfo();
        const nguoiThucHien = userInfo?.hoVaTen ?? userInfo?.tenDangNhap ?? null;
        const chiTietRes = await phieuDieuChinhApi.syncTuNguon(idphieu, nguoiThucHien);
        const rows = chiTietDtoToRows(Array.isArray(chiTietRes) ? chiTietRes : []);
        setTableData(rows);
        if (rows.length > 0) {
          message.success(`Đã tải và lưu ${rows.length} dòng dữ liệu nguồn`);
        } else {
          message.info("Không có dữ liệu nguồn cho Ngày/Ca/Kíp đã chọn");
        }
        return;
      }

      const ngay = ngayValue?.format ? ngayValue.format("YYYY-MM-DD") : String(ngayValue);
      const res = await phieuDieuChinhApi.getNguon({ ngay, ca: ca ? Number(ca) : undefined, kip: kip || undefined });
      const rows = (Array.isArray(res) ? res : []).map((r, idx) => ({
        key: `${r.loaiDieuChinh === 1 ? "bbgn-" : "naplieulocao-"}${r.idCtBBGN ?? idx}`,
        // Khóa liên kết ngược tới dòng nguồn — phiếu chưa lưu nên chưa insert được vào
        // LG_PhieuDieuChinh_ChiTiet, nhưng vẫn giữ lại trong bộ nhớ để gửi kèm khi Lưu phiếu,
        // nhờ đó lần "Tải dữ liệu" sau (sau khi phiếu đã có id) khớp lại đúng dòng cũ.
        idCtBBGN: r.idCtBBGN ?? null,
        idNVL: r.idVatTu ?? null,
        tenNVL: r.tenVatTu ?? "",
        loaiDieuChinh: r.loaiDieuChinh,
        // Tên NVL chi tiết (idNVLChiTiet) là giá trị người dùng tự chọn từ danh mục
        // LG_PhieuDieuChinh_NVL, không có sẵn trong nguồn.
        idNVLChiTiet: null,
        idNhomNVL: null,
        dvt: "",
        maLo: r.maLo ?? "",
        thuTu: idx + 1,
        // Phòng ban/Xưởng Giao-Nhận lấy tên thật từ nguồn (đã join Tbl_Xuong/Tbl_PhongBan).
        // Khối lượng, KL quy khô (Xuất/Nhập) và Độ ẩm là giá trị điều chỉnh — không lấy từ
        // nguồn, người dùng tự nhập tay trước khi Lưu rồi mới insert vào LG_PhieuDieuChinh_ChiTiet.
        phongBanXuat: r.tenPhongBanGiao ?? "",
        xuongXuat: r.tenXuongGiao ?? "",
        khoiLuongXuat: null,
        khoiLuongQuyKhoXuat: null,
        phongBanNhap: r.tenPhongBanNhan ?? "",
        xuongNhap: r.tenXuongNhan ?? "",
        khoiLuongNhap: null,
        khoiLuongQuyKhoNhap: null,
        doAm: null,
        viTri: "",
        phanLoai: "",
        // Ghi chú không lấy từ nguồn — là trường để người dùng tự nhập tại Phiếu điều chỉnh.
        ghiChu: "",
        nguoiDieuChinhGiao: null,
        thoiGianDieuChinhGiao: null,
        nguoiDieuChinhNhan: null,
        thoiGianDieuChinhNhan: null,
        trangThai: 0,
      }));
      setTableData(rows);
      if (rows.length > 0) {
        message.success(`Đã tải ${rows.length} dòng dữ liệu nguồn`);
      } else {
        message.info("Không có dữ liệu nguồn cho Ngày/Ca/Kíp đã chọn");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Không thể tải dữ liệu nguồn");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu]);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";

      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          ((res as any)?.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) => getCapDuyet(s) === pd.capDuyet && s.type === "selectNguoiKy"
            );
            if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
          });

          const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          form.setFieldsValue({
            ...data,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => getCapDuyet(sig) === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          // Nguồn sự thật của bảng chi tiết là LG_PhieuDieuChinh_ChiTiet — fallback về
          // table1 trong jsonData nếu phiếu chưa từng lưu chi tiết (mới tạo, chưa bấm Lưu).
          // table1 trong jsonData không có "key" (bị xóa trước khi lưu ở getFormData) — phải
          // gán lại key duy nhất ở đây, nếu không mọi dòng sẽ cùng key=undefined và bấm xác
          // nhận 1 dòng sẽ khớp trùng tất cả các dòng (xem handleXacNhanGiao).
          const withFallbackKeys = (table1: TableRow[]) =>
            (table1 || []).map((r, idx) => ({ ...r, key: r.key ?? `row-${idx}` }));
          try {
            const chiTietRes = await phieuDieuChinhApi.getChiTiet(idPhieu);
            const chiTiet = Array.isArray(chiTietRes) ? chiTietRes : [];
            if (chiTiet.length > 0) {
              setTableData(chiTietDtoToRows(chiTiet));
            } else {
              setTableData(withFallbackKeys(data.table1));
            }
          } catch {
            setTableData(withFallbackKeys(data.table1));
          }

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });
        }
      } else {
        setPhieuInfo({});
        setTableData([]);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig: any) => getCapDuyet(sig) === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
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

    // Loại số điều chỉnh = "Sau ẩm" (value "2") bắt buộc phải nhập Độ ẩm — nếu không thì
    // KL quy khô Nhập không tính được (xem recomputeRows). Chặn lưu và báo rõ dòng nào thiếu.
    const invalidDoAmRows = tableData
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => String(row.loaiSoDieuChinh) === "2" && toNum(row.doAm) === null);
    if (invalidDoAmRows.length > 0) {
      const rowsText = invalidDoAmRows.map(({ row, idx }) => row.thuTu ?? idx + 1).join(", ");
      message.error(`Vui lòng nhập Độ ẩm cho dòng ${rowsText} (Loại số điều chỉnh = Sau ẩm)`);
      throw new Error("Thiếu Độ ẩm ở các dòng Sau ẩm");
    }

    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: getCapDuyet(s),
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const processedTable1 = renumberThuTu(tableData).map((row) => {
      const r = { ...row };
      delete r.key;
      return r;
    });

    const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });

    return {
      ...formData,
      ...formattedDates,
      dvt: "Tấn",
      ca: formData.ca != null ? Number(formData.ca) : null,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [form, config, tableData, getCapDuyet]);

  // Ghi đè toàn bộ chi tiết vào LG_PhieuDieuChinh_ChiTiet sau khi BmPhieu (header) đã lưu —
  // gọi lại từ phieuActionService (customPutApi) mỗi lần bấm Lưu/Gửi.
  const saveChiTiet = useCallback(async (phieuId: string, formDataParam: Record<string, unknown>) => {
    const userInfo = getUserInfo();
    const items = ((formDataParam.table1 as TableRow[]) || []).map((row) => ({
      idNVL: row.idNVL ?? null,
      tenNVL: row.tenNVL ?? "",
      idNVLChiTiet: row.idNVLChiTiet != null && row.idNVLChiTiet !== "" ? Number(row.idNVLChiTiet) : null,
      idNhomNVL: row.idNhomNVL ?? null,
      dvt: "Tấn",
      maLo: row.maLo ?? null,
      thuTu: row.thuTu ?? null,
      loaiDieuChinh: row.loaiDieuChinh != null && row.loaiDieuChinh !== "" ? Number(row.loaiDieuChinh) : null,
      loaiSoDieuChinh: row.loaiSoDieuChinh != null && row.loaiSoDieuChinh !== "" ? Number(row.loaiSoDieuChinh) : null,
      phongBanXuat: row.phongBanXuat ?? null,
      xuongXuat: row.xuongXuat ?? null,
      khoiLuongXuat: row.khoiLuongXuat != null && row.khoiLuongXuat !== "" ? Number(row.khoiLuongXuat) : null,
      khoiLuongQuyKhoXuat:
        row.khoiLuongQuyKhoXuat != null && row.khoiLuongQuyKhoXuat !== "" ? Number(row.khoiLuongQuyKhoXuat) : null,
      phongBanNhap: row.phongBanNhap ?? null,
      xuongNhap: row.xuongNhap ?? null,
      khoiLuongNhap: row.khoiLuongNhap != null && row.khoiLuongNhap !== "" ? Number(row.khoiLuongNhap) : null,
      khoiLuongQuyKhoNhap:
        row.khoiLuongQuyKhoNhap != null && row.khoiLuongQuyKhoNhap !== "" ? Number(row.khoiLuongQuyKhoNhap) : null,
      doAm: row.doAm != null && row.doAm !== "" ? Number(row.doAm) : null,
      viTri: row.viTri ?? null,
      phanLoai: row.phanLoai ?? null,
      ghiChu: row.ghiChu ?? null,
      nguoiDieuChinhGiao:
        row.nguoiDieuChinhGiao != null && row.nguoiDieuChinhGiao !== "" ? Number(row.nguoiDieuChinhGiao) : null,
      thoiGianDieuChinhGiao: row.thoiGianDieuChinhGiao ?? null,
      nguoiDieuChinhNhan:
        row.nguoiDieuChinhNhan != null && row.nguoiDieuChinhNhan !== "" ? Number(row.nguoiDieuChinhNhan) : null,
      thoiGianDieuChinhNhan: row.thoiGianDieuChinhNhan ?? null,
      trangThai: row.trangThai != null && row.trangThai !== "" ? Number(row.trangThai) : 0,
      idCtBBGN: row.idCtBBGN ?? null,
    }));

    await phieuDieuChinhApi.saveChiTiet(phieuId, items, userInfo?.hoVaTen ?? userInfo?.tenDangNhap ?? null);
  }, []);

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
        navigate(`/taophieudieuchinh/${context.newPhieuId}`, { replace: true });
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
      phieuMaBm: config.code,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      customPutApi: saveChiTiet,
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [idphieu, phieuInfo, getFormData, saveChiTiet, handleStatusChange, handleActionSuccess, config.code]);

  // ─── Tab theo "Loại điều chỉnh" ─────────────────────────────────────────────
  // 1 phiếu duy nhất (1 header, 1 lần Lưu) nhưng chia bảng chi tiết thành các Tab —
  // mỗi Tab tương ứng 1 giá trị "Loại điều chỉnh" (Nhập - Xuất / Nội bộ - Xuất SX), lấy trực
  // tiếp từ config để không hard-code. Bộ lọc "Loại điều chỉnh" cũ (Select) không cần nữa vì
  // Tab đã thay thế vai trò đó.
  const [activeTab, setActiveTab] = useState<string>("1");

  useEffect(() => {
    if (loaiDieuChinhOptions.length > 0 && !loaiDieuChinhOptions.some((o: any) => String(o.value) === activeTab)) {
      setActiveTab(String(loaiDieuChinhOptions[0].value));
    }
  }, [loaiDieuChinhOptions, activeTab]);

  // ─── Bộ lọc bảng "Chi tiết điều chỉnh" ─────────────────────────────────────
  // Lọc theo Loại số điều chỉnh / Tên NVL / Phòng ban bên giao / Phòng ban bên nhận / Xưởng bên
  // giao / Xưởng bên nhận. Mỗi Tab (Loại điều chỉnh) giữ bộ lọc RIÊNG — đổi Tab không mang theo
  // bộ lọc của Tab kia, vì 2 Tab là 2 miền dữ liệu khác nhau (NVL, phòng ban, xưởng không liên
  // quan nhau). Bộ lọc chỉ ảnh hưởng hiển thị — tableData (nguồn sự thật) vẫn giữ đủ dòng bị
  // ẩn/ở Tab khác.
  type FilterShape = {
    loaiSoDieuChinh?: string | number;
    tenNVL?: string;
    phongBanXuat?: string;
    phongBanNhap?: string;
    xuongXuat?: string;
    xuongNhap?: string;
  };
  const [filtersByTab, setFiltersByTab] = useState<Record<string, FilterShape>>({});
  const filters = filtersByTab[activeTab] ?? {};
  const setFilters = useCallback(
    (updater: (f: FilterShape) => FilterShape) => {
      setFiltersByTab((prev) => ({ ...prev, [activeTab]: updater(prev[activeTab] ?? {}) }));
    },
    [activeTab]
  );

  const loaiSoDieuChinhOptions = useMemo(
    () => (table1Section?.columns ?? []).find((c: any) => c.dataIndex === "loaiSoDieuChinh")?.options ?? [],
    [table1Section]
  );

  // Danh sách giá trị cho dropdown bộ lọc chỉ lấy trong phạm vi Tab đang xem — không lẫn
  // NVL/phòng ban/xưởng của Tab kia vào gợi ý.
  const tableDataActiveTab = useMemo(
    () => tableData.filter((r) => String(r.loaiDieuChinh) === activeTab),
    [tableData, activeTab]
  );

  const makeUniqueOptions = useCallback((field: string) => {
    const values = Array.from(
      new Set(tableDataActiveTab.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== ""))
    );
    return values.map((v) => ({ label: String(v), value: v as string }));
  }, [tableDataActiveTab]);

  const tenNVLOptions = useMemo(() => makeUniqueOptions("tenNVL"), [makeUniqueOptions]);
  const phongBanXuatOptions = useMemo(() => makeUniqueOptions("phongBanXuat"), [makeUniqueOptions]);
  const phongBanNhapOptions = useMemo(() => makeUniqueOptions("phongBanNhap"), [makeUniqueOptions]);
  const xuongXuatOptions = useMemo(() => makeUniqueOptions("xuongXuat"), [makeUniqueOptions]);
  const xuongNhapOptions = useMemo(() => makeUniqueOptions("xuongNhap"), [makeUniqueOptions]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== null && v !== "");

  // Tập con đang hiển thị = đúng Tab đang chọn + bộ lọc RIÊNG của Tab đó (nếu có).
  const visibleTableData = useMemo(() => {
    return tableDataActiveTab.filter((row) => {
      if (filters.loaiSoDieuChinh != null && filters.loaiSoDieuChinh !== "" && String(row.loaiSoDieuChinh) !== String(filters.loaiSoDieuChinh)) return false;
      if (filters.tenNVL && row.tenNVL !== filters.tenNVL) return false;
      if (filters.phongBanXuat && row.phongBanXuat !== filters.phongBanXuat) return false;
      if (filters.phongBanNhap && row.phongBanNhap !== filters.phongBanNhap) return false;
      if (filters.xuongXuat && row.xuongXuat !== filters.xuongXuat) return false;
      if (filters.xuongNhap && row.xuongNhap !== filters.xuongNhap) return false;
      return true;
    });
  }, [tableDataActiveTab, filters]);

  // Bảng chỉ thao tác trên tập con đang hiển thị (đúng Tab + bộ lọc) — cần ghép lại với các
  // dòng ở Tab khác/bị ẩn trong tableData gốc để không mất dữ liệu khi thêm/sửa/xóa. Dòng mới
  // thêm (chưa từng có trong tableData) không có "Loại điều chỉnh" — tự gán theo Tab đang mở để
  // dòng vừa thêm không "biến mất" khỏi Tab ngay sau khi thêm.
  const handleVisibleTableDataChange = useCallback(
    (newRows: TableRow[]) => {
      setTableData((prev) => {
        const newRowsByKey = new Map(newRows.map((r) => [r.key, r]));
        const visibleKeys = new Set(visibleTableData.map((r) => r.key));
        const merged: TableRow[] = [];
        prev.forEach((row) => {
          if (visibleKeys.has(row.key)) {
            const updated = newRowsByKey.get(row.key);
            if (updated) {
              merged.push(updated);
              newRowsByKey.delete(row.key);
            }
          } else {
            merged.push(row);
          }
        });
        newRowsByKey.forEach((row) => {
          const hasLoai = row.loaiDieuChinh != null && row.loaiDieuChinh !== "";
          merged.push({ ...row, loaiDieuChinh: hasLoai ? row.loaiDieuChinh : Number(activeTab) });
        });
        return recomputeRows(merged, prev, currentUserInfo?.iD_TaiKhoan);
      });
    },
    [visibleTableData, activeTab, currentUserInfo]
  );

  const handleResetFilters = useCallback(() => setFilters(() => ({})), [setFilters]);

  return (
    <Card style={{ margin: 16, boxShadow: "0 2px 8px #f0f1f2" }} styles={{ body: { padding: 12 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{config.title}</Typography.Title>
        {idphieu && <Typography.Text strong>Số phiếu: {soPhieu}</Typography.Text>}
      </div>

      <Form form={form} layout="vertical" className="pdc-compact">
        <Form.Item name="idphieu" hidden><Input type="hidden" /></Form.Item>

        {/* Ngày/Ca/Kíp + hành động gộp chung 1 khu vực gọn — nhường chiều cao còn lại cho bảng */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {config.headerFields.map((f: any, idx: number) => (
              <div key={f.key || idx} style={{ width: 140 }}>
                <CustomFormItem field={f} idx={idx} disabled={isFormLocked} />
              </div>
            ))}
          </div>
          <Space wrap size="small" style={{ marginLeft: "auto" }}>
            <Button
              size="small"
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleLoadFromSource}
              disabled={isFormLocked}
              loading={loading}
            >
              Tải dữ liệu nguồn
            </Button>
            <Button size="small" icon={<SettingOutlined />} onClick={handleOpenNvlManager}>
              Quản lý NVL
            </Button>
            {actionButtons}
          </Space>
        </div>

        <Modal
          title="Quản lý danh mục NVL"
          open={nvlModalOpen}
          onCancel={() => setNvlModalOpen(false)}
          footer={<Button onClick={() => setNvlModalOpen(false)}>Đóng</Button>}
          width={520}
          destroyOnClose
        >
          <Form form={nvlForm} layout="inline" style={{ marginBottom: 12 }} onFinish={handleSaveNvl}>
            <Form.Item
              name="tenNVL"
              rules={[{ required: true, message: "Nhập tên NVL" }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input placeholder="Tên NVL" maxLength={255} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={nvlLoading}>
                  {nvlEditingId ? "Cập nhật" : "Thêm"}
                </Button>
                {nvlEditingId && <Button onClick={handleCancelEditNvl}>Hủy</Button>}
              </Space>
            </Form.Item>
          </Form>
          <Table
            size="small"
            bordered
            rowKey="id"
            dataSource={nvlOptions}
            pagination={nvlOptions.length > 10 ? { pageSize: 10 } : false}
            columns={[
              { title: "Tên NVL", dataIndex: "tenNVL" },
              {
                title: "",
                key: "action",
                width: 90,
                align: "center" as const,
                render: (_: unknown, record: LGPhieuDieuChinhNvlDto) => (
                  <Space size={4}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditNvl(record)} />
                    <Popconfirm
                      title="Xóa NVL này?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => handleDeleteNvl(record.id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Modal>

        {table1Section && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              {table1Section.title && (
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {table1Section.title}
                </Typography.Title>
              )}
              <Popover
                trigger="click"
                placement="bottomRight"
                title="Chọn cột hiển thị"
                content={
                  <div style={{ width: 280, maxHeight: 340, overflow: "auto" }}>
                    <Checkbox.Group
                      style={{ display: "flex", flexDirection: "column", gap: 6 }}
                      value={toggleableColumns.filter((o) => !hiddenColumns.includes(o.dataIndex)).map((o) => o.dataIndex)}
                      onChange={(checked) => {
                        const checkedSet = new Set(checked as string[]);
                        setHiddenColumns(toggleableColumns.filter((o) => !checkedSet.has(o.dataIndex)).map((o) => o.dataIndex));
                      }}
                    >
                      {toggleableColumns.map((o) => (
                        <Checkbox key={o.dataIndex} value={o.dataIndex}>{o.label}</Checkbox>
                      ))}
                    </Checkbox.Group>
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, marginTop: 8 }}
                      onClick={() => setHiddenColumns([])}
                    >
                      Hiện tất cả cột
                    </Button>
                  </div>
                }
              >
                <Badge count={hiddenColumns.length} size="small">
                  <Button size="small" icon={<TableOutlined />}>Cột hiển thị</Button>
                </Badge>
              </Popover>
            </div>

            {/* 1 phiếu duy nhất — chia bảng chi tiết thành các Tab theo "Loại điều chỉnh" để dễ
                theo dõi từng nhóm (Nhập - Xuất / Nội bộ - Xuất SX) thay vì 1 bảng dài lẫn lộn. */}
            <Tabs
              size="small"
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginBottom: 4 }}
              items={loaiDieuChinhOptions.map((opt: any) => {
                //const count = tableData.filter((r) => String(r.loaiDieuChinh) === String(opt.value)).length;
                return {
                  key: String(opt.value),
                  label: (
                    <Space size={4}>
                      {opt.label}
                      {/* <Badge count={count} showZero color="#999" /> */}
                    </Space>
                  ),
                };
              })}
            />

            <Collapse
              size="small"
              className="pdc-compact-filters"
              style={{ marginBottom: 8 }}
              items={[
                {
                  key: "filters",
                  label: (
                    <Space>
                      <FilterOutlined />
                      Bộ lọc
                      {hasActiveFilters && <Badge count={Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "").length} size="small" />}
                    </Space>
                  ),
                  children: (
                    <Space wrap size="small">
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Loại số điều chỉnh"
                        style={{ width: 160 }}
                        options={loaiSoDieuChinhOptions}
                        value={filters.loaiSoDieuChinh ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, loaiSoDieuChinh: value }))}
                        optionFilterProp="label"
                      />
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Tên NVL"
                        style={{ width: 180 }}
                        options={tenNVLOptions}
                        value={filters.tenNVL ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, tenNVL: value }))}
                        optionFilterProp="label"
                      />
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Phòng ban bên giao"
                        style={{ width: 180 }}
                        options={phongBanXuatOptions}
                        value={filters.phongBanXuat ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, phongBanXuat: value }))}
                        optionFilterProp="label"
                      />
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Phòng ban bên nhận"
                        style={{ width: 180 }}
                        options={phongBanNhapOptions}
                        value={filters.phongBanNhap ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, phongBanNhap: value }))}
                        optionFilterProp="label"
                      />
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Xưởng bên giao"
                        style={{ width: 180 }}
                        options={xuongXuatOptions}
                        value={filters.xuongXuat ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, xuongXuat: value }))}
                        optionFilterProp="label"
                      />
                      <Select
                        allowClear
                        showSearch
                        size="small"
                        placeholder="Xưởng bên nhận"
                        style={{ width: 180 }}
                        options={xuongNhapOptions}
                        value={filters.xuongNhap ?? undefined}
                        onChange={(value) => setFilters((f) => ({ ...f, xuongNhap: value }))}
                        optionFilterProp="label"
                      />
                      {hasActiveFilters && <Button size="small" onClick={handleResetFilters}>Xóa lọc</Button>}
                    </Space>
                  ),
                },
              ]}
            />

            {/* Giới hạn bảng trong khung riêng — cuộn ngang/dọc chỉ diễn ra bên trong bảng,
                không kéo giãn/cuộn theo cả trang. Chiều cao co giãn theo màn hình để bảng
                chiếm phần lớn không gian thay vì bị giới hạn cứng 600px. */}
            <div style={{ maxWidth: "100%", overflow: "auto" }}>
              <CustomFormTableV2
                columns={visibleTableColumns}
                initialData={visibleTableData}
                onDataChange={handleVisibleTableDataChange}
                loading={loading}
                editable={!isFormLocked}
                showAddButton={!isFormLocked}
                showDeleteButton={!isFormLocked}
                minRows={0}
                scrollY="calc(100vh - 400px)"
                pagination={{ pageSize: 50 }}
                showPlaceholder={false}
                isRowReadonly={(record) => record.trangThai === 1}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {config.signatures?.map((sig: any, i: number) => {
            const capDuyet = getCapDuyet(sig);
            const isLevelZero = capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === capDuyet);

            return (
              <Space key={sig.key || i} direction="vertical" align="center">
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <Typography.Text type="secondary">
                    {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                  </Typography.Text>
                )}
              </Space>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuDieuChinh;
