import { Card, Form, Input, Switch, Button, Select, Divider, Typography, Row, Col, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = (_values: any) => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      message.success('Cài đặt đã được lưu thành công!');
    }, 1000);
  };

  const handleReset = () => {
    form.resetFields();
    message.info('Đã reset về cài đặt mặc định');
  };

  return (
    <div>
      <Title level={2}>Cài đặt hệ thống</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Cài đặt chung" size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                siteName: 'Hệ thống quản lý',
                siteDescription: 'Hệ thống quản lý dữ liệu sản phẩm',
                language: 'vi',
                timezone: 'Asia/Ho_Chi_Minh',
                enableNotifications: true,
                enableEmail: true,
                enableSMS: false,
              }}
            >
              <Form.Item
                label="Tên trang web"
                name="siteName"
                rules={[{ required: true, message: 'Vui lòng nhập tên trang web!' }]}
              >
                <Input placeholder="Nhập tên trang web" />
              </Form.Item>

              <Form.Item
                label="Mô tả trang web"
                name="siteDescription"
              >
                <TextArea rows={3} placeholder="Nhập mô tả trang web" />
              </Form.Item>

              <Form.Item
                label="Ngôn ngữ"
                name="language"
              >
                <Select>
                  <Option value="vi">Tiếng Việt</Option>
                  <Option value="en">English</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Múi giờ"
                name="timezone"
              >
                <Select>
                  <Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</Option>
                  <Option value="UTC">UTC</Option>
                </Select>
              </Form.Item>

              <Divider />

              <Form.Item
                label="Bật thông báo"
                name="enableNotifications"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Bật email"
                name="enableEmail"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Bật SMS"
                name="enableSMS"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  Lưu cài đặt
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={handleReset} icon={<ReloadOutlined />}>
                  Reset
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Cài đặt bảo mật" size="small">
            <Form layout="vertical">
              <Form.Item
                label="Mật khẩu hiện tại"
                name="currentPassword"
              >
                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
              </Form.Item>

              <Form.Item
                label="Mật khẩu mới"
                name="newPassword"
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item
                label="Xác nhận mật khẩu"
                name="confirmPassword"
              >
                <Input.Password placeholder="Xác nhận mật khẩu mới" />
              </Form.Item>

              <Divider />

              <Form.Item
                label="Phiên đăng nhập tối đa"
                name="maxSessions"
              >
                <Select defaultValue="5">
                  <Option value="1">1 phiên</Option>
                  <Option value="3">3 phiên</Option>
                  <Option value="5">5 phiên</Option>
                  <Option value="10">10 phiên</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Thời gian hết hạn phiên (phút)"
                name="sessionTimeout"
              >
                <Input type="number" placeholder="30" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  Cập nhật bảo mật
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="Thông tin hệ thống" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <strong>Phiên bản:</strong> 2.0.0
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <strong>Ngày cập nhật:</strong> 2024-01-15
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <strong>Trạng thái:</strong> <span style={{ color: 'green' }}>Hoạt động</span>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <strong>Uptime:</strong> 99.9%
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Settings;

