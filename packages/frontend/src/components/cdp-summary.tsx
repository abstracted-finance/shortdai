import React from "react";
import { Paper, makeStyles, Box, Typography } from "@material-ui/core";
import { Cdp } from "../containers/use-cdps";

interface CdpSummaryProps {
  cdp: Cdp;
}

export const CdpSummary: React.FC<CdpSummaryProps> = ({ cdp }) => {
  const classes = useStyles();

  return (
    <Paper className={classes.root} variant="outlined">
      <Box p={4}>
        <Typography>Vault ID: {cdp.cdpId}</Typography>
      </Box>
    </Paper>
  );
};

const useStyles = makeStyles({
  root: {
    "&:not(:last-child)": {
      marginBottom: 16,
    },
  },
});
