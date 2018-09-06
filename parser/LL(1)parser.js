/**
 * = LL parser =
 *
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 * MIT Style license
 *
 * Often one can see manually written LL parsers implemented as
 * recursive descent. Approach in this diff is a classical parse table
 * state machine.
 *
 *  LL parser consists of:
 *
 * 1. input buffer (source code)
 * 2. stack
 * 3. parsing table (state machine)
 *
 * Parsing table:
 *
 *   Table is used to get the next production number to apply, based on current
 *   symbol from the buffer, and the symbol (terminal or non-terminal)
 *   on top of the stack.
 *
 *   - Rows in the table are non-terminals
 *   - Columns are terminals
 *
 * Parsing algorithm:
 *
 *   - if the top of the stack is *terminal*, and matches current symbol in
 *     buffer, then just discard it from the stack, and move cursor further.
 *     (if doesn't match -- parse error).
 *
 *   - Else (it must be a non-terminal), replace it with an
 *     alternative production, corresponding to the production number.
 *     (if no production -- parse error).
 *
 * $ - is a special symbol used to mark bottom of the stack
 *     and end of the buffer.
 *
 * S - is a start symbol.
 *
 * At the beginning stack is:
 *
 * [S, $]
 *
 * Example:
 *
 * Grammar:
 *
 *   1. S -> F
 *   2. S -> (S + F)
 *   3. F -> a
 *
 * Input:
 *
 *   (a + a)
 *
 * Parse table:
 *
 *   +------------------+
 *   |    (  )  a  +  $ |
 *   +------------------+
 *   | S  2  -  1  -  - |
 *   | F  -  -  3  -  - |
 *   +------------------+
 *
 * The production rules which are applied to parse `(a + a)` are: 2, 1, 3, 3:
 *
 * S -> ( S + F ) -> ( F + F ) -> ( a + F ) -> ( a + a )
 *
 * We see that each time the *left most* non-terminal is replaced. Hence, the
 * name of the parser: LL - scan source from Left to right, and apply the
 * Left most derivation.
 */


/**
 * Our grammar representation. Key is a production number from
 * the grammar, the value is: 0 - LHS, 1 - RHS of the production.
 */
var grammar = {
    1: ['S', 'F'],       // 1. S -> F
    2: ['S', '(S + F)'], // 2. S -> (S + F)
    3: ['F', 'a'],       // 3. F -> a
};

/**
 * Initial stack: bottom is the "end of the stack" ($),
 * and the start symbol ('S' in our case) is there too.
 */
var stack = ['S', '$'];

function parse(source) {
    return parseFromTable(source, buildTable(grammar, source));
}

function printGrammar(grammar) {
    console.log('Grammar:\n');
    for (var k in grammar) {
        console.log('  ' + k + '.', grammar[k][0], '->', grammar[k][1]);
    }
    console.log('');
}

/**
 * Builds a state-machine table where table[non-terminal][terminal]
 * coordinates determine which next production rule to apply.
 */
function buildTable(grammar, source) {
    // For now we assume a correct table was already built from
    // the grammar and source for us. We'll cover how to build it
    // automatically in the next lessons (see "first" and "follow"
    // sets topic). We encode only valid rules here and skip all other
    // (they return `undefined` meaning a parse error).
    //
    // +------------------+
    // |    (  )  a  +  $ |
    // +------------------+
    // | S  2  -  1  -  - |
    // | F  -  -  3  -  - |
    // +------------------+
    //
    return {
        'S': {'(': 2, 'a': 1},
        'F': {'a': 3}
    };
}

var productionNumbers = [];

/**
 * Parses a source using parse table.
 * Doesn't build a parse tree yet, but just checks a source
 * string for acceptance (prints production rules appled in case
 * of successful parse, or throws on parse errors).
 */
function parseFromTable(source, table) {
    printGrammar(grammar);
    console.log('Source:', source);
    source = source.replace(/\s+/g, '');
    for (var cursor = 0; cursor < source.length;) {
        var current = source[cursor];
        var top = stack.shift();
        // Terminal is on the stack, just advance.
        if (isTerminal(top, table) && top === current) {
            // We already shifted the symbol from the stack,
            // so just advance the cursor.
            cursor++;
            continue;
        }
        // Else, it's a non-terminal, do derivation (replace it
        // in the stack with corresponding production).
        stack.unshift.apply(stack, getProduction(table, top, current));
    }
    console.log('Accepted. Productions:', productionNumbers.join(', '), '\n');
}

function isTerminal(symbol, table) {
    return !table.hasOwnProperty(symbol);
}

function getProduction(table, top, current) {
    var nextProductionNumber = table[top][current];

    if (!nextProductionNumber) {
        throw Error('Parse error, unexpected token: ' + current);
    }

    var nextProduction = grammar[nextProductionNumber];

    productionNumbers.push(nextProductionNumber);

    // Return an array of symbols from a production, e.g.
    // '(', 'S', '+', 'F', ')' for '(S + F)', since
    // each symbol should be pushed onto the stack.
    return nextProduction[1].split(/\s*/);
}

// Test:
parse('(a + a)');

// Output:

// Grammar:
//
//   1. S -> F
//   2. S -> (S + F)
//   3. F -> a
//
// Source: (a + a)
// Accepted. Productions: 2, 1, 3, 3