// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Vault {
    ERC20Permit token;
    mapping(address => uint) public balanceOfToken;

    constructor(address token_) {
        token = ERC20Permit(token_);
    }

    function depositToken(uint amount) external {
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (success) balanceOfToken[msg.sender] += amount;
    }

    function depositeWithPermit(
        uint amount,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        token.permit(msg.sender, address(this), amount, deadline, v, r, s);
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (success) balanceOfToken[msg.sender] += amount;
    }
}
