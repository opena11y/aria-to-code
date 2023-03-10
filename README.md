# ARIA Specification to Code Generator Version 1.0 beta

This utility parses the [ARIA ](https://www.w3.org/TR/wai-aria/) specification and generates a Javascript Object representing the information for the role design patterns, and information on the valid properties, states and values defined in the specification.  The object created is available as a [JSON object](releases/ariaInHtmlInfo.json) or as a [Javascript include file](releases/ariaInHtmlInfo.js).  It also generates two files that separate the properties and state information from the role design patterns issues.

## Creating the JSON and JS files

These steps assume you have both `git` and `node.js` installed on your computer.

### Step 1: Checkout the Repository from Github

```git clone git@github.com:opena11y/aria-to-code.git```

### Step 2: Setup the `node` environment

```npm install```

### Step 3: Generating the JSON and JS files

```npm run build```

The following four files are created in the `releases` directory.

| File Name | Format | Role Design Pattern Info | Property and State Value Info |
| --------- | ------ | ------------------------ | ----------------------------- |
| [gen-aria-role-design-patterns.js](releases/gen-aria-role-design-patterns.js) | JS Module   | Yes | no  |
| [gen-aria-info.json](releases/gen-aria-info.json)                             | JSON Object | Yes | Yes |
| [gen-aria-info.js](releases/gen-aria-info.js)                                 | JS Module   | Yes | Yes |
| [gen-aria-property-data-types.js](releases/gen-aria-property-data-types.js)   | JS Module   | no  | Yes |

## Change History

