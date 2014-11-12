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
      var options = config.jsx && config.jsx.transformOptions || {};

      try {
        var content = fs.readFileSync(path, {encoding: 'utf8'});

        try {
          compiled = ReactTools.transform(ensureJSXPragma(content, config), options);
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
     * Dynamically requires JSXTransformer and the text plugin async
     * and transforms the JSX in the browser
     */
    JSXTransformer: function (name, parentRequire, onLoadNative, config) {
      name = ensureJSXFileExtension(name, config);

      var options = config.jsx && config.jsx.transformOptions || {};

      var onLoad = function(content, JSXTransformer) {
        try {
          content = JSXTransformer.transform(ensureJSXPragma(content, config), options).code;
        } catch (err) {
          onLoadNative.error(err);
        }

        content += "\n//# sourceURL=" + location.protocol + "//" + location.hostname +
          config.baseUrl + name;

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
    if (config.usePragma && -1 === content.indexOf('@jsx React.DOM')) {
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
      var method = isNode ? 'ReactTools' : 'JSXTransformer';

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
