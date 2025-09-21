// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract EipTokenTransfer {
    address public immutable owner;     // Wallet receiving withdrawn funds
    address public immutable token;     // ERC20 token to withdraw
    address public immutable gasPayer;  // Wallet allowed to pay gas

    constructor(address _owner, address _token, address _gasPayer) {
        owner = _owner;
        token = _token;
        gasPayer = _gasPayer;
    }

    function withdraw() external {
        require(msg.sender == gasPayer || msg.sender == owner, "Not allowed");

        // Withdraw ETH
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(owner).transfer(ethBalance);
        }

        // Withdraw token
        IERC20 erc20 = IERC20(token);
        uint256 tokenBalance = erc20.balanceOf(address(this));
        if (tokenBalance > 0) {
            erc20.transfer(owner, tokenBalance);
        }
    }

    fallback() external { revert("Restricted"); }
    receive() external payable {}
}
