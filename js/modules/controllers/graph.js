/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  "use strict";

  angular.module("krakenApp.Graph", ["krakenApp.services", "yaru22.jsonHuman"])
  .controller("GraphCtrl", ["$scope", "lodash", "viewModelService", 
    "mockDataService", "pollK8sDataService", "$location", "inspectNodeService",
    function($scope, lodash, viewModelService, mockDataService, pollK8sDataService, $location, inspectNodeService) {
      $scope.viewModelService = viewModelService;
      $scope.getTransformNames = function() {
        return lodash.sortBy(viewModelService.viewModel.transformNames);
      };

      $scope.selectedTransformName = "";
      if (viewModelService.viewModel.transformNames.length > 0) {
        $scope.selectedTransformName = lodash.first($scope.getTransformNames());
      }
 
      // Sets the selected transformName based on user selection
      $scope.setSelectedTransformName = function(transformName) {
        $scope.selectedTransformName = transformName;
      };

      $scope.showHide = function(id) {
        var element = document.getElementById(id);
        if (element) {
          element.style.display = (element.style.display == "none") ? "block" : "none";
        }
      };

      $scope.hideElement = function(id) {
        var element = document.getElementById(id);
        if (element) {
          element.style.display = "none";
        }
      };

      $scope.getLegendNodeTypes = function() {
        var result = [];
        var legend = viewModelService.viewModel.data.legend;
        if (legend && legend.nodes) {
          result = lodash.keys(legend.nodes)
            .filter(function(type) {
              return legend.nodes[type].available;
            })
            .sort();
        }

        return result;
      };

      $scope.getLegendNodeStyle = function(type) {
        var result = {};
        var legend = viewModelService.viewModel.data.legend;
        if (legend && legend.nodes) {
          result = legend.nodes[type].style;
        }

        return result;
      };

      $scope.getLegendLinkTypes = function() {
        var result = [];
        var legend = viewModelService.viewModel.data.legend;
        if (legend && legend.links) {
          result = lodash.keys(legend.links)
            .filter(function(type) {
              return legend.links[type].available;
            })
            .sort();
        }

        return result;
      };

      $scope.getLegendLinkStyle = function(type) {
        var result = {};
        var legend = viewModelService.viewModel.data.legend;
        if (legend && legend.links) {
          result = legend.links[type].style;
        }

        return result;
      };

      var getSelection = function() {
        var selectedNode = undefined;
        var selectionIdList = viewModelService.viewModel.configuration.selectionIdList;
        if (selectionIdList && selectionIdList.length > 0) {
          var selectedId = selectionIdList[0];
          selectedNode = lodash.find(viewModelService.viewModel.data.nodes, function(node) {
            return node.id === selectedId;
          });
        }

        return selectedNode;
      };
 
      $scope.getSelectionDetails = function() {
        var results = {};
        var selectedNode = getSelection();
        if (selectedNode && selectedNode.tags) {
          lodash.forOwn(selectedNode.tags, function(value, property) {
            if (value) {
              if (typeof value === "string") {
                // if ((typeof value === "object" && lodash.keys(value).length > 0) 
                //   || (lodash.isArray(value) && value.length > 0)) {
                //   value = JSON.stringify(value);
                // } else {
                //   value = "";
                // }

                if (value.length > 0) {
                  results[property] = value;
                }
              }
            }
          });
        }

        return results;
      };

      $scope.updateModel = function() {
        viewModelService.generateViewModel(pollK8sDataService.k8sdatamodel.data, $scope.selectedTransformName);
      };

      $scope.$watch("viewModelService.viewModel.configuration.selectionIdList", function(newValue, oldValue) {
        var selectionIdList = viewModelService.viewModel.configuration.selectionIdList;
        if (!selectionIdList || selectionIdList.length < 1) {
          $scope.hideElement("details");
        }
      });

      // Update the view model every time the user changes the transformation approach.
      $scope.$watch("selectedTransformName", function(newValue, oldValue) {
        if (!pollK8sDataService.isPolling()) {
          pollK8sDataService.refresh($scope);
        }
      });

      $scope.pollK8sDataService = pollK8sDataService;
      // Update the view model when the data model changes.
      $scope.$watch("pollK8sDataService.k8sdatamodel.sequenceNumber", function(newValue, oldValue) {
        if (newValue != oldValue) {
          console.log("INFO: Sequence number changed, generating view model");
          $scope.updateModel();
        }
      });

      if (pollK8sDataService.isPolling()) {
        $scope.isPolling = true;
        $scope.playIcon = "components/graph/img/Pause.svg";
      } else {
        $scope.isPolling = false;
        $scope.playIcon = "components/graph/img/Play.svg";
      }

      $scope.togglePlay = function() {
        if (pollK8sDataService.isPolling()) {
          $scope.isPolling = false;
          $scope.playIcon = "components/graph/img/Play.svg";
          pollK8sDataService.stop($scope);
        } else {
          $scope.isPolling = true;
          $scope.playIcon = "components/graph/img/Pause.svg";
          pollK8sDataService.start($scope);
        }
      };

      pollK8sDataService.k8sdatamodel.useSampleData = false;
      $scope.sourceIcon = "components/graph/img/LiveData.svg";
      $scope.getSourceText = function() {
        return pollK8sDataService.k8sdatamodel.useSampleData ? "Sample Data" : "Live Data";
      };

      $scope.toggleSource = function() {
        if (pollK8sDataService.k8sdatamodel.useSampleData) {
          pollK8sDataService.k8sdatamodel.useSampleData = false;
          $scope.sourceIcon = "components/graph/img/LiveData.svg"; 
        } else {
          pollK8sDataService.k8sdatamodel.useSampleData = true;
          $scope.sourceIcon = "components/graph/img/SampleData.svg";
        }
      };

      $scope.inspectSelection = function() {
        var selectedNode = getSelection();
        if (selectedNode && selectedNode.metadata) {
          inspectNodeService.setDetailData(selectedNode);
          $location.path('/graph/inspect');
        }
      };

      $scope.sampleNames = lodash.pluck(mockDataService.samples, "name");
      $scope.showMockDataSample = function(sampleName) {
        pollK8sDataService.stop($scope);
        var sample = lodash.find(mockDataService.samples, function(sample) {
          return sample.name === sampleName;
        });
        if (sample) {
          viewModelService.setViewModel(sample.data);
        }
      };

      $scope.refresh = function() {
        pollK8sDataService.refresh($scope);
      };
  }]);
})();
