"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Lint = require("tslint");
var ts = require("typescript");
var tsutils_1 = require("tsutils");
var CommentKind;
(function (CommentKind) {
    CommentKind[CommentKind["Unknown"] = 0] = "Unknown";
    CommentKind[CommentKind["Single"] = 1] = "Single";
    CommentKind[CommentKind["Multi"] = 2] = "Multi";
    CommentKind[CommentKind["JsDoc"] = 3] = "JsDoc";
})(CommentKind || (CommentKind = {}));
var FAILURE_STRING = 'Commented code is forbidden.';
var IGNORED_COMMENT_RE = '^(\\w+$|TODO|FIXME)';
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.apply = function (sourceFile) {
        var _a = this.getOptions(), _b = _a.ignoredCommentRegex, ignoredCommentRegex = _b === void 0 ? IGNORED_COMMENT_RE : _b, _c = _a.minLineCount, minLineCount = _c === void 0 ? 2 : _c;
        return this.applyWithFunction(sourceFile, walk, {
            ignoredCommentRegex: ignoredCommentRegex,
            minLineCount: minLineCount
        });
    };
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var isJsDoc = function (text) {
    var lines = text.split('\n');
    if (lines.length < 2)
        return false;
    var start = lines.shift();
    var end = lines.pop();
    return (start.trim() === '/**' &&
        !lines.find(function (s) { return s.trim().indexOf('* ') === -1; }) &&
        end.trim() === '*/');
};
var getCommentKind = function (text, comment) {
    if (isJsDoc(text))
        return CommentKind.JsDoc;
    if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia)
        return CommentKind.Multi;
    if (text.trim().startsWith('//'))
        return CommentKind.Single;
    return CommentKind.Multi;
};
function itLooksLikeCode(text, ignoredCommentRegex) {
    var clearedText = text
        .split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return !ignoredCommentRegex.test(s); })
        .join('\n');
    if (!clearedText) {
        return false;
    }
    try {
        var func = new Function(clearedText);
        return true;
    }
    catch (e) {
        return e.message.indexOf('Unexpected') === -1;
    }
}
var extractCommentContent = function (grouped) {
    return grouped.map(function (gr) {
        var text;
        switch (gr.kind) {
            case CommentKind.Multi:
                text = gr.comments
                    .join('\n')
                    .replace(/^\s*\/\*/, '')
                    .replace(/\*\/\s*$/, '')
                    .trim();
                break;
            case CommentKind.Single:
                text = gr.comments.map(function (c) { return c.replace(/^\s*\/\//, ''); }).join('\n');
                break;
            default:
                text = gr.comments.join('\n');
                break;
        }
        return { text: text, start: gr.start, end: gr.end };
    });
};
var walk = function (ctx) {
    var ignoredCommentRegex = new RegExp(ctx.options.ignoredCommentRegex);
    var groupedComments = [];
    var currentComments = [];
    var first = true;
    var lastPos = -1;
    var lastStart = -1;
    var lastEnd = -1;
    var lastKind = CommentKind.Unknown;
    tsutils_1.forEachComment(ctx.sourceFile, function (text, comment) {
        var commentText = text.substring(comment.pos, comment.end);
        var kind = getCommentKind(commentText, comment);
        if (kind !== CommentKind.JsDoc) {
            if (first) {
                lastStart = comment.pos;
                currentComments.push(commentText);
            }
            else if (lastKind === kind &&
                /^[ \t]*$/.test(text.substring(lastPos + 1, comment.pos))) {
                currentComments.push(commentText);
            }
            else {
                groupedComments.push({
                    kind: lastKind,
                    comments: currentComments,
                    start: lastStart,
                    end: comment.end
                });
                lastStart = comment.pos;
                currentComments = [commentText];
            }
            first = false;
            lastKind = kind;
            lastEnd = comment.end;
        }
        lastPos = comment.end;
    });
    if (currentComments.length > 0) {
        groupedComments.push({
            kind: lastKind,
            comments: currentComments,
            start: lastStart,
            end: lastEnd
        });
    }
    var contents = extractCommentContent(groupedComments);
    contents.forEach(function (content) {
        if (content.text.split('\n').length < ctx.options.minLineCount) {
            return;
        }
        else {
            if (itLooksLikeCode(content.text, ignoredCommentRegex)) {
                ctx.addFailureAt(content.start, content.end - content.start, FAILURE_STRING);
            }
        }
    });
};
//# sourceMappingURL=noCommentedCodeRule.js.map