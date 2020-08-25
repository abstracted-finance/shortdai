import { Box, Typography } from "@material-ui/core";
import useCdps from "../containers/use-cdps";
import { CdpSummary } from "./cdp-summary";

const TabManage = () => {
  const { cdps, isGettingCdps } = useCdps.useContainer();

  return (
    <Box minHeight={160}>
      {!isGettingCdps && !cdps.length && (
        <Box
          display="flex"
          height={160}
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="h6">no positions found.</Typography>
        </Box>
      )}
      {cdps.map((cdp) => (
        <CdpSummary key={cdp.cdpId} cdp={cdp} />
      ))}
    </Box>
  );
};

export default TabManage;
