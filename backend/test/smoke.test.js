const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

// validateId middleware — extracted inline copy of the guard in routes/notes.js.
// If that logic changes, this should change with it.
function makeValidateId() {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.statusCode = 400;
      res.body = { error: 'Invalid note id' };
      return;
    }
    next();
  };
}

test('validateId rejects a malformed id with 400', () => {
  const validateId = makeValidateId();
  const res = { statusCode: 200, body: null };
  let nextCalled = false;
  validateId({ params: { id: 'not-an-objectid' } }, res, () => (nextCalled = true));
  assert.equal(res.statusCode, 400);
  assert.equal(nextCalled, false);
});

test('validateId passes a well-formed ObjectId through', () => {
  const validateId = makeValidateId();
  let nextCalled = false;
  validateId({ params: { id: new mongoose.Types.ObjectId().toString() } }, {}, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test('requireEnv exits when a required var is missing', () => {
  const { requireEnv } = require('../config');
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    throw new Error('exit');
  };
  try {
    assert.throws(() => requireEnv(['DEFINITELY_NOT_SET_' + Date.now()]));
    assert.equal(exitCode, 1);
  } finally {
    process.exit = originalExit;
  }
});
