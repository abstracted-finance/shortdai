import { ethers } from "ethers";
import { Box, Typography, makeStyles, createStyles } from "@material-ui/core";
import useCdps from "../containers/use-cdps";
import { CdpSummary } from "./cdp-summary";

import { useDesktop } from "./hooks";
import usePrices from "../containers/use-prices";
import { useState } from "react";
import { prettyStringDecimals } from "./utils";

const TabManage = () => {
  const classes = useStyles();
  const isDesktop = useDesktop();
  const { cdps, isGettingCdps } = useCdps.useContainer();
  const { prices } = usePrices.useContainer();

  return (
    <>
      <Typography variant="h5">
        <Box
          p={1}
          mb={isDesktop ? 4 : 2}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {prices === null
            ? "..."
            : prettyStringDecimals(
                ethers.utils.formatUnits(
                  ethers.utils
                    .parseUnits("1", 36)
                    .div(
                      ethers.utils.parseUnits(
                        prettyStringDecimals(prices.usdcDaiRatio, 8),
                        18
                      )
                    ),
                  18
                ),
                4
              )}{" "}
          <img src="/usdc.png" className={classes.tokenIcon} />
          <Box mx={1.5}>=</Box>
          1
          <img src="/dai.png" className={classes.tokenIcon} />{" "}
        </Box>
      </Typography>

      <Box minHeight={160}>
        {!isGettingCdps && !cdps.length && (
          <Box
            display="flex"
            height={160}
            justifyContent="center"
            alignItems="center"
          >
            <Typography variant="h6">No positions found.</Typography>
          </Box>
        )}
        {cdps.map((cdp) => (
          <CdpSummary key={cdp.cdpId} cdp={cdp} />
        ))}
      </Box>
    </>
  );
};

export default TabManage;

export const useStyles = makeStyles((theme) =>
  createStyles({
    leverage: {
      position: "relative",
      "&:after": {
        position: "absolute",
        content: "'x'",
        top: 0,
        right: -20,
        height: "100%",
        fontSize: 24,
        color: "grey",
        display: "flex",
        alignItems: "center",
      },
    },
    warningPaper: {
      border: `1px solid ${theme.palette.warning.main}`,
    },
    errorPaper: {
      border: `1px solid ${theme.palette.error.main}`,
    },
    successPaper: {
      border: `1px solid ${theme.palette.success.main}`,
    },
    tokenIcon: {
      width: 20,
      height: 20,
      marginLeft: 4,
    },
  })
);
