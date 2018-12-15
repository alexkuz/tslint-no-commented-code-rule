import { getFixedResult, helper } from './lintRunner';
import { Rule } from './noCommentedCodeRule';

const rule = 'no-commented-code';

const noComments = `
function printTips() {
  tips.forEach((tip, i) => console.log(tip));
}
`;

const textComments = `
// (c) 2010-2013 Diego Perini (http://www.iport.it)
// https://gist.github.com/dperini/729294

// some comment
// it should work
function printTips() {
    // another comment
  tips.forEach((tip, i) => console.log(tip));
}
`;

const jsDocWithCode = `
/**
 * function () {
 *   return 1;
 * }
 */
function printTips() {
    // another comment
  tips.forEach((tip, i) => console.log(tip));
}
`;

const commentedCode = `
/**
 * Paste or drop some JavaScript here and explore
 * the syntax tree created by chosen parser.
 * You can use all the cool new features from ES6
 * and even more. Enjoy!
 */

let tips = [
  "Click on any AST node with a '+' to expand it",

  "Hovering over a node highlights the \
   corresponding part in the source code",

  "Shift click on an AST node expands the whole substree"
];

// text
// text
/* just a comment */

// // commented text
//
//function printTips() {
//  tips.forEach((tip, i) => console.log(tip));
//}
//

// blablabla

//function printTips() {
//  tips.forEach((tip, i) => console.log(tip));
//}
/*
just a comment
yup
*/

/**
 */
`;

const indentedCode = `
const a = () => {
  return b(
    {
      onSuccess: () => {
        // var c = '';
        // c += 'test';
      }
    }
  );
};
`;

const todoCode = `
// TODO: remove this code
// function test(a) {
//   return true;  
// }
`;

describe('No commented code', () => {
  it(`should pass on code with no comments`, () => {
    const result = helper({ src: noComments, rule });
    expect(result.errorCount).toBe(0);
  });

  it(`should pass on code with text comments`, () => {
    const result = helper({ src: textComments, rule });
    expect(result.errorCount).toBe(0);
  });

  it(`should pass on JsDoc with code`, () => {
    const result = helper({ src: jsDocWithCode, rule });
    expect(result.errorCount).toBe(0);
  });

  it(`should fail on commented code`, () => {
    const result = helper({ src: commentedCode, rule });
    expect(result.errorCount).toBe(2);
  });

  it(`should fail on indented commented code`, () => {
    const result = helper({ src: indentedCode, rule });
    expect(result.errorCount).toBe(1);
  });

  it(`should fail with TODO before code`, () => {
    const result = helper({ src: todoCode, rule });
    expect(result.errorCount).toBe(1);
  });
});
