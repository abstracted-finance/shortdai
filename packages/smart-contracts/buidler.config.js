// Go to https://buidler.dev/config/ to learn more
module.exports = {
  solc: {
    version: "0.6.12",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 240000,
    },
  },
  defaultNetwork: "localhost",
};
