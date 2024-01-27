import { ethers } from "hardhat";

async function main() {
  console.log("deploying EIP2612PermitToken contract");
  const token = await ethers.deployContract("EIP2612PermitToken", [
    "MyToken",
    "MTK",
  ]);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`${tokenAddress} is MyEIP712 contract address`);

  console.log("deploying Valut contract");
  const vault = await ethers.deployContract("Vault", [tokenAddress]);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`${vaultAddress} is Vault contract address`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// const EIP712 = await ethers.getContractFactory("MyEIP712");
// const exampleEIP712 = await EIP712.deploy();
// await exampleEIP712.deployed();
