"use client";

import React, { useState } from "react";
import Sidebar from "@/components/bars/sidebar/SideBar";
import Navbar from "@/components/bars/navbar/Navbar";

type Props = {
  children?: React.ReactNode;
};

const DesktopHome: React.FC<Props> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 bg-gray-100 dark:bg-gray-900">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
    </div>
  );
};

export default DesktopHome;
