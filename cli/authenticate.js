#!/usr/bin/env node
/* eslint-disable no-console */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { authenticate, generateTokens } = require('../lib/authenticate');

const { argv } = yargs(hideBin(process.argv));

const consumerKey = argv.CONSUMER_KEY;
const uid = argv.UID;
const pw = argv.PW;

if (consumerKey === undefined) {
  console.log('CONSUMER_KEY is required');
  process.exit(1);
}

authenticate({
  consumerKey,
  uid,
  pw,
}).then(async (grant) => {
  console.log('authenticaton successful, retrieving tokens...');
  const tokens = await generateTokens({
    consumerKey,
    grant,
  });
  console.log(tokens);
  process.exit();
});
