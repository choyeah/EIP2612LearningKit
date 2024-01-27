import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    local: {
      url: "http://127.0.0.1:8545/",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 31337,
    },
    holesky: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY!],
    },
    mumbai: {
      url: process.env.RPC_URL_MUMBAI,
      accounts: [process.env.PRIVATE_KEY!, process.env.TEST_PRIVATE_KEY!],
    },
  },
  solidity: "0.8.20",
};

export default config;
