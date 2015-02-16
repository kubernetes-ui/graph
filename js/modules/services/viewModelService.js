/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
 (function() {
  'use strict';

  function identityTransform(lodash) {
    var random = function() {
      var str = JSON.stringify(Math.random());
      var idx = str.indexOf('.') + 1;
      if (idx > 0 && idx < str.length) {
        str = str.substring(idx);
      }

      return str;
    };

    var nameToIndex = {};
    var typeToGroup = {};
    var mapNode = function(node) {
      var newNode = {};

      var newId = node.id || random();
      var newIndex = nameToIndex[newId];
      if (!newIndex) {
        newIndex = Object.keys(nameToIndex).length;
        nameToIndex[newId] = newIndex;
      }

      newNode.id = newId;
      newNode.name = node.label || newId;

      newNode.group = 0;
      var newType = node.type;
      if (newType) {
        var newGroup = typeToGroup[newType];
        if (!newGroup) {
          newGroup = Object.keys(typeToGroup).length;
          typeToGroup[newType] = newGroup;
        }

        newNode.group = newGroup;
        newNode.type = newType;
      }

      if (node.metadata && node.metadata.length > 0) {
        newNode.tags = lodash.map(node.metadata, function(value, key) {
          return {
            "key": key,
            "value": value
          };
        });
      }

      if (this.radius) {
        newNode.radius = this.radius;
      }

      return newNode;
    };

    var mapEdge = function(edge) {
      var newEdge = {};

      var sourceName = edge.source;
      var targetName = edge.target;
      if (sourceName && targetName) {
        var sourceIndex = nameToIndex[sourceName];
        var targetIndex = nameToIndex[targetName];
        if (sourceIndex && targetIndex) {
          newEdge.source = sourceIndex;
          newEdge.target = targetIndex;

          newEdge.id = edge.id || random();
          if (edge.relation) {
            newEdge.label = edge.relation;
            newEdge.type = edge.relation;
          }

          if (edge.metadata && edge.metadata.length > 0) {
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
  };

  // Compute the view model based on the data model and control parameters
  // and place the result in the current scope at $scope.viewModel.
  var viewModelService = function ViewModelService(lodash) {
    var defaultRadius = 15;
    this.setDefaultRadius = function(value) {
      defaultRadius = value;
    }

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
      "showEdgeLabels": true,
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
          })
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

      transform = identityTransform(lodash);
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
