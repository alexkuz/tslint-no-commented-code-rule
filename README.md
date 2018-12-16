# tslint-no-commented-code-rule
TSLint rule that bans commented code

### Usage
```
{
  "extends": [
    "tslint-no-commented-code-rule"
  ],
  "rules":
  {
    "no-commented-code": [true, {
      // ignore any comments that have less than N lines
      "minLineCount": 2,
      // ignore all lines that match this regex
      "ignoredCommentRegex": "^(\\w+$|TODO|FIXME)"
    }]
  }
}
```
