require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-deploy');
require('hardhat-deploy-ethers');
require('hardhat-contract-sizer');
// require('hardhat-gas-reporter');
require('@float-capital/solidity-coverage');
require('dotenv').config();

module.exports = {
  networks: {
    hardhat: {
			forking: {
				url: process.env.ALCHEMY_URL,
        enabled: false,
        blockNumber: 15395600
			},
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: true
    },
    mainnet: {
      url: process.env.ALCHEMY_URL,
      accounts: [process.env.ADMIN_PRIVATE_KEY],
      gasPrice: 50000000000,
      gas: 8888888
    },
    arbitrum: {
      url: process.env.ALCHEMY_URL_ARBITRUM,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.ADMIN_2_PRIVATE_KEY],
      gas: 77777777,
      //gasPrice: 1000000000
    },
    optimism: {
      url: process.env.ALCHEMY_URL_OPTIMISM,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      // gasPrice: 44000000000, // 44 gwei
      gas: 15000000,
    },
    polygon: {
      url: process.env.ALCHEMY_URL_POLYGON,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      // gasPrice: 44000000000 // 44 gwei,
      gas: 8888888
    },
    kovan: {
      url: process.env.ALCHEMY_URL_KOVAN,
      accounts: [process.env.ADMIN_PRIVATE_KEY, process.env.ADMIN_2_PRIVATE_KEY],
      //gasPrice: 1100000000,
      gas: 7777777
    },
    goerli: {
      url: process.env.ALCHEMY_URL_GOERLI,
      accounts: [process.env.ADMIN_PRIVATE_KEY, process.env.ADMIN_2_PRIVATE_KEY],
      //gasPrice: 1100000000,
      gas: 7777777
    },
    rinkeby: {
      url: process.env.ALCHEMY_URL_RINKEBY,
      accounts: [process.env.ADMIN_PRIVATE_KEY, process.env.ADMIN_2_PRIVATE_KEY],
      // gasPrice: 1100000000,
      // gas: 7777777
    },
    arbitrum_rinkeby: {
      url: process.env.ALCHEMY_URL_RINKEBY,
      accounts: [process.env.ADMIN_PRIVATE_KEY, process.env.ADMIN_2_PRIVATE_KEY],
      // gasPrice: 1100000000,
      // gas: 7777777
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      }
    }
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
  }
}
