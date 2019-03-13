pragma solidity 0.4.19;

import '../../contracts/ERC677BridgeTokenRewardable.sol';


contract ERC677BridgeTokenRewardableMock is ERC677BridgeTokenRewardable {

    function ERC677BridgeTokenRewardableMock(
        string _name,
        string _symbol,
        uint8 _decimals
    ) public ERC677BridgeTokenRewardable(_name, _symbol, _decimals) {}

    function setBlockRewardContractMock(address _blockRewardContract) public {
        blockRewardContract = _blockRewardContract;
    }

    function setValidatorSetContractMock(address _validatorSetContract) public {
        validatorSetContract = _validatorSetContract;
    }

}
