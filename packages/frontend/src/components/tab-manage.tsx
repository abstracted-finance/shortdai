import {
  Box,
  Button,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@material-ui/core";
import { ethers } from "ethers";
import useCdps from "../containers/use-cdps";
import useCloseShort from "../containers/use-close-short";
import useProxy from "../containers/use-proxy";
import useSelectedCdp from "../containers/use-selected-cdp";
import useShortDaiState, {
  ShortDaiState,
} from "../containers/use-shortdai-state";
import useUsdc from "../containers/use-usdc";
import { prettyStringDecimals } from "./utils";

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

  return (
    <>
      <Box height={1} />

      <Box mb={4}>
        <FormControl style={{ width: "100%" }}>
          <Select value={cdpId} onChange={(e: any) => setCdpId(e.target.value)}>
            {cdps.map((x) => {
              return <MenuItem value={x.cdpId}>{x.cdpId}</MenuItem>;
            })}
          </Select>
        </FormControl>
      </Box>
      <Paper variant="outlined">
        <Box p={2.5}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6" component="p">
              <span style={{ color: "#fff" }}>Supplied (USDC)</span>
              <br />
              {isGettingCdpStats ? "..." : null}
              {!isGettingCdpStats
                ? prettyStringDecimals(
                    ethers.utils.formatUnits(cdpStats.supplied18, 18)
                  )
                : "..."}
            </Typography>

            <Typography variant="h6" component="p">
              <span style={{ color: "#fff" }}>Collateralization Ratio</span>
              <br />
              {isGettingCdpStats ? "..." : null}
              {!isGettingCdpStats ? (cdpStats.cr || 0).toString() + "%" : "..."}
            </Typography>

            <Typography variant="h6" component="p">
              <span style={{ color: "#fff" }}>Borrowed (DAI)</span>
              <br />
              {isGettingCdpStats ? "..." : null}
              {!isGettingCdpStats
                ? prettyStringDecimals(
                    ethers.utils.formatUnits(cdpStats.borrowed18, 18)
                  )
                : "..."}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box height={16} />

      <Box mt={2} display="flex">
        <Button
          variant="contained"
          color="primary"
          disabled={
            shortDaiState === ShortDaiState.PENDING ||
            shortDaiState === ShortDaiState.NOT_CONNECTED ||
            isApprovingUsdc ||
            isCreatingProxy ||
            isClosingShort ||
            !validCdpId
          }
          size="large"
          fullWidth
          onClick={() => {
            if (shortDaiState === ShortDaiState.SETUP_PROXY) {
              createProxy();
              return;
            }

            if (shortDaiState === ShortDaiState.APPROVE_USDC) {
              approveUsdc();
              return;
            }

            if (shortDaiState === ShortDaiState.READY) {
              // Close short dai
              closeShortDaiPosition(cdpId).then(() => getCdps());
              return;
            }
          }}
        >
          {shortDaiState === ShortDaiState.PENDING ? "INTIALIZING" : null}
          {shortDaiState === ShortDaiState.NOT_CONNECTED
            ? "CONNECT WALLET TO CONTINUE"
            : null}
          {shortDaiState === ShortDaiState.SETUP_PROXY ? "SETUP" : null}
          {shortDaiState === ShortDaiState.APPROVE_USDC ? "APPROVE" : null}
          {shortDaiState === ShortDaiState.READY ? "CLOSE" : null}
        </Button>
      </Box>
    </>
  );
};

export default TabManage;
