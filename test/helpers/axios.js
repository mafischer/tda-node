const sinon = require('sinon');
const proxyquire = require('proxyquire');
const chai = require('chai');
const dirtyChai = require('dirty-chai');
const chaiAsPromised = require('chai-as-promised');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(dirtyChai);

describe('Axios Helper Test Suite', () => {
  let sandbox; let axios; let
    helper;

  before(() => {
    sandbox = sinon.createSandbox();
    axios = sandbox.stub();
    helper = proxyquire('../../helpers/axios', {
      axios,
    });
  });

  beforeEach(() => {
    axios.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe('axios Tests', () => {
    it('should return data upon success', async () => {
      axios.resolves({
        status: 200,
        statusText: 'success',
        data: {
          pizza: 'pepperoni',
        },
      });
      expect(helper.axios()).to.eventually.deep.equal({
        pizza: 'pepperoni',
      });
    });

    it('should reject with 100 error', async () => {
      axios.resolves({
        status: 100,
        statusText: 'Continue',
        data: {
          pizza: 'pepperoni',
        },
      });
      expect(helper.axios({})).to.be.rejectedWith('100: Continue');
    });

    it('should reject with 404 error', () => {
      axios.resolves({
        status: 404,
        statusText: 'Not Found',
      });
      expect(helper.axios({})).to.be.rejectedWith('404: Not Found');
    });

    it('should return error upon failure', () => {
      axios.rejects(new Error('500'));
      expect(helper.axios({})).to.be.rejectedWith('500');
    });
  });
});
