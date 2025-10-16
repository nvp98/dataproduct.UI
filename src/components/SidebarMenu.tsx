import { Menu } from "antd";
import { menuConfig } from "../utils/configs/menuConfig";
import { useEffect, useState } from "react";
import type { User } from "../services/fakeApi";

const SidebarMenu = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  if (!user) return null; // hoặc Loading...

  // const filteredMenu = menuConfig.filter(
  //   (item) => !item.roles || item.roles.includes(user.role)
  // );
  // const filteredMenu = menuConfig.filter((item) => "admin");
  const filteredMenu = menuConfig;

  return (
    <Menu
      theme="light"
      mode="inline"
      defaultSelectedKeys={["1"]}
      items={filteredMenu}
    />
  );
};

export default SidebarMenu;
