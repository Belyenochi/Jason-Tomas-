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
        if(this.input[this.cursor] === 'a') {
            this.eat('a');
            this.eat('b');
        } else if(this.input[this.cursor] === 'c') {
            this.eat('c');
        }
    }

    run() {
        try {
            this.compilerS(); // Start !!!

            if (this.input.length !== this.cursor) { // deal with Extra unmatched characters
                throw Error(`unexpected Extra unmatched characters with ${this.input.slice(this.cursor)}` +
                 `at position ${this.cursor} in inputstring: ${this.input}`);
            }

            return true;
        } catch (e) {
            console.log(`Error: ${e.message}`);
            return false;
        }

    }

    eat(inputChar) {
        if (inputChar === this.input[this.cursor]) {
            this.cursor++;
        } else {
            throw Error(`unexpected match ${inputChar} with ${this.input} at position ${this.cursor}`);
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