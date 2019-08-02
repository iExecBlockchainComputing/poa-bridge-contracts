pragma solidity 0.4.24;

import "./BasicForeignBridgeErcToErc.sol";
import "../ERC677Bridge.sol";

contract ForeignBridgeErc677ToErc677 is ERC677Bridge, BasicForeignBridgeErcToErc {
    event UserRequestForAffirmation(address recipient, uint256 value);

    function initialize(
        address _validatorContract,
        address _erc20token,
        uint256 _requiredBlockConfirmations,
        uint256 _gasPrice,
        uint256 _dailyLimit,
        uint256 _maxPerTx,
        uint256 _minPerTx,
        uint256 _homeDailyLimit,
        uint256 _homeMaxPerTx,
        address _owner,
        uint256 _decimalsShift
    ) external returns (bool) {
        require(_minPerTx > 0 && _maxPerTx > _minPerTx && _dailyLimit > _maxPerTx);

        _initialize(
            _validatorContract,
            _erc20token,
            _requiredBlockConfirmations,
            _gasPrice,
            _maxPerTx,
            _homeDailyLimit,
            _homeMaxPerTx,
            _owner,
            _decimalsShift
        );

        uintStorage[DAILY_LIMIT] = _dailyLimit;
        uintStorage[MIN_PER_TX] = _minPerTx;

        emit DailyLimitChanged(_dailyLimit);

        return isInitialized();
    }

    function erc20token() public view returns (ERC20Basic) {
        return erc677token();
    }

    function setErc20token(address _token) internal {
        setErc677token(_token);
    }

    function fireEventOnTokenTransfer(address _from, uint256 _value) internal {
        emit UserRequestForAffirmation(_from, _value);
    }
}
