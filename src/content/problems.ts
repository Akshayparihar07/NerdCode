import type { Problem, ProblemMetadata, ProblemSlug } from "./problem-types";

export const PROBLEMS: readonly Problem[] = [
  {
    slug: "two-sum",
    order: 1,
    title: "Two Sum",
    difficulty: "easy",
    concepts: ["Arrays", "Hash maps"],
    statement: [
      "You are given a list of transaction amounts and a target balance. Find two different positions whose values add to the target.",
      "Exactly one valid pair exists. Return its zero-based indices in increasing order; the same position cannot be used twice.",
    ],
    examples: [
      {
        args: [[4, 12, 7, 3], 10],
        expected: [2, 3],
        explanation: "The values at positions 2 and 3 are 7 and 3.",
      },
      {
        args: [[5, 5], 10],
        expected: [0, 1],
        explanation:
          "Equal values are allowed when they come from different positions.",
      },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10,000",
      "-1,000,000 ≤ nums[i], target ≤ 1,000,000",
      "Exactly one pair produces the target.",
    ],
    functionName: "two_sum",
    starterCode: `def two_sum(nums, target):
    # Return the two matching indices.
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return two_sum(args[0], args[1])`,
    analogy: {
      scenario:
        "A payment service must match two unsettled ledger entries that together explain a reconciliation difference.",
      mapping: [
        "Each number is a ledger entry and the target is the unexplained balance.",
        "The hash map is an index from an amount already seen to its transaction position.",
        "Looking for target - amount is the same complement lookup used during reconciliation.",
      ],
      useCases: [
        "Reconciling payments and refunds",
        "Pairing resources to meet a capacity target",
        "Finding complementary product bundles",
      ],
    },
    hints: [
      "For the current value, compute the one value that would complete the target.",
      "Store each visited value with its index so a complement lookup is constant time.",
      "Check for the complement before storing the current value; that prevents reusing one position.",
    ],
    walkthrough: {
      approach:
        "Scan once while remembering the position of every earlier amount in a hash map.",
      steps: [
        "Create an empty map from amount to index.",
        "For each amount, calculate target minus that amount.",
        "If the complement is in the map, return its index and the current index.",
        "Otherwise save the current amount and continue.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      solution: `def two_sum(nums, target):
    seen = {}
    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]
        seen[value] = index
    return []`,
    },
    publicCases: [
      { args: [[4, 12, 7, 3], 10], expected: [2, 3] },
      { args: [[5, 5], 10], expected: [0, 1] },
      { args: [[-8, 1, 9, 14], 6], expected: [0, 3] },
    ],
  },
  {
    slug: "contains-duplicate",
    order: 2,
    title: "Contains Duplicate",
    difficulty: "easy",
    concepts: ["Arrays", "Sets"],
    statement: [
      "Given a sequence of integer event IDs, report whether any ID occurs more than once.",
      "Return true as soon as a repeated ID can be proven; otherwise return false after examining the entire sequence.",
    ],
    examples: [
      {
        args: [[41, 8, 19, 8]],
        expected: true,
        explanation: "Event ID 8 appears at two different positions.",
      },
      {
        args: [[3, 6, 9]],
        expected: false,
        explanation: "Every event ID is unique.",
      },
    ],
    constraints: [
      "0 ≤ nums.length ≤ 100,000",
      "-1,000,000,000 ≤ nums[i] ≤ 1,000,000,000",
    ],
    functionName: "contains_duplicate",
    starterCode: `def contains_duplicate(nums):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return contains_duplicate(args[0])`,
    analogy: {
      scenario:
        "An event pipeline receives delivery IDs and must notice when a retried message has already appeared.",
      mapping: [
        "Each number is an event's idempotency key.",
        "The set represents keys the consumer has already processed.",
        "A membership hit signals a duplicate delivery before it changes state twice.",
      ],
      useCases: [
        "Deduplicating message-queue deliveries",
        "Rejecting repeated import records",
        "Spotting duplicate telemetry packets",
      ],
    },
    hints: [
      "You only need to remember whether a value appeared, not where it appeared.",
      "A set gives average O(1) membership checks.",
      "Compare against the set before inserting the current value.",
    ],
    walkthrough: {
      approach:
        "Keep a set of IDs already observed during one left-to-right scan.",
      steps: [
        "Start with an empty set.",
        "If the current number is already present, return true.",
        "Otherwise add it; return false if the scan finishes.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      solution: `def contains_duplicate(nums):
    seen = set()
    for value in nums:
        if value in seen:
            return True
        seen.add(value)
    return False`,
    },
    publicCases: [
      { args: [[41, 8, 19, 8]], expected: true },
      { args: [[3, 6, 9]], expected: false },
      { args: [[]], expected: false },
    ],
  },
  {
    slug: "valid-anagram",
    order: 3,
    title: "Valid Anagram",
    difficulty: "easy",
    concepts: ["Strings", "Frequency maps"],
    statement: [
      "Two lowercase labels are equivalent when one can be rearranged to form the other.",
      "Return true when both labels contain every letter the same number of times, and false otherwise.",
    ],
    examples: [
      {
        args: ["secure", "rescue"],
        expected: true,
        explanation: "Both labels contain exactly the same six letters.",
      },
      {
        args: ["state", "tastee"],
        expected: false,
        explanation: "The second label has an extra e.",
      },
    ],
    constraints: [
      "0 ≤ text.length, candidate.length ≤ 100,000",
      "Both strings contain lowercase English letters only.",
    ],
    functionName: "valid_anagram",
    starterCode: `def valid_anagram(text, candidate):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return valid_anagram(args[0], args[1])`,
    analogy: {
      scenario:
        "An inventory service compares two shipment manifests by item counts rather than by the order in which items were scanned.",
      mapping: [
        "Characters stand for item codes in two manifests.",
        "A frequency map is the compact inventory for one manifest.",
        "Matching counts prove the same contents even when arrival order differs.",
      ],
      useCases: [
        "Reconciling unordered inventory batches",
        "Building simple text fingerprints",
        "Comparing categorical feature distributions",
      ],
    },
    hints: [
      "Different lengths can never be rearrangements of each other.",
      "Count each letter in the first string, then remove counts using the second.",
      "If a count is missing or drops below zero, the strings differ.",
    ],
    walkthrough: {
      approach:
        "Balance character counts: increment for the first label and decrement for the second.",
      steps: [
        "Reject strings with different lengths.",
        "Build a frequency map for the first string.",
        "Consume one stored count for every character in the second string.",
        "Reject a missing character; otherwise all counts balance.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(k), where k is the alphabet size",
      solution: `def valid_anagram(text, candidate):
    if len(text) != len(candidate):
        return False
    counts = {}
    for char in text:
        counts[char] = counts.get(char, 0) + 1
    for char in candidate:
        if counts.get(char, 0) == 0:
            return False
        counts[char] -= 1
    return True`,
    },
    publicCases: [
      { args: ["secure", "rescue"], expected: true },
      { args: ["state", "tastee"], expected: false },
      { args: ["", ""], expected: true },
    ],
  },
  {
    slug: "valid-parentheses",
    order: 4,
    title: "Valid Parentheses",
    difficulty: "easy",
    concepts: ["Strings", "Stacks"],
    statement: [
      "A configuration fragment contains only round, square, and curly brackets. Decide whether every opening bracket is closed by the same kind in the correct nesting order.",
      "Adjacent groups are allowed, and an empty fragment is valid.",
    ],
    examples: [
      {
        args: ["{[()]}"],
        expected: true,
        explanation: "Every nested block closes in reverse opening order.",
      },
      {
        args: ["{[(])}"],
        expected: false,
        explanation:
          "The round block is closed while a square block is on top.",
      },
    ],
    constraints: [
      "0 ≤ sequence.length ≤ 100,000",
      "sequence contains only ()[]{}.",
    ],
    functionName: "valid_parentheses",
    starterCode: `def valid_parentheses(sequence):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return valid_parentheses(args[0])`,
    analogy: {
      scenario:
        "A parser must verify that nested configuration sections finish in the reverse order in which they began.",
      mapping: [
        "An opening bracket starts a parser context.",
        "The stack holds contexts that are still waiting to close.",
        "A closing bracket must match the most recently opened context.",
      ],
      useCases: [
        "Parsing programming languages",
        "Validating structured configuration",
        "Tracking nested UI or document nodes",
      ],
    },
    hints: [
      "When a block opens, remember it until a closing token arrives.",
      "Only the most recently opened unfinished block can close next.",
      "Map each closing token to its expected opening token.",
    ],
    walkthrough: {
      approach: "Use a stack to mirror the nesting of unfinished blocks.",
      steps: [
        "Push every opening bracket.",
        "For a closing bracket, reject an empty stack or a mismatched top.",
        "Pop a matching opening bracket.",
        "Accept only when the stack is empty after the scan.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      solution: `def valid_parentheses(sequence):
    opening_for = {')': '(', ']': '[', '}': '{'}
    stack = []
    for token in sequence:
        if token in opening_for:
            if not stack or stack.pop() != opening_for[token]:
                return False
        else:
            stack.append(token)
    return not stack`,
    },
    publicCases: [
      { args: ["{[()]}"], expected: true },
      { args: ["{[(])}"], expected: false },
      { args: [""], expected: true },
    ],
  },
  {
    slug: "binary-search",
    order: 5,
    title: "Binary Search",
    difficulty: "easy",
    concepts: ["Arrays", "Binary search", "Search invariants"],
    statement: [
      "An ascending list contains unique integer checkpoints. Return the zero-based position of a requested checkpoint.",
      "If the checkpoint is absent, return -1. Your solution should repeatedly discard half of the remaining search range.",
    ],
    examples: [
      {
        args: [[1, 4, 8, 13, 21], 13],
        expected: 3,
        explanation: "Checkpoint 13 is stored at index 3.",
      },
      {
        args: [[1, 4, 8, 13, 21], 7],
        expected: -1,
        explanation:
          "Seven lies between stored checkpoints but is not present.",
      },
    ],
    constraints: [
      "0 ≤ numbers.length ≤ 100,000",
      "numbers is strictly increasing.",
      "-1,000,000,000 ≤ numbers[i], target ≤ 1,000,000,000",
    ],
    functionName: "binary_search",
    starterCode: `def binary_search(numbers, target):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return binary_search(args[0], args[1])`,
    analogy: {
      scenario:
        "A database index stores ordered keys, allowing a lookup to choose one half of the index at every comparison.",
      mapping: [
        "The sorted array behaves like one level of an ordered index.",
        "The midpoint key tells the lookup which half could still contain the target.",
        "The left and right bounds describe the only range still possible.",
      ],
      useCases: [
        "Searching ordered database indexes",
        "Finding a configuration threshold",
        "Locating a timestamp in sorted telemetry",
      ],
    },
    hints: [
      "Track an inclusive range in which the target could still exist.",
      "Compare the middle value with the target, then keep only the possible half.",
      "Use left <= right so a one-element range is still checked.",
    ],
    walkthrough: {
      approach:
        "Maintain an inclusive search interval and halve it until the value is found or the interval disappears.",
      steps: [
        "Set left to the first index and right to the last.",
        "Compare the midpoint value with the target.",
        "Return the midpoint on equality; otherwise move the appropriate boundary past it.",
        "Return -1 when left moves beyond right.",
      ],
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      solution: `def binary_search(numbers, target):
    left, right = 0, len(numbers) - 1
    while left <= right:
        middle = left + (right - left) // 2
        if numbers[middle] == target:
            return middle
        if numbers[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    return -1`,
    },
    publicCases: [
      { args: [[1, 4, 8, 13, 21], 13], expected: 3 },
      { args: [[1, 4, 8, 13, 21], 7], expected: -1 },
      { args: [[], 5], expected: -1 },
    ],
  },
  {
    slug: "merge-intervals",
    order: 6,
    title: "Merge Intervals",
    difficulty: "medium",
    concepts: ["Arrays", "Sorting", "Intervals"],
    statement: [
      "You receive inclusive reservation windows as [start, end] pairs. Combine every pair of windows that overlaps or touches.",
      "Return the consolidated windows ordered by start time. The input order is arbitrary.",
    ],
    examples: [
      {
        args: [
          [
            [8, 10],
            [1, 4],
            [3, 6],
            [12, 15],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [12, 15],
        ],
        explanation: "The windows [1, 4] and [3, 6] overlap.",
      },
      {
        args: [
          [
            [2, 5],
            [5, 9],
          ],
        ],
        expected: [[2, 9]],
        explanation:
          "Inclusive windows touching at 5 belong to one reservation.",
      },
    ],
    constraints: [
      "0 ≤ intervals.length ≤ 10,000",
      "Each interval has exactly two integers.",
      "-1,000,000 ≤ start ≤ end ≤ 1,000,000",
    ],
    functionName: "merge_intervals",
    starterCode: `def merge_intervals(intervals):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return merge_intervals(args[0])`,
    analogy: {
      scenario:
        "A room-booking service compresses overlapping reservations before calculating when the room is actually occupied.",
      mapping: [
        "Each interval is one claimed span on a shared timeline.",
        "Sorting creates chronological order so only the latest merged span needs inspection.",
        "Extending an end time combines reservations with no free gap between them.",
      ],
      useCases: [
        "Calendar availability",
        "Compute-cluster reservation windows",
        "Combining covered ranges in logs or storage",
      ],
    },
    hints: [
      "First arrange the intervals by their start time.",
      "After sorting, a new interval can overlap only the last merged interval.",
      "On overlap, keep the earlier start and the larger end.",
    ],
    walkthrough: {
      approach:
        "Sort by start time, then grow a result list whose intervals never overlap.",
      steps: [
        "Return an empty list for empty input.",
        "Sort copies of the windows by start and then end.",
        "Append a window when it starts after the last merged end.",
        "Otherwise extend the last end to the larger end.",
      ],
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n) for the returned windows",
      solution: `def merge_intervals(intervals):
    merged = []
    for start, end in sorted(intervals):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return merged`,
    },
    publicCases: [
      {
        args: [
          [
            [8, 10],
            [1, 4],
            [3, 6],
            [12, 15],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [12, 15],
        ],
      },
      {
        args: [
          [
            [2, 5],
            [5, 9],
          ],
        ],
        expected: [[2, 9]],
      },
      { args: [[]], expected: [] },
    ],
  },
  {
    slug: "reverse-linked-list",
    order: 7,
    title: "Reverse Linked List",
    difficulty: "easy",
    concepts: ["Linked lists", "Pointers"],
    statement: [
      "A singly linked processing chain points from each node to the next. Reverse every link and return the new head.",
      "The editor receives a ListNode class. Your function receives either a ListNode or None; the platform converts JSON arrays to nodes and converts your result back to an array.",
    ],
    examples: [
      {
        args: [[2, 7, 1, 8]],
        expected: [8, 1, 7, 2],
        explanation:
          "Following next pointers from the returned head visits the original nodes backward.",
      },
      {
        args: [[]],
        expected: [],
        explanation: "An empty chain remains empty.",
      },
    ],
    constraints: [
      "0 ≤ node count ≤ 10,000",
      "-1,000,000 ≤ node value ≤ 1,000,000",
      "The input contains no cycle.",
    ],
    functionName: "reverse_linked_list",
    starterCode: `class ListNode:
    def __init__(self, value=0, next_node=None):
        self.value = value
        self.next = next_node


def reverse_linked_list(head):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    values = args[0]
    head = None
    tail = None
    for value in values:
        node = ListNode(value)
        if head is None:
            head = node
        else:
            tail.next = node
        tail = node

    node = reverse_linked_list(head)
    result = []
    while node is not None:
        if len(result) >= len(values):
            raise ValueError("returned list contains a cycle or extra nodes")
        result.append(node.value)
        node = node.next
    return result`,
    analogy: {
      scenario:
        "A recovery tool needs to walk a one-way chain of log segments in the opposite direction without allocating a second chain.",
      mapping: [
        "Each node is one segment and next is its forward reference.",
        "Previous stores the rebuilt backward reference.",
        "Saving next before rewiring prevents losing the unprocessed remainder.",
      ],
      useCases: [
        "Reversing chained log or history records",
        "Undoing a linked workflow",
        "Manipulating free lists in memory managers",
      ],
    },
    hints: [
      "You need references to the reversed prefix and the unprocessed suffix.",
      "Save the current node's next reference before changing it.",
      "Move three references forward: previous, current, and saved next.",
    ],
    walkthrough: {
      approach:
        "Iteratively redirect each next pointer toward the already reversed prefix.",
      steps: [
        "Start previous at None and current at the old head.",
        "Save current.next, then point current.next to previous.",
        "Advance previous to current and current to the saved node.",
        "Return previous after current reaches None.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      solution: `class ListNode:
    def __init__(self, value=0, next_node=None):
        self.value = value
        self.next = next_node


def reverse_linked_list(head):
    previous = None
    current = head
    while current is not None:
        next_node = current.next
        current.next = previous
        previous = current
        current = next_node
    return previous`,
    },
    publicCases: [
      { args: [[2, 7, 1, 8]], expected: [8, 1, 7, 2] },
      { args: [[]], expected: [] },
      { args: [[42]], expected: [42] },
    ],
  },
  {
    slug: "min-stack",
    order: 8,
    title: "Min Stack",
    difficulty: "medium",
    concepts: ["Stacks", "Augmented data structures"],
    statement: [
      "Implement a stack that supports push, pop, top, and get_min, with every operation taking constant time.",
      'The provided run_min_stack function receives operations such as ["push", 7], ["pop"], ["top"], and ["get_min"]. It returns one output per operation: null for push, the removed value for pop, and the requested value for top or get_min.',
    ],
    examples: [
      {
        args: [[["push", 6], ["push", 2], ["get_min"], ["pop"], ["top"]]],
        expected: [null, null, 2, 2, 6],
        explanation:
          "The minimum is 2 until that value is popped, leaving 6 on top.",
      },
      {
        args: [[["push", 3], ["push", 3], ["pop"], ["get_min"]]],
        expected: [null, null, 3, 3],
        explanation: "Duplicate minimum values must be tracked independently.",
      },
    ],
    constraints: [
      "1 ≤ operations.length ≤ 10,000",
      "push values are integers between -1,000,000 and 1,000,000.",
      "pop, top, and get_min are called only when the stack is non-empty.",
    ],
    functionName: "run_min_stack",
    starterCode: `class MinStack:
    def __init__(self):
        pass

    def push(self, value):
        pass

    def pop(self):
        pass

    def top(self):
        pass

    def get_min(self):
        pass


def run_min_stack(operations):
    stack = MinStack()
    outputs = []
    for operation in operations:
        name = operation[0]
        if name == "push":
            stack.push(operation[1])
            outputs.append(None)
        elif name == "pop":
            outputs.append(stack.pop())
        elif name == "top":
            outputs.append(stack.top())
        else:
            outputs.append(stack.get_min())
    return outputs`,
    runnerCode: `def __nerdcode_run(args):
    return run_min_stack(args[0])`,
    analogy: {
      scenario:
        "A deployment console adds latency samples for successive checkpoints and must recover the lowest remaining value whenever the newest checkpoint is rolled back.",
      mapping: [
        "The stack represents samples in last-in, first-out order.",
        "Each entry carries the minimum for the prefix beneath it.",
        "The top entry therefore answers both latest value and current minimum.",
      ],
      useCases: [
        "Rollback-aware telemetry minima",
        "Expression evaluators with aggregate state",
        "Backtracking while preserving the best score",
      ],
    },
    hints: [
      "A single stored minimum is hard to repair when that value is popped.",
      "Store the minimum-so-far alongside every pushed value.",
      "The new minimum is min(value, the previous top's stored minimum).",
    ],
    walkthrough: {
      approach:
        "Store pairs of [value, minimum_at_this_depth], making the current minimum part of the stack's top state.",
      steps: [
        "On push, compare the new value with the previous stored minimum.",
        "Append both the value and the resulting minimum.",
        "Pop and top use the pair's value.",
        "get_min reads the pair's stored minimum.",
      ],
      timeComplexity: "O(1) per operation",
      spaceComplexity: "O(n)",
      solution: `class MinStack:
    def __init__(self):
        self.items = []

    def push(self, value):
        current_min = value if not self.items else min(value, self.items[-1][1])
        self.items.append([value, current_min])

    def pop(self):
        return self.items.pop()[0]

    def top(self):
        return self.items[-1][0]

    def get_min(self):
        return self.items[-1][1]


def run_min_stack(operations):
    stack = MinStack()
    outputs = []
    for operation in operations:
        name = operation[0]
        if name == "push":
            stack.push(operation[1])
            outputs.append(None)
        elif name == "pop":
            outputs.append(stack.pop())
        elif name == "top":
            outputs.append(stack.top())
        else:
            outputs.append(stack.get_min())
    return outputs`,
    },
    publicCases: [
      {
        args: [[["push", 6], ["push", 2], ["get_min"], ["pop"], ["top"]]],
        expected: [null, null, 2, 2, 6],
      },
      {
        args: [[["push", 3], ["push", 3], ["pop"], ["get_min"]]],
        expected: [null, null, 3, 3],
      },
    ],
  },
  {
    slug: "tree-level-order",
    order: 9,
    title: "Tree Level Order",
    difficulty: "medium",
    concepts: ["Trees", "Breadth-first search", "Queues"],
    statement: [
      "Return the values of a binary tree grouped by depth, starting with the root level and reading each level from left to right.",
      "The platform builds the tree from a level-order JSON array where null marks a missing child. Your function receives a TreeNode or None.",
    ],
    examples: [
      {
        args: [[5, 3, 8, 1, 4, null, 9]],
        expected: [[5], [3, 8], [1, 4, 9]],
        explanation: "Nodes are grouped by their distance from the root.",
      },
      {
        args: [[]],
        expected: [],
        explanation: "A missing root has no levels.",
      },
    ],
    constraints: [
      "0 ≤ node count ≤ 10,000",
      "-1,000,000 ≤ node value ≤ 1,000,000",
      "The input array is a valid level-order tree representation.",
    ],
    functionName: "level_order",
    starterCode: `class TreeNode:
    def __init__(self, value=0, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right


def level_order(root):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    values = args[0]
    if not values or values[0] is None:
        root = None
    else:
        root = TreeNode(values[0])
        parents = [root]
        parent_index = 0
        value_index = 1
        while parent_index < len(parents) and value_index < len(values):
            parent = parents[parent_index]
            parent_index += 1
            if value_index < len(values):
                left_value = values[value_index]
                value_index += 1
                if left_value is not None:
                    parent.left = TreeNode(left_value)
                    parents.append(parent.left)
            if value_index < len(values):
                right_value = values[value_index]
                value_index += 1
                if right_value is not None:
                    parent.right = TreeNode(right_value)
                    parents.append(parent.right)
    return level_order(root)`,
    analogy: {
      scenario:
        "A directory service renders an organization chart one reporting layer at a time, from leadership down to individual teams.",
      mapping: [
        "Each tree node is one person or organizational unit.",
        "The queue holds the next reporting layer in left-to-right order.",
        "Processing the current queue length creates a clean boundary between depths.",
      ],
      useCases: [
        "Rendering organization and filesystem trees",
        "Finding minimum-hop paths",
        "Layer-wise model or dependency inspection",
      ],
    },
    hints: [
      "Depth-first traversal can work, but a queue naturally visits one depth at a time.",
      "At the start of a level, record how many nodes are currently waiting.",
      "Process exactly that many nodes before appending the next level.",
    ],
    walkthrough: {
      approach:
        "Use breadth-first search, turning the current list of nodes into the next list one level at a time.",
      steps: [
        "Return an empty list when the root is missing.",
        "Start the current level with the root.",
        "Collect its values while adding each existing child to the next level.",
        "Repeat until no nodes remain.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(w), where w is the maximum tree width",
      solution: `from collections import deque


class TreeNode:
    def __init__(self, value=0, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right


def level_order(root):
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.value)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result`,
    },
    publicCases: [
      {
        args: [[5, 3, 8, 1, 4, null, 9]],
        expected: [[5], [3, 8], [1, 4, 9]],
      },
      { args: [[]], expected: [] },
      { args: [[11]], expected: [[11]] },
    ],
  },
  {
    slug: "number-of-islands",
    order: 10,
    title: "Number of Islands",
    difficulty: "medium",
    concepts: ["Matrices", "Graph traversal", "Flood fill"],
    statement: [
      'A rectangular map uses "1" for active land and "0" for water. Count the separate land regions.',
      "Cells belong to the same region when connected vertically or horizontally; diagonal contact does not connect them.",
    ],
    examples: [
      {
        args: [
          [
            ["1", "1", "0"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        ],
        expected: 3,
        explanation:
          "The top cluster and the two isolated bottom cells form three regions.",
      },
      {
        args: [
          [
            ["0", "0"],
            ["0", "0"],
          ],
        ],
        expected: 0,
        explanation: "There are no active cells.",
      },
    ],
    constraints: [
      "0 ≤ rows, columns ≤ 300",
      "Every row has the same length.",
      'Each cell is either "0" or "1".',
    ],
    functionName: "count_islands",
    starterCode: `def count_islands(grid):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    grid = [row[:] for row in args[0]]
    return count_islands(grid)`,
    analogy: {
      scenario:
        "A vision pipeline groups neighboring foreground pixels into separate objects before extracting features from each object.",
      mapping: [
        "The matrix is an image mask or a map.",
        "Every land cell is a graph node connected to four possible neighbors.",
        "Flood fill marks one complete connected component at a time.",
      ],
      useCases: [
        "Connected-component image segmentation",
        "Discovering network clusters",
        "Grouping adjacent regions on geographic grids",
      ],
    },
    hints: [
      "Each unvisited land cell starts exactly one new region.",
      "From that cell, visit every reachable vertical and horizontal neighbor.",
      "Mark cells as visited in the grid or in a separate set so none are counted twice.",
    ],
    walkthrough: {
      approach:
        "Scan the grid and flood-fill every unvisited land cell, counting one component per new fill.",
      steps: [
        "Visit every row and column.",
        "When a land cell appears, increment the count and place it on a stack.",
        "Change each reached land cell to water and add its land neighbors.",
        "Continue the outer scan after that component is exhausted.",
      ],
      timeComplexity: "O(rows × columns)",
      spaceComplexity: "O(rows × columns) in the worst case",
      solution: `def count_islands(grid):
    if not grid or not grid[0]:
        return 0
    rows, columns = len(grid), len(grid[0])
    count = 0
    for row in range(rows):
        for column in range(columns):
            if grid[row][column] != "1":
                continue
            count += 1
            grid[row][column] = "0"
            stack = [(row, column)]
            while stack:
                current_row, current_column = stack.pop()
                for next_row, next_column in (
                    (current_row - 1, current_column),
                    (current_row + 1, current_column),
                    (current_row, current_column - 1),
                    (current_row, current_column + 1),
                ):
                    if (
                        0 <= next_row < rows
                        and 0 <= next_column < columns
                        and grid[next_row][next_column] == "1"
                    ):
                        grid[next_row][next_column] = "0"
                        stack.append((next_row, next_column))
    return count`,
    },
    publicCases: [
      {
        args: [
          [
            ["1", "1", "0"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        ],
        expected: 3,
      },
      {
        args: [
          [
            ["0", "0"],
            ["0", "0"],
          ],
        ],
        expected: 0,
      },
      { args: [[]], expected: 0 },
    ],
  },
  {
    slug: "climbing-stairs",
    order: 11,
    title: "Climbing Stairs",
    difficulty: "easy",
    concepts: ["Dynamic programming", "Recurrence relations"],
    statement: [
      "A robot must climb exactly n levels. On each move it can climb either one level or two levels.",
      "Return the number of distinct move sequences that reach level n.",
    ],
    examples: [
      {
        args: [4],
        expected: 5,
        explanation:
          "The five plans use step sizes 1111, 112, 121, 211, and 22.",
      },
      {
        args: [1],
        expected: 1,
        explanation: "Only one single-level move is possible.",
      },
    ],
    constraints: ["1 ≤ n ≤ 40"],
    functionName: "count_routes",
    starterCode: `def count_routes(n):
    pass`,
    runnerCode: `def __nerdcode_run(args):
    return count_routes(args[0])`,
    analogy: {
      scenario:
        "A planner counts valid ways to complete a workflow when the final action can advance one stage or skip directly across two.",
      mapping: [
        "Each level is a smaller planning state.",
        "A route to level n must end after a route to n - 1 or n - 2.",
        "Saving those smaller results avoids rebuilding the same route tree repeatedly.",
      ],
      useCases: [
        "Counting bounded workflow paths",
        "Sequence models with local state transitions",
        "Estimating combinations in staged planning",
      ],
    },
    hints: [
      "Classify every route by the size of its final move.",
      "The answer for n is the sum of the answers for n - 1 and n - 2.",
      "Only the previous two answers are needed at any moment.",
    ],
    walkthrough: {
      approach:
        "Build the recurrence iteratively while retaining just the last two route counts.",
      steps: [
        "Use 1 route for level 1 and 2 routes for level 2.",
        "For each later level, add the previous two counts.",
        "Shift the saved pair forward.",
        "Return the count for n.",
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      solution: `def count_routes(n):
    if n <= 2:
        return n
    previous, current = 1, 2
    for _ in range(3, n + 1):
        previous, current = current, previous + current
    return current`,
    },
    publicCases: [
      { args: [4], expected: 5 },
      { args: [1], expected: 1 },
      { args: [7], expected: 21 },
    ],
  },
  {
    slug: "lru-cache",
    order: 12,
    title: "LRU Cache",
    difficulty: "medium",
    concepts: ["Hash maps", "Doubly linked lists", "Caching"],
    statement: [
      "Implement a fixed-capacity least-recently-used cache with get and put operations that each run in constant time.",
      'run_lru_cache receives a capacity and operations such as ["put", key, value] or ["get", key]. Return null for every put, the stored value for a cache hit, and -1 for a miss. Reading or updating a key makes it most recently used.',
    ],
    examples: [
      {
        args: [
          2,
          [
            ["put", 1, 10],
            ["put", 2, 20],
            ["get", 1],
            ["put", 3, 30],
            ["get", 2],
          ],
        ],
        expected: [null, null, 10, null, -1],
        explanation:
          "Reading key 1 makes key 2 the least recent, so adding key 3 evicts key 2.",
      },
    ],
    constraints: [
      "1 ≤ capacity ≤ 1,000",
      "1 ≤ operations.length ≤ 10,000",
      "Keys and values are integers between -1,000,000 and 1,000,000.",
    ],
    functionName: "run_lru_cache",
    starterCode: `class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.previous = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        pass

    def get(self, key):
        pass

    def put(self, key, value):
        pass


def run_lru_cache(capacity, operations):
    cache = LRUCache(capacity)
    outputs = []
    for operation in operations:
        if operation[0] == "put":
            cache.put(operation[1], operation[2])
            outputs.append(None)
        else:
            outputs.append(cache.get(operation[1]))
    return outputs`,
    runnerCode: `def __nerdcode_run(args):
    return run_lru_cache(args[0], args[1])`,
    analogy: {
      scenario:
        "An API gateway keeps a small response cache and discards the entry that clients have ignored for the longest time whenever space runs out.",
      mapping: [
        "The hash map locates a cached key without scanning.",
        "The linked list orders entries from stalest to most recently used.",
        "Removing and reattaching a node records a hit without moving other entries.",
      ],
      useCases: [
        "API and database query caches",
        "Operating-system page replacement",
        "Keeping a bounded set of model features or embeddings",
      ],
    },
    hints: [
      "A map provides fast lookup but does not cheaply maintain usage order by itself.",
      "A doubly linked list can remove a known node and append it to the recent end in O(1).",
      "Use two sentinel nodes so removing the least-recent real node has no edge cases.",
    ],
    walkthrough: {
      approach:
        "Combine a key-to-node map with a doubly linked list ordered from least to most recently used.",
      steps: [
        "Place sentinel nodes before and after all real cache nodes.",
        "On get, find the node in the map, move it to the recent end, and return its value.",
        "On put, update and move an existing node or append a new one.",
        "When capacity is exceeded, detach the first real node and remove its key from the map.",
      ],
      timeComplexity: "O(1) per get or put",
      spaceComplexity: "O(capacity)",
      solution: `class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.previous = None
        self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.nodes = {}
        self.oldest = Node()
        self.newest = Node()
        self.oldest.next = self.newest
        self.newest.previous = self.oldest

    def _detach(self, node):
        node.previous.next = node.next
        node.next.previous = node.previous

    def _make_recent(self, node):
        previous = self.newest.previous
        previous.next = node
        node.previous = previous
        node.next = self.newest
        self.newest.previous = node

    def get(self, key):
        node = self.nodes.get(key)
        if node is None:
            return -1
        self._detach(node)
        self._make_recent(node)
        return node.value

    def put(self, key, value):
        node = self.nodes.get(key)
        if node is not None:
            node.value = value
            self._detach(node)
            self._make_recent(node)
            return
        node = Node(key, value)
        self.nodes[key] = node
        self._make_recent(node)
        if len(self.nodes) > self.capacity:
            expired = self.oldest.next
            self._detach(expired)
            del self.nodes[expired.key]


def run_lru_cache(capacity, operations):
    cache = LRUCache(capacity)
    outputs = []
    for operation in operations:
        if operation[0] == "put":
            cache.put(operation[1], operation[2])
            outputs.append(None)
        else:
            outputs.append(cache.get(operation[1]))
    return outputs`,
    },
    publicCases: [
      {
        args: [
          2,
          [
            ["put", 1, 10],
            ["put", 2, 20],
            ["get", 1],
            ["put", 3, 30],
            ["get", 2],
          ],
        ],
        expected: [null, null, 10, null, -1],
      },
      {
        args: [
          1,
          [
            ["put", 4, 40],
            ["put", 4, 41],
            ["get", 4],
          ],
        ],
        expected: [null, null, 41],
      },
    ],
  },
];

export const PROBLEM_SLUGS: readonly ProblemSlug[] = PROBLEMS.map(
  (problem) => problem.slug,
);

export const PROBLEM_METADATA: readonly ProblemMetadata[] = PROBLEMS.map(
  ({ slug, order, title, difficulty, concepts }) => ({
    slug,
    order,
    title,
    difficulty,
    concepts,
  }),
);

export function isProblemSlug(value: string): value is ProblemSlug {
  return PROBLEM_SLUGS.includes(value as ProblemSlug);
}

export function getProblemBySlug(slug: string): Problem | undefined {
  return PROBLEMS.find((problem) => problem.slug === slug);
}
