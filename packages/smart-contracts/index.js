const CONSTANTS = require("./cli/utils/constants");

const getContract = ({ network, name }) => {
  if (!network) {
    const { abi } = require(`./artifacts/${name}.json`);
    return { abi };
  }

  const { abi, address } = require(`./deployed/${network}/${name}.json`);
  return {
    abi,
    address,
  };
};

module.exports = {
  getContract,
  CONSTANTS,
};
