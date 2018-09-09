/**
 * LR-parsing.
 *
 * Canonical collection of LR(0) items.
 *
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 * MIT Style License (C) 2015
 *
 * See this "rock-painting" to get the picture of what we're building here:
 *
 *   https://twitter.com/DmitrySoshnikov/status/665310804200128513/
 *
 * Definitions:
 *
 *   - Canonical collection of LR-items is a graph consisting
 *     of closured LR-items and goto connections between them.
 *     It's a state machine used for building LR parsing table.
 *
 *   - An item is a production with the dot cursor. The dot position
 *     is advanced on the goto operation. The dot splits the production
 *     on left and right sides, that shows what we have seen already
 *     in this production during the parse process, and what have not yet.
 *
 *   - A closure is a set of LR-items; it has a kernel items set, and
 *     also added items, which are created following production rules
 *     corresponding to the non-terminal at the dot position. A closure
 *     is also known as a state, which is used in building of the
 *     LR parsing table.
 *
 *   - A closure is final if it contains only the kernel items set
 *     which is itself final (with the dot position at the end of
 *     the production). Several closures can be final. The final
 *     items are used at reduction.
 *
 * Theory:
 *
 *   - https://en.wikipedia.org/wiki/LR_parser
 *   - "Dragon book", Introduction to LR parsing
 *
 * See also LL(1) parser: https://github.com/DmitrySoshnikov/ll1
 */

/**
 * Der Nichts. The Epsilon.
 */
const EPSILON = 'ε';

// --------------------------------------------------------------------------
// 1. GrammarSymbol
// --------------------------------------------------------------------------

/**
 * Class encapsulates operations with one
 * grammar symbol (terminal or non-terminal)
 */
class GrammarSymbol {
    constructor(symbol) {
        this._symbol = symbol;
    }

    /**
     * Terminals in our grammar are quoted,
     * "a", " ", "var", etc.
     */
    isTerminal() {
        const quoteRe = /'|"/;

        return quoteRe.test(this._symbol[0]) &&
            quoteRe.test(this._symbol[this._symbol.length - 1]);
    }

    isNonTerminal() {
        return !this.isTerminal();
    }

    isEpsilon() {
        return this._symbol === EPSILON;
    }

    getSymbol() {
        return this._symbol;
    }

    isSymbol(symbol) {
        return this.getSymbol() === symbol;
    }
}

// --------------------------------------------------------------------------
// 2. Production
// --------------------------------------------------------------------------

/**
 * Class encapsulates operations with a grammar production.
 */
class Production {
    /**
     * Receives a raw production in a view of:
     *
     * LHS -> RHS or a short alternative
     *      | RHS if the LHS is the same.
     */
    constructor(production) {
        this._raw = production;
        this._normalize();
    }

    getRaw() {
        return this._raw;
    }

    /**
     * For cases like:
     *
     *   A -> aA
     *      | b
     *
     * For the second alternative, grammar will call setLHS('A').
     */
    setLHS(LHS) {
        if (!(LHS instanceof GrammarSymbol)) {
            LHS = new GrammarSymbol(LHS);
        }
        this._LHS = LHS;
    }

    getLHS() {
        return this._LHS;
    }

    getRHS() {
        return this._RHS;
    }

    _normalize() {
        let splitter = this._raw.indexOf('->') !== -1 ? '->' : '|';
        let splitted = this._raw.split(splitter);
        let LHS = new GrammarSymbol(splitted[0].trim());
        let rhsStr = splitted[1].trim();

        let RHS = [];

        // If no RHS provided, assume it's ε. We support
        // both formats, explicit: F -> ε, and implicit: F ->

        if (!rhsStr) {
            RHS.push(new GrammarSymbol(EPSILON));
        } else {
            let rhsProd = rhsStr.split(/\s+/);
            for (let i = 0; i < rhsProd.length; i++) {
                if (rhsProd[i] === '"' && rhsProd[i + 1] === '"') {
                    RHS.push(new GrammarSymbol('" "'));
                    i++;
                } else {
                    RHS.push(new GrammarSymbol(rhsProd[i]));
                }
            }
        }

        this._LHS = LHS;
        this._RHS = RHS;
    }
}

