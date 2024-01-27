// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract EIP2612PermitToken is ERC20, EIP712 {
    using ECDSA for bytes32;

    // EIP-2612의 nonce를 저장하기 위한 매핑
    mapping(address => uint256) private _nonces;

    // EIP-712 도메인 구분자를 위한 타입해시 변수
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    constructor(
        string memory name,
        string memory symbol,
        uint256 _supply
    ) ERC20(name, symbol) EIP712(name, "1") {
        _mint(msg.sender, _supply);
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");

        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _nonces[owner]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == owner, "INVALID_SIGNER");

        _approve(owner, spender, value);
    }

    function nonces(address owner) external view returns (uint) {
        return _nonces[owner];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
