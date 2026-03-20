/* eslint-disable @typescript-eslint/no-explicit-any */
import HRC2_STD_NXT from "../../../utils/BM_config/HRC2_STD_NXT.json";
import { Card, Form, Input, Typography, message, Button, Tabs } from "antd";
import dayjs from "dayjs";
import { useState, useEffect, useCallback, useMemo } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
// import GroupedTableSTD from "../../../components/GroupedTableSTD";
import GroupedTableSTD from "../../../components/GroupedTableSTD";
import SummaryTableSTD from "../../../components/SummaryTableSTD";
import { phieuActionService, type PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import type {
  STD_NXT_Table1Row,
  STD_NXT_Table2Row,
  STD_NXT_HRC2_UpsertDto,
  NXTSummaryDto,
  STD_NXT_HRC2_PhanBoDto,
} from "../../../models/STD_NXT_Model";
import { STD_NXT_HRC2ServiceApi } from "../../../services/STD_NXT_HRC2ServiceApi";
import { dlnmHRC2Api } from "../../../services/DLNMHRC2Api";

const Tao_STD = () => {
  const { idphieu, navigateToDetail, safeGetDetail } =
    usePhieuNavigation("std_nxt_hrc2_idphieu", "/std_nhapxuatton");

  const config = HRC2_STD_NXT;
  const [form] = Form.useForm();

  const [table1Data, setTable1Data] = useState<STD_NXT_Table1Row[]>([]);
  const [table2Data, setTable2Data] = useState<STD_NXT_Table2Row[]>([]);
  const [loading, setLoading] = useState(false);

  // State để lưu thông tin phiếu cho action buttons
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);
  // Cho phép edit khi ĐangLuu (0), Đã thu hồi (3) hoặc Hiệu chỉnh (7 = phiếu clone)
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );
  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  // Map khu vực -> scope int (lấy từ config.khuVucList value), hỗ trợ key là label hoặc value
  const scopeMap = useMemo(() => {
    const map = new Map<string, number>();
    const kvList = config.layout1?.[0]?.khuVucList || [];
    kvList.forEach((kv: any) => {
      const key = kv?.label ? String(kv.label) : "";
      const valNum = kv?.value !== undefined ? Number(kv.value) : NaN;
      if (!Number.isNaN(valNum)) {
        if (key) map.set(key, valNum);
        const valKey = kv?.value !== undefined ? String(kv.value) : "";
        if (valKey) map.set(valKey, valNum);
      }
    });
    return map;
  }, [config.layout1]);

  // Helper build payload DTO cho API lưu riêng (STD_XUAT_NHAP_TON_HRC2s & STD_NXT_TOTAL_HRC2)
  const buildNxtUpsertPayload = useCallback(
    (formValues: any): STD_NXT_HRC2_UpsertDto => {
      // Details
      const details = (table1Data || []).map((row) => {
        const khuVucKey = row.khuVuc ? String(row.khuVuc) : "";
        const scopeVal = khuVucKey && scopeMap.has(khuVucKey) ? scopeMap.get(khuVucKey) || 0 : 0;
        return {
          Scope: scopeVal,
          ViTri: row.viTri ?? 0,
          Id_HeaderKey: row.idNguyenNhienLieu ?? 0,
          IDSilo: row.siloId ?? null,
          TenNguyenLieu: row.nguyenNhienLieu ?? "",
          TonDauCa: row.tonDauCa ? Number(row.tonDauCa) : 0,
          TuongQuanDauCa: row.tuongQuanDauCa ?? "",
          NhapVaoTrongCa: row.nhapTrongCa ? Number(row.nhapTrongCa) : 0,
          MucLieu: row.mucLieu ? Number(row.mucLieu) : 0,
          TheTich: row.theTich ? Number(row.theTich) : 0,
          TyTrong: row.tyTrong ? Number(row.tyTrong) : 0,
          TonCuoiCa: row.tonCuoiCa ? Number(row.tonCuoiCa) : 0,
          TuongQuanCuoiCa: row.tuongQuanCuoiCa ?? "",
          TongThucTe: row.tongThucTe ? Number(row.tongThucTe) : 0,
          LuongSuDungKiemKe: row.luongSuDungKiemKe != null && row.luongSuDungKiemKe !== "" ? Number(row.luongSuDungKiemKe) : null,
        };
      });

      // Map TenNguyenLieu -> Id_HeaderKey từ details
      const idByName: Record<string, number | undefined> = {};
      details.forEach((d) => {
        if (d.TenNguyenLieu) {
          idByName[d.TenNguyenLieu] = d.Id_HeaderKey || idByName[d.TenNguyenLieu];
        }
      });

      // Summary: tổng hợp trực tiếp từ details (group theo TenNguyenLieu)
      const grouped: Record<
        string,
        { id: number; tonDau: number; nhap: number; tonCuoi: number; sdss: number }
      > = {};
      details.forEach((d) => {
        const name = d.TenNguyenLieu || "";
        if (!name) return;
        if (!grouped[name]) {
          grouped[name] = {
            id: d.Id_HeaderKey || 0,
            tonDau: 0,
            nhap: 0,
            tonCuoi: 0,
            sdss: 0,
          };
        }
        grouped[name].id = d.Id_HeaderKey || grouped[name].id;
        grouped[name].tonDau += d.TonDauCa || 0;
        grouped[name].nhap += d.NhapVaoTrongCa || 0;
        grouped[name].tonCuoi += d.TonCuoiCa || 0;
        grouped[name].sdss += d.TongThucTe || 0; // giả sử TongThucTe là số sổ sách
      });

      const summary: NXTSummaryDto[] = Object.keys(grouped).map((name) => {
        const g = grouped[name];
        const tongSuDung = g.tonDau + g.nhap - g.tonCuoi;
        const chenh = Math.abs(tongSuDung - g.sdss);
        return {
          Id_HeaderKey: g.id,
          TenNguyenLieu: name,
          TongTonDauCa: g.tonDau,
          TongNhapTrongCa: g.nhap,
          TongTonCuoiCa: g.tonCuoi,
          TongSuDung: tongSuDung,
          TongSDTrenSoSach: g.sdss,
          ChenhLech: chenh,
        };
      });

      return {
        IdPhieu: formValues.idphieu || null,
        NgaySX: formValues.NgaySX ? formValues.NgaySX.format("YYYY-MM-DD") : null,
        Ca: formValues.ca ?? 0,
        Scope: 0,
        BieuMau: config.code,
        Details: details,
        Summary: summary,
      };
    },
    [config.code, scopeMap, table1Data]
  );

  // Hàm khởi tạo dữ liệu ban đầu
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      if (idphieu) {
        const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
        if (!res) return;

        const phieuPayload = (res as any)?.data ?? res;
        const formData = phieuPayload?.jsonData || {};

        // Khôi phục form values (ưu tiên jsonData). Tách NgaySX/ca để tránh bị override bởi spread.
        const { NgaySX, ca, ...restFormData } = formData;
        const tinhTrang = phieuPayload?.tinhTrang ?? 0;
        form.setFieldsValue({
          idphieu: phieuPayload?.idphieu,
          NgaySX: NgaySX ? dayjs(NgaySX) : null,
          ca: ca ?? phieuPayload?.ca,
          ...restFormData,
        });

        // Nếu trạng thái là DangLuu và field capduyet=0 chưa có giá trị → mặc định currentUser
        if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
          const overrideFields: Record<string, any> = {};
          config.signatures
            .filter((sig: any) => sig.isChon && sig.capduyet === 0)
            .forEach((sig: any) => {
              const existing = form.getFieldValue(sig.key);
              if (existing == null) {
                overrideFields[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              }
            });
          if (Object.keys(overrideFields).length > 0) {
            form.setFieldsValue(overrideFields);
          }
        }

        const detailRes: any = await STD_NXT_HRC2ServiceApi.getDetail(idphieu);
        const data = detailRes?.data;

        // Helper: Map scope -> khuVuc (label từ khuVucList)
        const getKhuVucByScope = (scope: number): string => {
          const kvList = config.layout1?.[0]?.khuVucList || [];
          const kv = kvList.find((kv: any) => {
            const valueNum = kv?.value !== undefined ? Number(kv.value) : NaN;
            return !Number.isNaN(valueNum) && valueNum === scope;
          });
          return kv?.label ? String(kv.label) : String(scope);
        };

        // Map details từ BE sang format frontend
        const mappedDetails: STD_NXT_Table1Row[] = (data?.details || []).map((item: any, index: number) => {
          const scope = Number(item.scope) || 0;
          const khuVuc = getKhuVucByScope(scope);
          
          return {
            key: `${scope}_${item.id_HeaderKey}_${item.viTri}_${index}`,
            khuVuc: khuVuc,
            viTri: Number(item.viTri) || 1,
            nguyenNhienLieu: item.tenNguyenLieu || "",
            idNguyenNhienLieu: item.id_HeaderKey || null,
            isUnmapped: !item.id_HeaderKey, // Nếu có id_HeaderKey thì isUnmapped = false
            siloId: item.idSilo ?? item.IDSilo ?? item.siloId ?? null,
            tenSilo: item.tenSilo ?? item.TenSilo ?? null,
            tonDauCa: item.tonDauCa ?? null,
            tuongQuanDauCa: item.tuongQuanDauCa ?? "",
            mucLieu: item.mucLieu ?? null,
            theTich: item.theTich ?? null,
            tyTrong: item.tyTrong ?? null,
            nhapTrongCa: item.nhapVaoTrongCa ?? null,
            tonCuoiCa: item.tonCuoiCa ?? null,
            tuongQuanCuoiCa: item.tuongQuanCuoiCa ?? "",
            tongThucTe: item.tongThucTe ?? null,
            luongSuDungKiemKe: item.luongSuDungKiemKe ?? null,
          };
        });

        // Map summary từ BE sang format frontend (gồm HasPhanBo, Id_HeaderKey, NgaySX, Ca cho SummaryTableSTD)
        const ngaySxStr = (data?.ngaySX ?? data?.NgaySX) != null ? (typeof (data?.ngaySX ?? data?.NgaySX) === "string" ? (data?.ngaySX ?? data?.NgaySX) : (data?.ngaySX ?? data?.NgaySX)?.format?.("YYYY-MM-DD")) : undefined;
        const caVal = data?.ca ?? data?.Ca ?? undefined;
        const mappedSummary: STD_NXT_Table2Row[] = (data?.summary || []).map((item: any) => ({
          key: `summary_${item.id_HeaderKey ?? item.Id_HeaderKey}`,
          totalNguyenNhienLieu: item.tenNguyenLieu ?? item.TenNguyenLieu ?? "",
          totalTonDauCa: item.tongTonDauCa ?? item.TongTonDauCa ?? null,
          totalNhapTrongCa: item.tongTonNhapTrongCa ?? item.TongTonNhapTrongCa ?? null,
          totalTonCuoiCa: item.tongTonCuoiCa ?? item.TongTonCuoiCa ?? null,
          totalSuDung: item.tongSuDung ?? item.TongSuDung ?? null,
          totalSDTrongSoSach: item.tongSDTrenSoSach ?? item.TongSDTrenSoSach ?? null,
          totalChenhLech: item.chenhLech ?? item.ChenhLech ?? null,
          HasPhanBo: item.hasPhanBo ?? item.HasPhanBo ?? null,
          Id_HeaderKey: item.id_HeaderKey ?? item.Id_HeaderKey ?? null,
          NgaySX: ngaySxStr,
          Ca: caVal,
        }));

        setTable1Data(mappedDetails);
        setTable2Data(mappedSummary);

        // Lưu thông tin phiếu cho action buttons
        setPhieuInfo({
          tinhTrang: phieuPayload?.tinhTrang ?? 0,
          nguoiTaoId: phieuPayload?.nguoiTaoId ?? null,
          idphongBan: phieuPayload?.idphongBan ?? null,
          pheDuyet: phieuPayload?.pheDuyet || formData.pheDuyet || [],
          isClone: phieuPayload?.isClone ?? false,
        });
      } else {
        // Phiếu mới: chỉ set capduyet=0 về currentUser nếu field chưa có giá trị
        const newOverride: Record<string, any> = {};
        config.signatures
          .filter((sig: any) => sig.isChon && sig.capduyet === 0)
          .forEach((sig: any) => {
            const existing = form.getFieldValue(sig.key);
            if (existing == null) {
              newOverride[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            }
          });
        if (Object.keys(newOverride).length > 0) {
          form.setFieldsValue(newOverride);
        }
        setPhieuInfo({});
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, idphieu, safeGetDetail, currentUserInfo?.iD_TaiKhoan]);

  // Chuẩn bị payload cho action buttons (theo pattern TaoPhieuBOF)
  // actionKey: "save" | "saveAndSend" | ... để phân biệt lưu vs gửi
  const getFormData = useCallback(async (actionKey?: string) => {
    const userInfo = getUserInfo();
    const isSend = actionKey === "saveAndSend" || actionKey === "gui";
    // Khi lưu: chỉ validate header fields (Ngày, Ca). Khi gửi: validate thêm chữ ký.
    const headerFieldKeys = config.headerFields.map((f: any) => f.key);
    const signatureKeys = config.signatures.filter((s) => s.isChon).map((s) => s.key);
    const fieldsToValidate = isSend ? [...headerFieldKeys, ...signatureKeys] : headerFieldKeys;
    await form.validateFields(fieldsToValidate);
    // Lấy toàn bộ giá trị form (kể cả idphieu, chữ ký) để build payload đầy đủ
    const values = form.getFieldsValue(true);

    const table1Normalized = (table1Data || []).map((row) => ({
      ...row,
      tonDauCa: Number(row.tonDauCa || 0),
      tuongQuanDauCa: row.tuongQuanDauCa ?? "",
      nhapTrongCa: Number(row.nhapTrongCa || 0),
      tonCuoiCa: Number(row.tonCuoiCa || 0),
      tuongQuanCuoiCa: row.tuongQuanCuoiCa ?? "",
      tongThucTe: Number(row.tongThucTe || 0),
      luongSuDungKiemKe: row.luongSuDungKiemKe != null && row.luongSuDungKiemKe !== "" ? Number(row.luongSuDungKiemKe) : null,
    }));

    // Validation (chỉ khi Gửi): Tất cả dòng phải chọn Silo
    if (isSend) {
      const missingSiloRows = table1Normalized.filter((row) => !row.siloId && row.viTri !== 2);
      if (missingSiloRows.length > 0) {
        const byTab = missingSiloRows.reduce<Record<string, string[]>>((acc, r: any) => {
          const tab = String(r?.khuVuc ?? "Không xác định");
          const name = String(r?.nguyenNhienLieu ?? "").trim() || "(không tên)";
          (acc[tab] ||= []).push(name);
          return acc;
        }, {});

        const detailLines = Object.entries(byTab)
          .map(([tab, names]) => `- Tab ${tab}: ${names.join(", ")}`)
          .join("\n");

        message.error(
          `Vui lòng chọn Silo cho tất cả loại liệu trước khi gửi.\nCác dòng chưa chọn theo tab:\n${detailLines}`
        );
        throw new Error("Validation failed: thiếu Silo");
      }

      // Validation (chỉ khi Gửi): luongSuDungKiemKe phải nhất quán với tongThucTe
      // - tongThucTe = 0 → luongSuDungKiemKe phải = 0
      // - tongThucTe != 0 → luongSuDungKiemKe phải != 0
      const inconsistentKiemKeRows = table1Normalized.filter((row) => {
        const thucTe = Number(row.tongThucTe);
        const kiemKe = row.luongSuDungKiemKe;
        const kiemKeNum = kiemKe === null || kiemKe === undefined ? 0 : Number(kiemKe);
        if (Number.isNaN(kiemKeNum)) return false;
        return (thucTe === 0 && kiemKeNum !== 0) || (thucTe !== 0 && kiemKeNum === 0);
      });
      if (inconsistentKiemKeRows.length > 0) {
        const tenNguyenLieu = inconsistentKiemKeRows.map((r) => r.nguyenNhienLieu || "(không tên)").join(", ");
        message.error(
          `Lượng sử dụng kiểm kê không nhất quán với lượng thực tế sử dụng. Vui lòng kiểm tra lại: ${tenNguyenLieu}`
        );
        throw new Error("Validation failed: luongSuDungKiemKe không nhất quán với tongThucTe");
      }
    }

    // Validation: các cột số không được âm
    const isNeg = (v: unknown) => {
      if (v === null || v === undefined || v === "") return false;
      const num = typeof v === "number" ? v : Number(v);
      return !Number.isNaN(num) && num < 0;
    };
    const numericFields: { field: keyof typeof table1Normalized[0]; label: string }[] = [
      { field: "tonDauCa", label: "Tồn đầu ca" },
      { field: "nhapTrongCa", label: "Nhập trong ca" },
      { field: "tonCuoiCa", label: "Tồn cuối ca" },
      { field: "tongThucTe", label: "Tổng thực tế" },
      { field: "luongSuDungKiemKe", label: "Lượng sử dụng kiểm kê" },
    ];
    for (const { field, label } of numericFields) {
      const negRows = table1Normalized.filter((row) => isNeg(row[field]));
      if (negRows.length > 0) {
        const tenNguyenLieu = negRows.map((r) => r.nguyenNhienLieu || "(không tên)").join(", ");
        message.error(`${label} không được âm. Vui lòng kiểm tra lại: ${tenNguyenLieu}`);
        throw new Error(`Validation failed: ${field} âm`);
      }
    }

    // Validation: Khi SoSuDung = 0 và SoNhapVe = 0 thì SoTonCuoi phải bằng SoTonDau
    const invalidRows = table1Normalized.filter((row) => {
      const soSuDung = row.tongThucTe;
      const soNhapVe = row.nhapTrongCa;
      const soTonDau = row.tonDauCa;
      const soTonCuoi = row.tonCuoiCa;
      return soSuDung === 0 && soNhapVe === 0 && soTonCuoi !== soTonDau;
    });

    if (invalidRows.length > 0) {
      const tenNguyenLieu = invalidRows.map((r) => r.nguyenNhienLieu || "(không tên)").join(", ");
      message.error(
        `Dữ liệu tồn kho không hợp lệ.\nKhi số sử dụng = 0 và số nhập về = 0 thì số tồn cuối phải bằng số tồn đầu.\nVui lòng kiểm tra lại: ${tenNguyenLieu}`
      );
      throw new Error("Validation failed: tồn cuối không bằng tồn đầu");
    }

    const table2Normalized = (table2Data || []).map((row) => ({
      ...row,
      totalTonDauCa: Number(row.totalTonDauCa || 0),
      totalNhapTrongCa: Number(row.totalNhapTrongCa || 0),
      totalTonCuoiCa: Number(row.totalTonCuoiCa || 0),
      totalSuDung: Number(row.totalSuDung || 0),
      totalSDTrongSoSach: Number(row.totalSDTrongSoSach || 0),
      totalChenhLech: Number(row.totalChenhLech || 0),
      tyLeBOF: row.tyLeBOF != null ? Number(row.tyLeBOF) : null,
      tyLeTinhLuyen: row.tyLeTinhLuyen != null ? Number(row.tyLeTinhLuyen) : null,
    }));

    // Flow phê duyệt giống BOF
    const pheDuyetFlow = config.signatures
      .filter((s) => s.isChon)
      .map((s) => ({
        capDuyet: s.capduyet,
        maKyDuyet: s.key,
        nguoiDuyetId: form.getFieldValue(s.key),
        tinhTrang: 0,
        ghiChu: "",
      }));

    // Thêm người tạo phiếu ở cấp 1 nếu cấu hình
    const hasCreator = config.signatures.find(
      (x) => x.isChon === false && x.capduyet === 1
    );
    if (hasCreator) {
      pheDuyetFlow.unshift({
        capDuyet: 1,
        maKyDuyet: hasCreator?.key || "",
        nguoiDuyetId: userInfo.iD_TaiKhoan ?? null,
        tinhTrang: 1,
        ghiChu: "Người tạo phiếu",
      });
    }
    return {
      ...values,
      NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
      maBm: config.code,
      prefix: config.prefix,
      scope: 0,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: table1Normalized,
      table2: table2Normalized,
      pheDuyet: pheDuyetFlow,
      nxtPayload: buildNxtUpsertPayload(values),
    };
  }, [getUserInfo, form, config.headerFields, config.signatures, config.code, config.prefix, table1Data, table2Data, buildNxtUpsertPayload]);

  const handleActionSuccess = useCallback(
    async (context: any) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/tao-std");
        return;
      }
      await initData();
    },
    [navigateToDetail, initData]
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
      noApproval: true,
      // Gọi API upsert sau khi PhieuApi.postData hoặc PhieuApi.putData thành công
      customPutApi: async (phieuIdParam, formData) => {
        // Lấy nxtPayload từ formData
        const nxtPayload = (formData as any)?.nxtPayload as STD_NXT_HRC2_UpsertDto | undefined;
        if (!nxtPayload) {
          console.warn("nxtPayload không tồn tại trong formData");
          return;
        }
        // Cập nhật IdPhieu từ phieuIdParam
        nxtPayload.IdPhieu = phieuIdParam;
        await STD_NXT_HRC2ServiceApi.upsert(nxtPayload);
      },
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
      },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleActionSuccess]);

  /** Gọi khi load lần đầu */
  useEffect(() => {
    initData();
  }, [initData]);

  const layout1Raw = config.layout1?.[0];
  const layout1 = layout1Raw
    ? {
        ...layout1Raw,
        columns: (layout1Raw.columns || [])
          .filter((col: any) => !col.hidden)
          .map((col: any) =>
            col.children
              ? { ...col, children: col.children.filter((c: any) => !c.hidden) }
              : col
          ),
      }
    : undefined;
  const layout2 = config.layout2?.[0];

  const handlePhanBoSummary = useCallback(
    async (dto: STD_NXT_HRC2_PhanBoDto) => {
      try {
        if (!idphieu) {
          message.warning("Vui lòng lưu phiếu trước khi phân bổ.");
          return;
        }
        const values = await form.validateFields(["NgaySX", "ca"]);
        const ngay = values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null;
        const caVal = values.ca;
        if (!ngay || !caVal) {
          message.warning("Vui lòng chọn Ngày và Ca trước khi phân bổ.");
          return;
        }
        const payload: STD_NXT_HRC2_PhanBoDto = {
          NgaySX: ngay,
          Ca: Number(caVal),
          Id_HeaderKey: dto.Id_HeaderKey,
          ChenhLech: dto.ChenhLech,
          IdPhieu: idphieu,
          TyLeBOF: dto.TyLeBOF ?? null,
          TyLeTinhLuyen: dto.TyLeTinhLuyen ?? null,
        };
        setLoading(true);
        const res = await STD_NXT_HRC2ServiceApi.phanBo(payload);
        const ok = (res as any)?.data ?? res;
        if (ok === true) {
          message.success("Phân bổ chênh lệch thành công.");
          if (idphieu) {
            await initData();
          }
        } else {
          message.warning("Phân bổ không thành công.");
        }
      } catch (error: any) {
        console.error("Phân bổ thất bại:", error);
        message.error(error?.message || "Không thể phân bổ. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [form, idphieu, initData]
  );

  const handleThuHoiSummary = useCallback(
    async (dto: STD_NXT_HRC2_PhanBoDto) => {
      try {
        if (!idphieu) {
          message.warning("Vui lòng lưu phiếu trước khi thu hồi phân bổ.");
          return;
        }
        const values = await form.validateFields(["NgaySX", "ca"]);
        const ngay = values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null;
        const caVal = values.ca;
        if (!ngay || !caVal) {
          message.warning("Vui lòng chọn Ngày và Ca trước khi thu hồi phân bổ.");
          return;
        }
        const payload: STD_NXT_HRC2_PhanBoDto = {
          NgaySX: ngay,
          Ca: Number(caVal),
          Id_HeaderKey: dto.Id_HeaderKey,
          ChenhLech: dto.ChenhLech,
          IdPhieu: idphieu,
          TyLeBOF: dto.TyLeBOF ?? null,
          TyLeTinhLuyen: dto.TyLeTinhLuyen ?? null,
        };
        setLoading(true);
        const res = await STD_NXT_HRC2ServiceApi.thuHoiPhanBo(payload);
        const ok = (res as any)?.data ?? res;
        if (ok === true) {
          message.success("Thu hồi phân bổ thành công.");
          if (idphieu) {
            await initData();
          }
        } else {
          message.warning("Thu hồi phân bổ không thành công.");
        }
      } catch (error: any) {
        console.error("Thu hồi phân bổ thất bại:", error);
        message.error(error?.message || "Không thể thu hồi phân bổ. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [form, idphieu, initData]
  );

  const handleFilterData = useCallback(async () => {
    try {
      // Chỉ validate Ngày và Ca để tránh yêu cầu các trường ký tên
      const values = await form.validateFields(["NgaySX", "ca"]);
      const ngay = values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null;
      const caVal = values.ca;
      if (!ngay || !caVal) {
        message.warning("Vui lòng chọn Ngày và Ca trước khi lọc dữ liệu");
        return;
      }
      const idphieuVal = form.getFieldValue("idphieu") ?? idphieu;
      const headerKeyIds = [...new Set(
        table1Data
          .map((r) => r.idNguyenNhienLieu)
          .filter((id): id is number => id != null && id !== undefined && Number(id) > 0)
      )];
      const res = await dlnmHRC2Api.filterSTD_NXT({
        NgaySX: ngay,
        Ca: Number(caVal),
        ...(idphieuVal ? { idPhieu: idphieuVal } : {}),
        ...(headerKeyIds.length > 0 ? { headerKeyIds } : {}),
      });
      // Map dữ liệu trả về từ filter
      const payload = (res as any)?.data ?? res;
      const resultData = Array.isArray(payload) ? (payload as any[]) : [];

      const kvList = config.layout1?.[0]?.khuVucList || [];
      const findKhuVucLabel = (bieuMau: string | null | undefined, scope: number | null | undefined) => {
        const match = kvList.find((kv: any) => kv?.bieuMau === bieuMau && Number(kv?.scope) === Number(scope));
        return match?.label || match?.value || "";
      };
      const getKhuVucByScope = (scope: number): string => {
        const kv = kvList.find((kv: any) => {
          const valueNum = kv?.value !== undefined ? Number(kv.value) : NaN;
          return !Number.isNaN(valueNum) && valueNum === scope;
        });
        return kv?.label ? String(kv.label) : String(scope);
      };
      const viTriDefault = config.layout1?.[0]?.defaultViTri ?? 1;
      const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

      // Khi có idphieu: BE đã chạy Init và cập nhật DB → load lại detail từ BE rồi mới đổ resultData lên
      if (idphieuVal) {
        const detailRes: any = await STD_NXT_HRC2ServiceApi.getDetail(idphieuVal);
        const data = detailRes?.data;
        const mappedDetails: STD_NXT_Table1Row[] = (data?.details || []).map((item: any, index: number) => {
          const scope = Number(item.scope) || 0;
          const khuVuc = getKhuVucByScope(scope);
          return {
            key: `${scope}_${item.id_HeaderKey}_${item.viTri}_${index}`,
            khuVuc,
            viTri: Number(item.viTri) || 1,
            nguyenNhienLieu: item.tenNguyenLieu || "",
            idNguyenNhienLieu: item.id_HeaderKey || null,
            isUnmapped: !item.id_HeaderKey,
            siloId: item.idSilo ?? item.IDSilo ?? item.siloId ?? null,
            tenSilo: item.tenSilo ?? item.TenSilo ?? null,
            tonDauCa: item.tonDauCa ?? null,
            tuongQuanDauCa: item.tuongQuanDauCa ?? "",
            mucLieu: item.mucLieu ?? null,
            theTich: item.theTich ?? null,
            tyTrong: item.tyTrong ?? null,
            nhapTrongCa: item.nhapVaoTrongCa ?? null,
            tonCuoiCa: item.tonCuoiCa ?? null,
            tuongQuanCuoiCa: item.tuongQuanCuoiCa ?? "",
            tongThucTe: item.tongThucTe ?? null,
            luongSuDungKiemKe: item.luongSuDungKiemKe ?? null,
          };
        });
        const ngaySxStr = (data?.ngaySX ?? data?.NgaySX) != null ? (typeof (data?.ngaySX ?? data?.NgaySX) === "string" ? (data?.ngaySX ?? data?.NgaySX) : (data?.ngaySX ?? data?.NgaySX)?.format?.("YYYY-MM-DD")) : undefined;
        const caVal = data?.ca ?? data?.Ca ?? undefined;
        const mappedSummary: STD_NXT_Table2Row[] = (data?.summary || []).map((item: any) => ({
          key: `summary_${item.id_HeaderKey ?? item.Id_HeaderKey}`,
          totalNguyenNhienLieu: item.tenNguyenLieu ?? item.TenNguyenLieu ?? "",
          totalTonDauCa: item.tongTonDauCa ?? item.TongTonDauCa ?? null,
          totalNhapTrongCa: item.tongTonNhapTrongCa ?? item.TongTonNhapTrongCa ?? null,
          totalTonCuoiCa: item.tongTonCuoiCa ?? item.TongTonCuoiCa ?? null,
          totalSuDung: item.tongSuDung ?? item.TongSuDung ?? null,
          totalSDTrongSoSach: item.tongSDTrenSoSach ?? item.TongSDTrenSoSach ?? null,
          totalChenhLech: item.chenhLech ?? item.ChenhLech ?? null,
          HasPhanBo: item.hasPhanBo ?? item.HasPhanBo ?? null,
          Id_HeaderKey: item.id_HeaderKey ?? item.Id_HeaderKey ?? null,
          NgaySX: ngaySxStr,
          Ca: caVal,
        }));

        // Giữ lại các dòng thêm tay (isManualNew) chưa lưu lên BE
        const manualNewRows = table1Data
          .filter((r: any) => r.isManualNew === true)
          .map((r: any) => ({ ...r, tongThucTe: 0 }));

        const currentRows = [
          ...mappedDetails.map((r) => ({ ...r, tongThucTe: 0 })),
          ...manualNewRows,
        ];
        const newUnmappedRows: STD_NXT_Table1Row[] = [];

        resultData.forEach((item: any) => {
          const khuVucLabel = findKhuVucLabel(item.bieuMau, item.scope);
          if (!khuVucLabel) return;
          const targetHeaderId = (item.headerKeyId ?? item.HeaderKeyId) as number | null;
          const targetHeaderName = item.headerKeyName ?? item.HeaderKeyName;
          const totalKL = (item.totalKLPhuGia ?? item.TotalKLPhuGia ?? 0) as number;
          const phuLieus = Array.isArray(item.phuLieus ?? item.PhuLieus) ? (item.phuLieus ?? item.PhuLieus) : [];

          if (targetHeaderId) {
            currentRows.forEach((row, idx) => {
              if (row.khuVuc !== khuVucLabel) return;
              if (row.idNguyenNhienLieu === targetHeaderId || (!row.idNguyenNhienLieu && targetHeaderName && norm(row.nguyenNhienLieu) === norm(targetHeaderName))) {
                currentRows[idx] = { ...currentRows[idx], tongThucTe: totalKL ?? 0, isUnmapped: false, idNguyenNhienLieu: currentRows[idx].idNguyenNhienLieu ?? targetHeaderId };
              }
            });
            return;
          }
          phuLieus.forEach((pl: any) => {
            const fallbackName = pl?.tenPhuLieu ?? pl?.TenPhuLieu ?? "";
            const idPhuLieu = pl?.iD_PhuLieu ?? pl?.ID_PhuLieu ?? null;
            if (!idPhuLieu) return;
            const existingUnmappedIndex = currentRows.findIndex((row) => row.isUnmapped && row.idPhuLieu === idPhuLieu && row.khuVuc === khuVucLabel);
            if (existingUnmappedIndex >= 0) {
              currentRows[existingUnmappedIndex] = { ...currentRows[existingUnmappedIndex], tongThucTe: totalKL ?? 0, rawTenPhuLieu: currentRows[existingUnmappedIndex].rawTenPhuLieu || fallbackName, nguyenNhienLieu: currentRows[existingUnmappedIndex].nguyenNhienLieu || fallbackName, isUnmapped: true };
              return;
            }
            if (!newUnmappedRows.some((row) => row.idPhuLieu === idPhuLieu && row.khuVuc === khuVucLabel)) {
              newUnmappedRows.push({
                key: `${khuVucLabel}_unmapped_${idPhuLieu}_${Date.now()}`,
                khuVuc: khuVucLabel,
                viTri: viTriDefault,
                nguyenNhienLieu: fallbackName,
                idNguyenNhienLieu: null,
                rawTenPhuLieu: fallbackName,
                isUnmapped: true,
                idPhuLieu: idPhuLieu,
                tonDauCa: "", tuongQuanDauCa: "", nhapTrongCa: "", tonCuoiCa: "", tuongQuanCuoiCa: "",
                tongThucTe: totalKL ?? 0,
              });
            }
          });
        });

        setTable1Data([...currentRows, ...newUnmappedRows]);
        setTable2Data(mappedSummary);
      } else {
        // Không có phiếu: giữ logic cũ, đổ filter lên prev
        setTable1Data((prev: STD_NXT_Table1Row[]) => {
          const currentRows = prev.map((r) => ({ ...r, tongThucTe: 0 }));
          const newUnmappedRows: STD_NXT_Table1Row[] = [];

          resultData.forEach((item: any) => {
            const khuVucLabel = findKhuVucLabel(item.bieuMau, item.scope);
            if (!khuVucLabel) return;
            const targetHeaderId = (item.headerKeyId ?? item.HeaderKeyId) as number | null;
            const targetHeaderName = item.headerKeyName ?? item.HeaderKeyName;
            const totalKL = (item.totalKLPhuGia ?? item.TotalKLPhuGia ?? 0) as number;
            const phuLieus = Array.isArray(item.phuLieus ?? item.PhuLieus) ? (item.phuLieus ?? item.PhuLieus) : [];

            if (targetHeaderId) {
              currentRows.forEach((row, idx) => {
                if (row.khuVuc !== khuVucLabel) return;
                if (row.idNguyenNhienLieu === targetHeaderId || (!row.idNguyenNhienLieu && targetHeaderName && norm(row.nguyenNhienLieu) === norm(targetHeaderName))) {
                  currentRows[idx] = { ...currentRows[idx], tongThucTe: totalKL ?? 0, isUnmapped: false, idNguyenNhienLieu: currentRows[idx].idNguyenNhienLieu ?? targetHeaderId };
                }
              });
              return;
            }
            phuLieus.forEach((pl: any) => {
              const fallbackName = pl?.tenPhuLieu ?? pl?.TenPhuLieu ?? "";
              const idPhuLieu = pl?.iD_PhuLieu ?? pl?.ID_PhuLieu ?? null;
              if (!idPhuLieu) return;
              const existingUnmappedIndex = currentRows.findIndex((row) => row.isUnmapped && row.idPhuLieu === idPhuLieu && row.khuVuc === khuVucLabel);
              if (existingUnmappedIndex >= 0) {
                currentRows[existingUnmappedIndex] = { ...currentRows[existingUnmappedIndex], tongThucTe: totalKL ?? 0, rawTenPhuLieu: currentRows[existingUnmappedIndex].rawTenPhuLieu || fallbackName, nguyenNhienLieu: currentRows[existingUnmappedIndex].nguyenNhienLieu || fallbackName, isUnmapped: true };
                return;
              }
              if (!newUnmappedRows.some((row) => row.idPhuLieu === idPhuLieu && row.khuVuc === khuVucLabel)) {
                newUnmappedRows.push({
                  key: `${khuVucLabel}_unmapped_${idPhuLieu}_${Date.now()}`,
                  khuVuc: khuVucLabel,
                  viTri: viTriDefault,
                  nguyenNhienLieu: fallbackName,
                  idNguyenNhienLieu: null,
                  rawTenPhuLieu: fallbackName,
                  isUnmapped: true,
                  idPhuLieu: idPhuLieu,
                  tonDauCa: "", tuongQuanDauCa: "", nhapTrongCa: "", tonCuoiCa: "", tuongQuanCuoiCa: "",
                  tongThucTe: totalKL ?? 0,
                });
              }
            });
          });
          return [...currentRows, ...newUnmappedRows];
        });
      }

      if (resultData.length === 0) {
        message.info("Không có dữ liệu phụ liệu cho Ngày/Ca đã chọn (đã reset Tổng thực tế sử dụng = 0)");
      } else {
        message.success("Đã lọc dữ liệu phụ liệu theo ngày/ca");
      }
    } catch (error: any) {
      console.error("Lọc dữ liệu thất bại:", error);
      message.error(error?.message || "Không thể lọc dữ liệu");
    }
  }, [form, config.layout1, setTable1Data, table1Data, idphieu]);

  return (
    <Card className="mt-6 shadow-md">
      {/* Tiêu đề biên bản */}
      <div className="mb-6 flex items-start justify-between">
        {/* Logo + tên công ty */}
        {/* <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <img
            src="https://report.hoaphatdungquat.vn/img/logoHP.png"
            alt="logo"
            style={{ height: "auto", width: 150 }}
          />
          {config.headerInfo && (
            <>
              <Typography.Text strong>
                {config.headerInfo.subCompany}
              </Typography.Text>
              <Typography.Text>{config.headerInfo.company}</Typography.Text>
            </>
          )}
        </div> */}

        {/* Tiêu đề trung tâm */}
        <div className="flex-1 text-center">
          <Typography.Title level={3} className="mb-0">
            {config.title}
          </Typography.Title>
        </div>

        {/* ISO góc phải */}
        {/* {config.isoInfo && (
          <div className="text-right leading-5 text-[13px]">
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {config.isoInfo.revision}</div>
          </div>
        )} */}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* HEADER - các trường nhập đầu */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: 900,
            margin: "0 auto",
            padding: "8px 0",
          }}
        >
          {config.headerFields.map((f, idx) => (
            <div key={f.key || idx} style={{ flex: "0 0 260px", maxWidth: 320 }}>
              <CustomFormItem field={f} idx={idx} />
            </div>
          ))}
          <div style={{ flex: "0 0 160px", maxWidth: 160 }}>
            <Button
              type="primary"
              onClick={handleFilterData}
              style={{
                height: 35,
                width: "100%",
                borderRadius: 8,
              }}
            >
              Lọc dữ liệu
            </Button>
          </div>
        </div>

        {/* TABS: summaryTable + mỗi khuVuc 1 tab */}
        {(() => {
          const kvList = layout1?.khuVucList || [];
          const kvLabels: string[] = kvList
            .map((k: any) => k?.label || k?.value || "")
            .filter((x: string) => !!x);

          const tabItems = [
            // Tab 0: Tổng hợp (summaryTable)
            ...(layout2 && layout2.sectionType === "summaryTable"
              ? [
                  {
                    key: "summary",
                    label: layout2.title || "Tổng hợp",
                    children: (
                      <SummaryTableSTD
                        columns={layout2.columns || []}
                        table1Data={table1Data}
                        initialData={table2Data}
                        onDataChange={setTable2Data}
                        onPhanBo={handlePhanBoSummary}
                        onThuHoi={handleThuHoiSummary}
                        idPhieu={idphieu ?? undefined}
                        editable={!isFormLocked}
                        loading={loading}
                      />
                    ),
                  },
                ]
              : []),
            // Tab per khuVuc
            ...(layout1 && layout1.sectionType === "groupedTable"
              ? kvLabels.map((kvLabel) => ({
                  key: `kv_${kvLabel}`,
                  label: kvLabel,
                  children: (
                    <GroupedTableSTD
                      columns={layout1.columns || []}
                      initialData={table1Data.filter((r: any) => r.khuVuc === kvLabel)}
                      onDataChange={(kvRows: any[]) =>
                        setTable1Data((prev: any[]) => [
                          ...prev.filter((r: any) => r.khuVuc !== kvLabel),
                          ...kvRows,
                        ])
                      }
                      khuVucList={[kvLabel]}
                      defaultNguyenNhienLieu={[]}
                      defaultViTri={layout1.defaultViTri || 1}
                      editable={!isFormLocked}
                      loading={loading}
                      ngaySX={form.getFieldValue("NgaySX")}
                      khuVucConfig={kvList}
                      nhaMay={2}
                    />
                  ),
                }))
              : []),
          ];

          return (
            <Tabs
              style={{ marginTop: 24 }}
              items={tabItems}
              type="card"
            />
          );
        })()}

        {/* SIGNATURES - ký tên */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            gap: 24,
          }}
        >
          {config.signatures
            .filter((x) => x.isChon)
            ?.map((sig, i) => {
              const isLevelZero = sig.capduyet === 0;
              // Khi trạng thái là DangLuu và cấp duyệt = 0, luôn lấy currentUser, không quan tâm form có giá trị hay không
              const shouldUseCurrentUser = currentTinhTrang === TrangThaiPhieuConst.DangLuu && isLevelZero;
              
              return (
                <div key={sig.key || i}>
                  <CustomFormItem
                    field={sig}
                    idx={i}
                    disabled={isSignatureReadonly || isFormLocked}
                    initialValue={
                      shouldUseCurrentUser
                        ? currentUserInfo?.iD_TaiKhoan ?? null
                        : form.getFieldValue(sig.key)
                    }
                  />
                </div>
              );
            })}
        </div>
        {/* ACTION BUTTONS */}

        {/* Action buttons theo workflow */}
        {actionButtons && (
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {actionButtons}
          </div>
        )}
      </Form>
    </Card>
  );
};

export default Tao_STD;
