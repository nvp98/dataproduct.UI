import { Layout } from "antd";

const { Footer } = Layout;

type FooterNavProps = React.HTMLAttributes<HTMLDivElement>;

const MainFooter = ({}: FooterNavProps) => {
  return (
    <Footer
      style={{
        textAlign: "center",
        borderTop: "1px solid #f0f0f0",
        background: "#fff",
        padding: "12px 24px",
      }}
    >
      Copyright © {new Date().getFullYear()} Phòng CNTT & CĐS
    </Footer>
  );
};

export default MainFooter;
