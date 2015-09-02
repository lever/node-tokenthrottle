var test = require("tape")

var Throttle = require("../")
var TokenBucket = require("../token_bucket")

test("Loaded", function (t) {
  t.plan(2)

  t.ok(Throttle, "Loaded Throttle module")
  t.ok(TokenBucket, "Loaded TokenBucket module")
})

test("TokenBucket", function (t) {
  t.plan(17)
  var bucket, copy

  bucket = TokenBucket({fillRate: 10, capacity: 10, window: 1000})
  t.equal(bucket.tokens, 10, "Tokens filled from capacity")

  bucket = TokenBucket({fillRate: "0", capacity: "11", window: "1000"})
  t.equal(bucket.tokens, 11, "Type fixes stringified numbers")

  t.ok(bucket.hasTokens(1), "hasTokens(1) is true for a bucket with tokens")
  t.equal(bucket.tokens, 11, "hasTokens doesn't remove any tokens.")

  t.ok(bucket.consume(1), "We can consume one from a bucket with tokens")
  t.equal(bucket.tokens, 10, "We've removed a token.")

  copy = TokenBucket(bucket)
  t.equal(copy.time, bucket.time, "inner field copied")
  t.equal(copy.tokens, bucket.tokens, "tokens copied")

  copy = TokenBucket(JSON.parse(JSON.stringify(bucket)))
  t.equal(copy.time, bucket.time, "inner field copied from raw object")
  t.equal(copy.tokens, bucket.tokens, "tokens copied from raw object")

  bucket = TokenBucket({fillRate: 0, capacity: 1, window: 1000})
  t.ok(bucket.hasTokens(1))
  t.ok(bucket.consume(1))
  t.notOk(bucket.hasTokens(1), "No tokens left.")
  t.notOk(bucket.consume(1), "No tokens left to consume.")

  bucket = TokenBucket({fillRate: 10, capacity: 10, window: 1000})
  t.ok(bucket.consume(1), "tokens available to")
  setTimeout(function () {
    t.ok(bucket.consume(1), "tokens available to consume")
    console.log(bucket.tokens)
    t.ok(bucket.tokens > 8 && bucket.tokens < 9, "Partially filled now upon consume")
  }, 10)
})

/**
 * Returns a rateLimit callback function that asserts that the rateLimit output
 * (passed into the returned callback) matches some expected value.
 * @param  {Object}   t              the "t" test object from tap
 * @param  {boolean}  expected       expected output of rateLimit
 * @param  {String}   failureMessage message to display in the assert on failure
 * @return {Function} a callback to pass to rateLimit
 */
var expectLimited = function (t, expected, failureMessage) {
  return function (err, limited) {
    t.notOk(err)
    t.equal(limited, expected, failureMessage)
  }
}

test("Throttle", function (t) {
  t.plan(10)

  var throttle = Throttle({rate: 3})
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", expectLimited(t, false, "Not throttled yet"))
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, true,  "Should now be throttled."))
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, false, "Throttle should be lifted."))
  }, 400)
})

test("Throttle peekRateLimit", function (t) {
  t.plan(14)

  var throttle = Throttle({rate: 2})

  var i = 0
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, false, "Not throttled yet (2 -> 1)"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.peekRateLimit("test", expectLimited(t, false, "Peek shouldn't affect rate limit"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.peekRateLimit("test", expectLimited(t, false, "Peek shouldn't affect rate limit"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.peekRateLimit("test", expectLimited(t, false, "Peek shouldn't affect rate limit"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, false, "Not throttled yet (1 -> 0)"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.peekRateLimit("test", expectLimited(t, true, "Should now be rate limited"))
  }, i++ * 10)
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, true, "Should now be rate limited"))
  }, i++ * 10)
})

