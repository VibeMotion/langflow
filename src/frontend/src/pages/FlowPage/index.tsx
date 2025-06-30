import { SidebarProvider } from "@/components/ui/sidebar";
import { useGetFlow } from "@/controllers/API/queries/flows/use-get-flow";
import { useGetTypes } from "@/controllers/API/queries/flows/use-get-types";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import useSaveFlow from "@/hooks/flows/use-save-flow";
import { useIsMobile } from "@/hooks/use-mobile";
import { SaveChangesModal } from "@/modals/saveChangesModal";
import useAlertStore from "@/stores/alertStore";
import { useTypesStore } from "@/stores/typesStore";
import { customStringify } from "@/utils/reactflowUtils";
import { useEffect, useState } from "react";
import { useBlocker, useParams } from "react-router-dom";
import useFlowStore from "../../stores/flowStore";
import useFlowsManagerStore from "../../stores/flowsManagerStore";
import Page from "./components/PageComponent";
import { FlowSidebarComponent } from "./components/flowSidebarComponent";
import { Button } from "@/components/ui/button";
import { useUtilityStore } from "@/stores/utilityStore";
import { PlayIcon, StopIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import ExportButton from "./components/PageComponent/ExportButton";
import { useSearchParams } from "react-router-dom";

export default function FlowPage({ view }: { view?: boolean }): JSX.Element {
  const [searchParams] = useSearchParams();
  const types = useTypesStore((state) => state.types);

  useGetTypes({
    enabled: Object.keys(types).length <= 0,
  });

  const setCurrentFlow = useFlowsManagerStore((state) => state.setCurrentFlow);
  const currentFlow = useFlowStore((state) => state.currentFlow);
  const currentSavedFlow = useFlowsManagerStore((state) => state.currentFlow);
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const [isLoading, setIsLoading] = useState(false);

  const changesNotSaved =
    customStringify(currentFlow) !== customStringify(currentSavedFlow) &&
    (currentFlow?.data?.nodes?.length ?? 0) > 0;

  const isBuilding = useFlowStore((state) => state.isBuilding);
  const blocker = useBlocker(changesNotSaved || isBuilding);

  const setOnFlowPage = useFlowStore((state) => state.setOnFlowPage);
  const { id } = useParams();
  const navigate = useCustomNavigate();
  const saveFlow = useSaveFlow();

  const flows = useFlowsManagerStore((state) => state.flows);
  const currentFlowId = useFlowsManagerStore((state) => state.currentFlowId);

  const updatedAt = currentSavedFlow?.updated_at;
  const autoSaving = useFlowsManagerStore((state) => state.autoSaving);
  const stopBuilding = useFlowStore((state) => state.stopBuilding);
  const buildFlow = useFlowStore((state) => state.buildFlow);

  const [sessionId, setSessionId] = useState<string>(currentFlowId);

  const { mutateAsync: getFlow } = useGetFlow();

  const [flowNotFound, setFlowNotFound] = useState(false);

  const handleSave = () => {
    let saving = true;
    let proceed = false;
    setTimeout(() => {
      saving = false;
      if (proceed) {
        blocker.proceed && blocker.proceed();
        setSuccessData({
          title: "Flow saved successfully!",
        });
      }
    }, 1200);
    saveFlow().then(() => {
      if (!autoSaving || saving === false) {
        blocker.proceed && blocker.proceed();
        setSuccessData({
          title: "Flow saved successfully!",
        });
      }
      proceed = true;
    });
  };

  const handleExit = () => {
    if (isBuilding) {
      // Do nothing, let the blocker handle it
    } else if (changesNotSaved) {
      if (blocker.proceed) blocker.proceed();
    } else {
      navigate("/all");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (changesNotSaved || isBuilding) {
        event.preventDefault();
        event.returnValue = ""; // Required for Chrome
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [changesNotSaved, isBuilding]);

  // Set flow tab id
  useEffect(() => {
    const awaitgetTypes = async () => {
      if (flows && currentFlowId === "") {
        const isAnExistingFlow = flows.find((flow) => flow.id === id);

        if (!isAnExistingFlow) {
          setFlowNotFound(true);
          return;
        }

        const isAnExistingFlowId = isAnExistingFlow.id;

        await getFlowToAddToCanvas(isAnExistingFlowId);
      }
    };
    awaitgetTypes();
  }, [id, flows, currentFlowId]);

  useEffect(() => {
    setOnFlowPage(true);

    return () => {
      setOnFlowPage(false);
      console.log("unmounting");
      setCurrentFlow(undefined);
    };
  }, [id]);

  useEffect(() => {
    if (
      blocker.state === "blocked" &&
      autoSaving &&
      changesNotSaved &&
      !isBuilding
    ) {
      handleSave();
    }
  }, [blocker.state, isBuilding]);

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (isBuilding) {
        stopBuilding();
      } else if (!changesNotSaved) {
        blocker.proceed && blocker.proceed();
      }
    }
  }, [blocker.state, isBuilding]);

  const getFlowToAddToCanvas = async (id: string) => {
    const flow = await getFlow({ id: id });
    setCurrentFlow(flow);
  };

  const isMobile = useIsMobile();

  if (flowNotFound) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">
            Flow Not Found
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            The flow you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flow-page-positioning">
        {currentFlow && (
          <div className="flex h-full overflow-hidden">
            <SidebarProvider width="17.5rem" defaultOpen={!isMobile}>
              {!view && <FlowSidebarComponent isLoading={isLoading} />}
              <main className="flex w-full overflow-hidden">
                <div className="relative h-full w-full">
                  {searchParams.get("isAdmin") === "true" && (
                    <ExportButton includeApiKeys={true} />
                  )}
                  <Button
                    className="absolute right-[72px] top-[16px] z-10"
                    onClick={async () => {
                      if (isBuilding) {
                        stopBuilding();
                      } else {
                        await buildFlow({
                          silent: true,
                          session: sessionId,
                        }).catch((err) => {
                          console.error(err);
                        });
                      }
                    }}
                    variant={isBuilding ? "destructive" : "primary"}
                  >
                    {isBuilding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Stop Replay
                      </>
                    ) : (
                      <>
                        <PlayIcon className="mr-2 h-4 w-4" />
                        Replay
                      </>
                    )}
                  </Button>
                  <Page setIsLoading={setIsLoading} />
                </div>
              </main>
            </SidebarProvider>
          </div>
        )}
      </div>
      {blocker.state === "blocked" && (
        <>
          {!isBuilding && currentSavedFlow && (
            <SaveChangesModal
              onSave={handleSave}
              onCancel={() => blocker.reset?.()}
              onProceed={handleExit}
              flowName={currentSavedFlow.name}
              lastSaved={
                updatedAt
                  ? new Date(updatedAt).toLocaleString("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      month: "numeric",
                      day: "numeric",
                    })
                  : undefined
              }
              autoSave={autoSaving}
            />
          )}
        </>
      )}
    </>
  );
}
