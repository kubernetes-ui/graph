/**=========================================================
 * Module: Graph
 * Visualizer for force directed graph.
 * This is a directive that uses d3 to generate an svg
 * element.
 =========================================================*/

angular.module('kubernetesApp.components.graph')
    .directive('d3Visualization', ['d3Service', 'd3RenderingService',
                                   function (d3Service, d3RenderingService) {
  return {
    restrict: 'E',
    link: function (scope, element, attrs) {
      scope.$watch('viewModelService.viewModel.version', function(newValue, oldValue) {
        if (!window.d3) {
          d3Service.d3().then(d3Rendering);
        } else {
          d3Rendering();
        }
      });

      scope.$watch('selectionIdList', function(newValue, oldValue) {
        if (newValue !== undefined) {
          // The d3Rendering.nodeSelection() method expects a set of objects, each with an id property.
          var nodes = new Set();

          newValue.forEach(function (e) {
            nodes.add({id: e});
          });

          d3Rendering.nodeSelection(nodes);
        }
      });

      var d3Rendering = d3RenderingService
        .rendering()
        .controllerScope(scope)
        .directiveElement(element[0]);
    }
  };
}]);
