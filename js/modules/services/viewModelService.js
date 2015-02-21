/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/

(function() {
  'use strict';

  function templateTransform(lodash, template) {
    var idToIndex = {};
    var typeToCluster = {};

    var nodeStyles = undefined;
    var linkStyles = undefined;
    if (template.legend) {
      if (template.legend.nodes) {
        nodeStyles = template.legend.nodes;
      }

      if (template.legend.links) {
        linkStyles = template.legend.links;
      }
    }

    var stringifyNoQuotes = function(result) {
      if (typeof result !== 'string') {
        if (typeof result !== 'undefined') {
          result = JSON.stringify(result);
          result = result.replace(/\"([^(\")"]+)\":/g,"$1:");
        } else {
          result = 'undefined';   
        }
      }

      return result;
    };

    var evalExpression = function(item, expression) {
      var result = undefined;
      if (typeof expression.eval === 'string') {
        var args = [];
        if (Array.isArray(expression.args)) {
          lodash.forEach(expression.args, function(results) {
            if (typeof results === 'string') {
              if (results.charAt(0) == '$') {
                results = JSONPath(null, item, results);
              }
              if (results && results.length > 0) {
                results = lodash.map(results, function(result) {
                  return stringifyNoQuotes(result);
                });
                args.push(results);
              }
            }
          });
          var expr = vsprintf(expression.eval, args);
        }
        result = eval(expr);
      }

      return result;
    };

    var filterItem = function(filters) {
      return function(fromItem) {
        return lodash.every(filters, function(filter) { 
          return evalExpression(fromItem, filter); 
        });
      };
    };

    var random = function() {
      var str = JSON.stringify(Math.random());
      var idx = str.indexOf('.') + 1;
      if (idx > 0 && idx < str.length) {
        str = str.substring(idx);
      }

      return str;
    };

    var evalMapping = function(item, mapping) {
      var result = undefined;
      if (mapping) {
        if (typeof mapping === 'string') {
          result = mapping;
          if (result.charAt(0) == '$') {
            result = JSONPath(null, item, mapping);
            if (result && result.length == 1) {
              result = result[0];
            }
          }
        } else
        if (typeof mapping === 'object') {
          if (mapping.expression) {
          result = evalExpression(item, mapping);
          } else
          if (mapping.properties) {
            result = mapProperties(item, {}, mapping);
          }
        } else
        if (Array.isArray(mapping)) {
          result = lodash.map(mapping, function(member) {
              return evalMapping(item, member);
          });
        }
      }

      return result;
    };

    var mapProperties = function(fromItem, toItem, properties) {
      if (properties) {
        lodash.forOwn(properties, function(mapping, property) {
          mapping = evalMapping(fromItem, mapping);
          if (mapping) {
            property = evalMapping(fromItem, property);
            if (property) {
              property = stringifyNoQuotes(property);
              toItem[property] = mapping;
            }
          }
        });
      }
    };

    var mapItem = function(fromItem, toItem, maps, styles) {
      toItem.id = fromItem.id || random();

      if (maps) {
        // TODO: Apply maps progressively not sequentially.
        lodash.forEach(maps, function(map) {
          if (!map.filter || evalExpression(fromItem, map.filter)) {
            mapProperties(fromItem, toItem, map.properties);
          }
        });
      }

      var style = styles.hasOwnProperty(toItem.type) ? 
        styles[toItem.type] : styles[lodash.first(Object.keys(styles))];
      lodash.assign(toItem, style);
    };

    var setIndex = function(toNode) {
      if (!idToIndex[toNode.id]) {
        idToIndex[toNode.id] = Object.keys(idToIndex).length;
      }
    };

    var getIndex = function(fromEdge, toEdge) {
      if (fromEdge.source && fromEdge.target) {
        toEdge.source = idToIndex[fromEdge.source];
        toEdge.target = idToIndex[fromEdge.target];
      }
    };

    var setCluster = function(toNode) {
      if (template.settings && template.settings.clustered) {
        if (toNode.type) {
          toNode.cluster = typeToCluster[toNode.type];
          if (!toNode.cluster) {
            toNode.cluster = Object.keys(typeToCluster).length;
            typeToCluster[toNode.type] = toNode.cluster;
          }
        } else {
          toNode.cluster = 0;
        }
      }
    };

    var mapNode = function(fromNode) {
      var toNode = {};

      mapItem(fromNode, toNode, template.nodeMaps, nodeStyles || this.legend.nodes);
      setCluster(toNode);
      setIndex(toNode);

      return toNode;
    };

    var mapEdge = function(fromEdge) {
      var toEdge = {};

      mapItem(fromEdge, toEdge, template.edgeMaps, linkStyles || this.legend.links);
      getIndex(fromEdge, toEdge);

      return toEdge;
    };

    var sortNode = function(fromNode) {
      return fromNode.id;
    };

    var sortEdge = function(fromEdge) {
      return fromEdge.source + ':' + fromEdge.target;
    };

    return function(fromModel, toModel, configuration) {
      if (fromModel && toModel && configuration) {
        idToIndex = {};
        typeToCluster = {};

        if (fromModel.nodes) {
          if (template.settings) {
            toModel.settings = template.settings;
          }

          var chain = lodash.chain(fromModel.nodes)
            .filter(function(fromItem) {
              return configuration.legend.nodes[fromItem.type].enabled;
            });
          if (template.nodeFilters) {
            chain = chain
              .filter(filterItem(template.nodeFilters), configuration);
          }

          toModel.nodes = chain
            .sortBy(sortNode, configuration)
            .map(mapNode, configuration)
            .value();
        }

        if (fromModel.edges) {
          var chain = lodash.chain(fromModel.edges);
          if (template.edgeFilters) {
            chain = chain.filter(filterItem(template.edgeFilters), configuration);
          }

          // Remove links to dropped nodes.
          var linkFilters = [{
            "eval" : "('%s' !== 'undefined') && ('%s' !== 'undefined')",
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
    var defaultWidth = 1;
    this.setDefaultWidth = function (value) {
      defaultWidth = value;
    };

    var defaultStroke = 'gray';
    this.setDefaultStroke = function (value) {
      defaultStroke = value;
    };

    var defaultDash = undefined;
    this.setDefaultDash = function (value) {
      defaultDash = value;
    };

    var defaultDistance = 40;
    this.setDefaultDistance = function (value) {
      defaultDistance = value;
    };

    var defaultLink = {
      'width' : defaultWidth,
      'stroke' : defaultStroke,
      // 'dash' : defaultDash,
      'distance' : defaultDistance
    };

    this.setDefaultLink = function(value) {
      defaultLink = value;
    };

    var defaultRadius = 10;
    this.setDefaultRadius = function(value) {
      defaultRadius = value;
    };

    var defaultFill = 'cornflowerblue';
    this.setDefaultFill = function(value) {
      defaultFill = value;
    };

    var defaultIcon = undefined;
    this.setDefaultIcon = function(value) {
      defaultIcon = value;
    };

    var defaultNode = {
      'radius' : defaultRadius,
      'fill' : defaultFill,
      'icon' : defaultIcon,
      'enabled' : true
    };

    this.setDefaultNode = function(value) {
      defaultNode = value;
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
          "name" : "no data",
          "radius" : defaultRadius,
          "fill": defaultFill
        }
      ],
      "links" : []
    };

    var viewModel = { 
      "data" : defaultModel, 
      "default" : defaultModel,
      "configuration" : {
        // TODO: Read the legend from an external file, though it needs to be
        // exported for dependencies like GraphCtrl.
        "legend" : {
          "nodes" : {
            "Container" : defaultNode,
            "Cluster" : {
              "radius" : 30,
              "fill" : "lightcoral",
              "enabled" : false
            },
            "Node" : {
              "radius" : 25,
              "fill" : "indianred",
              "enabled" : false
            },
            "Process" : {
              "radius" : 15,
              "fill" : "coral",
              "enabled" : true
            },
            "Service" : {
              "radius" : 20,
              "fill" : "lightblue",
              "enabled" : true
            },
            "ReplicationController" : {
              "radius" : 15,
              "fill" : "lightcyan",
              "enabled" : true
            },
            "Pod" : {
              "radius" : 15,
              "fill" : "darkblue",
              "enabled" : true
            },
            "Image" : {
              "radius" : 15,
              "fill" : "green",
              "enabled" : true
            }
          },
          "links" : {
            "contains" : defaultLink,
            "balances" : {
              "width" : 1,
              "stroke" : "gray",
              "dash" : "5, 5, 1, 5",
              "distance" : 60
            },
            "uses" : {
              "width" : 2,
              "stroke" : "gray",
              "dash" : "1, 5",
              "distance" : 60
            },
            "monitors" : {
              "width" : 1,
              "stroke" : "gray",
              "dash" : "5, 10",
              "distance" : 60
            }
          }
        }
      },
      "version" : 0,
      "transformNames" : []
    };

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

      // TODO: Remove the following when finished debugging.
      if (constructorName === "templateTransform") {
        bindTransform(templateTransform, directoryEntry);
        return;
      }

      if (window[constructorName]) {
        bindTransform(window[constructorName], directoryEntry);
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
