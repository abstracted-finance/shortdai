import chalk from "chalk";

export const warn = (...args) => {
  console.log(chalk.yellowBright(...args));
};

export const debug = (...args) => {
  console.log(chalk.magenta(...args));
};

export const info = (...args) => {
  console.log(chalk.blueBright(...args));
};

export const critical = (...args) => {
  console.log(chalk.redBright(...args));
};

export const success = (...args) => {
  console.log(chalk.greenBright(...args));
};

export const notset = (...args) => {
  console.log(chalk.grey(...args));
};
