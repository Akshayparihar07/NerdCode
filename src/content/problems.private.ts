import "server-only";

import type { ProblemCase, ProblemSlug } from "./problem-types";

const HIDDEN_CASES: Readonly<Record<ProblemSlug, readonly ProblemCase[]>> = {
  "two-sum": [
    { args: [[2, 9, 5, 11], 14], expected: [1, 2] },
    { args: [[0, 4, 3, 0], 0], expected: [0, 3] },
    { args: [[-4, -7, -1, -9], -16], expected: [1, 3] },
    { args: [[1_000_000, -1_000_000, 8], 0], expected: [0, 1] },
    { args: [[6, 2, 9, 12], 15], expected: [0, 2] },
  ],
  "contains-duplicate": [
    { args: [[1]], expected: false },
    { args: [[-1, -2, -3, -1]], expected: true },
    { args: [[0, 1, 2, 3, 4, 5]], expected: false },
    { args: [[9, 8, 7, 6, 5, 5]], expected: true },
    { args: [[1_000_000_000, -1_000_000_000]], expected: false },
  ],
  "valid-anagram": [
    { args: ["aabbcc", "cbabca"], expected: true },
    { args: ["aacc", "ccac"], expected: false },
    { args: ["x", "x"], expected: true },
    { args: ["binary", "brainy"], expected: true },
    { args: ["listen", "silentt"], expected: false },
  ],
  "valid-parentheses": [
    { args: ["()[]{}"], expected: true },
    { args: ["("], expected: false },
    { args: ["]"], expected: false },
    { args: ["([{}]){}"], expected: true },
    { args: ["(((())))[]"], expected: true },
    { args: ["([)]"], expected: false },
  ],
  "binary-search": [
    { args: [[5], 5], expected: 0 },
    { args: [[5], 4], expected: -1 },
    { args: [[-9, -4, 0, 3, 12], -9], expected: 0 },
    { args: [[-9, -4, 0, 3, 12], 12], expected: 4 },
    { args: [[-9, -4, 0, 3, 12], 2], expected: -1 },
  ],
  "merge-intervals": [
    {
      args: [
        [
          [1, 10],
          [2, 3],
          [4, 8],
        ],
      ],
      expected: [[1, 10]],
    },
    { args: [[[5, 7]]], expected: [[5, 7]] },
    {
      args: [
        [
          [9, 12],
          [-5, -2],
          [-3, 1],
          [6, 6],
        ],
      ],
      expected: [
        [-5, 1],
        [6, 6],
        [9, 12],
      ],
    },
    {
      args: [
        [
          [1, 2],
          [4, 5],
          [7, 8],
        ],
      ],
      expected: [
        [1, 2],
        [4, 5],
        [7, 8],
      ],
    },
    {
      args: [
        [
          [3, 4],
          [1, 3],
          [1, 2],
        ],
      ],
      expected: [[1, 4]],
    },
  ],
  "reverse-linked-list": [
    { args: [[1, 2]], expected: [2, 1] },
    { args: [[-3, 0, 4]], expected: [4, 0, -3] },
    { args: [[5, 5, 5]], expected: [5, 5, 5] },
    { args: [[1, 2, 3, 4, 5, 6]], expected: [6, 5, 4, 3, 2, 1] },
  ],
  "min-stack": [
    {
      args: [[["push", -5], ["get_min"], ["top"], ["pop"]]],
      expected: [null, -5, -5, -5],
    },
    {
      args: [
        [
          ["push", 8],
          ["push", 3],
          ["push", 5],
          ["get_min"],
          ["pop"],
          ["get_min"],
        ],
      ],
      expected: [null, null, null, 3, 5, 3],
    },
    {
      args: [
        [
          ["push", 2],
          ["push", 1],
          ["push", 1],
          ["pop"],
          ["get_min"],
          ["pop"],
          ["get_min"],
        ],
      ],
      expected: [null, null, null, 1, 1, 1, 2],
    },
  ],
  "tree-level-order": [
    {
      args: [[1, 2, 3, null, 4, 5, null]],
      expected: [[1], [2, 3], [4, 5]],
    },
    { args: [[-1, null, 2, 3]], expected: [[-1], [2], [3]] },
    { args: [[1, 2, null, 3, null, 4]], expected: [[1], [2], [3], [4]] },
    { args: [[null]], expected: [] },
    { args: [[0, -1, 1]], expected: [[0], [-1, 1]] },
  ],
  "number-of-islands": [
    {
      args: [
        [
          ["1", "1", "1"],
          ["1", "1", "1"],
        ],
      ],
      expected: 1,
    },
    {
      args: [
        [
          ["1", "0", "0"],
          ["0", "1", "0"],
          ["0", "0", "1"],
        ],
      ],
      expected: 3,
    },
    {
      args: [
        [
          ["1", "0", "1", "1"],
          ["1", "0", "0", "1"],
        ],
      ],
      expected: 2,
    },
    { args: [[["1"]]], expected: 1 },
    { args: [[["0"]]], expected: 0 },
  ],
  "climbing-stairs": [
    { args: [2], expected: 2 },
    { args: [3], expected: 3 },
    { args: [5], expected: 8 },
    { args: [10], expected: 89 },
    { args: [20], expected: 10_946 },
    { args: [40], expected: 165_580_141 },
  ],
  "lru-cache": [
    {
      args: [
        1,
        [
          ["put", 1, 1],
          ["put", 2, 2],
          ["get", 1],
          ["get", 2],
        ],
      ],
      expected: [null, null, -1, 2],
    },
    {
      args: [
        2,
        [
          ["put", 1, 1],
          ["put", 2, 2],
          ["put", 1, 9],
          ["put", 3, 3],
          ["get", 2],
          ["get", 1],
        ],
      ],
      expected: [null, null, null, null, -1, 9],
    },
    {
      args: [
        3,
        [
          ["put", -1, 5],
          ["put", 0, 6],
          ["get", -1],
          ["get", 7],
        ],
      ],
      expected: [null, null, 5, -1],
    },
  ],
};

export function getHiddenCases(slug: string): readonly ProblemCase[] {
  return HIDDEN_CASES[slug as ProblemSlug] ?? [];
}
