import { Button, ButtonProps, makeStyles, Box } from "@material-ui/core";
import cn from "classnames";
import React from "react";

const COLORS = {
  metamask: {
    orange: "#f6851b",
  },
};

const useStyles = makeStyles({
  metamaskOutlined: {
    borderColor: COLORS.metamask.orange,
    color: COLORS.metamask.orange,
  },
});

interface CustomButtonProps extends Partial<ButtonProps> {
  name: "metamask";
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  name,
  className,
  ...props
}) => {
  const { variant } = props;
  const classes = useStyles();
  return (
    <Button
      className={cn(className, {
        [classes.metamaskOutlined]:
          name === "metamask" && variant === "outlined",
      })}
      startIcon={<img src="/metamask.svg" width={24} height={24} />}
      {...props}
    />
  );
};
