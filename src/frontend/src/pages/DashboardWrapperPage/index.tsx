import AppHeader from "@/components/core/appHeaderComponent";
import useTheme from "@/customization/hooks/use-custom-theme";
import { Outlet } from "react-router-dom";

export function DashboardWrapperPage() {
  useTheme();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <div className="hidden">
        <AppHeader />
      </div>
      <div className="flex w-full flex-1 flex-row overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
