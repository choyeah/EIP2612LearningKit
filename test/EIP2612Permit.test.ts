// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { EIP2612PermitToken, Vault } from "../typechain-types";

describe("EIP2612PermitToken 테스트", () => {
  let token: EIP2612PermitToken, tokenAddress: string;
  let vault: Vault, vaultAddress: string;
  let owner: Signer, ownerAddress: string;
  let addr1: Signer, addr1Address: string;

  const supply = ethers.parseUnits("10000", 18);
  const amount = ethers.parseUnits("100", 18);

  beforeEach("컨트랙트 배포 및 공통 변수 셋팅", async function () {
    [owner, addr1] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    addr1Address = await addr1.getAddress();

    const Token = await ethers.getContractFactory("EIP2612PermitToken");
    token = await Token.deploy("MyToken", "MTK", supply);
    tokenAddress = await token.getAddress();

    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(tokenAddress);
    vaultAddress = await vault.getAddress();
  });

  describe("vault.depositeWithPermit() 테스트", () => {
    it("허가(Permit)를 통한 토큰 예치 성공 테스트", async function () {
      try {
        const deadline = Math.floor(Date.now() / 1000) + 60 * 60; // 1시간 후 만료

        const { r, s, v } = await getPermitSignature(
          owner,
          token,
          vaultAddress,
          amount,
          deadline
        );

        await vault.depositeWithPermit(amount, deadline, v, r, s);

        expect(await token.balanceOf(vaultAddress)).to.eq(amount);
        expect(await token.balanceOf(owner.getAddress())).to.eq(
          supply - amount
        );
      } catch (error) {
        console.error("Error catched:", error);
      }
    });

    it("만료된 허가로 인한 토큰 예치 실패 테스트", async () => {
      try {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        const deadline = block!.timestamp + 20; // 현재 블록의 타임스탬프에 20초를 더하여 '데드라인'(유효기간 만료 시점)을 설정

        const { v, r, s } = await getPermitSignature(
          owner,
          token,
          vaultAddress,
          amount,
          deadline
        );

        // 다음 블록이 채굴될 때 그 타임스탬프가 deadline 시점과 동일하게 설정
        await ethers.provider.send("evm_setNextBlockTimestamp", [deadline]);
        await ethers.provider.send("evm_mine"); // 새로운 블록을 채굴하도록 EVM에 명령

        await expect(
          vault.depositeWithPermit(amount, deadline, v, r, s)
        ).to.be.revertedWith("PERMIT_DEADLINE_EXPIRED");
        expect(await token.balanceOf(vaultAddress)).to.eq(0);
        expect(await token.balanceOf(ownerAddress)).to.eq(supply);
      } catch (error) {
        console.error("Error catched:", error);
      }
    });

    it("잘못된 서명을 사용한 허가로 인해 예치가 실패하는지 테스트", async () => {
      try {
        const deadline = Math.floor(Date.now() / 1000) + 60 * 60;

        const { v, r, s } = await getPermitSignature(
          addr1, // 토큰 소유자가 아닌 계정으로 서명
          token,
          vaultAddress,
          amount,
          deadline
        );

        await expect(
          vault.depositeWithPermit(amount, deadline, v, r, s)
        ).to.be.revertedWith("INVALID_SIGNER");
        expect(await token.balanceOf(vaultAddress)).to.eq(0);
        expect(await token.balanceOf(ownerAddress)).to.eq(supply);
      } catch (error) {
        console.error("Error catched:", error);
      }
    });
  });
});

async function getPermitSignature(
  signer: Signer,
  token: EIP2612PermitToken,
  spender: string,
  value: bigint,
  deadline: number
) {
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  const version = "1";
  const owner = await signer.getAddress();
  const [nonce, name] = await Promise.all([
    token.nonces(await signer.getAddress()),
    token.name(),
  ]);

  const domain = {
    chainId,
    name,
    version,
    verifyingContract: await token.getAddress(),
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };

  const sig = await signer.signTypedData(domain, types, message);
  return ethers.Signature.from(sig);
}

/**
 * 참고용 코드 - 시그니처 스플릿 함수
 * 목적: 이더리움 서명(Ethereum signature)을 R, S, V 구성 요소로 분할.
 *
 * 개요:
 * - 이더리움 서명은 일반적으로 '0x'로 시작하는 130자리의 16진수 문자열.
 * - 이 함수는 서명을 R, S, V 세 부분으로 나누어 각각을 반환.
 *
 * 예시:
 * const signature = "0x1234..."; // 서명 예시
 * const { r, s, v } = splitSignatureToRSV(signature);
 */

// 참고용 코드
/*
function splitSignatureToRSV(signature: string) {
  const newSignature = signature.slice(2);
  const r = "0x" + newSignature.slice(0, 64);
  const s = "0x" + newSignature.slice(64, 128);
  const v = parseInt(newSignature.slice(128, 130), 16);
  return { r, s, v };
}
*/
