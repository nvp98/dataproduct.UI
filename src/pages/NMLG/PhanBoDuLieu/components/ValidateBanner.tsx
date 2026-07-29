import { Alert } from "antd";
import type { ValidatePhanBoResultDto } from "../../../../services/PhanBoApi";

function formatSo(n: number) {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

export default function ValidateBanner({
  validate,
  label,
}: {
  validate: ValidatePhanBoResultDto | null;
  label?: string;
}) {
  if (!validate) return null;

  const prefix = label ? `${label} — ` : "";

  return (
    <Alert
      className="mb-3"
      type={validate.isMatched ? "success" : "error"}
      showIcon
      message={
        validate.isMatched
          ? `${prefix}Đã khớp tổng: Nhận về ${formatSo(validate.tongNhanVe)} = Phân bổ ${formatSo(validate.tongPhanBo)}`
          : `${prefix}Chưa khớp tổng: Nhận về ${formatSo(validate.tongNhanVe)} ≠ Phân bổ ${formatSo(validate.tongPhanBo)} (chênh lệch ${formatSo(validate.chenhLech)})`
      }
    />
  );
}
