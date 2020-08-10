import chalk from "chalk";

export const warn = (...args) => {
  console.log(chalk.yellowBright(...args));
};
