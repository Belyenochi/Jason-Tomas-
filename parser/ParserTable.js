/**
 * Building LL(1) parsing table from First and Follow sets.
 *
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 * MIT Style License
 *
 * This diff is a continuation of what we started in the previous two diffs:
 *
 * Dependencies:
 *
 *   1. Actual LL Parser, that uses parsing table:
 *      https://gist.github.com/DmitrySoshnikov/29f7a9425cdab69ea68f
 *
 *   2. First and Follow sets construction:
 *      https://gist.github.com/DmitrySoshnikov/924ceefb1784b30c5ca6
 *
 * As we implemented in diff (1), LL Parser uses a parsing table. This
 * table is built based on First and Follow sets which we built in
 * the diff (2). In this diff we finishing constructing the parsing table
 * based on the data from previous analysis.
 *
 * The purpose of the parsing table is to tell which next production to use
 * based on the symbol on the stack, and the current symbol in the buffer.
 * As we said in (1), rows of the table are non-terminals, and columns are
 * terminals.
 *
 * Grammar:
 *
 *   1. S -> F
 *   2. S -> (S + F)
 *   3. F -> a
 *
 * Parsing table:
 *
 *   +------------------+
 *   |    (  )  a  +  $ |
 *   +------------------+
 *   | S  2  -  1  -  - |
 *   | F  -  -  3  -  - |
 *   +------------------+
 *
 * The rules for constructing the table are the following:
 *
 *   1. Scan all non-terminals in the grammar, and put their derivations under
 *      the columns which are in the First set of the RHS for this non-terminal.
 *
 *   2. If this non-terminal has `ε` (epsilon, "empty" symbol) as one of its
 *      derivations, then put the corresponding ε-derivation into the columns
 *      which are in the Follow set of this non-terminal.
 *
 * Let's see it on the implementation.
 */

// Special "empty" symbol.
let EPSILON = 'ε';

/**
 * Given a grammar builds a LL(1) parsing table based on the
 * First and Follow sets of this grammar.
 */
function buildParsingTable(grammar, firstSets, followSets) {
    let parsingTable = {};

    for (let k in grammar) {
        let production = grammar[k];
        let LHS = getLHS(production);
        let RHS = getRHS(production);
        let productionNumber = Number(k);

        // Init columns for this non-terminal.
        if (!parsingTable[LHS]) {
            parsingTable[LHS] = {};
        }

        // All productions goes under the terminal column, if
        // this terminal is not epsilon.
        if (RHS !== EPSILON) {
            getFirstSetOfRHS(RHS, firstSets).forEach(function(terminal) {
                parsingTable[LHS][terminal] = productionNumber;
            });
        } else {
            // Otherwise, this ε-production goes under the columns from
            // the Follow set.
            followSets[LHS].forEach(function(terminal) {
                parsingTable[LHS][terminal] = productionNumber;
            });
        }
    }

    return parsingTable;
}

/**
 * Given production `S -> F`, returns `S`.
 */
function getLHS(production) {
    return production.split('->')[0].replace(/\s+/g, '');
}

/**
 * Given production `S -> F`, returns `F`.
 */
function getRHS(production) {
    return production.split('->')[1].replace(/\s+/g, '');
}

/**
 * Returns First set of RHS.
 */
function getFirstSetOfRHS(RHS, firstSets) {

    // For simplicity, in this educational parser, we assume that
    // the first symbol (if it's a non-terminal) cannot produces `ε`.
    // Since in real parser, we need to get the First set of the whole RHS.
    // This means, that if `B` in the production `X -> BC` can be `ε`, then
    // the First set should of course include First(C) as well, i.e. RHS[1], etc.
    //
    // That is, in a real parser, one usually combines steps of building a
    // parsing table, First and Follow sets in one step: when a parsing table
    // needs the First set of a RHS, it's calculated in place.
    //
    // But here we just return First of RHS[0].
    //

    return firstSets[RHS[0]];
}

// Testing

// ----------------------------------------------------------------------
// Example 1 of a simple grammar, generates: a, or (a + a), etc.
// ----------------------------------------------------------------------

// We just manually define our First and Follow sets for a given grammar,
// see again diff (2) where we automatically generated these sets.

let grammar_1 = {
    1: 'S -> F',
    2: 'S -> (S + F)',
    3: 'F -> a',
};

// See https://gist.github.com/DmitrySoshnikov/924ceefb1784b30c5ca6
// for the sets construction.

let firstSets_1 = {
    'S': ['a', '('],
    'F': ['a'],
    'a': ['a'],
    '(': ['('],
};

let followSets_1 = {
    'S': ['$', '+'],
    'F': ['$', '+', ')'],
};

console.log(buildParsingTable(grammar_1, firstSets_1, followSets_1));

// Results:

// S: { a: 1, '(': 2 }
// F: { a: 3 }

// That corresponds to the following table:

// +------------------+
// |    (  )  a  +  $ |
// +------------------+
// | S  2  -  1  -  - |
// | F  -  -  3  -  - |
// +------------------+

// ----------------------------------------------------------------------
// Example 2, for the "calculator" grammar, e.g. (a + a) * a.
// ----------------------------------------------------------------------

let grammar_2 = {
    1: 'E -> TX',
    2: 'X -> +TX',
    3: 'X -> ε',
    4: 'T -> FY',
    5: 'Y -> *FY',
    6: 'Y -> ε',
    7: 'F -> a',
    8: 'F -> (E)',
};

// See https://gist.github.com/DmitrySoshnikov/924ceefb1784b30c5ca6
// for the sets construction.

let firstSets_2 = {
    'E': ['a', '('],
    'T': ['a', '('],
    'F': ['a', '('],
    'a': ['a'],
    '(': ['('],
    'X': ['+', 'ε'],
    '+': ['+'],
    'Y': ['*', 'ε'],
    '*': ['*'],
};

let followSets_2 = {
    'E': ['$', ')'],
    'X': ['$', ')'],
    'T': ['+', '$', ')'],
    'Y': ['+', '$', ')'],
    'F': ['*', '+', '$', ')'],
};

console.log(buildParsingTable(grammar_2,firstSets_2,followSets_2));

// Results:

// E: { a: 1, '(': 1 },
// X: { '+': 2, '$': 3, ')': 3 },
// T: { a: 4, '(': 4 },
// Y: { '*': 5, '+': 6, '$': 6, ')': 6 },
// F: { a: 7, '(': 8 }

// That corresponds to the following table:

// +---------------------+
// |    a  +  *  (  )  $ |
// +---------------------+
// | E  1  -  -  1  -  - |
// | X  -  2  -  -  3  3 |
// | T  4  -  -  4  -  - |
// | Y  -  6  5  -  6  6 |
// | F  7  -  -  8  -  - |
// +---------------------+