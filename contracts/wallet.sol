pragma solidity ^0.8.7;
// SPDX-License-Identifier: MIT

interface IToken {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}

contract Wallet {
    function getBalance(address _target) public view returns (uint256) {
        return _target.balance;
    }

    function getBalanceERC20(
        address _target,
        IToken _token
    ) public view returns (uint256) {
        return _token.balanceOf(_target);
    }

    function sendERC20Token(
        address payable _to,
        IToken _token,
        uint256 _amount
    ) public {
        uint256 balance = _token.balanceOf(msg.sender);
        require(_amount <= balance, 'not enough balance');
        _token.transferFrom(msg.sender, _to, _amount);
    }

    function checkAllowance(
        address owner,
        IToken _token
    ) public view returns (uint256) {
        return _token.allowance(owner, address(this));
    }
}
