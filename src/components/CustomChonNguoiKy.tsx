import { useEffect, useState } from "react";
import { Select } from "antd";
import { TaiKhoanApi } from "../services/TaiKhoanService";

interface CustomChonNguoiKyProps {
  maphongBan?: string; // "NM.CTD" | "P.QLCL" | "NM.HRC1"
  value?: any;
  onChange?: (value: any) => void;
  disabled?: boolean;
  isReadOnly?: boolean;
}

export default function CustomChonNguoiKy({
  maphongBan,
  value,
  onChange,
  disabled = false,
  isReadOnly = false,
}: CustomChonNguoiKyProps) {
  const isDisabled = disabled || isReadOnly;
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNguoiKy = async () => {
      if (!maphongBan) return;

      setLoading(true);
      try {
        const res = await TaiKhoanApi.getData({ maphongBan }); // truyền dạng object params
        setOptions(
          ((res as any) || []).map((x: any) => ({
            label: x.tenTaiKhoan + "-" + x.hoVaTen,
            value: x.iD_TaiKhoan,
          }))
        );
      } catch (error) {
        console.error("Lỗi tải danh sách người ký:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNguoiKy();
  }, [maphongBan]);

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
