import { track } from "@/customization/utils/analytics";
import useFlowStore from "@/stores/flowStore";
import { useDarkStore } from "@/stores/darkStore";
import { downloadFlow, removeApiKeys } from "@/utils/reactflowUtils";
import IconComponent from "@/components/common/genericIconComponent";
import { Button } from "@/components/ui/button";
import useAlertStore from "@/stores/alertStore";
import { API_WARNING_NOTICE_ALERT } from "@/constants/alerts_constants";

export default function ExportButton({ includeApiKeys = false }: { includeApiKeys?: boolean }) {
  const currentFlow = useFlowStore((state) => state.currentFlow);
  const version = useDarkStore((state) => state.version);
  const setNoticeData = useAlertStore((state) => state.setNoticeData);

  const handleExport = () => {
    if (!currentFlow) return;

    const flowData = {
      id: currentFlow.id,
      data: currentFlow.data!,
      description: currentFlow.description || "",
      name: currentFlow.name || "",
      last_tested_version: version,
      endpoint_name: currentFlow.endpoint_name,
      is_component: false,
      tags: currentFlow.tags,
    };

    if (includeApiKeys) {
      downloadFlow(
        flowData,
        flowData.name,
        flowData.description
      );
      setNoticeData({
        title: API_WARNING_NOTICE_ALERT,
      });
    } else {
      downloadFlow(
        removeApiKeys(flowData),
        flowData.name,
        flowData.description
      );
    }

    track("Flow Exported", { flowId: currentFlow.id });
  };

  return (
    <Button
      variant="primary"
      size="icon"
      className="absolute left-[160px] top-[16px] z-10 p-2"
      onClick={handleExport}
      aria-label="Export Flow"
    >
      <IconComponent
        name="Download"
        className="h-5 w-5 text-primary"
        aria-hidden="true"
      />
      Export
    </Button>
  );
}
