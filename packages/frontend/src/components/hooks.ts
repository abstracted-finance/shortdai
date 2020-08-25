import { useMediaQuery } from "@material-ui/core";

export function useDesktop() {
  return useMediaQuery("(min-width:600px)");
}
