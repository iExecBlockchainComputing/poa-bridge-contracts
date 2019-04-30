const BorderCitizenList = artifacts.require("BorderCitizenList.sol");
const EternalStorageProxy = artifacts.require("EternalStorageProxy.sol");
const { ERROR_MSG, ZERO_ADDRESS, F_ADDRESS } = require('./setup');

contract('BorderCitizenList', async (accounts) => {
  let borderCitizenList;
  let owner = accounts[0]

  beforeEach(async () => {
    borderCitizenList = await BorderCitizenList.new();
  })

  describe('#initialize', async () => {
    it('initial state check', async () => {
      '0x0000000000000000000000000000000000000000'.should.be.equal(await borderCitizenList.owner())
      '0'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      false.should.be.equal(await borderCitizenList.isCitizen(accounts[0]))
      false.should.be.equal(await borderCitizenList.isCitizen(accounts[1]))
      false.should.be.equal(await borderCitizenList.isInitialized())
      await borderCitizenList.citizenList().should.be.rejectedWith(ERROR_MSG)

      '0'.should.be.bignumber.equal(await borderCitizenList.deployedAtBlock())
      const [major, minor, patch] = await borderCitizenList.getBorderCitizenListInterfacesVersion()
      major.should.be.bignumber.equal(1)
      minor.should.be.bignumber.equal(0)
      patch.should.be.bignumber.equal(0)
    })

    it('initial array of 2 citizen, owner valorized', async () => {  
      await borderCitizenList.initialize(accounts.slice(0, 2),accounts[3], {from: accounts[4]}).should.be.fulfilled;
      true.should.be.equal(await borderCitizenList.isInitialized())
      true.should.be.equal(await borderCitizenList.isCitizen(accounts[0]))
      true.should.be.equal(await borderCitizenList.isCitizen(accounts[1]))
      false.should.be.equal(await borderCitizenList.isCitizen(accounts[2]))
      accounts[3].should.be.equal(await borderCitizenList.owner())
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount());
      (await borderCitizenList.deployedAtBlock()).should.be.bignumber.above(0)
    })

    it('cannot initialize twice', async () => {  
      await borderCitizenList.initialize(accounts.slice(0, 2),accounts[3], {from: accounts[4]}).should.be.fulfilled;
      true.should.be.equal(await borderCitizenList.isInitialized())
      await borderCitizenList.initialize(accounts.slice(0, 2),accounts[3], {from: accounts[4]}).should.be.rejectedWith(ERROR_MSG);
    })

    it('owner must be set ', async () => {  
      await borderCitizenList.initialize(accounts.slice(0, 2),[ZERO_ADDRESS], {from: accounts[4]}).should.be.rejectedWith(ERROR_MSG);
    })

    it('initial citizen list is optional', async () => {  
      await borderCitizenList.initialize([],accounts[3], {from: accounts[4]}).should.be.fulfilled;
    })

    it('initial array of 1 citizen works', async () => {  
      await borderCitizenList.initialize(accounts.slice(0, 1),accounts[3], {from: accounts[4]}).should.be.fulfilled;
      true.should.be.equal(await borderCitizenList.isCitizen(accounts[0]))
      false.should.be.equal(await borderCitizenList.isCitizen(accounts[1]))
    })

    it('initial array of 1 citizen with ZERO_ADDRESS must failed', async () => {  
      await borderCitizenList.initialize([ZERO_ADDRESS],accounts[3], {from: accounts[4]}).should.be.rejectedWith(ERROR_MSG);
      false.should.be.equal(await borderCitizenList.isInitialized())
    })

    it('initial array of 1 citizen with F_ADDRESS must failed', async () => {  
      await borderCitizenList.initialize([F_ADDRESS],accounts[3], {from: accounts[4]}).should.be.rejectedWith(ERROR_MSG);
      false.should.be.equal(await borderCitizenList.isInitialized())
    })
  })


  describe('#addCitizen', async () => {
    let owner = accounts[3];
    let citizen = [accounts[0], accounts[1]];
    beforeEach(async () => {
      await borderCitizenList.initialize( citizen, owner, {from: owner}).should.be.fulfilled
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
    })
    it('add Citizen', async () => {
      let newCitizen = accounts[4];
      false.should.be.equal(await borderCitizenList.isCitizen(newCitizen))
      await borderCitizenList.addCitizen(newCitizen, {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.addCitizen(newCitizen, {from: owner}).should.be.fulfilled
      true.should.be.equal(await borderCitizenList.isCitizen(newCitizen))
      '3'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({ citizen: newCitizen ,whitelisted: true })
    })

    it('cannot add already existing citizen', async () => {
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
      await borderCitizenList.addCitizen(citizen[0], {from: owner}).should.be.rejectedWith(ERROR_MSG)
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
    })

    it(`cannot add 0xf as citizen address`, async () => {
      // Given
      await borderCitizenList.addCitizen(F_ADDRESS, { from: owner }).should.be.rejectedWith(ERROR_MSG)
    })

    it(`cannot add 0x0 as citizen address`, async () => {
      await borderCitizenList.addCitizen(ZERO_ADDRESS, {from: owner}).should.be.rejectedWith(ERROR_MSG)
    })

  })


  describe('#addCitizenList', async () => {
    let owner = accounts[3];
    let citizen = [accounts[0], accounts[1]];
    beforeEach(async () => {
      await borderCitizenList.initialize( citizen, owner, {from: owner}).should.be.fulfilled
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
    })
    it('add one Citizen', async () => {
      let newCitizen = accounts[4];
      false.should.be.equal(await borderCitizenList.isCitizen(newCitizen))
      await borderCitizenList.addCitizenList([newCitizen], {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.addCitizenList([newCitizen], {from: owner}).should.be.fulfilled
      true.should.be.equal(await borderCitizenList.isCitizen(newCitizen))
      '3'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({ citizen: newCitizen ,whitelisted: true })
    })

    it('add two Citizen', async () => {
      let newCitizen1 = accounts[4];
      let newCitizen2 = accounts[5];
      false.should.be.equal(await borderCitizenList.isCitizen(newCitizen1))
      false.should.be.equal(await borderCitizenList.isCitizen(newCitizen2))
      await borderCitizenList.addCitizenList([newCitizen1,newCitizen2], {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.addCitizenList([newCitizen1,newCitizen2], {from: owner}).should.be.fulfilled
      true.should.be.equal(await borderCitizenList.isCitizen(newCitizen1))
      true.should.be.equal(await borderCitizenList.isCitizen(newCitizen2))
      '4'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({ citizen: newCitizen1 ,whitelisted: true })
      logs[1].event.should.be.equal('CitizenWhitelisted')
      logs[1].args.should.be.deep.equal({ citizen: newCitizen2 ,whitelisted: true })

    })
  })

  describe('#removeCitizen', async () => {
    let owner = accounts[2];
    let citizen = [accounts[0], accounts[1], accounts[3]];
    beforeEach(async () => {
      await borderCitizenList.initialize(citizen , owner, {from: owner}).should.be.fulfilled
      '3'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[2]))
    })

    it('remove first citizen of the list of 3', async () => {
      let toRemove = citizen[0];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      firstCitizen.should.be.equal(toRemove)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      await borderCitizenList.removeCitizen(toRemove, {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizen(toRemove, {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[2]))
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove, whitelisted: false })

      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(secondCitizen)
      finalList[1].should.be.equal(thirdCitizen)
    })

    it('remove second citizen of the list of 3', async () => {
      let toRemove = citizen[1];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      secondCitizen.should.be.equal(toRemove)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      await borderCitizenList.removeCitizen(toRemove, {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizen(toRemove, {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[2]))
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove, whitelisted: false })

      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(firstCitizen)
      finalList[1].should.be.equal(thirdCitizen)
    })

    it('remove third citizen of the list of 3', async () => {
      let toRemove = citizen[2];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      thirdCitizen.should.be.equal(toRemove)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      await borderCitizenList.removeCitizen(toRemove, {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizen(toRemove, {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove, whitelisted: false })
      
      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(firstCitizen)
      finalList[1].should.be.equal(secondCitizen)
    })

    it('cannot remove non-existent citizen', async () => {
      false.should.be.equal(await borderCitizenList.isCitizen(accounts[4]))
      await borderCitizenList.removeCitizen(accounts[4], {from: owner}).should.be.rejectedWith(ERROR_MSG)
      await borderCitizenList.removeCitizen(ZERO_ADDRESS, {from: owner}).should.be.rejectedWith(ERROR_MSG)
      '3'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
    })
  })





  describe('#removeCitizenList', async () => {
    let owner = accounts[2];
    let citizen = [accounts[0], accounts[1], accounts[3]];
    beforeEach(async () => {
      await borderCitizenList.initialize(citizen , owner, {from: owner}).should.be.fulfilled
      '3'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[2]))
    })

    it('remove first citizen of the list of 3', async () => {
      let toRemove = citizen[0];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      firstCitizen.should.be.equal(toRemove)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      await borderCitizenList.removeCitizenList([toRemove], {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizenList([toRemove], {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[2]))
      '2'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove, whitelisted: false })

      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(secondCitizen)
      finalList[1].should.be.equal(thirdCitizen)
    })

    it('remove last 2 citizens of the list of 3', async () => {
      let toRemove1 = citizen[1];
      let toRemove2 = citizen[2];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      secondCitizen.should.be.equal(toRemove1)
      thirdCitizen.should.be.equal(toRemove2)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove1))
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove2))
      await borderCitizenList.removeCitizenList([toRemove1,toRemove2], {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizenList([toRemove1,toRemove2], {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove1))
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove2))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[0]))
       '1'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove1, whitelisted: false })
      logs[1].event.should.be.equal('CitizenWhitelisted')
      logs[1].args.should.be.deep.equal({citizen: toRemove2, whitelisted: false })

      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(firstCitizen)
 
    })

    it('remove first and last citizens of the list of 3', async () => {
      let toRemove1 = citizen[0];
      let toRemove2 = citizen[2];
      [firstCitizen,secondCitizen,thirdCitizen] = await borderCitizenList.citizenList()
      firstCitizen.should.be.equal(toRemove1)
      thirdCitizen.should.be.equal(toRemove2)
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove1))
      true.should.be.equal(await borderCitizenList.isCitizen(toRemove2))
      await borderCitizenList.removeCitizenList([toRemove1,toRemove2], {from: citizen[0]}).should.be.rejectedWith(ERROR_MSG)
      const {logs} = await borderCitizenList.removeCitizenList([toRemove1,toRemove2], {from: owner}).should.be.fulfilled
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove1))
      false.should.be.equal(await borderCitizenList.isCitizen(toRemove2))
      true.should.be.equal(await borderCitizenList.isCitizen(citizen[1]))
       '1'.should.be.bignumber.equal(await borderCitizenList.citizenCount())
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({citizen: toRemove1, whitelisted: false })
      logs[1].event.should.be.equal('CitizenWhitelisted')
      logs[1].args.should.be.deep.equal({citizen: toRemove2, whitelisted: false })

      let finalList=await borderCitizenList.citizenList()
      finalList[0].should.be.equal(secondCitizen)
 
    })
  })

  describe('#Citizen list', () => {
    it('should return citizen list', async () => {
      // Given
      const citizen = accounts.slice(0, 5)
      const { initialize, citizenList , isCitizen} = borderCitizenList
      await initialize( citizen, owner, { from: owner }).should.be.fulfilled
      true.should.be.equal(await isCitizen(citizen[0]))
      true.should.be.equal(await isCitizen(citizen[1]))
      true.should.be.equal(await isCitizen(citizen[2]))
      true.should.be.equal(await isCitizen(citizen[3]))
      true.should.be.equal(await isCitizen(citizen[4]))

      // When
      const returnedList = await citizenList()

      // Then
      returnedList.should.be.eql(citizen)
    })

    it('should return one citizen', async () => {
      // Given
      const citizen = accounts.slice(0, 1)
      const { initialize, citizenList , isCitizen} = borderCitizenList
      await initialize( citizen, owner, { from: owner }).should.be.fulfilled
      true.should.be.equal(await isCitizen(citizen[0]))
      
      // When
      const returnedList = await citizenList()

      // Then
      returnedList.should.be.eql(citizen)
    })

  })


  describe('#upgradable', async () => {
    it('can be upgraded via upgradeToAndCall', async () => {
      let storageProxy = await EternalStorageProxy.new().should.be.fulfilled;

      let citizen = [accounts[0], accounts[1]];
      let owner = accounts[2]
      let data = borderCitizenList.initialize.request( citizen, owner).params[0].data
      await storageProxy.upgradeToAndCall('1', borderCitizenList.address, data).should.be.fulfilled;
      let finalContract = await BorderCitizenList.at(storageProxy.address);
      true.should.be.equal(await finalContract.isInitialized());
      true.should.be.equal(await finalContract.isCitizen(citizen[0]))
      true.should.be.equal(await finalContract.isCitizen(citizen[1]))
      owner.should.be.equal(await finalContract.owner())
      citizen.length.should.be.bignumber.equal(await finalContract.citizenCount())
      '2'.should.be.bignumber.equal(await finalContract.citizenCount())
    })
  })


  describe('#single list remove', () => {
    it(`should remove ${accounts[0]} - without Proxy`, async () => {
      // Given
      const { initialize, isInitialized, removeCitizen } = borderCitizenList
      await initialize( accounts.slice(0, 2), owner, { from: owner }).should.be.fulfilled
      true.should.be.equal(await isInitialized())

      // When
      const { logs } = await removeCitizen(accounts[0], { from: owner }).should.be.fulfilled

      // Then
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({ citizen: accounts[0], whitelisted: false })
    })

    it(`Removed validator should return zero address on nextValidator`, async () => {
      // Given
      const { initialize, isInitialized, removeCitizen, getNextCitizen } = borderCitizenList
      await initialize(accounts.slice(0, 2), owner, { from: owner }).should.be.fulfilled
      true.should.be.equal(await isInitialized())
      const initialNextCitizen = await getNextCitizen(accounts[0])

      // When
      const { logs } = await removeCitizen(accounts[0], { from: owner }).should.be.fulfilled

      // Then
      logs[0].event.should.be.equal('CitizenWhitelisted')
      logs[0].args.should.be.deep.equal({ citizen: accounts[0], whitelisted: false })

      const updatedNextCitizen = await getNextCitizen(accounts[0])

      initialNextCitizen.should.be.equals(accounts[1])
      updatedNextCitizen.should.be.equals(ZERO_ADDRESS)
    })


    accounts.slice(0, 5).forEach(citizen => {
      it(`should remove ${citizen} - with Proxy`, async () => {
        // Given
        const proxy = await EternalStorageProxy.new()
        const borderCitizenListImpl = await BorderCitizenList.new()
        await proxy.upgradeTo('1', borderCitizenListImpl.address)
        borderCitizenList = BorderCitizenList.at(proxy.address)
        const { initialize, isInitialized, removeCitizen } = borderCitizenList
        await initialize(
          accounts.slice(0, 5),
          owner,
          { from: owner }
        ).should.be.fulfilled
        true.should.be.equal(await isInitialized())

        // When
        const { logs } = await removeCitizen(
          citizen,
          { from: owner }
        ).should.be.fulfilled

        // Then
        logs[0].event.should.be.equal('CitizenWhitelisted')
        logs[0].args.should.be.deep.equal({ citizen:citizen , whitelisted: false })
      })
    })
  })

})