// --------------------------------------------------------------------------
// 3. Grammar
// --------------------------------------------------------------------------

/**
 * Class encapsulates operations with a grammar.
 * Production format: {0: <Production>}.
 */
class Grammar {
    /**
     * Receives a raw grammar containing a set of
     * productions. Normalizes it to internal representation
     * and also appends the augmented production.
     */
    constructor(grammar) {
        this._originalBnf = grammar;
        this._isAugmentedProduction = null;
        this._bnf = this._normalizeBnf(this._originalBnf);
    }

    getProductionsForSymbol(symbol) {
        if (symbol instanceof GrammarSymbol) {
            symbol = symbol.getSymbol();
        }

        let productionsForSymbol = {};

        for (let k in this._bnf) {
            let production = this._bnf[k]
            if (production.getLHS().isSymbol(symbol)) {
                productionsForSymbol[k] = production;
            }
        }

        return productionsForSymbol;
    }

    getProduction(number) {
        return this._bnf[number];
    }

    getAugmentedProduction() {
        // The augmented production which is built during normalization.
        return this._isAugmentedProduction;
    }

    _normalizeBnf(originalBnf) {
        let normalizedBnf = {};
        let currentNonTerminal;

        this._toArray(originalBnf).forEach((rawProduction, k) => {
            let productionNumber = k + 1;

            let production = new Production(rawProduction);

            // For a shorthand production that doesn't use explicit LHS,
            // take it from previous rule.
            if (!production.getLHS().getSymbol()) {
                production.setLHS(currentNonTerminal);
            }

            currentNonTerminal = production.getLHS().getSymbol();

            // LHS of the first rule is considered as "Start symbol".
            if (k === 0) {
                this._startSymbol = production.getLHS().getSymbol();

                // Augmented rule, S' -> S.
                normalizedBnf[k] = this._isAugmentedProduction = new Production(
                    `${this._startSymbol}' -> ${this._startSymbol}`
                );
            }

            normalizedBnf[productionNumber] = production;
        });

        return normalizedBnf;
    }

    _toArray(grammar) {
        if (Array.isArray(grammar)) {
            return grammar;
        }

        return grammar
            .split('\n')
            .filter(production => !!production.trim());
    }
}

// --------------------------------------------------------------------------
// 4. LRItem
// --------------------------------------------------------------------------

/**
 * Stores all LR-items that are used in closures.
 * This is to reuse the same LR-item that should "goto"
 * the same state from different closures.
 *
 * The key in the registry is the serialized item,
 * the value is an actual item object.
 *
 * E.g. {'A -> a • A': LRItem('A -> a A', 1), ...}
 */
let LRItemsRegistry = {};

/**
 * An LRItem is built for a production at particular
 * dot position. The kernel item (for the augmented production)
 * builds the canonical collection, recursively applying
 * "closure" and "goto" operations.
 */
class LRItem {
    constructor({production, dotPosition = 0, grammar}) {
        this._production = production;
        this._dotPosition = dotPosition;
        this._grammar = grammar;
        this._closure = null;
        this._gotoPointer = null;
    }

    /**
     * Whether this item should be closured.
     */
    shouldClosure() {
        return !this.isFinal() && this.getCurrentSymbol().isNonTerminal();
    }

    /**
     * Whether this item is already connected to a closure.
     */
    isConnected() {
        return this._gotoPointer !== null;
    }

    /**
     * Returns the closure object for this item.
     */
    getClosure() {
        return this._closure;
    }

    /**
     * Applies closure operation for this item.
     */
    closure() {
        if (!this.shouldClosure()) {
            return;
        }
        this._closure = new Closure({
            kernelItem: this,
            grammar: this._grammar,
        });
        return this._closure;
    }

