/* Copyright (c) 2017 Devis, MIT License */

"use strict";
const test = require("node:test");
const assert = require("node:assert");
const devis = require("../index");

const rabbitOptions = {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: process.env.RABBITMQ_PORT || 5672,
    queue: "devis-test-" + process.pid
};

function promisify(fn, ...args) {
    return new Promise((resolve, reject) => {
        fn(...args, (err, res) => (err ? reject(err) : resolve(res)));
    });
}

test.before(async () => {
    devis.push({ method: "calculator", action: "add" }, (args, done) => {
        // Answer the first call last, so replies arrive out of order.
        setTimeout(() => done(null, args.ar1 + args.ar2), args.delay);
    });
    await promisify(devis.listenMQ, { rabbitmq: Object.assign({}, rabbitOptions) });
    await promisify(devis.clientMQ, { rabbitmq: Object.assign({}, rabbitOptions) });
});

test("a call gets the result of the remote handler", async () => {
    const res = await promisify(devis.callMQ, { queue: rabbitOptions.queue, method: "calculator", action: "add" }, { ar1: 1, ar2: 2, delay: 0 });
    assert.strictEqual(res, "3");
});

// 1.x shared one reply queue between callers, so concurrent calls could receive each other's results.
test("concurrent calls each receive their own result", async () => {
    const path = { method: "calculator", action: "add" };
    const results = await Promise.all([
        promisify(devis.callMQ, Object.assign({ queue: rabbitOptions.queue }, path), { ar1: 1, ar2: 1, delay: 200 }),
        promisify(devis.callMQ, Object.assign({ queue: rabbitOptions.queue }, path), { ar1: 10, ar2: 10, delay: 0 })
    ]);
    assert.deepStrictEqual(results, ["2", "20"]);
});

// Up to 2.0.0 an unknown pattern or a handler error crashed the server and the caller never got an answer.
test("an unknown pattern is answered with an error and the server keeps serving", async () => {
    await assert.rejects(promisify(devis.callMQ, { queue: rabbitOptions.queue, method: "calculator", action: "missing" }, {}), /No handle found/);
    const res = await promisify(devis.callMQ, { queue: rabbitOptions.queue, method: "calculator", action: "add" }, { ar1: 2, ar2: 2, delay: 0 });
    assert.strictEqual(res, "4");
});

test("an error from the remote handler reaches the caller", async () => {
    devis.push({ method: "calculator", action: "divide" }, (args, done) => {
        if (args.right === 0) return done("division by zero");
        done(null, args.left / args.right);
    });
    await assert.rejects(promisify(devis.callMQ, { queue: rabbitOptions.queue, method: "calculator", action: "divide" }, { left: 1, right: 0 }), /division by zero/);
});

// Callers on Devis 4 await calls instead of wrapping each one in a Promise.
test("a call without callback resolves the parsed result", async () => {
    const res = await devis.callMQ({ queue: rabbitOptions.queue, method: "calculator", action: "add" }, { ar1: 1, ar2: 2, delay: 0 });
    assert.strictEqual(res, 3);
});

test("a call without callback rejects with an Error carrying the remote error", async () => {
    const err = await devis.callMQ({ queue: rabbitOptions.queue, method: "calculator", action: "divide" }, { left: 1, right: 0 }).catch((e) => e);
    assert.ok(err instanceof Error);
    assert.strictEqual(err.message, "division by zero");
});
