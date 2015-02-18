/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/

// TODO: Remove these embedded library modules when they vendor correctly.

// bower_components/sprintf/dist/sprintf.js
(function(window) {
    var re = {
        not_string: /[^s]/,
        number: /[dief]/,
        text: /^[^\x25]+/,
        modulo: /^\x25{2}/,
        placeholder: /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fiosuxX])/,
        key: /^([a-z_][a-z_\d]*)/i,
        key_access: /^\.([a-z_][a-z_\d]*)/i,
        index_access: /^\[(\d+)\]/,
        sign: /^[\+\-]/
    };

    function sprintf() {
        var key = arguments[0], cache = sprintf.cache;
        if (!(cache[key] && cache.hasOwnProperty(key))) {
            cache[key] = sprintf.parse(key)
        }
        return sprintf.format.call(null, cache[key], arguments);
    }

    sprintf.format = function(parse_tree, argv) {
        var cursor = 1, tree_length = parse_tree.length, node_type = "", arg, output = [], i, k, match, pad, pad_character, pad_length, is_positive = true, sign = ""
        for (i = 0; i < tree_length; i++) {
            node_type = get_type(parse_tree[i])
            if (node_type === "string") {
                output[output.length] = parse_tree[i]
            }
            else if (node_type === "array") {
                match = parse_tree[i] // convenience purposes only
                if (match[2]) { // keyword argument
                    arg = argv[cursor]
                    for (k = 0; k < match[2].length; k++) {
                        if (!arg.hasOwnProperty(match[2][k])) {
                            throw new Error(sprintf("[sprintf] property '%s' does not exist", match[2][k]))
                        }
                        arg = arg[match[2][k]]
                    }
                }
                else if (match[1]) { // positional argument (explicit)
                    arg = argv[match[1]]
                }
                else { // positional argument (implicit)
                    arg = argv[cursor++]
                }

                if (get_type(arg) == "function") {
                    arg = arg()
                }

                if (re.not_string.test(match[8]) && (get_type(arg) != "number" && isNaN(arg))) {
                    throw new TypeError(sprintf("[sprintf] expecting number but found %s", get_type(arg)))
                }

                if (re.number.test(match[8])) {
                    is_positive = arg >= 0
                }

                switch (match[8]) {
                    case "b":
                        arg = arg.toString(2)
                    break
                    case "c":
                        arg = String.fromCharCode(arg)
                    break
                    case "d":
                    case "i":
                        arg = parseInt(arg, 10)
                    break
                    case "e":
                        arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential()
                    break
                    case "f":
                        arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg)
                    break
                    case "o":
                        arg = arg.toString(8)
                    break
                    case "s":
                        arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg)
                    break
                    case "u":
                        arg = arg >>> 0
                    break
                    case "x":
                        arg = arg.toString(16)
                    break
                    case "X":
                        arg = arg.toString(16).toUpperCase()
                    break
                }
                if (re.number.test(match[8]) && (!is_positive || match[3])) {
                    sign = is_positive ? "+" : "-"
                    arg = arg.toString().replace(re.sign, "")
                }
                else {
                    sign = ""
                }
                pad_character = match[4] ? match[4] === "0" ? "0" : match[4].charAt(1) : " "
                pad_length = match[6] - (sign + arg).length
                pad = match[6] ? (pad_length > 0 ? str_repeat(pad_character, pad_length) : "") : ""
                output[output.length] = match[5] ? sign + arg + pad : (pad_character === "0" ? sign + pad + arg : pad + sign + arg)
            }
        }
        return output.join("");
    }

    sprintf.cache = {};

    sprintf.parse = function(fmt) {
        var _fmt = fmt, match = [], parse_tree = [], arg_names = 0
        while (_fmt) {
            if ((match = re.text.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = match[0]
            }
            else if ((match = re.modulo.exec(_fmt)) !== null) {
                parse_tree[parse_tree.length] = "%"
            }
            else if ((match = re.placeholder.exec(_fmt)) !== null) {
                if (match[2]) {
                    arg_names |= 1
                    var field_list = [], replacement_field = match[2], field_match = []
                    if ((field_match = re.key.exec(replacement_field)) !== null) {
                        field_list[field_list.length] = field_match[1]
                        while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
                                field_list[field_list.length] = field_match[1]
                            }
                            else {
                                throw new SyntaxError("[sprintf] failed to parse named argument key")
                            }
                        }
                    }
                    else {
                        throw new SyntaxError("[sprintf] failed to parse named argument key")
                    }
                    match[2] = field_list
                }
                else {
                    arg_names |= 2
                }
                if (arg_names === 3) {
                    throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported")
                }
                parse_tree[parse_tree.length] = match
            }
            else {
                throw new SyntaxError("[sprintf] unexpected placeholder")
            }
            _fmt = _fmt.substring(match[0].length)
        }
        return parse_tree
    }

    var vsprintf = function(fmt, argv, _argv) {
        _argv = (argv || []).slice(0)
        _argv.splice(0, 0, fmt)
        return sprintf.apply(null, _argv)
    };

    /**
     * helpers
     */
    function get_type(variable) {
        return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase()
    };

    function str_repeat(input, multiplier) {
        return Array(multiplier + 1).join(input)
    };

    /**
     * export to either browser or node.js
     */
    if (typeof exports !== "undefined") {
        exports.sprintf = sprintf
        exports.vsprintf = vsprintf
    }
    else {
        window.sprintf = sprintf
        window.vsprintf = vsprintf

        if (typeof define === "function" && define.amd) {
            define(function() {
                return {
                    sprintf: sprintf,
                    vsprintf: vsprintf
                }
            })
        }
    }
})(typeof window === "undefined" ? this : window);

