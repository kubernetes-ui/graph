/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph
 =========================================================*/

(function() {
  "use strict";

  // Compute the view model based on the data model and control parameters
  // and place the result in the current scope at $scope.viewModel.
  var viewModelService = function ViewModelService(lodash) {
    var defaultWidth = 2;
    this.setDefaultWidth = function (value) {
      defaultWidth = value;
    };

    var defaultStroke = "gray";
    this.setDefaultStroke = function (value) {
      defaultStroke = value;
    };

    var defaultDash = "1";
    this.setDefaultDash = function (value) {
      defaultDash = value;
    };

    var defaultDistance = 40;
    this.setDefaultDistance = function (value) {
      defaultDistance = value;
    };

    var defaultLink = {
      "style" : {
        "dash" : defaultDash,
        "width" : defaultWidth,
        "stroke" : defaultStroke,
        "distance" : defaultDistance
      }
    };

    this.setDefaultLink = function(value) {
      defaultLink = value;
    };

    var defaultRadius = 10;
    this.setDefaultRadius = function(value) {
      defaultRadius = value;
    };

    var defaultFill = "cornflowerblue";
    this.setDefaultFill = function(value) {
      defaultFill = value;
    };

    var defaultIcon = undefined;
    this.setDefaultIcon = function(value) {
      defaultIcon = value;
    };

    var defaultNode = {
      "style" : {
        "radius" : defaultRadius,
        "fill" : defaultFill,
        "icon" : defaultIcon
      },
      "selected" : true,
      "included" : true
    };

    this.setDefaultNode = function(value) {
      defaultNode = value;
    };

    var defaultSettings = {
      "clustered": false,

      // TODO: Remove these when they"re no longer needed.
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
              "style" : {
                "radius" : 30,
                "fill" : "#D32F2F"                
              },
              "selected" : false,
              "included" : true
            },
            "Node" : {
              "style" : {
                "radius" : 25,
                "fill" : "#FF4D81"
              },
              "selected" : false,
              "included" : true
            },
            "Process" : {
              "style" : {
                "radius" : 15,
                "fill" : "#FF9800"
              },
              "selected" : true,
              "included" : true
            },
            "Service" : {
              "style" : {
                "radius" : 20,
                "fill" : "#7C4DFF"
              },
              "selected" : true,
              "included" : true
            },
            "ReplicationController" : {
              "style" : {
                "radius" : 20,
                "fill" : "#DE2AFB"
              },
              "selected" : true,
              "included" : true
            },
            "Pod" : {
              "style" : {
                "radius" : 20,
                "fill" : "#E91E63"
              },
              "selected" : true,
              "included" : true
            },
            "Image" : {
              "style" : {
                "radius" : 15,
                "fill" : "#D1C4E9"
              },
              "selected" : true,
              "included" : true 
            }
          },
          "links" : {
            "contains" : defaultLink,
            "balances" : {
              "style" : {
                "width" : 2,
                "stroke" : "#7C4DFF",
                "dash" : "5, 5",
                "distance" : 60
              }
            },
            "uses" : {
              "style" : {
                "width" : 2,
                "stroke" : "#D1C4E9",
                "dash" : "5, 5",
                "distance" : 60
              }
            },
            "monitors" : {
              "style" : {
                "width" : 2,
                "stroke" : "#DE2AFB",
                "dash" : "5, 5",
                "distance" : 60
              }
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

      // if (constructorName === "templateTransform") {
      //   bindTransform(templateTransform, directoryEntry);
      //   return;
      // }

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

    var setIndex = function(toNode, idToIndex) {
      if (!idToIndex[toNode.id]) {
        idToIndex[toNode.id] = lodash.keys(idToIndex).length;
      }
    };

    var getIndex = function(toLink, idToIndex) {
      if (toLink.source && toLink.target) {
        toLink.source = idToIndex[toLink.source];
        toLink.target = idToIndex[toLink.target];
      }
    };

    var setCluster = function(toNode, typeToCluster) {
      if (toNode.type) {
        toNode.cluster = typeToCluster[toNode.type];
        if (!toNode.cluster) {
          toNode.cluster = lodash.keys(typeToCluster).length;
          typeToCluster[toNode.type] = toNode.cluster;
        }
      } else {
        toNode.cluster = 0;
      }
    };

    var postProcess = function(toModel, configuration) {
      if (toModel.nodes) {
        var legend = configuration.legend;
        lodash.forOwn(legend.nodes, function(nodeEntry) {
          nodeEntry.included = false;
        });

        var typeToCluster = {};
        var idToIndex = {};

        var chain = lodash.chain(toModel.nodes)
          .forEach(function(toNode) {
            if (legend.nodes[toNode.type]) {
              legend.nodes[toNode.type].included = true;
            }
          });
        var filtered = lodash.any(legend.nodes, function(nodeEntry) {
          return !nodeEntry.selected;
        });

        if (filtered) {
          chain = chain
            .filter(function(toNode) {
              return legend.nodes[toNode.type].selected;
            });
        }
        
        if (toModel.settings && toModel.settings.clustered) {
          chain = chain
            .forEach(function(toNode) {
              setCluster(toNode, typeToCluster);
            });
        }

        toModel.nodes = chain
          .forEach(function(toNode) {
            setIndex(toNode, idToIndex);
          })
          .value();

        if (toModel.links) {
          var chain = lodash.chain(toModel.links)
            .forEach(function(toLink) {
              getIndex(toLink, idToIndex);
            });

          if (filtered) {
            chain = chain
              .filter(function(toLink) {
                return (typeof toLink.source !== "undefined") 
                  && (typeof toLink.target !== "undefined");
              });          
          }

          toModel.links = chain.value();
        }
      }

      return toModel;
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
      toModel = transform(dataModel, toModel, viewModel.configuration);
      toModel = postProcess(toModel, viewModel.configuration);

      setViewModel(toModel);
    };

    this.$get = function() {
      return {
        "viewModel" : viewModel,
        "generateViewModel" : generateViewModel,
        "setViewModel" : setViewModel
      };
    };
  };

  angular.module("krakenApp.Graph")
    .provider("viewModelService", ["lodash", viewModelService]);

})();
