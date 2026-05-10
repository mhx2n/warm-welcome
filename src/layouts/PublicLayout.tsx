import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReminderWidget from "@/components/ReminderWidget";
import EventBannerDisplay from "@/components/EventBannerDisplay";
import TelegramFloatingButton from "@/components/TelegramFloatingButton";
import { trackPageVisit } from "@/lib/api";

const PublicLayout = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageVisit(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      <EventBannerDisplay />
      <Outlet />
      <ReminderWidget />
      <TelegramFloatingButton />
      <Footer />
    </>
  );
};

export default PublicLayout;