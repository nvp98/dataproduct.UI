import { Menu } from "antd";
import { menuConfig } from "../utils/configs/menuConfig";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAdminUser } from "../utils/helpers/checkAdminRole";
import {
  BmQuyenXlApi,
  type MenuPermissionsResponse,
} from "../services/BmQuyenXlApi";

const SidebarMenu = () => {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [menuPermissions, setMenuPermissions] =
    useState<MenuPermissionsResponse | null>(null);

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
    const raw =
      user?.iD_TaiKhoan ??
      user?.ID_TaiKhoan ??
      user?.idTaiKhoan ??
      user?.IdTaiKhoan;
    const idTaiKhoan = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(idTaiKhoan) || idTaiKhoan <= 0) {
      setMenuPermissions(null);
      return;
    }
    BmQuyenXlApi.getMenuPermissions(idTaiKhoan)
      .then((res) =>
        setMenuPermissions(
          res ?? {
            processingForms: [],
            approvingForms: [],
            viewingForms: [],
            chotPhieuForms: [],
          },
        ),
      )
      .catch(() => setMenuPermissions(null));
  }, [user]);

  /** Lọc item theo maBM: item có maBM thì hiển thị khi maBM nằm trong allowedSet (hoặc allowAll). */
  const filterByMaBM = useCallback(
    (
      items: {
        key?: string;
        maBM?: string;
        children?: unknown[];
        [k: string]: unknown;
      }[],
      allowedSet: Set<string>,
      allowAll: boolean,
    ): typeof items => {
      return items
        .filter((item) => {
          const roles = item.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin"))
            return isAdminUser(user);
          if (Array.isArray(roles) && roles.includes("PKH"))
            return user?.tenNgan === "P.KH";
          if (item.maBM != null && item.maBM !== "")
            return allowAll || allowedSet.has(item.maBM);
          return true;
        })
        .map((item) => {
          if (item.children && Array.isArray(item.children)) {
            const filteredChildren = filterByMaBM(
              item.children as {
                key?: string;
                maBM?: string;
                children?: unknown[];
                [k: string]: unknown;
              }[],
              allowedSet,
              allowAll,
            );
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (
            item.children &&
            Array.isArray(item.children) &&
            item.children.length === 0
          )
            return false;
          return true;
        });
    },
    [user],
  );

  const filteredMenu = useMemo(() => {
    if (!user) return [];
    const isAdmin = isAdminUser(user);
    const showAll = isAdmin || menuPermissions === null;
    const mkSet = (forms: string[]) =>
      showAll ? new Set<string>(["*"]) : new Set<string>(forms);

    // vung 1 = xử lý, vung 2 = phê duyệt, vung 3 = chỉ xem
    const vungSets: Record<number, Set<string>> = {
      1: mkSet(menuPermissions?.processingForms ?? []),
      2: mkSet(menuPermissions?.approvingForms ?? []),
      3: mkSet(menuPermissions?.viewingForms ?? []),
      4: mkSet(menuPermissions?.chotPhieuForms ?? []),
    };

    type Item = {
      key?: string;
      vung?: number;
      maBM?: string;
      children?: unknown[];
      [k: string]: unknown;
    };

    const filterMenuItems = (items: Item[]): Item[] => {
      return items
        .filter((item) => {
          const roles = item.roles as string[] | undefined;
          if (Array.isArray(roles) && roles.includes("admin")) return isAdmin;
          if (Array.isArray(roles) && roles.includes("PKH"))
            return user?.tenNgan === "P.KH";
          return true;
        })
        .map((item) => {
          if (item.children && Array.isArray(item.children)) {
            const vung = item.vung as number | undefined;
            const set = vung != null ? vungSets[vung] : undefined;
            const filteredChildren =
              set != null
                ? filterByMaBM(item.children as Item[], set, set.has("*"))
                : filterMenuItems(item.children as Item[]);
            return { ...item, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (
            item.children &&
            Array.isArray(item.children) &&
            item.children.length === 0
          )
            return false;
          return true;
        });
    };

    const filtered = filterMenuItems(
      menuConfig as {
        key?: string;
        vung?: number;
        maBM?: string;
        children?: unknown[];
        [k: string]: unknown;
      }[],
    );

    // Xóa custom props (maBM, roles) để tránh React warning khi antd spread xuống DOM
    const stripCustomProps = (items: typeof filtered): typeof filtered =>
      items?.map((item) => {
        const { children, ...rest } = item as Record<string, unknown>;
        const clean = { ...rest } as Record<string, unknown>;
        delete clean.maBM;
        delete clean.roles;
        return {
          ...clean,
          ...(children
            ? { children: stripCustomProps(children as typeof filtered) }
            : {}),
        };
      });

    return stripCustomProps(filtered) as React.ComponentProps<
      typeof Menu
    >["items"];
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
