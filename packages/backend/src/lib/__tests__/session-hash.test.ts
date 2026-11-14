import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sessionHash } from "../session-hash.js";

const session = {
  user: { id: "u1", name: "Kim", email: "kim@x.test", image: null },
  session: { id: "s1", expiresAt: new Date("2030-01-01") },
};

describe("sessionHash", () => {
  it("is stable for the same session", () => {
    assert.equal(sessionHash(session), sessionHash(structuredClone(session)));
  });

  it("is safe in a cookie and short", () => {
    assert.match(sessionHash(session), /^[\w-]{16}$/);
  });

  it("ignores key order", () => {
    const reordered = { session: session.session, user: { image: null, email: "kim@x.test", name: "Kim", id: "u1" } };
    assert.equal(sessionHash(reordered), sessionHash(session));
  });

  it("changes when any field changes", () => {
    assert.notEqual(sessionHash({ ...session, user: { ...session.user, name: "Lee" } }), sessionHash(session));
    assert.notEqual(
      sessionHash({ ...session, session: { ...session.session, expiresAt: new Date("2031-01-01") } }),
      sessionHash(session)
    );
  });

  it("ignores what pick leaves out", () => {
    const renewed = { ...session, session: { ...session.session, expiresAt: new Date("2031-01-01") } };
    assert.equal(
      sessionHash(renewed, s => s.user),
      sessionHash(session, s => s.user)
    );
  });

  it("doesn't confuse values shifted between fields", () => {
    const a = { ...session, user: { ...session.user, name: "a", email: "b" } };
    const b = { ...session, user: { ...session.user, name: "ab", email: "" } };
    assert.notEqual(sessionHash(a), sessionHash(b));
  });
});
