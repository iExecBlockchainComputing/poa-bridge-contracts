pragma solidity 0.4.24;

import "./Ownable.sol";


contract BorderOption is Ownable {

    function borderCitizenListContract() public view returns(address) {
        return addressStorage[keccak256(abi.encodePacked("borderCitizenListContract"))];
    }

    function setBorderCitizenListContract(address _borderCitizenListContract) public onlyOwner {
        require(isContract(_borderCitizenListContract));
        addressStorage[keccak256(abi.encodePacked("borderCitizenListContract"))] = _borderCitizenListContract;
    }

    function isContract(address _addr) internal view returns (bool)
    {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }

}