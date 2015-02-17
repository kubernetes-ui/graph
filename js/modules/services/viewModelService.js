/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/

// TODO: Remove this embedded copy of JSONPath when it loads correctly.

  /*global module, exports, require*/
  /*jslint vars:true, evil:true*/
  /* JSONPath 0.8.0 - XPath for JSON
   *
   * Copyright (c) 2007 Stefan Goessner (goessner.net)
   * Licensed under the MIT (MIT-LICENSE.txt) licence.
   */

 (function() {
  'use strict';

  // Keep compatibility with old browsers
  if (!Array.isArray) {
    Array.isArray = function (vArg) {
      return Object.prototype.toString.call(vArg) === '[object Array]';
    };
  }

  var cache = {};

  function push (arr, elem) {arr = arr.slice(); arr.push(elem); return arr;}
  function unshift (elem, arr) {arr = arr.slice(); arr.unshift(elem); return arr;}

  function JSONPath (opts, obj, expr) {
    if (!(this instanceof JSONPath)) {
      try {
        return new JSONPath(opts, obj, expr);
      }
      catch (e) {
        if (!e.avoidNew) {
          throw e;
        }
        return e.value;
      }
    }

    opts = opts || {};
    var objArgs = opts.hasOwnProperty('json') && opts.hasOwnProperty('path');
    this.resultType = (opts.resultType && opts.resultType.toLowerCase()) || 'value';
    this.flatten = opts.flatten || false;
    this.wrap = opts.hasOwnProperty('wrap') ? opts.wrap : true;
    this.sandbox = opts.sandbox || {};

    if (opts.autostart !== false) {
      var ret = this.evaluate((objArgs ? opts.json : obj), (objArgs ? opts.path : expr));
      if (!ret || typeof reg !== 'object') {
        throw {avoidNew: true, value: ret, message: "JSONPath should not be called with 'new'"};
      }
    }
  }

  // PUBLIC METHODS

  JSONPath.prototype.evaluate = function (obj, expr) {
    var self = this;
    this._obj = obj;
    if (expr && obj && (this.resultType === 'value' || this.resultType === 'path')) {
      var exprList = this._normalize(expr);
      if (exprList[0] === '$' && exprList.length > 1) {exprList.shift();}
      var result = this._trace(exprList, obj, ['$']);
      result = result.filter(function (ea) { return ea && !ea.isParentSelector; });
      if (!result.length) {return this.wrap ? [] : false;}
      if (result.length === 1 && !this.wrap && !Array.isArray(result[0].value)) {return result[0][this.resultType] || false;}
      return result.reduce(function (result, ea) {
        var valOrPath = ea[self.resultType];
        if (self.resultType === 'path') {valOrPath = self._asPath(valOrPath);}
        if (self.flatten && Array.isArray(valOrPath)) {
          result = result.concat(valOrPath);
        } else {
          result.push(valOrPath);
        }
        return result;
      }, []);
    }
  };

  // PRIVATE METHODS

  JSONPath.prototype._normalize = function (expr) {
    if (cache[expr]) {return cache[expr];}
    var subx = [];
    var normalized = expr.replace(/[\['](\??\(.*?\))[\]']/g, function ($0, $1) {return '[#' + (subx.push($1) - 1) + ']';})
    .replace(/'?\.'?|\['?/g, ';')
    .replace(/(?:;)?(\^+)(?:;)?/g, function ($0, ups) {return ';' + ups.split('').join(';') + ';';})
    .replace(/;;;|;;/g, ';..;')
    .replace(/;$|'?\]|'$/g, '');
    var exprList = normalized.split(';').map(function (expr) {
      var match = expr.match(/#([0-9]+)/);
      return !match || !match[1] ? expr : subx[match[1]];
    });
    cache[expr] = exprList;
    return cache[expr];
  };

  JSONPath.prototype._asPath = function (path) {
    var i, n, x = path, p = '$';
    for (i = 1, n = x.length; i < n; i++) {
      p += /^[0-9*]+$/.test(x[i]) ? ('[' + x[i] + ']') : ("['" + x[i] + "']");
    }
    return p;
  };

  JSONPath.prototype._trace = function (expr, val, path) {
      // No expr to follow? return path and value as the result of this trace branch
      var self = this;
      if (!expr.length) {return [{path: path, value: val}];}

      var loc = expr[0], x = expr.slice(1);
      // The parent sel computation is handled in the frame above using the
      // ancestor object of val
      if (loc === '^') {return path.length ? [{path: path.slice(0, -1), expr: x, isParentSelector: true}] : [];}

      // We need to gather the return value of recursive trace calls in order to
      // do the parent sel computation.
      var ret = [];
      function addRet (elems) {ret = ret.concat(elems);}

      if (val && val.hasOwnProperty(loc)) { // simple case, directly follow property
        addRet(this._trace(x, val[loc], push(path, loc)));
      }
      else if (loc === '*') { // any property
        this._walk(loc, x, val, path, function (m, l, x, v, p) {
          addRet(self._trace(unshift(m, x), v, p));
        });
      }
      else if (loc === '..') { // all child properties
        addRet(this._trace(x, val, path));
        this._walk(loc, x, val, path, function (m, l, x, v, p) {
          if (typeof v[m] === 'object') {
            addRet(self._trace(unshift('..', x), v[m], push(p, m)));
          }
        });
      }
      else if (loc[0] === '(') { // [(expr)]
        addRet(this._trace(unshift(this._eval(loc, val, path[path.length], path), x), val, path));
      }
      else if (loc.indexOf('?(') === 0) { // [?(expr)]
        this._walk(loc, x, val, path, function (m, l, x, v, p) {
          if (self._eval(l.replace(/^\?\((.*?)\)$/, '$1'), v[m], m, path)) {
            addRet(self._trace(unshift(m, x), v, p));
          }
        });
      }
      else if (loc.indexOf(',') > -1) { // [name1,name2,...]
        var parts, i;
        for (parts = loc.split(','), i = 0; i < parts.length; i++) {
          addRet(this._trace(unshift(parts[i], x), val, path));
        }
      }
      else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) { // [start:end:step]  Python slice syntax
        addRet(this._slice(loc, x, val, path));
      }

      // We check the resulting values for parent selections. For parent
      // selections we discard the value object and continue the trace with the
      // current val object
      return ret.reduce(function (all, ea) {
        return all.concat(ea.isParentSelector ? self._trace(ea.expr, val, ea.path) : [ea]);
      }, []);
    };

    JSONPath.prototype._walk = function (loc, expr, val, path, f) {
      var i, n, m;
      if (Array.isArray(val)) {
        for (i = 0, n = val.length; i < n; i++) {
          f(i, loc, expr, val, path);
        }
      }
      else if (typeof val === 'object') {
        for (m in val) {
          if (val.hasOwnProperty(m)) {
            f(m, loc, expr, val, path);
          }
        }
      }
    };

    JSONPath.prototype._slice = function (loc, expr, val, path) {
      if (!Array.isArray(val)) {return;}
      var i,
      len = val.length, parts = loc.split(':'),
      start = (parts[0] && parseInt(parts[0], 10)) || 0,
      end = (parts[1] && parseInt(parts[1], 10)) || len,
      step = (parts[2] && parseInt(parts[2], 10)) || 1;
      start = (start < 0) ? Math.max(0, start + len) : Math.min(len, start);
      end    = (end < 0)    ? Math.max(0, end + len) : Math.min(len, end);
      var ret = [];
      for (i = start; i < end; i += step) {
        ret = ret.concat(this._trace(unshift(i, expr), val, path));
      }
      return ret;
    };

    JSONPath.prototype._eval = function (code, _v, _vname, path) {
      if (!this._obj || !_v) {return false;}
      if (code.indexOf('@path') > -1) {
        this.sandbox._$_path = this._asPath(path.concat([_vname]));
        code = code.replace(/@path/g, '_$_path');
      }
      if (code.indexOf('@') > -1) {
        this.sandbox._$_v = _v;
        code = code.replace(/@/g, '_$_v');
      }
      try {
        return vm.runInNewContext(code, this.sandbox);
      }
      catch(e) {
        console.log(e);
        throw new Error('jsonPath: ' + e.message + ': ' + code);
      }
    };

  // For backward compatibility (deprecated)
  JSONPath.eval = function (obj, expr, opts) {
    return JSONPath(opts, obj, expr);
  };

  if (typeof module === 'undefined') {
    window.jsonPath = { // Deprecated
      eval: JSONPath.eval
    };
    window.JSONPath = JSONPath;
  }
  else {
    module.exports = JSONPath;
  }
})();

(function() {
  'use strict';

  function templateTransform(lodash, template) {
    var nameToIndex = {};
    var typeToGroup = {};

    var random = function() {
      var str = JSON.stringify(Math.random());
      var idx = str.indexOf('.') + 1;
      if (idx > 0 && idx < str.length) {
        str = str.substring(idx);
      }

      return str;
    };

    var applyMaps = function(fromNode, toNode) {
      if (template.maps) {
        var map = lodash.find(template.maps, function(map) {
          return map.type === toNode.type;
        });
        if (map) {
          if (map.name) {
            var result = JSONPath(null, fromNode, map.name);
            if (result && result.length > 0) {
              toNode.name = result[0];
            }
          }

          if (map.tags) {
            lodash.forEach(map.tags, function(tagPath) {
              var result = JSONPath(null, fromNode, map.name);
              if (result && result.length > 0) {
                toNode.tags.push({ 'key': map.name, 'value': result[0] });
              }
            });
          }
        }
      }
    };

    var mapNode = function(fromNode) {
      var toNode = {};

      toNode.id = fromNode.id || random();
      if (!nameToIndex[toNode.id]) {
        nameToIndex[toNode.id] = Object.keys(nameToIndex).length;
      }

      toNode.group = 0;
      toNode.name = fromNode.label || toNode.id;
      toNode.type = fromNode.type;
      if (toNode.type) {
        applyMaps(fromNode, toNode);
        toNode.group = typeToGroup[toNode.type];
        if (!toNode.group) {
          toNode.group = Object.keys(typeToGroup).length;
          typeToGroup[toNode.type] = toNode.group;
        }
      }

      if (!toNode.tags && fromNode.metadata) {
        toNode.tags = lodash.map(fromNode.metadata, function(value, key) {
          return {
            "key": key,
            "value": value
          };
        });
      }

      if (this.radius) {
        toNode.radius = this.radius;
      }

      return toNode;
    };

    var mapEdge = function(edge) {
      var newEdge = {};

      if (edge.source && edge.target) {
        newEdge.source = nameToIndex[edge.source];
        newEdge.target = nameToIndex[edge.target];
        if (newEdge.source && newEdge.target) {
          newEdge.id = edge.id || random();
          if (edge.relation) {
            newEdge.label = edge.relation;
            newEdge.type = edge.relation;
          }

          if (edge.metadata) {
            newEdge.tags = lodash.map(edge.metadata, function(value, key) {
              return {
                "key": key,
                "value": value
              };
            });
          }

          if (this.thickness) {
            newEdge.thickness = this.thickness;
          }

          if (this.distance) {
            newEdge.distance = this.distance;
          }
        }
      }

      return newEdge;
    };

    var sortNode = function(node) {
      return node.id;
    };

    var sortEdge = function(edge) {
      return edge.source + edge.target;
    };

    var filterNode = function(node) {
      return node.type != this.nodeFilter;
    };

    var filterEdge = function(edge) {
      return edge.source && edge.target 
        && edge.type != this.edgeFilter;
    };

    return function(fromModel, toModel, configuration) {
      if (fromModel && toModel && configuration) {
        nameToIndex = {};
        typeToGroup = {};

        var fromNodes = fromModel.nodes;
        if (fromNodes) {
          toModel.nodes = lodash.chain(fromNodes)
            .map(mapNode, configuration)
            .filter(filterNode, configuration)
            .sortBy(sortNode, configuration)
            .value();
        }

        var fromEdges = fromModel.edges;
        if (fromEdges && Object.keys(nameToIndex).length > 1) {
          toModel.links = lodash.chain(fromEdges)
            .map(mapEdge, configuration)
            .filter(filterEdge, configuration)
            .sortBy(sortEdge, configuration)
            .value();
        }
      }

      return toModel;
    };
  }

  // Compute the view model based on the data model and control parameters
  // and place the result in the current scope at $scope.viewModel.
  var viewModelService = function ViewModelService(lodash) {
    var defaultRadius = 15;
    this.setDefaultRadius = function(value) {
      defaultRadius = value;
    };

    var defaultThickness = 1;
    this.setDefaultThickness = function (value) {
      defaultThickness = value;
    };

    var defaultDistance = 45;
    this.setDefaultDistance = function (value) {
      defaultDistance - value;
    };

    var defaultSettings = {
      "clustered": false,

      // TODO: Remove these when they're no longer needed.
      "showEdgeLabels": false,
      "showNodeLabels": true
    };
    this.setDefaultSettings = function(value) {
      defaultSettings = value;
    };

    var defaultModel = {
      "settings" : defaultSettings,
      "nodes" : [{
          "group" : 1,
          "name" : "no data",
          "radius" : 20
        }
      ],
      "links" : []
    };

    var viewModel = { 
      'data' : defaultModel, 
      'default' : defaultModel,
      'configuration' : {
        'nodeFilter' : undefined,
        'edgeFilter' : undefined,
        'radius' : defaultRadius,
        'thickness' : defaultThickness,
        'distance' : defaultDistance
      },
      'version' : 0,
      'transformNames' : []
    };

    // TODO: Move this template into a file.
    var defaultTemplate = {
      'maps' : [
          { 'type' : 'Container', 'name' : '$.metadata.Config.Image' }
        ]
    };

    var defaultTransform = templateTransform(lodash, defaultTemplate);
    var transformsByName = {}; // Loaded transforms by name.

    // Load a transform from a given directory entry.
    var loadTransform = function(directoryEntry) {
      if (!directoryEntry) {
        return;
      }

      var transformName = directoryEntry.name;
      var scriptName = directoryEntry.script;
      if (!transformName || !scriptName) {
        return;
      }

      var stripSuffix = function(fileName) {
        var suffixIndex = fileName.indexOf(".");
        if (suffixIndex > 0) {
          fileName = fileName.substring(0, suffixIndex);
        }

        return fileName;
      };

      // Load the script into the window scope.
      var scriptPath = "components/graph/assets/transforms/" + scriptName;
      $.getScript(scriptPath)
        .done(function() {
          // Defer to give the load opportunity to complete.
          lodash.defer(function() {
            // Get the constructor by name from the window scope.
            var constructorName = stripSuffix(scriptName);
            var constructor = window[constructorName];
            if (constructor) {
              var transform = constructor(lodash);
              if (transform) {
                // console.log('INFO: Loaded transform: "' + transformName + '".');
                viewModel.transformNames.push(transformName);
                transformsByName[transformName] = transform;
                return;
              }
            }

            console.log('ERROR: Could not load transform "' + transformName + '".');
          });
        })
        .fail(function(jqxhr, settings, exception) {
          console.log('ERROR: Could not load transform "' + transformName + '": ' + exception);
        });
    };

    // Load the transforms directory.
    $.getJSON("components/graph/assets/transforms.json")
      .done(function(transforms) {
        // Defer to give the load opportunity to complete.
        lodash.defer(function() {
          // console.log('INFO: Loaded transform directory: ' + JSON.stringify(transforms));
          if (transforms.directory) {
            lodash.forEach(transforms.directory, function(directoryEntry) {
              loadTransform(directoryEntry);
            });
            return;
          }

          console.log('ERROR: Could not load transform directory.');
        });
      })
      .fail(function(jqxhr, settings, exception) {
        console.log('ERROR: Could not load transform directory: ' + exception);
      });

    var setViewModel = function(data) {
      if (data && data.nodes && data.settings) {
        // console.log('DEBUG: setViewModel called with: ' + JSON.stringify(data));
        viewModel.data = data;
        viewModel.version++;
      }
    };

    // Generate the view model from a given data model using a given transform.
    var generateViewModel = function(dataModel, transformName) {
      // console.log('DEBUG: generateViewModel called.');
      if (!dataModel || !transformName) {
        // console.log('DEBUG: Invalid arguments.');
        return;
      }

      if (!dataModel["nodes"] || dataModel["nodes"].length < 1) {
        // console.log('DEBUG: No nodes in data model.');
        return;
      }

      var transform = transformsByName[transformName];
      if (!transform) {
        console.log('ERROR: Could not find transform "' + transformName + '".');
        return;
      }

      var toModel = JSON.parse(JSON.stringify(defaultModel));
      var fromModel = JSON.parse(JSON.stringify(dataModel));

      // TODO: Removed hard wired call to defaultTransform.
      toModel = defaultTransform(fromModel, toModel, viewModel.configuration);
      setViewModel(toModel);
    };

    this.$get = function() {
      return {
        'viewModel' : viewModel,
        'generateViewModel' : generateViewModel,
        'setViewModel' : setViewModel
      };
    };
  };

  angular.module('krakenApp.Graph')
    .provider('viewModelService', ['lodash', viewModelService]);

})();
