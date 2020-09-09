import { useMediaQuery } from "@material-ui/core";

export function useMobile() {
  return useMediaQuery("(max-width:600px)");
}
