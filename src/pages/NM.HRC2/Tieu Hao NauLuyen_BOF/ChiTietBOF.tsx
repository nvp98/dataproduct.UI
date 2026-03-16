/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
  Typography,
  Row,
  Col,
  message,
} from "antd";
import dayjs from "dayjs";
import { formatNumberGroup } from "../../../utils/formatters/numberFormat";
import { useLocation, useNavigate } from "react-router-dom";
import { PhieuApi } from "../../../services/PhieuApi";
import HRC2_BB_NauLuyen_BOF from "../../../utils/BM_config/HRC2_BB_NauLuyen_BOF.json";
import { phieuActionService } from "../../../services/PhieuActionService";

const { Title, Text } = Typography;

type DynamicColumnMeta = {
  dataIndex: string;
  width?: number;
  label: string;
};

type DynamicColumnsMap = Record<string, DynamicColumnMeta[]>;

const ChiTietTieuHaoNauLuyen_BOF = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { idphieu } = location.state || {};

  const config = HRC2_BB_NauLuyen_BOF;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await PhieuApi.getDetail(idphieu);
      setData(res);
    } catch (error) {
      console.error("Lỗi tải dữ liệu phiếu:", error);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //   if (!data) return null;

  const formData = data?.jsonData || {};
  const tableData = formData?.table1 || [];
  const table2Data = formData?.table2 || [];
  // cấu hình bảng hiển thị
  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1"
  );

  const tableColumns = useMemo(() => {
    const sourceColumns = (tableSection?.columns || []) as any[];
    const dynamicColumnsMap =
      (formData?.table1DynamicColumns as DynamicColumnsMap | undefined) || {};

    const applyFormat = (col: any) => {
      if (!col || !col.dataIndex || col.format !== "number-group") return col;
      return {
        ...col,
        render: (value: unknown) => formatNumberGroup(value),
      };
    };

    const mapped = sourceColumns.map((col) => {
      const key = col.dataIndex || col.key;
      const dynamicChildren =
        key && dynamicColumnsMap[key] ? dynamicColumnsMap[key] : undefined;
      if (dynamicChildren && dynamicChildren.length > 0) {
        return {
          ...col,
          children: dynamicChildren.map((child) => ({
            title: child.label,
            dataIndex: child.dataIndex,
            width: child.width,
          })),
        };
      }
      if (Array.isArray(col.children) && col.children.length > 0) {
        return {
          ...col,
          children: col.children.map((c: any) => applyFormat(c)),
        };
      }
      return applyFormat(col);
    });

    if (dynamicColumnsMap.adjust && dynamicColumnsMap.adjust.length > 0) {
      mapped.push({
        title: "Điều chỉnh số liệu",
        children: dynamicColumnsMap.adjust.map((child) => ({
          title: child.label,
          dataIndex: child.dataIndex,
          width: child.width,
        })),
      });
    }

    return mapped;
  }, [tableSection, formData?.table1DynamicColumns]);

  const tableSection2 = config.layout2.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table2"
  );

  const columns2 = useMemo(() => {
    const raw = (tableSection2?.columns || []) as any[];
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    return raw.map((col) => {
      if (Array.isArray(col.children)) {
        return {
          ...col,
          align: alignType(col.align),
          children: col.children.map((c: any) => ({
            ...c,
            align: alignType(c.align),
          })),
        };
      }
      return { ...col, align: alignType(col.align) };
    });
  }, [tableSection2?.columns]);
  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate("/taophieutieuhaonauluyen_bof", {
          replace: true,
          state: { idphieu: context.newPhieuId },
        });
        return;
      }
      await loadData();
    },
    [loadData, navigate]
  );

  const actionButtons = useMemo(() => {
    if (!data || !idphieu) return null;
    const userInfo = getUserInfo();
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu,
      tinhTrang: data.tinhTrang ?? 0,
      isClone: data.isClone ?? false,
      currentUserId: userInfo.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo.tenNgan ?? null,
      nguoiTaoId: data.nguoiTaoId ?? null,
      phieuPhongBanId: data.idphongBan ?? null,
      pheDuyet: data.pheDuyet ?? [],
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
        message.error((error as any)?.message ?? "Không thể thực hiện thao tác");
      },
    });

    if (buttons.length === 0) return null;
    // Ở trang chi tiết, không chỉnh form nên không cần getFormData
    return phieuActionService.renderActionButtons(buttons, idphieu || "");
  }, [data, idphieu, getUserInfo, handleActionSuccess]);

  return (
    <Card
      bordered
      style={{ padding: 24, background: "#fff" }}
      loading={loading}
    >
        {/* Logo + tên công ty */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          {/* Logo + tên công ty */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                <Typography.Text strong>
                  {config.headerInfo.company}
                </Typography.Text>
              </>
            )}
          </div>

          {/* Tiêu đề trung tâm */}
          {/* <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
        </div> */}

          {/* ISO góc phải */}
          {config.isoInfo && (
            <div
              style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}
            >
              <div>
                <b>{config.isoInfo.code}</b>
              </div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={4} style={{ marginBottom: 0 }}>
            {config.title}
          </Title>
          {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
        </div>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Số phiếu">
            {data?.soPhieu || ""}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày SX">
            {formData?.NgaySX
              ? dayjs(formData.NgaySX).format("DD/MM/YYYY")
              : ""}
          </Descriptions.Item>
          <Descriptions.Item label="Ca sản xuất">
            {formData?.ca || ""}
          </Descriptions.Item>
          <Descriptions.Item label="Máy đúc">
            {formData?.mayduc || ""}
          </Descriptions.Item>
        </Descriptions>

        <Table
          bordered
          columns={tableColumns}
          dataSource={tableData?.map((r: any, i: number) => ({
            key: i,
            stt: i + 1,
            ...r,
          }))}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          sticky={{ offsetHeader: 0 }}
        />
        {table2Data && table2Data.length > 0 && (
          <Table
            bordered
            style={{ marginTop: 16 }}
            columns={columns2}
            dataSource={table2Data?.map((r: any, i: number) => ({
              key: i,
              stt: i + 1,
              ...r,
            }))}
            pagination={false}
            size="small"
        />
        )}
        {/* Khu vực ký duyệt */}
        <Row
          justify="space-around"
          align="top"
          style={{ textAlign: "center", marginTop: 30 }}
        >
          {config.signatures.map((sig) => {
            const duyet = data?.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capduyet
            );
            return (
              <Col>
                <Text strong>{sig.label}</Text>
                <br />
                <Text type="secondary" key={sig.capduyet}>
                  <Text>{duyet?.tinhTrang === 1 ? "Đã ký" : "Chưa xử lý"}</Text>
                  <br />
                  {duyet?.tenNguoiDuyet}
                </Text>
              </Col>
            );
          })}
        </Row>

        {/* Action buttons dưới cùng giống màn tạo phiếu */}
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {actionButtons}
        </div>
      </Card>
  );
};

export default ChiTietTieuHaoNauLuyen_BOF;
