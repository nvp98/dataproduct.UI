import { Menu } from "antd";
import { menuConfig } from "../utils/configs/menuConfig";
import { useEffect, useState } from "react";
import type { User } from "../services/fakeApi";
import { isAdminUser } from "../utils/helpers/checkAdminRole";

const SidebarMenu = () => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("userinfo");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  if (!user) return null; // hoặc Loading...

  // Lọc menu theo quyền admin
  const filterMenuItems = (items: any[]): any[] => {
    return items
      .filter((item) => {
        // Nếu menu item có roles=["admin"], chỉ hiển thị cho admin
        if (item.roles && item.roles.includes("admin")) {
          return isAdminUser(user);
        }
        // Nếu menu item có roles=["PKH"], chỉ hiển thị cho P.KH
        if (item.roles && item.roles.includes("PKH")) {
          return user.tenNgan === "P.KH";
        }
        return true; // Menu không có roles thì hiển thị cho tất cả
      })
      .map((item) => {
        // Nếu có children, filter children cũng
        if (item.children) {
          return {
            ...item,
            children: filterMenuItems(item.children),
          };
        }
        return item;
      })
      .filter((item) => {
        // Loại bỏ menu cha nếu không còn children nào
        if (item.children && item.children.length === 0) {
          return false;
        }
        return true;
      });
  };

  const filteredMenu = filterMenuItems(menuConfig);

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
