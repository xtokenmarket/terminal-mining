// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./staking/StakingRewards.sol";

/**
 * Staking pool responsible only for single token staking
 */
contract SingleAssetPool is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    StakingRewards
{
    using SafeMath for uint8;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public stakingToken;
    address public manager;
    address private terminal;

    struct StakingDetails {
        address[] rewardTokens;
        address rewardEscrow;
        bool rewardsAreEscrowed;
    }

    // Events
    event ManagerSet(address indexed manager);

    function initialize(
        address _stakingToken,
        address _terminal,
        StakingDetails memory stakingParams
    ) external initializer nonReentrant {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __Pausable_init_unchained();

        stakingToken = IERC20(_stakingToken);

        terminal = _terminal;

        // Set staking state variables
        rewardTokens = stakingParams.rewardTokens; // Liquidity Mining tokens
        rewardEscrow = IRewardEscrow(stakingParams.rewardEscrow); // Address of vesting contract
        rewardsAreEscrowed = stakingParams.rewardsAreEscrowed; // True if rewards are escrowed after unstaking
    }

    /* ========================================================================================= */
    /*                                            User-facing                                    */
    /* ========================================================================================= */

    /**
     *  @dev Stake tokens in the contract
     *  @dev Need to approve tokens to contract before staking
     *  @param amount token amount to stake
     */
    function stake(uint256 amount) external whenNotPaused {
        require(amount > 0, "Need to stake at least one token");

        // transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Stake tokens
        stakeRewards(amount, msg.sender);
    }

    /**
     *  @dev Unstake tokens from contract
     *  @param amount token amount to unstake
     */
    function unstake(uint256 amount) public {
        require(amount > 0, "Need to unstake at least one token");
        require(
            stakedBalanceOf(msg.sender) >= amount,
            "Not enough staked balance"
        );

        // Unstake tokens
        unstakeRewards(amount, msg.sender);

        // Transfer tokens to sender
        stakingToken.safeTransfer(msg.sender, amount);
    }

    /**
     *  @dev Unstake tokens from contract and claim reward
     *  @param amount token amount to unstake
     */
    function unstakeAndClaimReward(uint256 amount) external {
        claimReward();
        unstake(amount);
    }

    // --- Overriden StakingRewards functions ---

    /**
     * Configure the duration of the rewards
     * The rewards are unlocked based on the duration and the reward amount
     * @param _rewardsDuration reward duration in seconds
     */
    function setRewardsDuration(uint256 _rewardsDuration)
        public
        override
        onlyTerminal
    {
        super.setRewardsDuration(_rewardsDuration);
    }

    /**
     * Initialize the rewards with a given reward amount
     * After calling this function, the rewards start accumulating
     * @param rewardAmount reward amount for reward token
     * @param token address of the reward token
     */
    function initializeReward(uint256 rewardAmount, address token)
        public
        override
        onlyTerminal
    {
        super.initializeReward(rewardAmount, token);
    }

    /**
     * @notice Add manager to CLR instance
     * @notice Managers have the same management permissions as owners
     */
    function addManager(address _manager) external onlyOwner {
        manager = _manager;
        emit ManagerSet(_manager);
    }

    function pauseContract() external onlyOwnerOrManager returns (bool) {
        _pause();
        return true;
    }

    function unpauseContract() external onlyOwnerOrManager returns (bool) {
        _unpause();
        return true;
    }

    modifier onlyOwnerOrManager() {
        require(
            msg.sender == owner() || msg.sender == manager,
            "Function may be called only by owner or manager"
        );
        _;
    }

    modifier onlyTerminal() {
        require(
            msg.sender == terminal,
            "Function may be called only via Terminal"
        );
        _;
    }

    /**
     * @dev Returns the current version of the SingleAssetPool instance
     */
    function getVersion() public pure returns (uint16 version) {
        return 1;
    }
}
