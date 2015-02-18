/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/

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
            // TODO: Make the property list dynamic.
            if (properties.name) {
              var result = JSONPath(null, fromItem, properties.name);
              if (result && result.length > 0) {
                toItem.name = result[0];
              }
            }

            if (properties.label) {
              var result = JSONPath(null, fromItem, properties.label);
              if (result && result.length > 0) {
                toItem.label = result[0];
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
              var results = JSONPath(null, fromItem, arg);
              if (results && results.length > 0) {
                results = lodash.map(results, function(result) {
                  if (typeof result === 'undefined') {
                    return 'undefined';
                  }

                  return result;
                });
                args.push(results);
              }
            });
          }

          var expr = vsprintf(filter.expr, args);
          return eval(expr);
        });
      };
    };

    return function(fromModel, toModel, configuration) {
      if (fromModel && toModel && configuration) {
        nameToIndex = {};
        typeToGroup = {};

        if (fromModel.nodes) {
          var chain = lodash.chain(fromModel.nodes);
          if (template.nodeFilters) {
            chain = chain.filter(filterItem(template.nodeFilters), configuration);
          }

          toModel.nodes = chain
            .map(mapNode, configuration)
            .sortBy(sortNode, configuration)
            .value();
        }

        if (fromModel.edges) {
          var chain = lodash.chain(fromModel.edges);
          if (template.edgeFilters) {
            chain = chain.filter(filterItem(template.edgeFilters), configuration);
          }

          // Remove links to dropped nodes.
          var linkFilters = [{
            "expr" : "('%s' !== 'undefined') && ('%s' !== 'undefined')",
            "args" : [ "$.source", "$.target" ]
          }];

          toModel.links = chain
            .map(mapEdge, configuration)
            .filter(filterItem(linkFilters), configuration)
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

    // var defaultTransform = templateTransform(lodash, defaultTemplate);
    var transformsByName = {}; // Loaded transforms by name.

    var stripSuffix = function(fileName) {
      var suffixIndex = fileName.indexOf(".");
      if (suffixIndex > 0) {
        fileName = fileName.substring(0, suffixIndex);
      }

      return fileName;
    };

    var bindTransform = function(constructor, directoryEntry) {
      var transform = constructor(lodash, directoryEntry.data);
      if (transform) {
        // console.log('INFO: Loaded transform: "' + directoryEntry.name + '".');
        viewModel.transformNames.push(directoryEntry.name);
        transformsByName[directoryEntry.name] = transform;
      } else {
        console.log('ERROR: Could not bind transform "' + directoryEntry.name + '".');
      }
    };

    // Load a transform from a given directory entry.
    var loadTransform = function(directoryEntry) {
      if (!directoryEntry) {
        return;
      }

      if (!directoryEntry.name || !directoryEntry.script) {
        return;
      }

      var constructorName = stripSuffix(directoryEntry.script);

      if (window[constructorName]) {
        bindTransform(window[constructorName], directoryEntry);
        return;
      }

      // TODO: Remove the following when finished debugging.
      if (constructorName === "templateTransform") {
        bindTransform(templateTransform, directoryEntry);
        return;
      }

      // Load the script into the window scope.
      var scriptPath = "components/graph/assets/transforms/" + directoryEntry.script;
      $.getScript(scriptPath)
        .done(function() {
          // Defer to give the load opportunity to complete.
          lodash.defer(function() {
            // Get the constructor by name from the window scope.
            if (window[constructorName]) {
              bindTransform(window[constructorName], directoryEntry);
              return;
            }

            console.log('ERROR: Could not load transform "' + directoryEntry.name + '".');
          });
        })
        .fail(function(jqxhr, settings, exception) {
          console.log('ERROR: Could not load transform "' + directoryEntry.name + '": ' + exception);
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
      toModel = transform(fromModel, toModel, viewModel.configuration);
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
