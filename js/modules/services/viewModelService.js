/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
 (function() {
  'use strict';

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
