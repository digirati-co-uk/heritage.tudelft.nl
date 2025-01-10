import { describe, expect, test } from "vitest";
import { treeFromDirectories } from "../../src/util/tree-from-directories";

describe("treeFromDirectories", () => {
  test("should return an empty object if no directories are passed", () => {
    const tree = treeFromDirectories([]);
    expect(tree).toEqual({});
  });

  test("should return a tree with one directory", () => {
    const tree = treeFromDirectories(["a"]);
    expect(tree).toEqual({ "": ["a"] });
  });

  test("should return a tree with two directories", () => {
    const tree = treeFromDirectories(["a", "b"]);
    expect(tree).toEqual({ "": ["a", "b"] });
  });

  test("should return a tree with two directories with a common parent", () => {
    const tree = treeFromDirectories(["a/b", "a/c"]);
    expect(tree).toEqual({ a: ["b", "c"] });
  });

  test("should return a tree with two directories with a common parent deeper", () => {
    const tree = treeFromDirectories(["a/b/b1", "a/b/b2", "a/c"]);
    expect(tree).toEqual({
      a: ["c"],
      "a/b": ["b1", "b2"],
    });
  });
});
