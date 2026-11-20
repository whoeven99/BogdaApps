import React, { useState } from "react";
import Link from "next/link"; // 如果不是 Next.js，可以去掉 Link，改用 <a>
import { Pagination } from "@shopify/polaris";
import styles from "./styles.module.css";

const menuItems = [
  { name: "首页", path: "/" },
  { name: "关于我们", path: "/about" },
  { name: "服务", path: "/services" },
  { name: "联系", path: "/contact" },
];

interface SideMenuProps {
  menuItems: { title: string; id: string }[];
  hasNext: boolean;
  hasPrevious: boolean;
  onClick: (id: string) => void;
  activeItem: string;
  isMobile: boolean;
}

const SideMenu: React.FC<SideMenuProps> = ({
  menuItems,
  hasNext,
  hasPrevious,
  onClick,
  activeItem = menuItems[0]?.id,
  isMobile = false,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: isMobile ? "100%" : 200,
        backgroundColor: "#f0f0f0",
        height: "calc( 100vh - 76px )",
        transition: "width 0.2s",
        zIndex: 1000,
      }}
    >
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={`${styles.Ciwi_side_menu_item} ${
              activeItem === item.id ? styles.Ciwi_side_menu_item_active : ""
            }`}
            onClick={() => onClick(item.id)}
          >
            <div className={styles.Ciwi_side_menu_item_text}>{item.title}</div>
          </li>
        ))}
      </ul>
      {/* <div style={{ padding: "12px 24px", alignSelf: "center" }}>
        <Pagination
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onNext={() => {}}
          onPrevious={() => {}}
        />
      </div> */}
    </div>
  );
};

export default SideMenu;
