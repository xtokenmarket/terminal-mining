// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.7.6;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";

import "../interfaces/ISingleAssetPoolDeployer.sol";

contract SingleAssetPoolProxy is TransparentUpgradeableProxy {
    /**
     * @dev Storage slot with the SingleAssetPool contract address.
     * This is the keccak-256 hash of "eip1967.proxy.singleAssetPoolDeployer" subtracted by 1,
     * and is validated in the constructor.
     */
    bytes32 private constant _DEPLOYER_SLOT =
        0xc7338f2c9083697b912569beb93a467a4ffb607d556f6fbfdb2a69c46f40a045;

    constructor(
        address _logic,
        address _proxyAdmin,
        address __poolDeployer
    ) TransparentUpgradeableProxy(_logic, _proxyAdmin, "") {
        assert(
            _DEPLOYER_SLOT ==
                bytes32(
                    uint256(
                        keccak256("eip1967.proxy.singleAssetPoolDeployer")
                    ) - 1
                )
        );
        _setSingleAssetPoolDeployer(__poolDeployer);
    }

    /**
     * @dev Returns the address of the single asset pool deployer.
     */
    function _poolDeployer()
        internal
        view
        virtual
        returns (address poolDeployer)
    {
        bytes32 slot = _DEPLOYER_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            poolDeployer := sload(slot)
        }
    }

    /**
     * @dev Stores a new address in the pool deployer slot.
     */
    function _setSingleAssetPoolDeployer(address poolDeployer) private {
        bytes32 slot = _DEPLOYER_SLOT;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, poolDeployer)
        }
    }

    function upgradeTo(address _implementation) external override ifAdmin {
        require(
            ISingleAssetPoolDeployer(_poolDeployer())
                .singleAssetPoolImplementation() == _implementation,
            "Can only upgrade to latest SingleAssetPool implementation"
        );
        _upgradeTo(_implementation);
    }

    function upgradeToAndCall(address _implementation, bytes calldata data)
        external
        payable
        override
        ifAdmin
    {
        require(
            ISingleAssetPoolDeployer(_poolDeployer())
                .singleAssetPoolImplementation() == _implementation,
            "Can only upgrade to latest SingleAssetPool implementation"
        );
        _upgradeTo(_implementation);
        Address.functionDelegateCall(_implementation, data);
    }
}
