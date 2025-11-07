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

const DLNMHRC2ChiTiet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [mainData, setMainData] = useState<any>(null);
  const [form] = Form.useForm();

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

  const fetchDetailData = async () => {
    if (!reportNo) return;
    
    setLoading(true);
    try {
      const res: any = await dlnmHRC2Api.getByReportNo(reportNo);
      const data = Array.isArray(res) ? res : [];
      
      setDetailData(data);
      
      // Set form với record đầu tiên (thông tin chung)
      if (data.length > 0) {
        setMainData(data[0]);
        // Convert ngay sang dayjs nếu có
        const formData: any = { ...data[0] };
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
      dataIndex: "iD_PhuLieu",
      key: "id_PhuLieu",
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
  ];

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
        `}</style>
      </Card>

      {detailData && detailData.length > 0 && (
        <Card title="Danh sách phụ liệu">
          <Table
            dataSource={detailData}
            rowKey="id"
            pagination={false}
            size="small"
            columns={columns}
            loading={loading}
          />
        </Card>
      )}
    </div>
  );
};

export default DLNMHRC2ChiTiet;

