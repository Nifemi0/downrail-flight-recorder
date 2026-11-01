// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// EXPERIMENTAL LOCAL RESEARCH ONLY. Never deploy or approve this contract without
// protocol compatibility testing and an independent security review.
interface GuardToken { function balanceOf(address owner) external view returns (uint256); }
interface GuardBank {
    struct SystemConfig { address marginBank; address collateralToken; address perpPoolFactory; address liquidationEngine; address insuranceFund; address feeRecipient; uint16 maxLeverageLimit; bool fullyWired; }
    function getSystemConfig() external view returns (SystemConfig memory);
    struct AccountState { int256 unlockedCollateralBalance; uint256 lockedCollateral; address[] activePerpPools; }
    function getAccountState(address owner) external view returns (AccountState memory);
    struct Position { int128 size; uint128 avgEntryPrice; int256 entryFundingIndex; uint64 lastUpdatedTimestampNs; }
    function getPosition(address owner, address perpPool) external view returns (Position memory);
    function quoteFundingPayer(address owner) external view returns (address);
}
interface GuardPool {
    function marginBank() external view returns (address);
    function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) external returns (bool, uint128);
}

/// Caps observed net balance changes and resulting absolute position size for one IOC placement.
/// It does not cap trading losses, liquidation, gas, other positions, or external orders.
contract ExperimentalPlacementGuard {
    GuardPool public immutable pool;
    GuardBank public immutable bank;
    GuardToken public immutable collateral;
    uint256 private entered;
    error InvalidSetup(); error Reentrant(); error Expired(); error InvalidOrder(); error Rejected(); error PayerChanged(); error LimitExceeded();
    constructor(address pool_, address bank_, address collateral_) {
        if (pool_ == address(0) || bank_ == address(0) || collateral_ == address(0) || GuardPool(pool_).marginBank() != bank_ || GuardBank(bank_).getSystemConfig().collateralToken != collateral_) revert InvalidSetup();
        pool = GuardPool(pool_); bank = GuardBank(bank_); collateral = GuardToken(collateral_);
    }
    struct Limits { uint256 ownerNetDebit; uint256 payerNetDebit; uint256 freeCollateralReduction; uint256 maxAbsPosition; }
    function place(bool isBid, uint256 price, uint256 quantity, uint64 expiryNs, uint256 deadline, Limits calldata limits) external returns (uint128 orderId) {
        if (entered != 0) revert Reentrant(); entered = 1;
        if (block.timestamp > deadline || uint256(expiryNs) <= block.timestamp * 1e9) revert Expired();
        if (price == 0 || quantity == 0) revert InvalidOrder();
        address owner = msg.sender;
        address payer = bank.quoteFundingPayer(owner);
        uint256 ownerBefore = collateral.balanceOf(owner);
        uint256 payerBefore = payer == address(0) ? 0 : collateral.balanceOf(payer);
        int256 freeBefore = bank.getAccountState(owner).unlockedCollateralBalance;
        (bool accepted, uint128 id) = pool.placeOrderFor(owner, isBid, 0, price, quantity, expiryNs, 2, 0, address(0), 0);
        if (!accepted) revert Rejected();
        if (bank.quoteFundingPayer(owner) != payer) revert PayerChanged();
        uint256 ownerAfter = collateral.balanceOf(owner);
        uint256 payerAfter = payer == address(0) ? 0 : collateral.balanceOf(payer);
        int256 freeAfter = bank.getAccountState(owner).unlockedCollateralBalance;
        int256 signedSize = int256(bank.getPosition(owner, address(pool)).size);
        uint256 absoluteSize = uint256(signedSize < 0 ? -signedSize : signedSize);
        if ((ownerBefore > ownerAfter && ownerBefore - ownerAfter > limits.ownerNetDebit) ||
            (payerBefore > payerAfter && payerBefore - payerAfter > limits.payerNetDebit) ||
            (freeBefore > freeAfter && uint256(freeBefore - freeAfter) > limits.freeCollateralReduction) ||
            absoluteSize > limits.maxAbsPosition) revert LimitExceeded();
        entered = 0;
        return id;
    }
}
