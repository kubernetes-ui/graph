/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/
 (function() {
   'use strict';

  // Compute the view model based on the data model and control parameters
  // and place the result in the current scope at $scope.viewModel.
  var viewModelService = function ViewModelService() {
    var defaultRadius = 20;
    this.setDefaultRadius = function(value) {
      defaultRadius = value;
    }

    var defaultSettings = {
      "clustered": false,
      "showEdgeLabels": true,
      "showNodeLabels": true
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
      'configuration' : undefined,
      'version' : 0
    };

    var setViewModel = function(model) {
      console.log('setViewModel called with: ' + JSON.stringify(model));
      if (model) {
        viewModel.data = model;
        viewModel.version++;
      }
    };

    // Generate the view model from a given data model.
    var generateViewModel = function(model) {
      console.log('generateViewModel called with: ' + JSON.stringify(model));
      if (model) {
        if (model["nodes"]) {
          // Convert to strings and parse to create a deep copy.
          var fromNodes = JSON.parse(JSON.stringify(model.nodes));
          var toNodes = [];

          // Build name and group maps.
          var nameToIndex = {};
          var typeToGroup = {};

          fromNodes.forEach(function(fromNode, fromIndex) {
            var fromName = fromNode["id"];
            var fromType = fromNode["type"];
            if (fromName && fromType && !nameToIndex[fromName]) {
              // Map name to index.
              nameToIndex[fromName] = toNodes.length;
              fromNode["name"] = fromName;
              delete fromNode["id"];


              // Map type to group.
              var fromGroup = typeToGroup[fromType];
              if (!fromGroup) {
                fromGroup = Object.keys(typeToGroup).length;
                typeToGroup[fromType] = fromGroup;
              }

              fromNode["group"] = fromGroup;
              fromNode["radius"] = defaultRadius;
              toNodes.push(fromNode);
            }
          });

          if (toNodes.length > 0) {
            viewModel.data.nodes = toNodes;

            // Extract edges from data model and rename as links for d3 directive.
            if (model["edges"]) {
              // Convert to strings and parse to create a deep copy.
              var fromLinks = JSON.parse(JSON.stringify(model.edges));
              var toLinks = [];

              // Replace node names with indexes in link array.
              fromLinks.forEach(function(fromLink, fromIndex) {
                var sourceName = fromLink["source"];
                var targetName = fromLink["target"];
                if (sourceName && targetName) {
                  var sourceIndex = nameToIndex[sourceName];
                  var targetIndex = nameToIndex[targetName];
                  if (sourceIndex && targetIndex) {
                    fromLink["source"] = sourceIndex;
                    fromLink["target"] = targetIndex;
                    var labelValue = fromLink["relation"];
                    if (labelValue) {
                      fromLink["label"] = labelValue;
                      delete fromLink["relation"];
                    }

                    fromLink["thickness"] = 1;
                    fromLink["distance"] = 240;
                    toLinks.push(fromLink);
                  }
                }
              });

              if (toLinks.length > 0) {
                viewModel.data.links = toLinks;
              }
            }

            console.log("View model: " + JSON.stringify(viewModel.data));
            viewModel.version++;
          }
        }
      }
    };

    return {
      'viewModel' : viewModel,
      'generateViewModel' : generateViewModel,
      'setViewModel' : setViewModel
    };
  };

  angular.module('krakenApp.Graph')
  .service('viewModelService', viewModelService);

})();
