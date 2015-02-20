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
      if (template.legend.node) {
        nodeStyles = template.legend.node;
      }

      if (template.legend.edge) {
        linkStyles = template.legend.edge;
      }
    }

    // iterat through nodeMaps and edgeMaps and for each member, compile scope as regex.
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

    var mapItem = function(fromItem, toItem, maps, styles) {
      toItem.id = fromItem.id || random();

      if (maps) {
        var map = lodash.find(maps, function(map) {
          return map.filter ? applyFilter(map.filter, fromItem) : false;
        });

        if (map) {
          var properties = map.properties;
          if (properties) {
            // TODO: Make the property list dynamic.
            // TODO: Add support for property value expressions.
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

      // TODO: Implement as property value expressions.
      if (fromItem.relation) {
        if (toItem.type == 'loadBalances') {
          toItem.type = 'balances';
        } else if (toItem.type == 'createdFrom') {
          toItem.type = 'uses';
        }
      }

      allTags(fromItem, toItem);
      var style = styles[toItem.type] || styles[0];
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

      mapItem(fromNode, toNode, template.nodeMaps, nodeStyles || this.legend.node);
      setCluster(toNode);
      setIndex(toNode);

      return toNode;
    };

    var mapEdge = function(fromEdge) {
      var toEdge = {};

      mapItem(fromEdge, toEdge, template.edgeMaps, linkStyles || this.legend.link);
      getIndex(fromEdge, toEdge);

      return toEdge;
    };

    var sortNode = function(fromNode) {
      return fromNode.id;
    };

    var sortEdge = function(fromEdge) {
      return fromEdge.source + ':' + fromEdge.target;
    };

    var filterItem = function(filter, item) {
      var result = false;
      if (filter.expr) {
        var args = [];
        if (filter.args) {
          lodash.forEach(filter.args, function(arg) {
            var results = JSONPath(null, item, arg);
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
        var result = eval(expr);
      }

      return result;
    };

    var applyFilter = function(filters) {
      return function(fromItem) {
        return lodash.every(filters, function(filter) { 
          return filterItem(filter, fromItem); 
        });
      };
    };

    return function(fromModel, toModel, configuration) {
      if (fromModel && toModel && configuration) {
        idToIndex = {};
        typeToCluster = {};

        if (fromModel.nodes) {
          if (template.settings) {
            toModel.settings = template.settings;
          }

          var chain = lodash.chain(fromModel.nodes);
          if (template.nodeFilters) {
            chain = chain.filter(applyFilter(template.nodeFilters), configuration);
          }

          if (configuration.filter) {
            chain = chain.filter(function(fromItem) {
              return configuration.filter[fromItem.type];
            });
          }

          toModel.nodes = chain
            .sortBy(sortNode, configuration)
            .map(mapNode, configuration)
            .value();
        }

        if (fromModel.edges) {
          var chain = lodash.chain(fromModel.edges);
          if (template.edgeFilters) {
            chain = chain.filter(applyFilter(template.edgeFilters), configuration);
          }

          // Remove links to dropped nodes.
          var linkFilters = [{
            "expr" : "('%s' !== 'undefined') && ('%s' !== 'undefined')",
            "args" : [ "$.source", "$.target" ]
          }];

          toModel.links = chain
            .map(mapEdge, configuration)
            .filter(applyFilter(linkFilters), configuration)
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
      'icon' : defaultIcon
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
      'data' : defaultModel, 
      'default' : defaultModel,
      'configuration' : {
        // TODO: Read the legend from an external file, though it needs to be
        // exported for dependencies like GraphCtrl.
        'legend' : {
          'node' : {
            'Project' : {
              'radius' : 35,
              'fill' : 'salmon'
            },
            'Cluster' : {
              'radius' : 30,
              'fill' : 'lightcoral'
            },
            'Node' : {
              'radius' : 25,
              'fill' : 'indianred'
            },
            'Process' : {
              'radius' : 15,
              'fill' : 'coral'
            },
            'Service' : {
              'radius' : 20,
              'fill' : 'lightblue'
            },
            'ReplicationController' : {
              'radius' : 15,
              'fill' : 'lightcyan'
            },
            'Pod' : {
              'radius' : 15,
              'fill' : 'darkblue'
            },
            'Container' : defaultNode,
            'Image' : {
              'radius' : 15,
              'fill' : 'green'
            }
          },
          'link' : {
            'contains' : defaultLink,
            'balances' : {
              'width' : 1,
              'stroke' : 'gray',
              'dash' : '5, 5, 1, 5',
              'distance' : 60
            },
            'uses' : {
              'width' : 2,
              'stroke' : 'gray',
              'dash' : '1, 5',
              'distance' : 60
            },
            'monitors' : {
              'width' : 1,
              'stroke' : 'gray',
              'dash' : '5, 10',
              'distance' : 60
            }
          }
        },
        'filter': {
          'Cluster': true,
          'Container': true,
          'Image': false,
          'Node': true,
          'Pod': true,
          'Process': false,
          'Project': false,
          'ReplicationController': true,
          'Service': true
        }
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
