import { createStyles, makeStyles } from "@material-ui/core";

export const useStyles = makeStyles((theme) =>
  createStyles({
    "@global": {
      body: {
        backgroundColor: "rgb(44, 47, 54)",
        backgroundImage:
          "radial-gradient(50% 50% at 50% 50%, rgba(33, 114, 229, 0.1) 0%, rgba(33, 36, 41, 0) 100%)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `0 -30vh`,
      },
    },
    pickle: {
      position: "absolute",
      maxWidth: 300,
      width: "50%",
      top: 0,
      left: "50%",
      zIndex: -1,
    },
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
    tabButton: {
      fontSize: "1.75em",
      color: "#888D9B",
    },
    tabButtonActive: {
      fontSize: "1.75em",
      color: "#FFFFFF",
    },
    buttonCircularProgress: {
      marginLeft: "5px",
    },
    bottomDrawer: {
      transition: "transform 300ms ease-in-out",
      width: "85%",
      position: "relative",
      margin: "0 auto",
      transform: "translateY(-124px)",
      height: "100px",
      paddingTop: 24,
      backgroundColor: "transparent",
    },
    bottomDrawerShow: {
      transform: "translateY(-24px)",
    },
    buttonError: {
      backgroundColor: theme.palette.error.main,
    },
  })
);
