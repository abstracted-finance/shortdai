export const prettyStringDecimals = (s, n = 2) => {
  if (s.split(".").length < 2) {
    return `${s}.${"0".repeat(n)}`;
  }

  const i = s.split(".")[0];
  const j = s.split(".")[1];
  return `${i}.${j.slice(0, n)}`;
};
