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
