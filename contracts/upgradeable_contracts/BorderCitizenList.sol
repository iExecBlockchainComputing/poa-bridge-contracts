pragma solidity 0.4.24;


import "./Ownable.sol";
import "../libraries/SafeMath.sol";
import "../upgradeability/EternalStorage.sol";


contract BorderCitizenList is EternalStorage, Ownable {
    using SafeMath for uint256;

    address public constant F_ADDR = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    event CitizenAdded (address indexed citizen);
    event CitizenRemoved (address indexed citizen);


    function initialize(
        address[] _initialCitizen,
        address _owner
    )
        public
        returns (bool)
    {
        require(!isInitialized());
        require(_owner != address(0));
        setOwner(_owner);

        for (uint256 i = 0; i < _initialCitizen.length; i++) {
            require(_initialCitizen[i] != address(0) && _initialCitizen[i] != F_ADDR);
            require(!isCitizen(_initialCitizen[i]));

            if (i == 0) {
                setNextCitizen(F_ADDR, _initialCitizen[i]);
                if (_initialCitizen.length == 1) {
                    setNextCitizen(_initialCitizen[i], F_ADDR);
                }
            } else if (i == _initialCitizen.length - 1) {
                setNextCitizen(_initialCitizen[i - 1], _initialCitizen[i]);
                setNextCitizen(_initialCitizen[i], F_ADDR);
            } else {
                setNextCitizen(_initialCitizen[i - 1], _initialCitizen[i]);
            }

            setCitizenCount(citizenCount().add(1));
            emit CitizenAdded(_initialCitizen[i]);
        }

        uintStorage[keccak256("deployedAtBlock")] = block.number;
        setInitialize(true);

        return isInitialized();
    }

    function getBorderCitizenListInterfacesVersion() public pure returns(uint64 major, uint64 minor, uint64 patch) {
        return (1, 0, 0);
    }


    function addCitizen(address _citizen) public onlyOwner {
        require(_citizen != address(0) && _citizen != F_ADDR);
        require(!isCitizen(_citizen));

        address firstCitizen = getNextCitizen(F_ADDR);
        require(firstCitizen != address(0));
        setNextCitizen(_citizen, firstCitizen);
        setNextCitizen(F_ADDR, _citizen);
        setCitizenCount(citizenCount().add(1));
        emit CitizenAdded(_citizen);
    }

    function addCitizenList(address[] _citizen) external onlyOwner {
        for (uint256 i = 0; i < _citizen.length; i++) {
            addCitizen(_citizen[i]);
        }
    }

    function removeCitizen(address _citizen) public onlyOwner {
        require(isCitizen(_citizen));
        address citizenNext = getNextCitizen(_citizen);
        address index = F_ADDR;
        address next = getNextCitizen(index);
        require(next != address(0));

        while (next != _citizen) {
            index = next;
            next = getNextCitizen(index);

            if (next == F_ADDR || next == address(0) ) {
                revert();
            }
        }

        setNextCitizen(index, citizenNext);
        deleteItemFromAddressStorage("citizenList", _citizen);
        setCitizenCount(citizenCount().sub(1));

        emit CitizenRemoved(_citizen);
    }

    function removeCitizenList(address[] _citizen) external onlyOwner {
        for (uint256 i = 0; i < _citizen.length; i++) {
            removeCitizen(_citizen[i]);
        }
    }

    function isInitialized() public view returns(bool) {
        return boolStorage[keccak256(abi.encodePacked("isInitialized"))];
    }

    function deployedAtBlock() public view returns (uint256) {
        return uintStorage[keccak256("deployedAtBlock")];
    }

    function setInitialize(bool _status) internal {
        boolStorage[keccak256(abi.encodePacked("isInitialized"))] = _status;
    }

    function isCitizen(address _citizen) public view returns (bool) {
        return _citizen != F_ADDR && getNextCitizen(_citizen) != address(0);
    }

    function getNextCitizen(address _address) public view returns (address) {
        return addressStorage[keccak256(abi.encodePacked("citizenList", _address))];
    }

    function setNextCitizen(address _prevCitizen, address _citizen) internal {
        addressStorage[keccak256(abi.encodePacked("citizenList", _prevCitizen))] = _citizen;
    }

    function deleteItemFromAddressStorage(string _mapName, address _address) internal {
        delete addressStorage[keccak256(abi.encodePacked(_mapName, _address))];
    }


    function citizenList() public view returns (address[]) {
        address [] memory list = new address[](citizenCount());
        uint256 counter = 0;
        address nextCitizen = getNextCitizen(F_ADDR);
        require(nextCitizen != address(0));

        while (nextCitizen != F_ADDR) {
            list[counter] = nextCitizen;
            nextCitizen = getNextCitizen(nextCitizen);
            counter++;

            if (nextCitizen == address(0) ) {
                revert();
            }
        }

        return list;
    }

    function setCitizenCount(uint256 _citizenCount) internal {
        uintStorage[keccak256(abi.encodePacked("citizenCount"))] = _citizenCount;
    }

    function citizenCount() public view returns (uint256) {
        return uintStorage[keccak256(abi.encodePacked("citizenCount"))];
    }


}