    /**
     * Goto operation from this item. The item can be used in
     * different closures, but always goes to the same outer closure.
     *
     * Initial item (for the augmented production) builds the whole
     * graph of the canonical collection of LR items.
     */
    goto() {
        if (!this.isFinal() && !this.isConnected()) {
            this._gotoPointer = new Closure({
                kernelItem: this.advance(),
                grammar: this._grammar,
            });

            // And recursively go to the next closure state if needed.
            this._gotoPointer.goto();
        }
        return this._gotoPointer;
    }

    /**
     * The symbol at the dot position.
     */
    getCurrentSymbol() {
        return this._production.getRHS()[this._dotPosition];
    }

    /**
     * Whether we have seen the whole production.
     */
    isFinal() {
        return this._dotPosition === this._production.getRHS().length;
    }

    /**
     * Returns serialized representation of an item. This is used
     * as a key in the global registry of all items that participate
     * in closures. E.g. `A -> • a A`.
     */
    serialize() {
        return LRItem.keyForItem(this._production, this._dotPosition);
    }

    static keyForItem(production, dotPosition) {
        let RHS = production.getRHS().map(symbol => symbol.getSymbol());
        RHS.splice(dotPosition, 0, '•');

        return `${production.getLHS().getSymbol()} -> ${RHS.join(' ')}`;
    }

    /**
     * Returns an a new item with an advanced dot position.
     */
    advance() {
        if (this.isFinal()) {
            throw new Error(`Item for ${this._production.getRaw()} is final.`);
        }
        return new LRItem({
            production: this._production,
            dotPosition: this._dotPosition + 1,
            grammar: this._grammar,
        });
    }
}

// --------------------------------------------------------------------------
// 5. Closure
// --------------------------------------------------------------------------

/**
 * An abstraction for an items set (kernel plus added),
 * known as a "closure". Recursively closes over
 * all added items, eventually forming an LR-parsing state.
 */
class Closure {
    constructor({kernelItem, grammar}) {
        this._kernelItem = this._currentItem = kernelItem;
        this._items = [kernelItem];
        this._grammar = grammar;
        this._build();
    }

    getKernel() {
        return this._kernelItem;
    }

    getItems() {
        return this._items;
    }

    /**
     * Executes goto operation for every item.
     */
    goto() {
        this.getItems().forEach(item => item.goto());
    }

    /**
     * Expands items until there is any item (kernel or added)
     * with a non-terminal at the dot position.
     */
    _build() {
        if (!this._currentItem.shouldClosure()) {
            return;
        }

        let productionsForSymbol = this._grammar.getProductionsForSymbol(
            this._currentItem.getCurrentSymbol()
        );

        for (let k in productionsForSymbol) {
            let production = productionsForSymbol[k];

            let itemKey = LRItem.keyForItem(production, 0);
            let addedItem;

            // Register the item, or reuse the same one, it
            // should already be connected to needed closure.
            if (!LRItemsRegistry.hasOwnProperty(itemKey)) {
                addedItem = LRItemsRegistry[itemKey] =
                    // All added items are always at position 0.
                    new LRItem({
                        production,
                        dotPosition: 0,
                        grammar: this._grammar
                    });
            } else {
                addedItem = LRItemsRegistry[itemKey];
            }

            this._items.push(addedItem);
            this._currentItem = addedItem;

            // Recursively closure the added item.
            this._build();
        }
    }
}

// --------------------------------------------------------------------------
// 6. Tests
// --------------------------------------------------------------------------

// Example grammar.
const grammar = new Grammar(`
  S -> A A
  A -> "a" A
     | "b"
`);

let kernelItem = new LRItem({
    production: grammar.getAugmentedProduction(),
    grammar: grammar,
});

// Build the entire graph starting
// from the augmented production.

kernelItem
    .closure()
    .goto();

// Trace the graph.
// https://twitter.com/DmitrySoshnikov/status/665310804200128513/

// S' -> S •
console.log(
    kernelItem
        .getClosure()
        .getKernel()   // S' -> • S
        .goto()
        .getKernel()   // S' -> S •
        .serialize()
);

// S -> A A •
console.log(
    kernelItem
        .getClosure()
        .getItems()[1] // S -> • A A
        .goto()
        .getKernel()   // S -> A • A
        .goto()
        .getKernel()   // S -> A A •
        .serialize()
);