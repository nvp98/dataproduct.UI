import { Menu } from "antd";
import { menuConfig } from "../utils/configs/menuConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAdminUser } from "../utils/helpers/checkAdminRole";
import { BmQuyenXlApi, type MenuPermissionsResponse } from "../services/BmQuyenXlApi";

const SidebarMenu = () => {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [menuPermissions, setMenuPermissions] = useState<MenuPermissionsResponse | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("userinfo");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const idTaiKhoan =
      (user?.iD_TaiKhoan ?? user?.ID_TaiKhoan ?? user?.idTaiKhoan ?? user?.IdTaiKhoan) as number | undefined;
    if (idTaiKhoan == null || typeof idTaiKhoan !== "number") {
      setMenuPermissions(null);
      return;
    }
    BmQuyenXlApi.getMenuPermissions(idTaiKhoan)
      .then((res) => setMenuPermissions(res ?? { processingForms: [], approvingForms: [] }))
      .catch(() => setMenuPermissions({ processingForms: [], approvingForms: [] }));
  }, [user]);

  const filterByMaBM = useCallback(
    (
      items: { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[],
      processingSet: Set<string>,
      approvingSet: Set<string>,
      parentKey?: string
    ): typeof items => {
      const allowAllProcessing = processingSet.has("*");
      const allowAllApproving = approvingSet.has("*");
      const isUnderProcessing =
        parentKey === "sub2" || (typeof parentKey === "string" && parentKey.startsWith("sub2"));
      const isUnderApproving =
        parentKey === "sub3" || (typeof parentKey === "string" && (parentKey.startsWith("sub3") || parentKey.startsWith("sub4")));
      return items
        .filter((item) => {
          const roles = item.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) return isAdminUser(user);
          if (Array.isArray(roles) && roles.includes("PKH")) return user?.tenNgan === "P.KH";
          if (isUnderProcessing) {
            if (item.maBM != null) return allowAllProcessing || processingSet.has(item.maBM);
            return true;
          }
          if (isUnderApproving) {
            if (item.maBM != null) return allowAllApproving || approvingSet.has(item.maBM);
            return true;
          }
          return true;
        })
        .map((item) => {
          if (item.children && Array.isArray(item.children)) {
            const filteredChildren = filterByMaBM(
              item.children as { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[],
              processingSet,
              approvingSet,
              item.key ?? parentKey
            );
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (item.children && Array.isArray(item.children) && item.children.length === 0)
            return false;
          if ((isUnderProcessing || isUnderApproving) && item.children?.length === 0)
            return false;
          return true;
        });
    },
    [user]
  );

  const filteredMenu = useMemo(() => {
    if (!user) return [];
    const isAdmin = isAdminUser(user);
    const showAllByMaBM = isAdmin || menuPermissions === null;
    const processingSet = showAllByMaBM
      ? new Set<string>(["*"])
      : new Set(menuPermissions?.processingForms ?? []);
    const approvingSet = showAllByMaBM
      ? new Set<string>(["*"])
      : new Set(menuPermissions?.approvingForms ?? []);

    const filterMenuItems = (
      items: { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[]
    ): typeof items => {
      return items
        .filter((item) => {
          const roles = item.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) return isAdmin;
          if (Array.isArray(roles) && roles.includes("PKH")) return user?.tenNgan === "P.KH";
          return true;
        })
        .map((item) => {
          if (item.children && Array.isArray(item.children)) {
            const isSub2 = item.key === "sub2";
            const isSub3 = item.key === "sub3";
            const filteredChildren =
              isSub2 || isSub3
                ? filterByMaBM(
                    item.children as { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[],
                    isSub2 ? processingSet : new Set(),
                    isSub3 ? approvingSet : new Set(),
                    item.key
                  )
                : filterMenuItems(
                    item.children as { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[]
                  );
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (item.children && Array.isArray(item.children) && item.children.length === 0)
            return false;
          return true;
        });
    };

    return filterMenuItems(menuConfig as { key?: string; maBM?: string; children?: unknown[]; [k: string]: unknown }[]) as React.ComponentProps<typeof Menu>["items"];
  }, [user, menuPermissions, filterByMaBM]);

  if (!user) return null;

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
