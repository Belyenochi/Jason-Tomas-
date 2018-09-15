/**
 * = AST printer =
 *
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 * MIT Style License
 *
 * Once we have finished operating on our AST, we need to generate the
 * code back from that (possibly transformed) AST.
 *
 * We choose a very simple AST format here, which we used in the
 * "Essensials of interpretation" course:
 * https://github.com/DmitrySoshnikov/Essentials-of-interpretation
 *
 * [typeTag, <arg1>, <arg2>, ...]
 *
 * For example the AST node:
 *
 * ['+', 1, 2]
 *
 * is addition, since its type-tag (the first element) is '+'.
 *
 * So printer should generate the '1 + 2' code for that AST node.
 *
 * Code generation from AST is implemented similarly to the interpretation:
 * by traversing the AST (starting from the top, and going recursively deeper),
 * and running corresponding handling procedures for each node type.
 */


// Stores the generated code.
var output = [];

// We start with the main `compile` function, which accepts an AST,
// and generates corresponding code for it.

/**
 * Compiles an AST, and prints the generated code.
 */
function compile(ast) {
  output = [];
  _compile(ast);
  console.log(output.join(''));
}

/**
 * Main compilation function, works with particular AST node (top level, or
 * inner sub-nodes).
 *
 * It puts simple values directly to the output buffer, or calls a
 * corresponding handling procedure for a giving type-tag.
 *
 * For the ['+', 1, 2] node, it will first execute `printer['+']` handling
 * procedure, which recursively will come to the `_compile` function again
 * with values 1 and 2, where they will be put in the output.
 */
function _compile(node) {
  if (!Array.isArray(node)) {
    output.push(node);
    return;
  }
  return printer[node[0]].apply(printer, node);
}

/**
 * The `printer` object implements handlers for the type-tags.
 * Here we reuse the same `binary` function, which similar for
 * all binary operations: 1 + 1, 1 * 2, etc.
 */
var printer = {
  '+': binary,
  '-': binary,
  '*': binary,
  '/': binary,
};

// -- Working with precedence --

/**
 * If we have a higher precedence, and should first parse a sub-node with
 * a lower precedence, we need to wrap the sub-node into parens. E.g.
 *
 *  ['*', ['+', 2, 2], 2] -> (2 + 2) * 2
 *
 * However, we don't need the parens in:
 *
 *  ['+', 2, ['*', 2, 2]] -> 2 + 2 * 2.
 *
 * Similarly for the same precedence, no parens are needed:
 *
 *  ['+', 5, ['+', 1, 2]] -> 5 + 1 + 2
 */
var precedence = {
  '+': 0,
  '-': 0,
  '*': 1,
  '/': 1,
};

// To check the precedence, if our binary is a part of some other binary.
var prevBinaryOp;

/**
 * Generic handler for all binary operations. A binary operation consists of
 * a left-hand side (LHS) and a right-hand side (RHS), e.g.:
 *
 * 1 + 1 -> LHS + RHS
 *
 * Or:
 *
 * 1 + 2 * 3
 *
 * Here LHS is 1, and RHS is 2 * 3, which is itself a binary expression. And
 * in order to handle these complex sub-expressions, we have to recursively
 * call `_compile` on both, LHS, and RHS.
 */
function binary(op, lhs, rhs) {
  var shouldPrintParens = prevBinaryOp &&
    precedence[prevBinaryOp] > precedence[op];

  prevBinaryOp = op;

  if (shouldPrintParens) {
    output.push('(');
  }

  // LHS
  _compile(lhs);

  output.push(' ' + op + ' ');

  // RHS
  _compile(rhs);

  if (shouldPrintParens) {
    output.push(')');
  }
}

// Tests!

// 1 + 2
compile(['+', 1, 2]);

// 5 + 1 + 2
compile(['+', 5, ['+', 1, 2]]);

// 2 + 2 * 2
compile(['+', 2, ['*', 2, 2]]);

// (2 + 2) * 2
compile(['*', ['+', 2, 2], 2]);

// 2 * (2 + 2) + (1 + 4) * 3
compile(['+', ['*', 2, ['+', 2, 2]], ['*', ['+', 1, 4], 3]]);
