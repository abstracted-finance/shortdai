import { Box } from "@material-ui/core";
import useCdps from "../containers/use-cdps";
import useCloseShort from "../containers/use-close-short";
import useProxy from "../containers/use-proxy";
import useSelectedCdp from "../containers/use-selected-cdp";
import useShortDaiState from "../containers/use-shortdai-state";
import useUsdc from "../containers/use-usdc";
import { CdpSummary } from "./cdp-summary";

const TabManage = () => {
  const {
    closeShortDaiPosition,
    isClosingShort,
  } = useCloseShort.useContainer();
  const { isCreatingProxy, createProxy } = useProxy.useContainer();
  const { isApprovingUsdc, approveUsdc } = useUsdc.useContainer();
  const { shortDaiState } = useShortDaiState.useContainer();
  const { getCdps, isGettingCdps, cdps } = useCdps.useContainer();
  const {
    cdpId,
    isGettingCdpStats,
    cdpStats,
    setCdpId,
  } = useSelectedCdp.useContainer();

  const validCdpId = cdpId !== 0;

  console.log(cdps);

  return (
    <Box minHeight={320}>
      {cdps.map((cdp) => (
        <CdpSummary key={cdp.cdpId} cdp={cdp} />
      ))}
    </Box>
  );
};

export default TabManage;
