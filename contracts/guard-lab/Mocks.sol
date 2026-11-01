// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ExperimentalPlacementGuard.sol";
contract MockToken {
    mapping(address => uint256) public balanceOf;
    function setBalance(address owner, uint256 amount) external { balanceOf[owner]=amount; }
    function debit(address owner, uint256 amount) external { balanceOf[owner]-=amount; }
}
contract MockBank {
    address public collateral;
    constructor(address token) {collateral=token;}
    function getSystemConfig() external view returns (GuardBank.SystemConfig memory) {return GuardBank.SystemConfig(address(this),collateral,address(0),address(0),address(0),address(0),0,true);}
    mapping(address => int256) public free;
    mapping(address => address) public payer;
    mapping(address => int128) public size;
    function setSize(address owner, int128 value) external {size[owner]=value;}
    function getPosition(address owner, address) external view returns (GuardBank.Position memory) {return GuardBank.Position(size[owner],0,0,0);}
    function setFree(address owner, int256 value) external {free[owner]=value;}
    function setPayer(address owner, address value) external {payer[owner]=value;}
    function quoteFundingPayer(address owner) external view returns(address) {return payer[owner];}
    function getAccountState(address owner) external view returns (GuardBank.AccountState memory) {return GuardBank.AccountState(free[owner],0,new address[](0));}
}
contract MockPool {
    MockBank public bank; MockToken public token;
    mapping(address => address) public approved;
    uint256 public ownerDebit; uint256 public payerDebit; int256 public freeDelta; bool public shouldAccept = true; bool public changePayer; int128 public sizeDelta;
    constructor(address b,address t) {bank=MockBank(b);token=MockToken(t);}
    function marginBank() external view returns(address) {return address(bank);}
    function approveGuard(address guard) external {approved[msg.sender]=guard;}
    function configure(uint256 ownerDebit_,uint256 payerDebit_,int256 freeDelta_,bool accept_,bool change_) external {ownerDebit=ownerDebit_;payerDebit=payerDebit_;freeDelta=freeDelta_;shouldAccept=accept_;changePayer=change_;}
    function configurePosition(int128 delta) external {sizeDelta=delta;}
    function placeOrderFor(address owner,bool,uint64,uint256,uint256,uint64,uint8 orderType,uint8,address,uint96) external returns(bool,uint128) {
        require(approved[owner]==msg.sender,"not approved");
        require(orderType==2,"IOC required");
        address payer=bank.payer(owner);
        if(ownerDebit>0) token.debit(owner,ownerDebit);
        if(payerDebit>0) token.debit(payer,payerDebit);
        bank.setFree(owner,bank.free(owner)+freeDelta);
        bank.setSize(owner,bank.size(owner)+sizeDelta);
        if(changePayer) bank.setPayer(owner,address(0));
        return (shouldAccept,42);
    }
}
