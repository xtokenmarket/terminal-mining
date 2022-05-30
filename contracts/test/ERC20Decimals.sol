//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ERC-20 contract with custom decimals
contract ERC20Decimals is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 _decimals
    ) ERC20(name, symbol) {
        _setupDecimals(_decimals);
        _mint(msg.sender, 10000000000000000000 * 10**uint256(decimals()));
    }
}
