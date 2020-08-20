import { Box } from "@material-ui/core";
import useCdps from "../containers/use-cdps";
import { CdpSummary } from "./cdp-summary";

const TabManage = () => {
  const { cdps } = useCdps.useContainer();

  return (
    <Box minHeight={320}>
      {cdps.map((cdp) => (
        <CdpSummary key={cdp.cdpId} cdp={cdp} />
      ))}
    </Box>
  );
};

export default TabManage;