test("Override", function (t) {
  t.plan(8)

  var throttle = Throttle({
    rate: 3,
    burst: 3,
    overrides: {
      test: {rate: 0, burst: 0}
    }
  })
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      // rateLimit calls the callback with `undefined` as result if there's no rate limit set
      throttle.rateLimit("test", expectLimited(t, undefined, "Not throttled yet"))
    }, i * 10)
  }
  setTimeout(function () {
    // rateLimit calls the callback with `undefined` as result if there's no rate limit set
    throttle.rateLimit("test", expectLimited(t, undefined, "This one never gets throttled."))
  }, 50)
})

test("Override rate only", function (t) {
  t.plan(8)

  var throttle = Throttle({
    rate: 3,
    burst: 3,
    overrides: {
      test: {rate: 0}
    }
  })
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      // rateLimit calls the callback with `undefined` as result if there's no rate limit set
      throttle.rateLimit("test", expectLimited(t, undefined, "Not throttled yet"))
    }, i * 10)
  }
  setTimeout(function () {
    // rateLimit calls the callback with `undefined` as result if there's no rate limit set
    throttle.rateLimit("test", expectLimited(t, undefined, "This one never gets throttled."))
  }, 50)
})

test("Different throttle window", function (t) {
  t.plan(10)

  var throttle = Throttle({rate: 1, burst: 3, window: 100})
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", expectLimited(t, false, "Not throttled yet"))
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, true, "Should now be throttled."))
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, false, "Throttle should be lifted."))
  }, 150)
})

test("Bad Options", function (t) {
  t.plan(4)

  t.throws(
    function () {
      Throttle()
    }, "No options")

  function HashTable() {}
  HashTable.prototype.put = function (key) {}
  HashTable.prototype.get = function () {}
  t.throws(
    function () {
      Throttle({rate: 1, burst: 3, window: 100, tokensTable: new HashTable()})
    }, "Bad table")

  t.throws(
    function () {
      Throttle({burst: 1})
    }, "Missing rate")

  t.throws(
    function () {
      Throttle({rate: "blue"})
    }, "Bad rate type")
})

test("Different Token Table", function (t) {
  t.plan(20)

  function HashTable() {}
  HashTable.prototype.put = function (key, bucket) {
    t.ok(1, "Running custom put")
    this.key = bucket
  }
  HashTable.prototype.get = function (key) {
    t.ok(1, "Running custom get")
    return this.key
  }
  var throttle = Throttle({rate: 1, burst: 3, window: 100, tokensTable: new HashTable()})
  var i = 0
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle.rateLimit("test", expectLimited(t, false, "Not throttled yet"))
    }, i * 10)
  }
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, true, "Should now be throttled."))
  }, 50)
  setTimeout(function () {
    throttle.rateLimit("test", expectLimited(t, false, "Throttle should be lifted."))
  }, 150)
})

test("Two Throttle instances", function (t) {
  t.plan(12)

  var throttle1 = Throttle({rate: 3})
  var throttle2 = Throttle({rate: 1})
  var i = 0
  // Test throttle2
  // This is so much cleaner with setImmediate... *sigh 0.8.x*
  setTimeout(function () {
    throttle2.rateLimit("test", function (err, limited) {
      t.notOk(err)
      t.notOk(limited, "throttle2 not throttled yet")
    })
  }, 0)
  setTimeout(function () {
    throttle2.rateLimit("test", function (err, limited) {
      t.notOk(err)
      t.ok(limited, "throttle2 should now be throttled")
    })
  }, 10)
  // Make sure throttle1 is independent of throttle2
  while (i++ < 3) {
    // This is so much cleaner with setImmediate... *sigh 0.8.x*
    setTimeout(function () {
      throttle1.rateLimit("test", function (err, limited) {
        t.notOk(err)
        t.notOk(limited, "throttle1 not throttled yet")
      })
    }, 20 + i)
  }
  setTimeout(function () {
    throttle1.rateLimit("test", function (err, limited) {
      t.notOk(err)
      t.ok(limited, "throttle1 should now be throttled")
    })
  }, 50)
})
