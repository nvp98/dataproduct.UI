import { useEffect } from "react";
import { TaiKhoanApi } from "../services/TaiKhoanService";

const AuthInitializer = () => {
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) return;

      try {
        const user = JSON.parse(userStr);
        const tenTaiKhoan: string = user.username;
        if (!tenTaiKhoan) return;

        const quyenData = await TaiKhoanApi.getQuyen(tenTaiKhoan) as any;
        localStorage.setItem("bmQuyenXlList", JSON.stringify(quyenData.bmQuyenXlList || []));

        const userinfoStr = localStorage.getItem("userinfo");
        const userinfo = userinfoStr ? JSON.parse(userinfoStr) : {};
        userinfo.bmQuyenXlList = quyenData.bmQuyenXlList || [];
        userinfo.quyenTheoLo = quyenData.quyenTheoLo || [];
        userinfo.quyenTheoScope = quyenData.quyenTheoScope || [];
        localStorage.setItem("userinfo", JSON.stringify(userinfo));
      } catch {
        // fail silently
      }
    };

    init();
  }, []);

  return null;
};

export default AuthInitializer;
