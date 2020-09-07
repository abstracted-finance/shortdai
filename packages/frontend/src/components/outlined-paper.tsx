import { createStyles, makeStyles, Paper, PaperProps } from "@material-ui/core";
import cn from "classnames";
import React from "react";
import { useDesktop } from "./hooks";

interface OutlinedPaperProps extends PaperProps {
  color?: "success" | "warning" | "error";
}

export const OutlinedPaper: React.FC<OutlinedPaperProps> = ({
  className,
  color,
  ...props
}) => {
  const classes = useStyles();
  const isDesktop = useDesktop();

  return (
    <Paper
      className={cn(
        {
          [classes.paddingDesktop]: isDesktop,
          [classes.paddingMobile]: !isDesktop,
          [classes.success]: color === "success",
          [classes.warning]: color === "warning",
          [classes.error]: color === "error",
        },
        className
      )}
      variant="outlined"
      {...props}
    />
  );
};

const useStyles = makeStyles((theme) =>
  createStyles({
    paddingDesktop: {
      padding: 24,
    },
    paddingMobile: {
      padding: 16,
    },
    warning: {
      border: `1px solid ${theme.palette.warning.main}`,
    },
    error: {
      border: `1px solid ${theme.palette.error.main}`,
    },
    success: {
      border: `1px solid ${theme.palette.success.main}`,
    },
  })
);