/*global module, exports, require*/
/*jslint vars:true, evil:true*/
 JSONPath 0.8.0 - XPath for JSON
 *
 * Copyright (c) 2007 Stefan Goessner (goessner.net)
 * Licensed under the MIT (MIT-LICENSE.txt) licence.
 

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

    var allTags = function(fromItem, toItem) {
      if (!toItem.tags && fromItem.metadata) {
        toItem.tags = lodash.map(fromItem.metadata, function(value, key) {
          return { "key": key, "value": value };
        });
      }
    };

    var mapItem = function(fromItem, toItem, maps, apply) {
      if (maps) {
        var map = lodash.find(maps, function(map) {
          return apply(fromItem, map.scope);
        });

        if (map) {
          var properties = map.properties;
          if (properties) {
            if (properties.name) {
              var result = JSONPath(null, fromItem, properties.name);
              if (result && result.length > 0) {
                toItem.name = result[0];
              }
            }

            if (properties.type) {
              var result = JSONPath(null, fromItem, properties.type);
              if (result && result.length > 0) {
                toItem.type = result[0];
              }
            }

            if (properties.tags) {
              toItem.tags = [];
              lodash.forOwn(properties.tags, function(path, label) {
                var result = JSONPath(null, fromItem, path);
                if (result && result.length > 0) {
                  toItem.tags.push({ 'key': label, 'value': result[0] });
                }
              });
            }
          }
        }
      }

      allTags(fromItem, toItem);
    };

    var setIndex = function(toNode) {
      if (!nameToIndex[toNode.id]) {
        nameToIndex[toNode.id] = Object.keys(nameToIndex).length;
      }
    };

    var getIndex = function(fromEdge, toEdge) {
      if (fromEdge.source && fromEdge.target) {
        toEdge.source = nameToIndex[fromEdge.source];
        toEdge.target = nameToIndex[fromEdge.target];
      }
    };

    var setGroup = function(toNode) {
      toNode.group = 0;
      if (toNode.type) {
        toNode.group = typeToGroup[toNode.type];
        if (!toNode.group) {
          toNode.group = Object.keys(typeToGroup).length;
          typeToGroup[toNode.type] = toNode.group;
        }
      }
    };

    var mapNode = function(fromNode) {
      var toNode = {};

      toNode.id = fromNode.id || random();
      toNode.name = fromNode.label || toNode.id;
      toNode.type = fromNode.type;

      mapItem(fromNode, toNode, template.nodeMaps, 
        function(fromNode, scope) { return fromNode.type === scope; });

      setIndex(toNode);
      setGroup(toNode);

      if (this.radius) {
        toNode.radius = this.radius;
      }

      return toNode;
    };

    var mapEdge = function(fromEdge) {
      var toEdge = {};

      toEdge.id = fromEdge.id || random();
      toEdge.label = toEdge.name || fromEdge.relation;
      toEdge.type = fromEdge.relation;

      mapItem(fromEdge, toEdge, template.edgeMaps, 
        function(fromEdge, scope) { return fromEdge.relation === scope; });

      getIndex(fromEdge, toEdge);

      if (this.thickness) {
        toEdge.thickness = this.thickness;
      }

      if (this.distance) {
        toEdge.distance = this.distance;
      }

      return toEdge;
    };

    var sortNode = function(fromNode) {
      return fromNode.id;
    };

    var sortEdge = function(fromEdge) {
      return fromEdge.source + fromEdge.target;
    };

    var filterItem = function(filters) {
      return function(fromItem) {
        return lodash.every(filters, function(filter) {
          var args = [];
          if (filter.args) {
            lodash.forEach(filter.args, function(arg) {
              var result = JSONPath(null, fromItem, arg);
              if (result && result.length > 0) {
                args.push(result);
              }
            });
          }

          var expr = vsprintf(filter.expr, args);
          return eval(expr);
        });
      };
    };

    return function(fromModel, configuration) {
      var toModel = {};

      if (fromModel && configuration) {
        nameToIndex = {};
        typeToGroup = {};

        if (fromModel.nodes) {
          var chain = lodash.chain(fromModel.nodes)
            .map(mapNode, configuration);
          if (template.nodeFilters) {
            chain = chain.filter(filterItem(template.nodeFilters), configuration);
          }

          toModel.nodes = chain
            .sortBy(sortNode, configuration)
            .value();
        }

        if (fromModel.edges) {
          var chain = lodash.chain(fromModel.edges)
            .map(mapEdge, configuration);
          if (template.edgeFilters) {
            chain = chain.filter(filterItem(template.edgeFilters), configuration);
          }

          toModel.links = chain
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
      defaultDistance = value;
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
        'radius' : defaultRadius,
        'thickness' : defaultThickness,
        'distance' : defaultDistance
      },
      'version' : 0,
      'transformNames' : []
    };

    // TODO: Move this template into a file.
    var defaultTemplate = {
      "settings" : defaultSettings,
      'nodeMaps' : [{
        'scope' : 'Container', 
        'properties' : {
          'type' : 'type', 
          'name' : '$.metadata.Config.Image', 
          'tags' : {
            'Hostname' : '$.metadata.Config.Hostname', 
            'Memory' : '$.metadata.Config.Memory', 
            'MemorySwap' : '$.metadata.Config.MemorySwap', 
            'NetworkDisabled' : '$.metadata.Config.NetworkDisabled', 
            'Dns' : '$.metadata.HostConfig.Dns', 
            'DnsSearch' : '$.metadata.HostConfig.DnsSearch'
          }
        }
      },{
        'scope' : 'Pod', 
        'properties' : {
          'type' : 'type', 
          'tags' : {
            'containerID' : '$.metadata.currentState.info.POD.containerID', 
            'image' : '$.metadata.currentState.info.POD.image', 
            'podIP' : '$.metadata.currentState.info.POD.podIP', 
            'startedAt' : '$.metadata.currentState.info.POD.state.running.startedAt'
          }
        }
      }],
      'nodeFilters' : [{
        'expr' : '("%s" == "Pod") || ("%s" == "Container")',
        'args' : [ '$.type', '$.type' ]
      }],
      'edgeMaps' : [{ 
        'relation' : 'contains', 
        'name' : '$.metadata.Config.Image',
        'type' : 'contains'
      }],
      'edgeFilters' : [{
        'expr' : '("%s" === "contains")',
        'args' : [ '$.type' ]
      }]
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

      if (!dataModel.nodes || dataModel.nodes.length < 1) {
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
      toModel = defaultTransform(fromModel, viewModel.configuration);
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
