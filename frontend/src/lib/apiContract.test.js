// The browser tests' mock API must return what the real API returns: the
// same contract file is checked against the backend in
// backend/tests/test_contracts.py.
import { describe, expect, it } from "vitest";
import contract from "../../../contracts/api-responses.json";
import { CODING_RUN, CODING_SUBMIT, FORGOT_PASSWORD, SESSION, authResponse } from "../../e2e/responses.js";

const keys = (o) => Object.keys(o).sort();
const expected = (name) => [...contract[name]].sort();

describe("mock API responses match the API contract", () => {
  it("auth", () => {
    const body = authResponse("2026-10-02T00:00:00Z");
    expect(keys(body)).toEqual(expected("auth.cookie"));
    expect(keys(body.user)).toEqual(expected("auth.user"));
  });
  it("forgot password", () => expect(keys(FORGOT_PASSWORD)).toEqual(expected("forgot_password")));
  it("session start", () => expect(keys(SESSION)).toEqual(expected("session_start")));
  it("coding run", () => {
    expect(keys(CODING_RUN)).toEqual(expected("coding_run"));
    for (const r of CODING_RUN.results) expect(keys(r)).toEqual(expected("coding_run.result"));
  });
  it("coding submit", () => expect(keys(CODING_SUBMIT)).toEqual(expected("coding_submit")));
});
