import { useEffect, useState } from "react";
import { Select } from "antd";
import { TaiKhoanApi } from "../services/TaiKhoanService";

interface CustomChonNguoiKyProps {
  maBm?: string;
  loaiQuyen?: number; // 1 = người xử lý (quyền 1|4), 2 = người phê duyệt (quyền 2|4)
  maphongBan?: string; // fallback cũ khi chưa có maBm
  value?: any;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

export default function CustomChonNguoiKy({
  maBm,
  loaiQuyen,
  maphongBan,
  value,
  onChange,
  disabled = false,
}: CustomChonNguoiKyProps) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        let res: any;
        if (maBm && loaiQuyen != null) {
          res = await TaiKhoanApi.getListKyDuyet(maBm, loaiQuyen);
        } else if (maphongBan) {
          const params = maphongBan === "All" ? {} : { maphongBan };
          res = await TaiKhoanApi.getData(params);
        } else {
          return;
        }
        setOptions(
          ((res as any) || []).map((x: any) => ({
            label: x.tenTaiKhoan + " - " + x.hoVaTen,
            value: x.iD_TaiKhoan,
          })),
        );
      } catch (error) {
        console.error("Lỗi tải danh sách người ký:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [maBm, loaiQuyen, maphongBan]);

  return (
    <Select
      placeholder="Chọn người ký"
      options={options}
      value={value}
      onChange={onChange}
      loading={loading}
      showSearch
      allowClear
      disabled={disabled}
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: "300px" }}
    />
  );
}
