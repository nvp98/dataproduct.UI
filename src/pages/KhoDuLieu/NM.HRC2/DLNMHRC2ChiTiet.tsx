import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Space,
  Table,
  message,
  Spin,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { dlnmHRC2Api } from "../../../services/DLNMHRC2Api";
import { pickValue } from "../../../models/DLMN_HRC2Model";
import type {
  HRC2DetailByReportNoModel,
  HRC2DetailRow,
  HRC2MainData,
  HRC2RawData,
} from "../../../models/DLMN_HRC2Model";
import HeaderMappingModal from "../../../components/HeaderMapping";

const DLNMHRC2ChiTiet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<HRC2DetailRow[]>([]);
  const [mainData, setMainData] = useState<HRC2MainData | null>(null);
  const [form] = Form.useForm();
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<HRC2DetailRow | null>(null);

  // Lấy report_no từ location state hoặc params
  const reportNo = location.state?.reportNo || location.state?.report_NO || null;

  useEffect(() => {
    if (!reportNo) {
      message.error("Không tìm thấy REPORT_NO");
      navigate(-1);
      return;
    }
    fetchDetailData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportNo]);

  const normalizeMainData = (data?: HRC2RawData | null): HRC2MainData | null => {
    if (!data) return null;
    return {
      ngay: pickValue<HRC2MainData["ngay"]>(data, ["ngay", "Ngay"]),
      ca: pickValue<HRC2MainData["ca"]>(data, ["ca", "Ca"]),
      bieuMau: pickValue<string>(data, ["bieuMau", "BieuMau"]),
      scope: pickValue<HRC2MainData["scope"]>(data, ["scope", "Scope"]),
      meThoi: pickValue<string>(data, ["meThoi", "MeThoi"]),
      macThep: pickValue<string>(data, ["macThep", "MacThep"]),
      o2: pickValue<HRC2MainData["o2"]>(data, ["o2", "O2"]),
      ar_RH: pickValue<HRC2MainData["ar_RH"]>(data, ["ar_RH", "AR_RH"]),
      n2: pickValue<HRC2MainData["n2"]>(data, ["n2", "N2"]),
      ar_BOF: pickValue<HRC2MainData["ar_BOF"]>(data, ["ar_BOF", "AR_BOF"]),
      ar_LF: pickValue<HRC2MainData["ar_LF"]>(data, ["ar_LF", "AR_LF"]),
      klGangLong: pickValue<HRC2MainData["klGangLong"]>(data, ["klGangLong", "KLGangLong"]),
      klThepPhe: pickValue<HRC2MainData["klThepPhe"]>(data, ["klThepPhe", "KLThepPhe"]),
    };
  };

  const normalizeDetailData = (detail?: HRC2RawData[]): HRC2DetailRow[] =>
    (detail ?? []).map(item => ({
      idPhuLieu: pickValue<number>(item, ["idPhuLieu", "ID_PhuLieu", "iD_PhuLieu"]),
      tenPhuLieu: pickValue<string>(item, ["tenPhuLieu", "TenPhuLieu"]),
      klPhuGia: pickValue<number>(item, ["klPhuGia", "KLPhuGia"]),
      keyGuid: pickValue<string>(item, ["keyGuid", "KeyGuid"]),
      tenHienThi: pickValue<string>(item, ["tenHienThi", "TenHienThi"]),
      tenNguonDuLieu: pickValue<string>(item, ["tenNguonDuLieu", "TenNguonDuLieu"]),
      idHeaderKey: pickValue<number>(item, ["idHeaderKey", "ID_HeaderKey", "iD_HeaderKey"]),
      mappingId: pickValue<number>(item, ["mappingId", "MappingId"]),
    }));

  const fetchDetailData = async () => {
    if (!reportNo) return;
    
    setLoading(true);
    try {
      const res = (await dlnmHRC2Api.getByReportNo(
        reportNo
      )) as unknown as HRC2DetailByReportNoModel;
      const normalizedMain = normalizeMainData(
        (res?.data ?? null) as unknown as HRC2RawData | null
      );
      const normalizedDetail = normalizeDetailData(
        (res?.phulieus ?? []) as unknown as HRC2RawData[]
      );

      setMainData(normalizedMain);
      setDetailData(normalizedDetail);

      // Set form với record đầu tiên (thông tin chung)
      if (normalizedMain) {
        const formData: Partial<HRC2MainData> = { ...normalizedMain };
        if (formData.ngay) {
          try {
            // Kiểm tra xem đã là dayjs chưa, nếu chưa thì convert
            if (dayjs.isDayjs(formData.ngay)) {
              // Đã là dayjs, giữ nguyên
            } else if (formData.ngay instanceof Date) {
              formData.ngay = dayjs(formData.ngay);
            } else if (typeof formData.ngay === 'string') {
              formData.ngay = dayjs(formData.ngay);
            } else {
              formData.ngay = null;
            }
          } catch (e) {
            console.error("Error converting date:", e);
            formData.ngay = null;
          }
        } else {
          formData.ngay = null;
        }
        form.setFieldsValue(formData);
      }
    } catch (err) {
      console.error("Error fetch detail:", err);
      message.error("Lỗi khi tải chi tiết");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "ID Phụ liệu",
      dataIndex: "idPhuLieu",
      key: "idPhuLieu",
      width: 120,
      render: (value: number | null | undefined) => value || "-",
    },
    {
      title: "Tên phụ liệu",
      dataIndex: "tenPhuLieu",
      key: "tenPhuLieu",
    },
    {
      title: "KL Phụ gia",
      dataIndex: "klPhuGia",
      key: "klPhuGia",
      width: 120,
      render: (value: number | null | undefined) => value?.toFixed(2) || "-",
    },
    {
      title: "Key Guid",
      dataIndex: "keyGuid",
      key: "keyGuid",
      width: 220,
      render: (value: string | null | undefined) => value || "-",
    },
    {
      title: "Tên hiển thị",
      dataIndex: "tenHienThi",
      key: "tenHienThi",
    },
    {
      title: "Tên nguồn dữ liệu",
      dataIndex: "tenNguonDuLieu",
      key: "tenNguonDuLieu",
    },
    {
      title: "ID Header Key",
      dataIndex: "idHeaderKey",
      key: "idHeaderKey",
      width: 140,
      render: (value: number | null | undefined) => value || "-",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      render: (_: unknown, record: HRC2DetailRow) => (
        <Button type="link" size="small" onClick={() => openMappingModal(record)}>
          {record.keyGuid ? "Sửa" : "Móc nối"}
        </Button>
      ),
    },
  ];
  const openMappingModal = (record: HRC2DetailRow) => {
    setCurrentRow(record);
    setMappingModalVisible(true);
  };

  const handleCloseMappingModal = () => {
    setMappingModalVisible(false);
    setCurrentRow(null);
  };

  const handleMappingSuccess = () => {
    handleCloseMappingModal();
    fetchDetailData();
  };

  if (loading && !mainData) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        className="mb-4"
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              type="text"
            >
              Quay lại
            </Button>
            <span>Chi tiết REPORT_NO: {reportNo}</span>
          </Space>
        }
      >
        <Form layout="vertical" form={form}>
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="ngay" label="Ngày" className="mb-1.5">
                <DatePicker 
                  className="w-full" 
                  disabled 
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="ca" label="Ca" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="bieuMau" label="Biểu mẫu" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="scope" label="Scope" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="meThoi" label="Mẻ thổi" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="macThep" label="Mác thép" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="o2" label="O2" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="ar_RH" label="AR_RH" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="n2" label="N2" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="ar_BOF" label="AR_BOF" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="ar_LF" label="AR_LF" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="klGangLong" label="KL Gang lỏng" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Form.Item name="klThepPhe" label="KL Thép phế" className="mb-1.5">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <style>{`
          .ant-form-item-label > label {
            font-size: 12px;
            font-weight: 500;
            color: #595959;
            height: auto;
          }
          .ant-form-item-control-input {
            min-height: auto;
          }
          .ant-input-disabled,
          .ant-picker-disabled {
            background-color: #ffffff !important;
            color: #262626 !important;
            border-color: #d9d9d9 !important;
            cursor: default !important;
          }
          .ant-input-disabled:hover,
          .ant-picker-disabled:hover {
            border-color: #d9d9d9 !important;
          }
          .missing-key-row td {
            background-color: #fff1f0 !important;
            transition: background-color 0.2s ease;
          }
        `}</style>
      </Card>

      {detailData && detailData.length > 0 && (
        <Card title="Danh sách phụ liệu">
          <Table
            dataSource={detailData}
            rowKey={(record, index) => `${record.idPhuLieu ?? "0"}-${record.idHeaderKey ?? index}`}
            pagination={false}
            size="small"
            columns={columns}
            loading={loading}
            rowClassName={(record) => (record.keyGuid ? "" : "missing-key-row")}
          />
        </Card>
      )}

      <HeaderMappingModal
        open={mappingModalVisible}
        record={
          currentRow
            ? {
                idPhuLieu: currentRow.idPhuLieu ?? null,
                tenPhuLieu: currentRow.tenPhuLieu,
                tenNguonDuLieu: currentRow.tenNguonDuLieu,
                idHeaderKey: currentRow.idHeaderKey,
                mappingId: currentRow.mappingId,
              }
            : null
        }
        onCancel={handleCloseMappingModal}
        onSuccess={handleMappingSuccess}
      />
    </div>
  );
};

export default DLNMHRC2ChiTiet;

