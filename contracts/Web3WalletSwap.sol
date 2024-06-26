// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import '@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol';
import '@uniswap/swap-router-contracts/contracts/interfaces/ISwapRouter02.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Web3WalletSwap {
    ISwapRouter02 public immutable swapRouter;
    address private constant wrappedToken =
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH use for Wrap ETH from ETHER network
    // address private constant wrappedToken =
    //     0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // WETH use for Wrap ETH from ETH Sepolia network
    // address private constant wrappedToken =
    //     0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB use for Wrap BNB from BNB network
    // address constant private wrappedToken = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH use for Wrap ETH from Arbitrum network
    // address constant private wrappedToken = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73; // WETH use for Wrap ETH from Arbitrum Sepolia network
    // address constant private wrappedToken = 0x4200000000000000000000000000000000000006; // WETH use for Wrap ETH from Optimism network
    // address constant private wrappedToken = 0x4200000000000000000000000000000000000006; // WETH use for Wrap ETH from Optimism Sepolia network

    uint24 public constant poolFee = 3000;

    constructor(ISwapRouter02 _swapRouter) {
        swapRouter = _swapRouter;
    }

    function swapExactInputSingle(
        address token_spen,
        address token_receive,
        uint256 amountIn
    ) external payable returns (uint256 amountOut) {
        require(amountIn > 0, 'Amount in must larger than zero');
        // msg.sender must approve this contract
        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(
            token_spen,
            msg.sender,
            address(this),
            amountIn
        );

        // Approve the router to spend Token Input.
        TransferHelper.safeApprove(token_spen, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
            .ExactInputSingleParams({
                tokenIn: token_spen,
                tokenOut: token_receive,
                fee: poolFee,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    function swapExactNativeTokenInputSingle(
        address token_receive
    ) external payable returns (uint256 amountOut) {
        uint256 amountIn = msg.value;

        require(amountIn > 0, 'Amount in must larger than zero');
        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter
            .ExactInputSingleParams({
                tokenIn: wrappedToken,
                tokenOut: token_receive,
                fee: poolFee,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle{value: msg.value}(params);
    }
}
