const assert = require('assert');

/*
	Grammar:
		S->sAd
		A->ab|c
*/
class compilerEngile {
    constructor(input) {
        this.input  = input;
        this.cursor = 0;
    }

    compilerS() {
        this.eat('s');
        this.compilerA();
        this.eat('d');
    }

    compilerA() {
        let save;

        return (save = this.saveCursor(this.cursor) , this.compilerA1()) ||
            (this.backtrack(save) , this.compilerA2());
    }

    compilerA1() {
        return this.eat('a') && this.eat('b');
    }

    compilerA2() {
        return this.eat('c');
    }

    run() {
        try {
            this.compilerS(); // Start !!!

            if (this.input.length !== this.cursor) { // deal with Extra unmatched characters
                throw Error(`unexpected Extra unmatched characters with ${this.input.slice(this.cursor)}` +
                    `at position ${this.cursor} in input string: ${this.input}`);
            }

            return true;
        } catch (e) {
            console.log(`Error: ${e.message}`);
            return false;
        }

    }

    // help function

    eat(inputChar) {
        if (inputChar === this.input[this.cursor]) {
            this.cursor++;

            return true;
        }

        return false;
    }

    backtrack(fn) {
        this.cursor = fn();
    }

    saveCursor(cursor) {
        return function() {
            return cursor;
        }
    }

}

// test
assert(new compilerEngile("sasbds").run() === false); // true
assert(new compilerEngile("sasbd").run() === false);
assert(new compilerEngile("ssbds").run() === false);
assert(new compilerEngile("sasds").run() === false);
assert(new compilerEngile("sabds").run() === false);
assert(new compilerEngile("sabd").run() === true);