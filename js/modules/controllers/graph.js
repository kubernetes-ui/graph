/**=========================================================
* Module: Graph
* Visualizer for force directed graph
=========================================================*/
(function() {
  'use strict';

  angular.module('krakenApp.Graph', ['krakenApp.services'])
  .controller('GraphCtrl', ['$scope', 'viewModelService', 'mockDataService', 'pollK8sDataService',
    function($scope, viewModelService, mockDataService, pollK8sDataService) {
      $scope.viewModelService = viewModelService;
      $scope.selectedTransformName = '';
      if (viewModelService.viewModel.transformNames.length > 0) {
        $scope.selectedTransformName = viewModelService.viewModel.transformNames[0];
      }

      $scope.pollK8sDataService = pollK8sDataService;
      $scope.$watch("pollK8sDataService.k8sdatamodel.sequenceNumber", function(newValue, oldValue) {
        viewModelService.generateViewModel(pollK8sDataService.k8sdatamodel.data, $scope.selectedTransformName);
      });

      var nextSample = 0;
      $scope.nextSample = function() {
        pollK8sDataService.stop();
        viewModelService.setViewModel(mockDataService.samples[nextSample].data);
        nextSample = (nextSample + 1) % mockDataService.samples.length;
      };
  }]);
})();
