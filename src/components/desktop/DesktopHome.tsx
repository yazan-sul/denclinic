"use client";

import React, { useState } from "react";
import Sidebar from "@/components/bars/sidebar/SideBar";
type Props = {
  children?: React.ReactNode;
};

const DesktopHome: React.FC<Props> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <div className="flex h-screen overflow-hidden">
      <main className="flex-1 bg-gray-100 dark:bg-gray-900 transition-all duration-300">
        <div className="p-6">{children}</div>
      </main>
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} isMobile={false} />
    </div>
  );
};

export default DesktopHome;
