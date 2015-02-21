/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph', ['krakenApp.services'])
  .controller('GraphCtrl', ['$scope', 'lodash', 'viewModelService', 'mockDataService', 'pollK8sDataService',
    function($scope, lodash, viewModelService, mockDataService, pollK8sDataService) {
      $scope.viewModelService = viewModelService;
      $scope.selectedTransformName = '';
      if (viewModelService.viewModel.transformNames.length > 0) {
        $scope.selectedTransformName = viewModelService.viewModel.transformNames[0];
      }

      // Sets the selected transformName based on user selection
      $scope.setSelectedTransformName = function(transformName) {
        $scope.selectedTransformName = transformName;
      };

      $scope.updateModel = function() {
        viewModelService.generateViewModel(pollK8sDataService.k8sdatamodel.data, $scope.selectedTransformName);
      }

      // Update the view model every time the user changes the transformation approach.
      $scope.$watch('selectedTransformName', function(newValue, oldValue) {
        if (newValue != oldValue) {
          $scope.updateModel();
        }
      });

      $scope.pollK8sDataService = pollK8sDataService;
      // Update the view model every time the backend data model has changed.
      $scope.$watch('pollK8sDataService.k8sdatamodel.sequenceNumber', function(newValue, oldValue) {
        if (newValue != oldValue) {
          console.log('sequence number changed, generating view model');
          $scope.updateModel();
        }
      });

      if (pollK8sDataService.isPolling()) {
        $scope.isPolling = true;
        $scope.toggleIcon = "components/graph/img/Pause.svg";
      } else {
        $scope.isPolling = false;
        $scope.toggleIcon = "components/graph/img/Play.svg";
      }

      $scope.toggle = function() {
        if (pollK8sDataService.isPolling()) {
          $scope.isPolling = false;
          $scope.toggleIcon = "components/graph/img/Play.svg";
          pollK8sDataService.stop($scope);
        } else {
          $scope.isPolling = true;
          $scope.toggleIcon = "components/graph/img/Pause.svg";
          pollK8sDataService.start($scope);
        }
      };

      $scope.mockDataSampleNames = lodash.pluck(mockDataService.samples, 'name');
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
