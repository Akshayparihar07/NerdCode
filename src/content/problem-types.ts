export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ProblemSlug =
  | "two-sum"
  | "contains-duplicate"
  | "valid-anagram"
  | "valid-parentheses"
  | "binary-search"
  | "merge-intervals"
  | "reverse-linked-list"
  | "min-stack"
  | "tree-level-order"
  | "number-of-islands"
  | "climbing-stairs"
  | "lru-cache";

export type Difficulty = "easy" | "medium";

export type ProblemCase = {
  readonly args: JsonValue[];
  readonly expected: JsonValue;
};

export type ProblemExample = ProblemCase & {
  readonly explanation: string;
};

export type ProblemAnalogy = {
  readonly scenario: string;
  readonly mapping: readonly string[];
  readonly useCases: readonly string[];
};

export type ProblemWalkthrough = {
  readonly approach: string;
  readonly steps: readonly string[];
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly solution: string;
};

export type Problem = {
  readonly slug: ProblemSlug;
  readonly order: number;
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly concepts: readonly string[];
  readonly statement: readonly string[];
  readonly examples: readonly ProblemExample[];
  readonly constraints: readonly string[];
  readonly functionName: string;
  readonly starterCode: string;
  readonly runnerCode: string;
  readonly analogy: ProblemAnalogy;
  readonly hints: readonly string[];
  readonly walkthrough: ProblemWalkthrough;
  readonly publicCases: readonly ProblemCase[];
};

export type ProblemMetadata = Pick<
  Problem,
  "slug" | "order" | "title" | "difficulty" | "concepts"
>;
