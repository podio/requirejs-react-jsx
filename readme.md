# requirejs-react-jsx

[![NPM version](https://badge.fury.io/js/requirejs-react-jsx.svg)](http://badge.fury.io/js/requirejs-react-jsx)
[![Dependency Status](http://img.shields.io/gemnasium/podio/requirejs-react-jsx.svg?style=flat-square)](https://gemnasium.com/podio/requirejs-react-jsx)

A RequireJS plugin for compiling React JSX files. Will use [react-tools](https://www.npmjs.org/package/react-tools) when compiling using `r.js`, and will use `JSXTransformer` when running in the browser in development. This allows us to support multiple bundles in `r.js` and exclude the `JSXTransformer` from all of them since we're requiring it dynamically and not explicitly. This also means that we can get `1:1` Source Maps in both development and production.

# Install

```sh
$ bower install requirejs-react-jsx --save
```

If you're not using [bower](http://bower.io/search/) to manage your dependencies (you should), you can just download the [jsx.js](jsx.js) file manually.

Since we're also using [react-tools](https://www.npmjs.org/package/react-tools) for the build step while running in a node process, and not in the browser, you will need to install that also:

```sh
$ npm install react-tools --save
 ```

# Usage

### Setup

`app.js`

```js
define(function(require){

  var React = require('react');

  function App() {
    this.AppView = React.createClass({
      render: function () {
        return (
          <div>
            <p>Hello, React!</p>
          </div>
        );
      }
    });
  }

  App.prototype.init = function () {
    React.render(<this.AppView />, document.body);
  };

  return App;

});
```

`main.js`

```js
require.config({
  paths: {
    "react": "bower_components/react/react-with-addons",
    "JSXTransformer": "bower_components/react/JSXTransformer",
    "jsx": "bower_components/requirejs-react-jsx/jsx",
    "text": "bower_components/requirejs-text/text"
  },

  shim : {
    "react": {
      "exports": "React"
    },
    "JSXTransformer": "JSXTransformer"
  },

  jsx: {
    fileExtension: ".jsx",
    transformOptions: {
      harmony: true,
      stripTypes: false,
      inlineSourceMap: true
    },
    usePragma: false
  }
});

require(['jsx!app'], function(App){

  var app = new App();
  app.init();

});
```

### Building

Call with `$ node bower_components/r.js/dist/r.js -o build.js`

In your [r.js](https://github.com/jrburke/r.js/) `build.js` config:

```
// add `optimize=none` to skip script optimization (useful during debugging).

({
  appDir: "./",
  baseUrl: "./",
  dir: "./compiled",
  mainConfigFile: "./main.js",

  optimize: "uglify2",
  skipDirOptimize: true,
  generateSourceMaps: true,
  findNestedDependencies: true,
  preserveLicenseComments: false,

  onBuildWrite: function (moduleName, path, singleContents) {
    return singleContents.replace(/jsx!/g, '');
  },

  modules: [
    {
      name: "main",
      exclude: ['jsx']
    }
  ]
})
```

# License

[MIT](LICENSE)
