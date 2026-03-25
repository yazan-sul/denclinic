"use client";

import { useIsMobile } from "../hook/versions";
import MobileHome from "./mobile/MobileHome";
import DesktopHome from "./desktop/DesktopHome";

const HomeComponent = () => {
  const isMobile = useIsMobile();

  return isMobile ? <MobileHome /> : <DesktopHome />;
};

export default HomeComponent;
