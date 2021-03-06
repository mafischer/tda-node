/* eslint-disable no-console */
/* eslint-disable no-empty-function */
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const chai = require('chai');
const dirtyChai = require('dirty-chai');
const chaiAsPromised = require('chai-as-promised');

const { expect } = chai;
chai.use(chaiAsPromised);
chai.use(dirtyChai);

describe('Authenticate Test Suite', () => {
  let consoleLogStub;
  let auth;
  let sandbox;
  let puppeteer;
  let rlp;
  let openStub;
  let close;

  before(() => {
    sandbox = sinon.createSandbox();
    consoleLogStub = sandbox.stub(console, 'log');
    rlp = {
      default: {
        createInterface() {
          return {
            questionAsync: sandbox.stub().resolves('123456'),
          };
        },
      },
    };
    openStub = sandbox.stub();
    close = sandbox.stub().resolves();
    puppeteer = {
      launch() {
        return {
          newPage() {
            return {
              goto: sandbox.stub().resolves(),
              focus: sandbox.stub().resolves(),
              keyboard: {
                type: sandbox.stub().resolves(),
              },
              waitForNavigation: sandbox.stub().resolves(),
              waitForSelector: sandbox.stub().resolves(),
              click: sandbox.stub().resolves(),
            };
          },
          close,
        };
      },
    };
    auth = proxyquire('../../lib/authenticate.js', {
      open: openStub,
      puppeteer,
      'readline-promise': rlp,
    });
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(async () => {
    consoleLogStub.reset();
  });

  describe('authenticate tests', () => {
    let initStub;

    before(() => {
      initStub = sandbox.stub(auth, 'init');
    });

    beforeEach(async () => {
      initStub.reset();
      openStub.reset();
      close.reset();
      close.resolves();
    });

    it('should return a promise when called without a callback', async () => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);

      const promise = auth.authenticate({
        consumerKey: '1234567890',
      });

      expect(promise instanceof Promise).to.equal(true);
    });

    it('should use the puppeteer flow when uid and pw args exist', async () => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);
      // hit else branch in oauth function
      close.rejects('oops');

      const promise = auth.authenticate({
        consumerKey: '1234567890',
        uid: 'pizza',
        pw: 'cheese',
      });

      expect(openStub.callCount).to.equal(0);
      expect(promise instanceof Promise).to.equal(true);
    });

    it('should not use the puppeteer flow when uid does not exist', async () => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);

      const promise = auth.authenticate({
        consumerKey: '1234567890',
        pw: 'cheese',
      });

      expect(openStub.calledOnce).to.equal(true);
      expect(promise instanceof Promise).to.equal(true);
    });

    it('should not use the puppeteer flow when pw does not exist', async () => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);

      const promise = auth.authenticate({
        consumerKey: '1234567890',
        pw: 'cheese',
      });

      expect(openStub.calledOnce).to.equal(true);
      expect(promise instanceof Promise).to.equal(true);
    });

    it('should resolve a token', async () => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);

      const tkn = await auth.authenticate({
        consumerKey: '1234567890',
      });

      expect(tkn).to.deep.equal(token);
    });

    it('should callback on async init failure', (done) => {
      initStub.rejects(new Error('chicago style'));
      auth.authenticate({
        consumerKey: '1234567890',
      }, (err, tkn) => {
        expect(tkn).to.be.undefined();
        expect(err.message).to.equal('chicago style');
        done();
      });
    });

    it('should callback on init failure', (done) => {
      initStub.yields(new Error('chicago style'));
      auth.authenticate({
        consumerKey: '1234567890',
      }, (err, tkn) => {
        expect(tkn).to.be.undefined();
        expect(err.message).to.equal('chicago style');
        done();
      });
    });

    it('should callback with a token', (done) => {
      const token = {
        expires_in: 1800,
        refresh_token: '',
        access_token: '',
      };

      initStub.yields(null, token);

      auth.authenticate({
        consumerKey: '1234567890',
      }, (err, tkn) => {
        expect(err).to.be.null();
        expect(tkn).to.deep.equal(token);
        done();
      });
    });
  });

  describe('init tests', () => {
    let existsSyncStub; let authenticate;

    before(() => {
      existsSyncStub = sandbox.stub();

      authenticate = proxyquire('../../lib/authenticate.js', {
        puppeteer,
        'readline-promise': rlp,
        fs: {
          existsSync: existsSyncStub,
          readFileSync() {
            return '';
          },
        },
        https: {
          createServer() {

          },
        },
        '@hapi/hapi': {
          server() {
            return {
              route() {},
              async start() {},
              info: {
                uri: 'imma uri',
              },
            };
          },
        },
      });
    });

    beforeEach(() => {
      existsSyncStub.reset();
    });

    it('should init without error', async () => {
      try {
        const empty = await authenticate.init({
          key: '',
          cert: '',
          authCb: () => {},
        });
        expect(consoleLogStub.calledOnce).to.be.true();
        expect(empty).to.be.undefined();
      } catch (err) {
        expect(err).to.be.undefined();
      }
    });

    it('should init with certificates', async () => {
      existsSyncStub.returns(true);
      try {
        const empty = await authenticate.init({
          key: 'asdf',
          cert: 'asdf',
          authCb: () => {},
        });
        expect(consoleLogStub.calledOnce).to.be.true();
        expect(empty).to.be.undefined();
      } catch (err) {
        expect(err).to.be.undefined();
      }
    });

    it('should call the handler callback', async (done) => {
      existsSyncStub.returns(true);

      const { init } = proxyquire('../../lib/authenticate.js', {
        puppeteer,
        'readline-promise': rlp,
        fs: {
          existsSync: existsSyncStub,
          readFileSync() {
            return '';
          },
        },
        https: {
          createServer() {},
        },
        '@hapi/hapi': {
          server() {
            return {
              stop() {},
              route({ handler }) {
                handler({
                  query: {
                    code: 'pizza',
                  },
                });
              },
              async start() {},
              info: {
                uri: 'imma uri',
              },
            };
          },
        },
      });

      init({}, () => {
        console.log('here');
        done();
      });
    });
  });

  describe('generateTokens tests', () => {
    let authenticate; let
      axiosStub;

    before(() => {
      axiosStub = sandbox.stub();
      authenticate = proxyquire('../../lib/authenticate.js', {
        puppeteer,
        'readline-promise': rlp,
        axios: axiosStub,
      });
    });

    beforeEach(() => {
      axiosStub.reset();
    });

    it('should generate tokens without error', async () => {
      axiosStub.resolves({ data: 'pizza' });
      try {
        const token = await authenticate.generateTokens({
          consumerKey: 'emptyString',
        });
        expect(token).to.equal('pizza');
      } catch (err) {
        expect(err).to.be.undefined();
      }
    });

    it('should generate tokens and call callback', (done) => {
      axiosStub.resolves({ data: 'pizza' });
      authenticate.generateTokens({
        consumerKey: 'emptyString',
      }, (err, token) => {
        expect(token).to.equal('pizza');
        expect(err).to.be.null();
        done();
      });
    });

    it('should reject on error', async () => {
      axiosStub.rejects(new Error('thin crust'));

      try {
        const token = await authenticate.generateTokens({
          consumerKey: 'emptyString',
        });
        expect(token).to.be.undefined();
      } catch (err) {
        expect(err.message).to.equal('thin crust');
      }
    });

    it('should callback with error', (done) => {
      axiosStub.rejects(new Error('deep dish'));

      authenticate.generateTokens({
        consumerKey: 'emptyString',
      }, (err, token) => {
        expect(token).to.be.undefined();
        expect(err.message).to.equal('deep dish');
        done();
      });
    });
  });

  describe('refreshToken tests', () => {
    let authenticate; let
      axiosStub;

    before(() => {
      axiosStub = sandbox.stub();
      authenticate = proxyquire('../../lib/authenticate.js', {
        puppeteer,
        'readline-promise': rlp,
        axios: axiosStub,
      });
    });

    beforeEach(() => {
      axiosStub.reset();
    });

    it('should refresh token without error', async () => {
      axiosStub.resolves({ data: 'pizza' });
      try {
        const token = await authenticate.refreshToken({
          consumerKey: 'emptyString',
        });
        expect(token).to.equal('pizza');
      } catch (err) {
        expect(err).to.be.undefined();
      }
    });

    it('should refresh token and call callback', (done) => {
      axiosStub.resolves({ data: 'pizza' });
      authenticate.refreshToken({
        consumerKey: 'emptyString',
      }, (err, token) => {
        expect(token).to.equal('pizza');
        expect(err).to.be.null();
        done();
      });
    });

    it('should reject on error', async () => {
      axiosStub.rejects(new Error('thin crust'));
      try {
        const token = await authenticate.refreshToken({
          consumerKey: 'emptyString',
        });
        expect(token).to.be.undefined();
      } catch (err) {
        expect(err.message).to.equal('thin crust');
      }
    });

    it('should callback with error', (done) => {
      axiosStub.rejects(new Error('deep dish'));
      authenticate.refreshToken({
        consumerKey: 'emptyString',
      }, (err, token) => {
        expect(token).to.be.undefined();
        expect(err.message).to.equal('deep dish');
        done();
      });
    });
  });
});
