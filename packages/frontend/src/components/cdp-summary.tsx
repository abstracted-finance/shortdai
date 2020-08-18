import React from "react";
import { Paper, makeStyles, Box } from "@material-ui/core";

export const CdpSummary: React.FC = () => {
  const classes = useStyles();

  return (
    <Paper className={classes.root} variant="outlined">
      <Box p={4}>lol</Box>
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
