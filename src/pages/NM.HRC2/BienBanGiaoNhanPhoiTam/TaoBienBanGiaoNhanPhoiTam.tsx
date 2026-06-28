import HRC2_BBGN_PhoiTam from "../../../utils/BM_config/HRC2_BBGN_PhoiTam.json";
import { Button, Card, Form, Input, Typography, message } from "antd";
import CustomFormTable, { type FormColumnDef } from "../../../components/CustomFormTable";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation } from "react-router-dom";

const TaoBienBanGiaoNhanPhoiTam = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};

  const config = HRC2_BBGN_PhoiTam;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const initData = async () => {
    if (!idphieu) return;
    try {
      setLoading(true);
      const res = await PhieuApi.getDetail(idphieu);
      if (res) {
        const data = (res as any)?.jsonData || {};
        form.setFieldsValue({
          ...data,
          idphieu: (res as any)?.idphieu || "",
          NgaySX: data.NgaySX ? dayjs(data.NgaySX, "YYYY-MM-DD") : null,
        });
        if (data.table1) setTableData(data.table1);
        message.success("Đã tải dữ liệu phiếu!");
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu phiếu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Theo dõi form → load lại bảng */
  // useEffect(() => {
  //   if (ngaySX || ca || mayduc) {
  //     fetchTableData({
  //       NgaySX: ngaySX ? dayjs(ngaySX).format("YYYY-MM-DD") : null,
  //       Ca: ca,
  //       MayDuc: mayduc,
  //     });
  //   }
  // }, [ngaySX, ca, mayduc]);

  // Gửi dữ liệu form
  const handleSubmit = async (values: any) => {
    try {
      const stored = localStorage.getItem("userinfo");

      // Thông tin phê duyệt
      const pheDuyetFlow = config.signatures
        .filter((s) => s.isChon)
        .map((s) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      // Thêm dòng mặc định cho người tạo phiếu = cấp 1
      const hasCreator = config.signatures.find(
        (x) => x.isChon === false && x.capduyet === 1
      );
      if (hasCreator) {
        pheDuyetFlow.unshift({
          capDuyet: 1,
          maKyDuyet: hasCreator?.key || "", //
          nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
          tinhTrang: 1, // 1 = đã duyệt (vì chính người tạo)
          ghiChu: "Người tạo phiếu",
        });
      }

      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
        idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
        table1: tableData,
        pheDuyet: pheDuyetFlow,
      };
      // Kiểm tra có IDPhiếu hay không
      console.log("➡️ Payload gửi API:", payload);
      if (values.idphieu) {
        // Cập nhật
        await PhieuApi.putData(values.idphieu, payload);
        message.success("Cập nhật phiếu thành công!");
      } else {
        // Gửi POST API
        const res = await PhieuApi.postData(payload);

        // Nếu thành công
        message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu || ""}`);
      }
    } catch (error) {
      console.error("Lỗi tạo phiếu:", error);
      message.error("Không thể tạo phiếu! Vui lòng thử lại.");
    }
  };

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      {/* Tiêu đề biên bản */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
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
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
        </div>

        {/* ISO góc phải */}
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
        {/* HEADER - các trường nhập đầu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} />
          ))}
        </div>
        {/* TABLE - danh sách phôi */}
        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={(layout.columns || []) as unknown as FormColumnDef[]}
                initialData={tableData}
                onDataChange={setTableData}
                addRowButtonText="+ Thêm dòng"
                showAddButton={true}
                showDeleteButton={true}
                minRows={1}
                editable={(layout as any).editable !== false} // Default true nếu không có config
                loading={loading}
                // onRefresh={() => {
                //   const tableLayout = config.layout.find(
                //     (l) => l.sectionType === "table"
                //   );
                //   if (tableLayout) {
                //     fetchTableData(tableLayout);
                //   }
                // }}
              />
            )}
          </div>
        ))}

        {/* FOOTER - ghi chú */}
        {/* <div style={{ marginTop: 24 }}>
          <Typography.Text strong>Ghi chú:</Typography.Text>
          <ul>
            {config.footerNotes?.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div> */}

        {/* SIGNATURES - ký tên */}
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
            ?.map((sig, i) => (
              <div key={i}>
                {/* <Typography.Text strong>{sig.label}</Typography.Text> */}
                {/* <div
                style={{
                  borderBottom: "1px solid #aaa",
                  height: 40,
                  width: 180,
                  margin: "16px auto",
                }}
              ></div> */}
                {/* <Typography.Text>{sig.key}</Typography.Text> */}
                <CustomFormItem key={sig.key || i} field={sig} idx={i} />
                {/* <CustomChonNguoiKy maphongBan={sig.maphongBan} /> */}
              </div>
            ))}
          {config.signatures
            .filter((x) => x.capduyet == 1)
            .map((sig, i) => (
              <Form.Item name={sig.key || i} hidden>
                <Input type="hidden" />
              </Form.Item>
            ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Button type="primary" htmlType="submit">
            Lưu & Gửi phê duyệt
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default TaoBienBanGiaoNhanPhoiTam;
