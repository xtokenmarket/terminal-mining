//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../interfaces/ILMTerminal.sol";

/**
 * Mock revenue controller which reverts on receiving eth
 */
contract MockRevenueController {
    function withdrawFees(address terminal, address token) public {
        ILMTerminal(terminal).withdrawFees(token);
    }

    fallback() external payable {
        require(0 > 1);
    }

    receive() external payable {
        require(0 > 1);
    }
}
