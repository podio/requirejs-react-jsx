define(function () {

  'use strict';

  var buildMap = {};

  var transform = {
    /**
     * Reads the .jsx file synchronously and requires react-tools
     * to perform the transform when compiling using r.js
     */
    ReactTools: function (name, parentRequire, onLoadNative, config) {
      var fs = require.nodeRequire('fs'),
        ReactTools = require.nodeRequire('react-tools'),
        compiled = void 0;

      var path = parentRequire.toUrl(ensureJSXFileExtension(name, config));
      var oldOptions = config.jsx && config.jsx.transformOptions || {}; // @deprecated
      var options = config.config && config.config.jsx && config.config.jsx.transformOptions || oldOptions ||  {
        harmony: true // enable harmony by default
      };

      try {
        var content = fs.readFileSync(path, {encoding: 'utf8'});

        try {
          compiled = ReactTools.transform(ensureJSXPragma(content, config), options);

          if (process.env.running_under_istanbul) {
            var istanbul = require.nodeRequire('istanbul');
            var coverageVariable = Object.keys(global).filter(function (key) { return key.indexOf('$$cov_') === 0 })[0];
            var instrumenter = new istanbul.Instrumenter({
              coverageVariable: coverageVariable
            });

            compiled = instrumenter.instrumentSync(compiled, path);
          }
        } catch (err) {
          throw new Error('jsx.js - Error while running JSXTransformer on ' + path + '\n' + err.message);
        }

      } catch (err) {
        onLoadNative.error(err);
      }

      if (config.isBuild) {
        buildMap[name] = compiled;
      }

      onLoadNative.fromText(compiled);
    },
    
    /**
     * Dynamically requires Babel and the text plugin async
     * and transforms the JSX in the browser.
     * The configproperty 'babelOptions' will be passed to Babel.
    */
    babel: function (name, parentRequire, onLoadNative, config) {
      name = ensureJSXFileExtension(name, config);

      var options = config.jsx && config.jsx.babelOptions || {};

      var onLoad = function(content, babel) {

        try {
          options.filename = name;
          var transform = babel.transform(ensureJSXPragma(content, config), options);

          content = transform.code;

          if (transform.map) {
            content += "\n//# sourceURL=" + config.baseUrl + name;
          }

        } catch (err) {
          onLoadNative.error(err);
        }

        onLoadNative.fromText(content);
      };

      parentRequire(['babel', 'text'], function (babel, text) {
        text.load(name, parentRequire, function (content) {
          onLoad(content, babel);
        }, config);
      });
    },

    /**
     * Dynamically requires JSXTransformer and the text plugin async
     * and transforms the JSX in the browser
     */
    JSXTransformer: function (name, parentRequire, onLoadNative, config) {
      name = ensureJSXFileExtension(name, config);

      var oldOptions = config.jsx && config.jsx.transformOptions || {}; // @deprecated
      var options = config.config && config.config.jsx && config.config.jsx.transformOptions || oldOptions ||  {
        harmony: true // enable harmony by default
      };

      if (options.inlineSourceMap) {
        options.sourceMap = true;
      }

      var onLoad = function(content, JSXTransformer) {
        try {
          var transform = JSXTransformer.transform(ensureJSXPragma(content, config), options);

          content = transform.code;

          if (options.inlineSourceMap && transform.sourceMap) {
            var sourceMap = transform.sourceMap;

            if (typeof transform.sourceMap.toJSON === 'function') {
              sourceMap = transform.sourceMap.toJSON();
            }

            sourceMap.file = name;
            sourceMap.sources[0] = config.baseUrl + name;

            content += "\n//# sourceMappingURL=data:application/json;base64," + btoa(JSON.stringify(sourceMap));
          } else {
            content += "\n//# sourceURL=" + config.baseUrl + name;
          }
        } catch (err) {
          onLoadNative.error(err);
        }

        onLoadNative.fromText(content);
      };

      parentRequire(['JSXTransformer', 'text'], function (JSXTransformer, text) {
        text.load(name, parentRequire, function (content) {
          onLoad(content, JSXTransformer);
        }, config);
      });
    }
  };

  function ensureJSXFileExtension(name, config) {
    var fileExtension = config.jsx && config.jsx.fileExtension || '.jsx';

    if (name.indexOf(fileExtension) === -1) {
      name = name + fileExtension;
    }

    return name;
  }

  function ensureJSXPragma(content, config){
    if (config.usePragma && content.indexOf('@jsx React.DOM') === -1) {
      content = "/** @jsx React.DOM */\n" + content;
    }

    return content;
  }

  var isNode = typeof process !== "undefined" &&
    process.versions &&
    !!process.versions.node;

  var jsx = {
    version: '0.1.1',

    load: function (name, parentRequire, onLoadNative, config) {
      var method = isNode ? 'ReactTools' : (config.jsx.transformer || 'JSXTransformer');

      transform[method].call(this, name, parentRequire, onLoadNative, config);
    },

    write: function (pluginName, name, write) {
      if (buildMap.hasOwnProperty(name)) {
        var text = buildMap[name];
        write.asModule(pluginName + "!" + name, text);
      }
    }
  };

  return jsx;
});
