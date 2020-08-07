const getContract = ({ network, name }) => {
  const { abi, address } = require(`./deployed/${network}/${name}.json`);

  return {
    abi,
    address,
  };
};

module.exports = {
  getContract,
};
