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

      // Update the view model every time the user changes the transformation approach.
      $scope.$watch('selectedTransformName', function(newValue, oldValue) {
        $scope.updateModel();
      });

      $scope.k8sDataModel = pollK8sDataService.k8sdatamodel;
      // Update the view model every time the backend data model has changed.
      $scope.$watch('k8sDataModel.sequenceNumber', function(newValue, oldValue) {
        console.log('sequence number changed, generating view model');
        $scope.updateModel();
      });

      $scope.updateModel = function() {
        viewModelService.generateViewModel(pollK8sDataService.k8sdatamodel.data, $scope.selectedTransformName);
      }

      $scope.$watch("polling", function(newValue, oldValue) {
        if (newValue === oldValue) return;
        if (newValue) {
          $scope.start();
        } else {
          $scope.stop();
        }
      });

      $scope.mockDataSampleNames = lodash.pluck(mockDataService.samples, 'name');
      $scope.showMockDataSample = function(sampleName) {
        $scope.polling = false;
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

      $scope.start = function() {
        pollK8sDataService.start($scope);
      };

      $scope.stop = function() {
        pollK8sDataService.stop($scope);
      };
  }]);
})();
