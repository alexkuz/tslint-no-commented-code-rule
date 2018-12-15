import * as Lint from 'tslint';
import * as ts from 'typescript';
import { forEachComment } from 'tsutils';

type GroupedComment = {
  kind: CommentKind;
  comments: string[];
  start: number;
  end: number;
};

type PositionedComment = { start: number; end: number; text: string };

interface Options extends Lint.IOptions {
  ignoredCommentRegex?: string;
  minLineCount?: number;
}

type OptionsWithDefaults = {
  ignoredCommentRegex: string;
  minLineCount: number;
};

enum CommentKind {
  Unknown,
  Single,
  Multi,
  JsDoc
}

const FAILURE_STRING = 'Commented code is forbidden.';

const IGNORED_COMMENT_RE = '^(\\w+$|TODO|FIXME)';

export class Rule extends Lint.Rules.AbstractRule {
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const {
      ignoredCommentRegex = IGNORED_COMMENT_RE,
      minLineCount = 2
    } = this.getOptions() as Options;
    return this.applyWithFunction(sourceFile, walk, {
      ignoredCommentRegex,
      minLineCount
    });
  }
}

const isJsDoc = (text: string): boolean => {
  const lines = text.split('\n');
  if (lines.length < 2) return false;

  const start = lines.shift();
  const end = lines.pop();

  return (
    start.trim() === '/**' &&
    !lines.find(s => s.trim().indexOf('* ') === -1) &&
    end.trim() === '*/'
  );
};

const getCommentKind = (
  text: string,
  comment: ts.CommentRange
): CommentKind => {
  if (isJsDoc(text)) return CommentKind.JsDoc;

  if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia)
    return CommentKind.Multi;

  if (text.trim().startsWith('//')) return CommentKind.Single;

  return CommentKind.Multi;
};

function itLooksLikeCode(text: string, ignoredCommentRegex: RegExp): boolean {
  const clearedText = text
    .split('\n')
    .map(s => s.trim())
    .filter(s => !ignoredCommentRegex.test(s))
    .join('\n');

  if (!clearedText) {
    return false;
  }

  try {
    const func = new Function(clearedText);
    return true;
  } catch (e) {
    return e.message.indexOf('Unexpected') === -1;
  }
}

const extractCommentContent = (
  grouped: GroupedComment[]
): PositionedComment[] => {
  return grouped.map(gr => {
    let text;
    switch (gr.kind) {
      case CommentKind.Multi:
        text = gr.comments
          .join('\n')
          .replace(/^\s*\/\*/, '')
          .replace(/\*\/\s*$/, '')
          .trim();
        break;
      case CommentKind.Single:
        text = gr.comments.map(c => c.replace(/^\s*\/\//, '')).join('\n');
        break;
      default:
        text = gr.comments.join('\n');
        break;
    }
    return { text, start: gr.start, end: gr.end };
  });
};

const walk = (ctx: Lint.WalkContext<OptionsWithDefaults>) => {
  const ignoredCommentRegex = new RegExp(ctx.options.ignoredCommentRegex);

  const groupedComments: GroupedComment[] = [];
  let currentComments = [];
  let first = true;
  let lastPos = -1;
  let lastStart = -1;
  let lastEnd = -1;
  let lastKind = CommentKind.Unknown;

  forEachComment(ctx.sourceFile, (text, comment) => {
    const commentText = text.substring(comment.pos, comment.end);
    const kind = getCommentKind(commentText, comment);
    if (kind !== CommentKind.JsDoc) {
      if (first) {
        lastStart = comment.pos;
        currentComments.push(commentText);
      } else if (
        lastKind === kind &&
        /^[ \t]*$/.test(text.substring(lastPos + 1, comment.pos))
      ) {
        currentComments.push(commentText);
      } else {
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

  const contents = extractCommentContent(groupedComments);

  contents.forEach(content => {
    if (content.text.split('\n').length < ctx.options.minLineCount) {
      return;
    } else {
      if (itLooksLikeCode(content.text, ignoredCommentRegex)) {
        ctx.addFailureAt(
          content.start,
          content.end - content.start,
          FAILURE_STRING
        );
      }
    }
  });
};