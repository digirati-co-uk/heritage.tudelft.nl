import { describe, expect, test } from "vitest";
import { allDirectories } from "../../src/util/all-directories";

describe("allDirectories", () => {
  test("should return an empty array if no files are passed", () => {
    const dirs = allDirectories([]);
    expect(dirs).toEqual([]);
  });

  test("should return an array with one directory", () => {
    const dirs = allDirectories(["a"]);
    expect(dirs).toEqual(["a"]);
  });

  test("should return an array with two directories", () => {
    const dirs = allDirectories(["a", "b"]);
    expect(dirs).toEqual(["a", "b"]);
  });

  test("should return an array with two directories with a common parent", () => {
    const dirs = allDirectories(["a/b", "a/c"]);
    expect(dirs).toEqual(["a", "a/b", "a/c"]);
  });

  test("should return an array with two directories with a common parent deeper", () => {
    const dirs = allDirectories(["a/b/b1", "a/b/b2", "a/c"]);
    expect(dirs).toContain("a");
    expect(dirs).toContain("a/b");
    expect(dirs).toContain("a/b/b1");
    expect(dirs).toContain("a/b/b2");
    expect(dirs).toContain("a/c");
  });
});
