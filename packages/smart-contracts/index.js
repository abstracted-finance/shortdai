const CONSTANTS = require("./cli/utils/constants");

const getContract = ({ network, name }) => {
  if (!network) {
    const { abi } = require(`${__dirname}/artifacts/${name}.json`);
    return { abi };
  }

  const deployed = require(`${__dirname}/deployed/${network}/deployed.json`);
  const { abi, address } = deployed[name];

  return {
    abi,
    address,
  };
};

module.exports = {
  getContract,
  CONSTANTS,
};
