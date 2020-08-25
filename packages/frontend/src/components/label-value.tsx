import { Box, Typography, useTheme, BoxProps } from "@material-ui/core";

export interface LabelValueProps extends BoxProps {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
  icon?: "dai" | "usdc";
}

const LabelValue: React.FC<LabelValueProps> = ({
  label,
  children,
  inline,
  icon,
  textAlign = "center",
  ...props
}) => {
  const theme = useTheme();
  return (
    <Box textAlign={textAlign} {...props}>
      {inline ? (
        <Typography variant="h6">
          {label}:{" "}
          <Box color={theme.palette.text.primary} component="span">
            {children}
          </Box>
        </Typography>
      ) : (
        <>
          <Typography variant="h6">{label}</Typography>
          <Typography component="span">
            <Box
              height={24}
              display="flex"
              justifyContent={
                textAlign === "left"
                  ? "flex-start"
                  : textAlign === "right"
                  ? "flex-end"
                  : "center"
              }
              alignItems="center"
            >
              {children}
              {icon && (
                <>
                  <Box width={4} />
                  <img src={`/${icon}.png`} width={18} />
                </>
              )}
            </Box>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default LabelValue;
